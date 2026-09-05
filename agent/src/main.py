"""
Uchchar Voice Agent — Main Entry Point (LiveKit Agents 1.5+)

Multi-tenant, multi-provider voice AI agent. Each call is configured
entirely by its manifest — system prompt, STT, LLM, TTS, greeting,
tools, interruption sensitivity, and silence timeout.
Zero shared state between concurrent calls.

v1.5 changes:
  - Adaptive interruption handling (enabled by default)
  - EOUModel turn detection (transformer-based, not silence-based)
  - 51% fewer false barge-ins — critical for Indian accents

v2.0 changes:
  - Dynamic tool registration from manifest.tools_enabled
  - Full provider support: OpenAI, Anthropic, Google, Groq, Deepgram, ElevenLabs, Sarvam, Cartesia
  - interruption_sensitivity propagated from manifest
  - silence_timeout_ms propagated from manifest
  - speech_speed propagated to TTS
"""

import asyncio
import json
import os
import time
import random

from dotenv import load_dotenv
from livekit import agents
from livekit.agents import AgentSession, Agent, AgentServer
from livekit.plugins import silero

import aiohttp
from src.core import parse_manifest, speak_rejection_and_disconnect
from src.core.session import SessionManifest
from src.providers import (
    create_stt,
    create_llm,
    create_tts,
    log_provider_config,
    UnsupportedProviderError,
)
from src.domain.realestate import SessionReporter
from src.core.utils import configure_logging, get_logger
from src.tools.definitions import build_assistant

# Load environment variables
load_dotenv()

# Configure logging early
configure_logging()

logger = get_logger("main")


# ---------------------------------------------------------------------------
# Server Setup
# ---------------------------------------------------------------------------

server = AgentServer()


# ---------------------------------------------------------------------------
# Pre-warm Silero VAD at module startup.
# The first load downloads the model (~3s). Subsequent loads use the torch cache
# (~0.3s). By loading here, the FIRST inbound call also gets a fast start.
# ---------------------------------------------------------------------------
try:
    _CACHED_VAD = silero.VAD.load(
        min_silence_duration=0.4,
        min_speech_duration=0.05,
        activation_threshold=0.5,
    )
except Exception as _vad_warmup_err:
    _CACHED_VAD = None  # Will be created per-call as fallback


# Register the entrypoint with the name configured in environment
agent_name = os.getenv("LIVEKIT_AGENT_NAME", "leadmate-agent")

