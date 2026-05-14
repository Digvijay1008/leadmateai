"""
Leadmate Agent Configuration

Environment-based configuration using Pydantic Settings.
All secrets are loaded from environment variables.
"""

from functools import lru_cache
from typing import Literal

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class LiveKitSettings(BaseSettings):
    """LiveKit connection settings."""
    
    model_config = SettingsConfigDict(env_prefix="LIVEKIT_")
    
    url: str = Field(description="LiveKit server URL")
    api_key: SecretStr = Field(description="LiveKit API key")
    api_secret: SecretStr = Field(description="LiveKit API secret")


class BackendSettings(BaseSettings):
    """Backend API settings."""
    
    model_config = SettingsConfigDict(env_prefix="BACKEND_")
    
    api_url: str = Field(default="http://localhost:3001", description="Backend API URL")
    timeout_seconds: int = Field(default=30, description="HTTP request timeout")
    max_retries: int = Field(default=3, description="Max retries for failed requests")


class ProviderSettings(BaseSettings):
    """AI provider API keys."""
    
    # STT
    deepgram_api_key: SecretStr | None = Field(default=None, alias="DEEPGRAM_API_KEY")
    groq_api_key: SecretStr | None = Field(default=None, alias="GROQ_API_KEY")
    sarvam_api_key: SecretStr | None = Field(default=None, alias="SARVAM_API_KEY")
    
    # LLM
    openai_api_key: SecretStr | None = Field(default=None, alias="OPENAI_API_KEY")
    
    # TTS
    elevenlabs_api_key: SecretStr | None = Field(default=None, alias="ELEVENLABS_API_KEY")
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


class AgentSettings(BaseSettings):
    """Agent runtime settings."""
    
    model_config = SettingsConfigDict(env_prefix="AGENT_")
    
    # Logging
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = Field(default="INFO")
    log_format: Literal["json", "console"] = Field(default="console")
    
    # Timeouts (fallback values - manifest takes precedence)
    default_max_duration_seconds: int = Field(default=900)  # 15 minutes
    default_inactivity_timeout_seconds: int = Field(default=120)  # 2 minutes
    
    # VAD settings
    vad_threshold: float = Field(default=0.5, ge=0.0, le=1.0)
    vad_min_speech_duration_ms: int = Field(default=250)
    vad_min_silence_duration_ms: int = Field(default=500)
    
    # Audio settings
    sample_rate: int = Field(default=16000)
    channels: int = Field(default=1)
    
    # Safety
    max_consecutive_errors: int = Field(default=5)
    provider_timeout_seconds: int = Field(default=30)


class Settings(BaseSettings):
    """Root settings container."""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )
    
    livekit: LiveKitSettings = Field(default_factory=LiveKitSettings)
    backend: BackendSettings = Field(default_factory=BackendSettings)
    providers: ProviderSettings = Field(default_factory=ProviderSettings)
    agent: AgentSettings = Field(default_factory=AgentSettings)
    
    # Environment
    environment: Literal["development", "production", "test"] = Field(
        default="development",
        alias="ENVIRONMENT"
    )
    
    @property
    def is_production(self) -> bool:
        return self.environment == "production"
    
    @property
    def is_development(self) -> bool:
        return self.environment == "development"


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
