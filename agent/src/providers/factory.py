"""
Provider factory for the production Leadmate stack.

Supported providers:
- STT: deepgram, openai, sarvam
- LLM: openai, anthropic, google, groq
- TTS: deepgram, elevenlabs, sarvam, openai, cartesia
"""

import os

from livekit.plugins import deepgram as lk_deepgram
from livekit.plugins import elevenlabs as lk_elevenlabs
from livekit.plugins import groq as lk_groq
from livekit.plugins import openai as lk_openai
from livekit.plugins import sarvam as lk_sarvam

from src.core.session import LLMConfig, STTConfig, TTSConfig
from src.core.utils import get_logger

logger = get_logger("provider_factory")

SUPPORTED_STT = ["deepgram", "openai", "sarvam"]
SUPPORTED_LLM = ["openai", "anthropic", "google", "groq"]
SUPPORTED_TTS = ["deepgram", "elevenlabs", "sarvam", "openai", "cartesia"]


class UnsupportedProviderError(ValueError):
    """Raised when a manifest specifies an unknown provider."""

    def __init__(self, provider_type: str, provider_name: str):
        supported = {
            "stt": SUPPORTED_STT,
            "llm": SUPPORTED_LLM,
            "tts": SUPPORTED_TTS,
        }.get(provider_type, [])
        super().__init__(
            f"Unknown {provider_type} provider: '{provider_name}'. Supported: {supported}"
        )


# ---------------------------------------------------------------------------
# STT
# ---------------------------------------------------------------------------

def create_stt(config: STTConfig):
    provider = config.provider.lower()
    language = config.language or "en-US"
    # Deepgram uses 2-letter language code
    lang_short = language[:2] if provider == "deepgram" else language

    logger.info(
        "stt_init",
        provider=provider,
        model=config.model,
        language=language,
    )

    if provider == "deepgram":
        return lk_deepgram.STT(
            model=config.model or "nova-2",
            language=lang_short,
            api_key=os.environ.get("DEEPGRAM_API_KEY") or "",
        )

    if provider == "openai":
        return lk_openai.STT(
            model=config.model or "whisper-1",
            api_key=os.environ.get("OPENAI_API_KEY") or "",
        )

    if provider == "sarvam":
        return lk_sarvam.STT(
            api_key=os.environ.get("SARVAM_API_KEY") or "",
        )

    raise UnsupportedProviderError("stt", provider)


# ---------------------------------------------------------------------------
# LLM
# ---------------------------------------------------------------------------

def create_llm(config: LLMConfig):
    provider = config.provider.lower()

    logger.info(
        "llm_init",
        provider=provider,
        model=config.model,
        temperature=config.temperature,
    )

    if provider == "openai":
        return lk_openai.LLM(
            model=config.model or "gpt-4o-mini",
            temperature=float(config.temperature or 0.7),
            api_key=os.environ.get("OPENAI_API_KEY") or "",
        )

    if provider == "groq":
        return lk_groq.LLM(
            model=config.model or "llama-3.3-70b-versatile",
            temperature=float(config.temperature or 0.7),
            api_key=os.environ.get("GROQ_API_KEY") or "",
        )

    if provider == "anthropic":
        try:
            from livekit.plugins import anthropic as lk_anthropic
            return lk_anthropic.LLM(
                model=config.model or "claude-3-5-sonnet-20241022",
                api_key=os.environ.get("ANTHROPIC_API_KEY") or "",
            )
        except ImportError:
            logger.warning(
                "anthropic_plugin_missing",
                fallback="openai/gpt-4o-mini",
                hint="Install livekit-plugins-anthropic to use Anthropic models",
            )
            return lk_openai.LLM(
                model="gpt-4o-mini",
                temperature=float(config.temperature or 0.7),
                api_key=os.environ.get("OPENAI_API_KEY") or "",
            )

    if provider == "google":
        try:
            from livekit.plugins import google as lk_google
            return lk_google.LLM(
                model=config.model or "gemini-1.5-flash",
                api_key=os.environ.get("GOOGLE_API_KEY") or "",
            )
        except ImportError:
            logger.warning(
                "google_plugin_missing",
                fallback="openai/gpt-4o-mini",
                hint="Install livekit-plugins-google to use Google models",
            )
            return lk_openai.LLM(
                model="gpt-4o-mini",
                temperature=float(config.temperature or 0.7),
                api_key=os.environ.get("OPENAI_API_KEY") or "",
            )

    raise UnsupportedProviderError("llm", provider)


# ---------------------------------------------------------------------------
# TTS
# ---------------------------------------------------------------------------

def create_tts(config: TTSConfig):
    provider = config.provider.lower()

    # speaking_rate is attached to config if present (new manifest field)
    speaking_rate = getattr(config, "speaking_rate", 1.0) or 1.0

    logger.info(
        "tts_init",
        provider=provider,
        model=config.model,
        voice_id=config.voice_id,
        speaking_rate=speaking_rate,
    )

    if provider == "deepgram":
        # Deepgram Aura-2: voice_id IS the model name
        model = config.voice_id or config.model or "aura-2-thalia-en"
        return lk_deepgram.TTS(
            model=model,
            api_key=os.environ.get("DEEPGRAM_API_KEY"),
        )

    if provider == "elevenlabs":
        return lk_elevenlabs.TTS(
            model=config.model or "eleven_turbo_v2_5",
            voice_id=config.voice_id,
            api_key=os.environ.get("ELEVENLABS_API_KEY") or "",
        )

    if provider == "sarvam":
        return lk_sarvam.TTS(
            target_language_code="en-IN",
            speaker=config.voice_id or "priya",
            model=config.model or "bulbul:v3",
            api_key=os.environ.get("SARVAM_API_KEY") or "",
        )

    if provider == "openai":
        return lk_openai.TTS(
            model=config.model or "tts-1",
            voice=config.voice_id or "nova",
            api_key=os.environ.get("OPENAI_API_KEY") or "",
            speed=speaking_rate,
        )

    if provider == "cartesia":
        try:
            from livekit.plugins import cartesia as lk_cartesia
            return lk_cartesia.TTS(
                model=config.model or "sonic-english",
                voice=config.voice_id,
                api_key=os.environ.get("CARTESIA_API_KEY") or "",
                speed=speaking_rate,
            )
        except ImportError:
            logger.warning(
                "cartesia_plugin_missing",
                fallback="deepgram/aura-2-thalia-en",
                hint="Install livekit-plugins-cartesia to use Cartesia voices",
            )
            return lk_deepgram.TTS(
                model="aura-2-thalia-en",
                api_key=os.environ.get("DEEPGRAM_API_KEY") or "",
            )

    raise UnsupportedProviderError("tts", provider)


# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

def log_provider_config(
    stt_config: STTConfig,
    llm_config: LLMConfig,
    tts_config: TTSConfig,
    tenant_id: str,
    session_id: str,
):
    logger.info(
        "providers_initialized",
        stt=f"{stt_config.provider}/{stt_config.model}",
        llm=f"{llm_config.provider}/{llm_config.model}",
        tts=f"{tts_config.provider}/{tts_config.model}:{tts_config.voice_id}",
        tenant_id=tenant_id,
        session_id=session_id,
    )
