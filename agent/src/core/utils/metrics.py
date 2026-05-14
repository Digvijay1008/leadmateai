"""
Session Metrics Collection

Tracks metrics during session for end reporting.
"""

import time
from dataclasses import dataclass, field
from typing import Any


@dataclass
class SessionMetrics:
    """Metrics collected during a voice session."""
    
    session_id: str
    tenant_id: str
    
    # Timing
    start_time: float = field(default_factory=time.time)
    end_time: float | None = None
    first_speech_at: float | None = None
    last_speech_at: float | None = None
    
    # Conversation
    user_turns: int = 0
    agent_turns: int = 0
    tool_calls: int = 0
    rag_queries: int = 0
    
    # Audio
    total_user_audio_seconds: float = 0.0
    total_agent_audio_seconds: float = 0.0
    
    # Errors
    error_count: int = 0
    last_error: str | None = None
    
    # End reason
    end_reason: str = "unknown"
    
    @property
    def duration_seconds(self) -> float:
        """Get session duration in seconds."""
        end = self.end_time or time.time()
        return end - self.start_time
    
    @property
    def duration_seconds_int(self) -> int:
        """Get session duration as integer seconds (for billing)."""
        return int(self.duration_seconds)
    
    def record_user_turn(self, audio_duration_seconds: float = 0.0) -> None:
        """Record a user turn."""
        self.user_turns += 1
        self.total_user_audio_seconds += audio_duration_seconds
        
        now = time.time()
        if self.first_speech_at is None:
            self.first_speech_at = now
        self.last_speech_at = now
    
    def record_agent_turn(self, audio_duration_seconds: float = 0.0) -> None:
        """Record an agent turn."""
        self.agent_turns += 1
        self.total_agent_audio_seconds += audio_duration_seconds
    
    def record_tool_call(self) -> None:
        """Record a tool call."""
        self.tool_calls += 1
    
    def record_rag_query(self) -> None:
        """Record a RAG query."""
        self.rag_queries += 1
    
    def record_error(self, error: str) -> None:
        """Record an error."""
        self.error_count += 1
        self.last_error = error
    
    def finalize(self, end_reason: str) -> None:
        """Finalize metrics at session end."""
        self.end_time = time.time()
        self.end_reason = end_reason
    
    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for reporting."""
        return {
            "session_id": self.session_id,
            "tenant_id": self.tenant_id,
            "duration_seconds": self.duration_seconds_int,
            "user_turns": self.user_turns,
            "agent_turns": self.agent_turns,
            "tool_calls": self.tool_calls,
            "rag_queries": self.rag_queries,
            "error_count": self.error_count,
            "end_reason": self.end_reason,
        }


def create_metrics(session_id: str, tenant_id: str) -> SessionMetrics:
    """Create a new metrics instance for a session."""
    return SessionMetrics(session_id=session_id, tenant_id=tenant_id)
