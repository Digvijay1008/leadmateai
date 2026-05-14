"""
Session Manifest - Configuration received from Backend

The manifest contains all configuration needed for the agent
to run a session. It is immutable for the session duration.
"""

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class VoiceConfig:
    """Voice/TTS configuration from manifest."""
    
    persona_id: str
    provider: str
    voice_id: str
    speaking_rate: float = 1.0


@dataclass(frozen=True)
class STTConfig:
    """Speech-to-text configuration from manifest."""
    
    provider: str  # deepgram
    model: str
    language: str = "en-US"


@dataclass(frozen=True)
class LLMConfig:
    """Language model configuration from manifest."""
    
    provider: str  # groq, openai
    model: str
    system_prompt: str
    temperature: float = 0.7


@dataclass(frozen=True)
class TTSConfig:
    """Text-to-speech configuration from manifest."""
    
    provider: str  # deepgram, elevenlabs, sarvam
    model: str
    voice_id: str


@dataclass(frozen=True)
class SessionManifest:
    """
    Session manifest received from backend.
    
    This is the complete configuration for running a session.
    The agent ONLY uses this configuration - no database lookups.
    """
    
    # Identifiers
    session_id: str
    tenant_id: str
    
    # Timing constraints (from backend, enforced by agent)
    max_duration_seconds: int
    inactivity_timeout_seconds: int
    
    # Provider configurations
    voice: VoiceConfig
    stt: STTConfig
    llm: LLMConfig
    tts: TTSConfig
    
    # Conversation
    greeting_message: str
    goodbye_message: str
    tools_enabled: list[str]
    
    # Backend communication
    backend_api_url: str
    backend_auth_token: str
    
    # RAG configuration
    knowledge_base_id: str | None = None
    
    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "SessionManifest":
        """Create manifest from dictionary (e.g., from API response)."""
        return cls(
            session_id=data["session_id"],
            tenant_id=data["tenant_id"],
            max_duration_seconds=data["max_duration_seconds"],
            inactivity_timeout_seconds=data["inactivity_timeout_seconds"],
            voice=VoiceConfig(
                persona_id=data["voice"]["persona_id"],
                provider=data["voice"]["provider"],
                voice_id=data["voice"]["voice_id"],
                speaking_rate=data["voice"].get("speaking_rate", 1.0),
            ),
            stt=STTConfig(
                provider=data["stt"]["provider"],
                model=data["stt"]["model"],
                language=data["stt"].get("language", "en-US"),
            ),
            llm=LLMConfig(
                provider=data["llm"]["provider"],
                model=data["llm"]["model"],
                system_prompt=data["llm"]["system_prompt"],
                temperature=data["llm"].get("temperature", 0.7),
            ),
            tts=TTSConfig(
                provider=data["tts"]["provider"],
                model=data["tts"]["model"],
                voice_id=data["tts"]["voice_id"],
            ),
            greeting_message=data["greeting_message"],
            goodbye_message=data["goodbye_message"],
            tools_enabled=data.get("tools_enabled", []),
            backend_api_url=data["backend_api_url"],
            backend_auth_token=data["backend_auth_token"],
            knowledge_base_id=data.get("knowledge_base_id"),
        )
    
    def to_dict(self) -> dict[str, Any]:
        """Convert manifest to dictionary."""
        return {
            "session_id": self.session_id,
            "tenant_id": self.tenant_id,
            "max_duration_seconds": self.max_duration_seconds,
            "inactivity_timeout_seconds": self.inactivity_timeout_seconds,
            "voice": {
                "persona_id": self.voice.persona_id,
                "provider": self.voice.provider,
                "voice_id": self.voice.voice_id,
                "speaking_rate": self.voice.speaking_rate,
            },
            "stt": {
                "provider": self.stt.provider,
                "model": self.stt.model,
                "language": self.stt.language,
            },
            "llm": {
                "provider": self.llm.provider,
                "model": self.llm.model,
                "system_prompt": self.llm.system_prompt,
                "temperature": self.llm.temperature,
            },
            "tts": {
                "provider": self.tts.provider,
                "model": self.tts.model,
                "voice_id": self.tts.voice_id,
            },
            "greeting_message": self.greeting_message,
            "goodbye_message": self.goodbye_message,
            "tools_enabled": self.tools_enabled,
            "knowledge_base_id": self.knowledge_base_id,
        }


@dataclass
class ConversationTurn:
    """A single turn in the conversation."""
    
    speaker: str  # "user" or "agent"
    content: str
    timestamp_ms: int
    audio_duration_seconds: float = 0.0
    confidence: float | None = None  # STT confidence for user turns


@dataclass
class ConversationState:
    """Current state of the conversation."""
    
    turns: list[ConversationTurn]
    current_context: str = ""  # RAG context if any
    pending_tool_result: dict[str, Any] | None = None
    
    def add_turn(self, turn: ConversationTurn) -> None:
        """Add a turn to the conversation."""
        self.turns.append(turn)
    
    def get_history_for_llm(self, max_turns: int = 20) -> list[dict[str, str]]:
        """Get conversation history formatted for LLM."""
        recent_turns = self.turns[-max_turns:] if len(self.turns) > max_turns else self.turns
        
        return [
            {
                "role": "user" if turn.speaker == "user" else "assistant",
                "content": turn.content,
            }
            for turn in recent_turns
        ]
    
    def clear(self) -> None:
        """Clear conversation state."""
        self.turns.clear()
        self.current_context = ""
        self.pending_tool_result = None