@server.rtc_session(agent_name=agent_name)
async def uchchar_entrypoint(ctx: agents.JobContext):
    """
    Main entrypoint for each agent job.
    Each call is fully isolated — own manifest, own providers, own session.
    """
    session_start_time = time.monotonic()
    manifest = None
    reporter = None

    try:
        # Step 0: Connect immediately to establish the media path.
        # This sends initial RTP silence and prevents SIP timeouts.
        logger.info("connecting_to_room", room=ctx.room.name)
        t0 = time.monotonic()
        await ctx.connect()
        t_connect = time.monotonic()
        logger.info("room_connected", elapsed_ms=int((t_connect - t0) * 1000))

        # Step 1: Resolve manifest
        manifest = await _resolve_manifest(ctx)
        t_manifest = time.monotonic()
        logger.info("manifest_resolved", elapsed_ms=int((t_manifest - t_connect) * 1000))

        if manifest is None:
            await speak_rejection_and_disconnect(ctx)
            return

        logger.info(
            "manifest_loaded",
            session_id=manifest.session_id,
            tenant_id=manifest.tenant_id,
            llm=f"{manifest.llm.provider}/{manifest.llm.model}",
            tts=f"{manifest.tts.provider}/{manifest.tts.voice_id}",
            stt=f"{manifest.stt.provider}/{manifest.stt.model}",
            tools_enabled=manifest.tools_enabled,
            interruption_sensitivity=getattr(manifest, "interruption_sensitivity", "immediate"),
            silence_timeout_ms=getattr(manifest, "silence_timeout_ms", 10000),
            speech_speed=manifest.voice.speaking_rate,
        )

        # Step 2: Create provider plugins (these are constructors — fast)
        try:
            stt = create_stt(manifest.stt)
            llm = create_llm(manifest.llm)
            tts = create_tts(manifest.tts)
        except (UnsupportedProviderError, KeyError, Exception) as e:
            logger.error(
                "provider_init_failed",
                error=str(e),
                session_id=manifest.session_id,
                tenant_id=manifest.tenant_id,
            )
            await speak_rejection_and_disconnect(ctx)
            return

        t_providers = time.monotonic()
        logger.info("providers_created", elapsed_ms=int((t_providers - t_manifest) * 1000))

        log_provider_config(
            manifest.stt, manifest.llm, manifest.tts,
            manifest.tenant_id, manifest.session_id,
        )

        # Step 3: Create session reporter
        reporter = SessionReporter(manifest)

        # Step 4: Activate session on backend — FIRE AND FORGET.
        # This is a billing notification. It must NOT block the greeting.
        # If it fails, the finally block still reports session end.
        asyncio.create_task(_activate_session_safe(reporter, manifest.session_id))

        # Step 5: Resolve interruption behavior
        interruption_sensitivity = getattr(manifest, "interruption_sensitivity", "immediate")
        allow_interruptions = interruption_sensitivity != "none"

        # Step 6: Build agent session with pre-warmed VAD
        vad = _CACHED_VAD or silero.VAD.load(
            min_silence_duration=0.4,
            min_speech_duration=0.05,
            activation_threshold=0.5,
        )

        session = AgentSession(
            stt=stt,
            llm=llm,
            tts=tts,
            vad=vad,
            allow_interruptions=allow_interruptions,
        )

        t_session = time.monotonic()
        logger.info(
            "session_initialized",
            session_id=manifest.session_id,
            tenant_id=manifest.tenant_id,
            turn_detection="VAD (silero)",
            allow_interruptions=allow_interruptions,
            elapsed_ms=int((t_session - t_providers) * 1000),
            total_ms=int((t_session - session_start_time) * 1000),
        )

        # Step 7: Build dynamic assistant
        assistant = build_assistant(manifest, reporter)

        # Step 8: Start session (connects STT/TTS websockets)
        await session.start(
            room=ctx.room,
            agent=assistant,
        )

        t_started = time.monotonic()
        logger.info(
            "session_started",
            session_id=manifest.session_id,
            elapsed_ms=int((t_started - t_session) * 1000),
            total_ms=int((t_started - session_start_time) * 1000),
        )

        # Step 9: Greeting is now handled by Agent.on_enter() lifecycle hook
        # in definitions.py. This is the official LiveKit pattern — it fires
        # automatically when session.start() completes, and turn-taking works
        # correctly after the greeting (fixes widget silence issue).

        t_greeting = time.monotonic()
        logger.info(
            "session_ready",
            session_id=manifest.session_id,
            time_to_ready_ms=int((t_greeting - session_start_time) * 1000),
        )

        # Step 10: Wait for session to end
        try:
            while True:
                await asyncio.sleep(1)
        except asyncio.CancelledError:
            logger.info("session_completed", session_id=manifest.session_id)

    except Exception as e:
        import traceback
        with open("crash.log", "w") as f:
            f.write(traceback.format_exc())
        
        logger.error(
            "entrypoint_error",
            error=str(e),
            session_id=manifest.session_id if manifest else "unknown",
            tenant_id=manifest.tenant_id if manifest else "unknown",
        )

    finally:
        # Step 10: ALWAYS report session end — even on crash
        if manifest and reporter:
            duration = int(time.monotonic() - session_start_time)
            termination_reason = _determine_termination_reason(ctx)

            transcript = extract_transcript(session) if "session" in locals() else []

            await reporter.report_session_end(
                duration_seconds=duration,
                transcript=transcript,
                termination_reason=termination_reason,
            )

            logger.info(
                "session_ended",
                session_id=manifest.session_id,
                tenant_id=manifest.tenant_id,
                duration_seconds=duration,
                termination_reason=termination_reason,
            )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _activate_session_safe(reporter: SessionReporter, session_id: str):
    """Fire-and-forget session activation. Never blocks the greeting."""
    try:
        await reporter.activate_session()
    except Exception as e:
        logger.warning(
            "activate_session_background_failed",
            session_id=session_id,
            error=str(e),
        )

