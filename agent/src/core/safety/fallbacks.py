"""
Fallback and Error Handling

Resilience patterns for provider failures.
"""

import asyncio
from dataclasses import dataclass
from typing import Any, Callable, Awaitable, TypeVar

from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
)

from src.core.utils import get_logger


T = TypeVar("T")


@dataclass
class FallbackConfig:
    """Configuration for fallback behavior."""
    
    max_consecutive_errors: int = 5
    retry_count: int = 3
    retry_min_wait: float = 0.5
    retry_max_wait: float = 5.0
    
    # Fallback messages
    stt_error_message: str = "I'm sorry, I couldn't understand that. Could you please repeat?"
    llm_error_message: str = "I'm having trouble processing that. Could you try asking again?"
    tts_error_message: str = ""  # Silent fallback for TTS
    general_error_message: str = "I'm experiencing technical difficulties. Please hold on."


class ErrorTracker:
    """Tracks consecutive errors to detect failure spirals."""
    
    def __init__(self, max_errors: int = 5):
        self.max_errors = max_errors
        self.consecutive_errors = 0
        self.total_errors = 0
        self.logger = get_logger("error_tracker")
    
    def record_success(self) -> None:
        """Record a successful operation (resets consecutive counter)."""
        self.consecutive_errors = 0
    
    def record_error(self, error: str) -> bool:
        """
        Record an error.
        
        Returns:
            True if error limit exceeded (should terminate)
        """
        self.consecutive_errors += 1
        self.total_errors += 1
        
        self.logger.warning(
            "error_recorded",
            consecutive=self.consecutive_errors,
            total=self.total_errors,
            error=error[:200],
        )
        
        if self.consecutive_errors >= self.max_errors:
            self.logger.error(
                "error_limit_exceeded",
                consecutive=self.consecutive_errors,
                max=self.max_errors,
            )
            return True
        
        return False
    
    def should_terminate(self) -> bool:
        """Check if error limit has been exceeded."""
        return self.consecutive_errors >= self.max_errors


class FallbackHandler:
    """
    Handles fallback behavior for provider failures.
    
    Implements:
    - Retry with exponential backoff
    - Fallback responses on persistent failure
    - Error tracking and circuit breaking
    """
    
    def __init__(self, config: FallbackConfig | None = None):
        self.config = config or FallbackConfig()
        self.error_tracker = ErrorTracker(self.config.max_consecutive_errors)
        self.logger = get_logger("fallback")
    
    async def with_retry(
        self,
        operation: Callable[[], Awaitable[T]],
        operation_name: str,
        retryable_exceptions: tuple[type[Exception], ...] = (Exception,),
    ) -> T:
        """
        Execute an operation with retry.
        
        Args:
            operation: Async function to execute
            operation_name: Name for logging
            retryable_exceptions: Exceptions to retry on
            
        Returns:
            Result of the operation
            
        Raises:
            Exception if all retries fail
        """
        last_error: Exception | None = None
        
        for attempt in range(self.config.retry_count + 1):
            try:
                result = await operation()
                self.error_tracker.record_success()
                return result
                
            except retryable_exceptions as e:
                last_error = e
                
                if attempt < self.config.retry_count:
                    # Calculate wait time with exponential backoff
                    wait_time = min(
                        self.config.retry_min_wait * (2 ** attempt),
                        self.config.retry_max_wait,
                    )
                    
                    self.logger.warning(
                        "retry_attempt",
                        operation=operation_name,
                        attempt=attempt + 1,
                        max_attempts=self.config.retry_count + 1,
                        wait_seconds=round(wait_time, 2),
                        error=str(e)[:100],
                    )
                    
                    await asyncio.sleep(wait_time)
        
        # All retries exhausted
        self.error_tracker.record_error(str(last_error))
        raise last_error  # type: ignore
    
    async def with_fallback(
        self,
        operation: Callable[[], Awaitable[T]],
        fallback_value: T,
        operation_name: str,
    ) -> T:
        """
        Execute an operation with fallback on failure.
        
        Args:
            operation: Async function to execute
            fallback_value: Value to return on failure
            operation_name: Name for logging
            
        Returns:
            Result of operation or fallback value
        """
        try:
            result = await self.with_retry(operation, operation_name)
            return result
        except Exception as e:
            self.logger.error(
                "fallback_triggered",
                operation=operation_name,
                error=str(e)[:100],
            )
            return fallback_value
    
    def get_stt_fallback(self) -> str:
        """Get fallback message for STT failure."""
        return self.config.stt_error_message
    
    def get_llm_fallback(self) -> str:
        """Get fallback message for LLM failure."""
        return self.config.llm_error_message
    
    def get_tts_fallback(self) -> bytes:
        """Get fallback for TTS failure (empty audio)."""
        return b""
    
    def should_terminate(self) -> bool:
        """Check if session should terminate due to errors."""
        return self.error_tracker.should_terminate()


def create_fallback_handler(
    config: FallbackConfig | None = None,
) -> FallbackHandler:
    """Create a new fallback handler."""
    return FallbackHandler(config)
