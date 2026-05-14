"""
Call Rejection Handler — Gracefully reject calls when config is invalid.

When manifest is missing, malformed, or provider config is invalid,
we speak a rejection message and disconnect. NEVER serve a call with
wrong tenant config. NEVER silently fall back to defaults.
"""

import json
from typing import Any

from livekit import agents
from livekit.agents import AgentSession, Agent

from src.core.session import (
    SessionManifest,
    STTConfig,
    LLMConfig,
    TTSConfig,
    VoiceConfig,
)
from src.core.utils import get_logger

logger = get_logger("rejection")


# ===========================================
# MANIFEST PARSING
# ===========================================

def parse_manifest(raw_metadata: str | None, ctx: agents.JobContext) -> SessionManifest | None:
    """
    Parse and validate manifest from room metadata.

    Returns SessionManifest on success, None on failure.
    On failure, calls reject_call_gracefully() — caller should return immediately.
    """
    if not raw_metadata:
        _reject_sync(ctx, "empty_metadata")
        return None

    try:
        data = json.loads(raw_metadata)
    except json.JSONDecodeError as e:
        _reject_sync(ctx, f"invalid_json: {e}")
        return None

    # Support manifest nested under "manifest" key or at top level
    manifest_data = data.get("manifest", data)

    return _validate_and_build(manifest_data, ctx)


def _validate_and_build(
    data: dict[str, Any], ctx: agents.JobContext
) -> SessionManifest | None:
    """Validate required fields and build SessionManifest."""
    required_top = [
        "session_id", "tenant_id", "stt", "llm", "tts",
        "greeting_message", "goodbye_message",
    ]
    for field in required_top:
        if field not in data:
            _reject_sync(ctx, f"missing_field:{field}")
            return None

    # Validate nested configs
    stt_data = data["stt"]
    if "provider" not in stt_data:
        _reject_sync(ctx, "missing_field:stt.provider")
        return None

    llm_data = data["llm"]
    if "provider" not in llm_data or "system_prompt" not in llm_data:
        _reject_sync(ctx, "missing_field:llm.provider_or_system_prompt")
        return None

    tts_data = data["tts"]
    if "provider" not in tts_data:
        _reject_sync(ctx, "missing_field:tts.provider")
        return None

    try:
        return SessionManifest.from_dict(data)
    except Exception as e:
        _reject_sync(ctx, f"manifest_build_error: {e}")
        return None


# ===========================================
# REJECTION
# ===========================================

REJECTION_MESSAGE = (
    "We're experiencing technical difficulties. "
    "Please try calling back in a few minutes."
)


def _reject_sync(ctx: agents.JobContext, reason: str):
    """Log rejection. Actual TTS rejection happens in the entrypoint."""
    logger.critical(
        "call_rejected",
        room=ctx.room.name if ctx.room else "unknown",
        reason=reason,
    )


async def speak_rejection_and_disconnect(ctx: agents.JobContext):
    """
    Speak rejection message using minimal Deepgram TTS, then disconnect.

    Uses a bare-minimum AgentSession with only TTS — no STT, no LLM.
    This is a last resort when manifest is invalid.
    """
    try:
        import os
        from livekit.plugins import deepgram

        rejection_tts = deepgram.TTS(
            model="aura-2-thalia-en",
            api_key=os.environ.get("DEEPGRAM_API_KEY"),
        )

        session = AgentSession(tts=rejection_tts)
        await session.start(
            room=ctx.room,
            agent=Agent(instructions=""),
        )
        await session.generate_reply(
            instructions=f"Say exactly: {REJECTION_MESSAGE}"
        )

        # Wait for TTS to finish playing
        import asyncio
        await asyncio.sleep(5)

    except Exception as e:
        logger.error("rejection_tts_failed", error=str(e))

    finally:
        # ALWAYS disconnect — don't leave zombie rooms
        try:
            if ctx.room:
                await ctx.room.disconnect()
        except Exception:
            pass