async def _resolve_manifest(
    ctx: agents.JobContext
) -> SessionManifest | None:
    """
    Resolve manifest from metadata.

    Two flows:
    1. OUTBOUND / Web Widget: full manifest already in room metadata → parse directly.
    2. INBOUND SIP: dispatch rule sends {tenant_id, source:'sip_inbound'} only.
       We must call the backend to create a session and get the full manifest.
    """
    raw_metadata = _get_raw_metadata(ctx)

    if not raw_metadata:
        logger.warning("no_metadata_received", room=ctx.room.name if ctx.room else "unknown")
        return None

    try:
        data = json.loads(raw_metadata)
    except Exception:
        logger.warning("metadata_not_json", raw=raw_metadata[:200])
        return None

    # Check if this is a full manifest (has session_id at root or under 'manifest' key)
    manifest_data = data.get("manifest", data)
    if "session_id" in manifest_data and "llm" in manifest_data:
        # Full manifest present — parse it directly (outbound / web widget flow)
        logger.info("manifest_source", source="metadata")
        return parse_manifest(raw_metadata, ctx)

    # INBOUND SIP: only tenant_id present — fetch manifest from backend
    tenant_id = data.get("tenant_id")
    if not tenant_id:
        logger.error("no_tenant_id_in_metadata", data=data)
        return None

    logger.info("inbound_sip_detected", tenant_id=tenant_id, source=data.get("source"))

    backend_url = os.getenv("BACKEND_API_URL", "http://localhost:3001")
    internal_api_key = os.getenv("BACKEND_INTERNAL_KEY", "")

    try:
        async with aiohttp.ClientSession() as http:
            resp = await http.post(
                f"{backend_url}/api/v1/internal/sip/inbound-session",
                json={"tenant_id": tenant_id, "room_name": ctx.room.name if ctx.room else ""},
                headers={"x-internal-key": internal_api_key},
                timeout=aiohttp.ClientTimeout(total=10),
            )
            if resp.status != 200:
                body = await resp.text()
                logger.error(
                    "inbound_session_api_failed",
                    status=resp.status,
                    body=body[:300],
                    tenant_id=tenant_id,
                )
                return None

            payload = await resp.json()
            manifest_json = payload.get("manifest")
            if not manifest_json:
                logger.error("no_manifest_in_inbound_response", payload=payload)
                return None

            return parse_manifest(json.dumps(manifest_json), ctx)

    except Exception as e:
        logger.error("inbound_session_fetch_failed", error=str(e), tenant_id=tenant_id)
        return None


def _get_raw_metadata(ctx: agents.JobContext) -> str | None:
    """
    Get raw manifest metadata from the best available source.

    Priority:
    1. Dispatch metadata (from RoomAgentDispatch in token — test route)
    2. Room metadata (set by backend when creating room — production)
    """
    if hasattr(ctx, "job") and ctx.job and hasattr(ctx.job, "metadata"):
        if ctx.job.metadata:
            logger.debug("metadata_source", source="dispatch")
            return ctx.job.metadata

    if ctx.room and ctx.room.metadata:
        logger.debug("metadata_source", source="room")
        return ctx.room.metadata

    return None


def _determine_termination_reason(ctx: agents.JobContext) -> str:
    """Determine why the session ended."""
    return "session_ended"


def extract_transcript(session: AgentSession) -> list[dict]:
    """Helper to pull clean transcript from LiveKit AgentSession history.

    Robust to SDK version differences:
    - livekit-agents <1.5: text_content() is a callable method
    - livekit-agents 1.5+: text_content is a string property
    Wrapped in try/except so a crash here never blocks session end reporting.
    """
    try:
        transcript = []
        history = getattr(session, "history", None)
        if not history:
            return transcript
        for msg in getattr(history, "items", []):
            role = getattr(msg, "role", None)
            if role not in ["user", "assistant"]:
                continue
            raw = getattr(msg, "text_content", None)
            if raw is None:
                continue
            # Handle both property (str) and method (callable) forms; cast to str
            text = str(raw() if callable(raw) else raw)
            if text.strip():
                if not text.startswith("[Knowledge Base Context"):
                    transcript.append({"role": role, "content": text.strip()})
        return transcript
    except Exception:
        return []  # Never let transcript extraction block billing


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    agents.cli.run_app(server)
