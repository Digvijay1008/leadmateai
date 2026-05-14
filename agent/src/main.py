"""
Uchchar Voice Agent — Main Entry Point (LiveKit Agents 1.5+)

Multi-tenant, multi-provider voice AI agent. Each call is configured
entirely by its manifest — system prompt, STT, LLM, TTS, greeting.
Zero shared state between concurrent calls.

v1.5 changes:
  - Adaptive interruption handling (enabled by default)
  - EOUModel turn detection (transformer-based, not silence-based)
  - 51% fewer false barge-ins — critical for Indian accents
"""

import asyncio
import os
import time
import random

from dotenv import load_dotenv
from livekit import agents
from livekit.agents import AgentSession, Agent, AgentServer
from livekit.plugins import silero
from livekit.plugins.turn_detector.multilingual import MultilingualModel

from src.core import parse_manifest, speak_rejection_and_disconnect
from src.providers import (
    create_stt,
    create_llm,
    create_tts,
    log_provider_config,
    UnsupportedProviderError,
)
from src.domain.realestate import SessionReporter
from src.core.utils import configure_logging, get_logger

# Load environment variables
load_dotenv()

# Configure logging early
configure_logging()

logger = get_logger("main")


from src.tools.definitions import UchcharAssistant


# ---------------------------------------------------------------------------
# Server Setup
# ---------------------------------------------------------------------------

server = AgentServer()


@server.rtc_session(agent_name="uchchar-agent")
async def uchchar_entrypoint(ctx: agents.JobContext):
    """
    Main entrypoint for each agent job.
    Each call is fully isolated — own manifest, own providers, own session.
    """
    session_start_time = time.monotonic()
    manifest = None
    reporter = None

    try:
        # Step 1: Parse manifest — try dispatch metadata first, then room metadata
        raw_metadata = _get_raw_metadata(ctx)
        manifest = parse_manifest(raw_metadata, ctx)

        if manifest is None:
            await speak_rejection_and_disconnect(ctx)
            return

        logger.info(
            "manifest_loaded",
            session_id=manifest.session_id,
            tenant_id=manifest.tenant_id,
        )

        # Step 2: Create provider plugins via factory
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

        log_provider_config(
            manifest.stt, manifest.llm, manifest.tts,
            manifest.tenant_id, manifest.session_id,
        )

        # Step 3: Create session reporter for backend communication
        reporter = SessionReporter(manifest)

        # Step 4: Activate session on backend (billing clock starts)
        await reporter.activate_session()

        # Step 5: Build and start agent session
        # v1.5: EOUModel replaces silence-based VAD for turn detection
        # Uses transformer model — much better for Indian accents + background noise
        #
        # LATENCY OPT: min_silence_duration_ms=400 (down from ~800ms default)
        # This shaves ~400ms off every turn. The MultilingualModel still prevents
        # premature interruptions on Indian accents — the two work together.
        vad = silero.VAD.load(
            min_silence_duration_ms=400,  # Was ~800ms default → saves ~400ms/turn
            min_speech_duration_ms=50,    # Detect speech onset faster
            activation_threshold=0.5,     # Standard sensitivity
        )

        session = AgentSession(
            stt=stt,
            llm=llm,
            tts=tts,
            vad=vad,
            turn_detection=MultilingualModel(),
            allow_interruptions=True,     # Users can barge-in naturally
        )

        logger.info(
            "session_initialized",
            session_id=manifest.session_id,
            tenant_id=manifest.tenant_id,
            turn_detection="MultilingualModel",
            vad_silence_ms=400,
            allow_interruptions=True,
            startup_latency_ms=int((time.monotonic() - session_start_time) * 1000),
        )

        await session.start(
            room=ctx.room,
            agent=UchcharAssistant(
                instructions=manifest.llm.system_prompt,
                manifest=manifest,
                backend_client=reporter
            ),
        )

        logger.info(
            "session_started",
            session_id=manifest.session_id,
            tenant_id=manifest.tenant_id,
        )

        # Step 6: Speak tenant greeting
        # Log time-to-first-audio — this is what the caller hears at pickup.
        t_greeting = time.monotonic()
        await session.generate_reply(
            instructions=(
                f"Greet the caller with exactly this message: "
                f"{manifest.greeting_message}"
            )
        )
        logger.info(
            "greeting_dispatched",
            session_id=manifest.session_id,
            time_to_greeting_ms=int((time.monotonic() - t_greeting) * 1000),
        )

        # Step 7: Wait for session to end (user hangs up, timeout, etc.)
        # The session runs autonomously from here
        # LiveKit will call us back when the room closes

    except Exception as e:
        logger.error(
            "entrypoint_error",
            error=str(e),
            session_id=manifest.session_id if manifest else "unknown",
            tenant_id=manifest.tenant_id if manifest else "unknown",
        )

    finally:
        # Step 8: ALWAYS report session end — even on crash
        if manifest and reporter:
            duration = int(time.monotonic() - session_start_time)
            termination_reason = _determine_termination_reason(ctx)

            # Extract the actual conversation transcript
            transcript = extract_transcript(session) if 'session' in locals() else []

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

def _get_raw_metadata(ctx: agents.JobContext) -> str | None:
    """
    Get raw manifest metadata from the best available source.

    Priority:
    1. Dispatch metadata (from RoomAgentDispatch in token — test route)
    2. Room metadata (set by backend when creating room — production)
    """
    # Try dispatch/job metadata first (set via RoomAgentDispatch)
    if hasattr(ctx, 'job') and ctx.job and hasattr(ctx.job, 'metadata'):
        if ctx.job.metadata:
            logger.debug("metadata_source", source="dispatch")
            return ctx.job.metadata

    # Fall back to room metadata
    if ctx.room and ctx.room.metadata:
        logger.debug("metadata_source", source="room")
        return ctx.room.metadata

    return None


def _determine_termination_reason(ctx: agents.JobContext) -> str:
    """Determine why the session ended."""
    # In future: check ctx signals for specific reasons
    # For now, if we're in the finally block, it's one of these:
    return "session_ended"


def extract_transcript(session: AgentSession) -> list[dict]:
    """Helper to pull clean transcript from LiveKit AgentSession history."""
    transcript = []
    # session.history contains the list of messages in this conversation
    for msg in session.history.items:
        if hasattr(msg, 'role') and hasattr(msg, 'text_content'):
            text = msg.text_content()
            if text and len(text.strip()) > 0:
                # We only want user and assistant messages for the transcript
                if msg.role in ['user', 'assistant']:
                    # Filter out internal context injections
                    if not text.startswith('[Knowledge Base Context'):
                        transcript.append({
                            'role': msg.role,
                            'content': text.strip()
                        })
    return transcript


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    agents.cli.run_app(server)
