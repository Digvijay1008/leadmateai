"""
Provider factory for the production Leadmate stack.

Supported providers are intentionally locked to:
- STT: deepgram
- LLM: groq, openai
- TTS: deepgram, elevenlabs, sarvam
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

SUPPORTED_STT = ["deepgram"]
SUPPORTED_LLM = ["groq", "openai"]
SUPPORTED_TTS = ["deepgram", "elevenlabs", "sarvam"]


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


def create_stt(config: STTConfig):
    provider = config.provider

    if provider == "deepgram":
        return lk_deepgram.STT(
            model=config.model or "nova-3",
            language=config.language[:2] if config.language else "en",
            api_key=os.environ.get("DEEPGRAM_API_KEY"),
        )

    raise UnsupportedProviderError("stt", provider)


def create_llm(config: LLMConfig):
    provider = config.provider

    if provider == "groq":
        return lk_groq.LLM(
            model=config.model or "llama-3.3-70b-versatile",
            temperature=config.temperature,
            api_key=os.environ.get("GROQ_API_KEY"),
        )

    if provider == "openai":
        return lk_openai.LLM(
            model=config.model or "gpt-4o-mini",
            temperature=config.temperature,
            api_key=os.environ.get("OPENAI_API_KEY"),
        )

    raise UnsupportedProviderError("llm", provider)


def create_tts(config: TTSConfig):
    provider = config.provider

    if provider == "deepgram":
        # aura-2-thalia-en: lowest-latency Deepgram streaming model.
        # Streams audio chunks immediately — don't wait for full sentence.
        return lk_deepgram.TTS(
            model=config.model or "aura-2-thalia-en",
            api_key=os.environ.get("DEEPGRAM_API_KEY"),
        )

    if provider == "elevenlabs":
        # eleven_turbo_v2_5: same cost tier as v2, ~30% faster TTFA.
        return lk_elevenlabs.TTS(
            model=config.model or "eleven_turbo_v2_5",
            voice_id=config.voice_id,
            api_key=os.environ.get("ELEVENLABS_API_KEY"),
        )

    if provider == "sarvam":
        return lk_sarvam.TTS(
            target_language_code="en-IN",
            speaker=config.voice_id or "priya",
            model=config.model or "bulbul:v3",
            api_key=os.environ.get("SARVAM_API_KEY"),
        )

    raise UnsupportedProviderError("tts", provider)


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
