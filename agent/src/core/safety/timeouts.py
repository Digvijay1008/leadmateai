"""
Timeout and Duration Enforcement

Handles max duration and inactivity timeouts.
"""

import asyncio
import time
from dataclasses import dataclass
from typing import Callable, Awaitable

from src.core.utils import get_logger


@dataclass
class TimeoutState:
    """Current timeout state."""
    
    max_duration_seconds: int
    inactivity_timeout_seconds: int
    
    start_time: float = 0.0
    last_activity_time: float = 0.0
    
    is_started: bool = False
    is_expired: bool = False
    expiry_reason: str | None = None
    
    def start(self) -> None:
        """Start the timeout tracking."""
        now = time.time()
        self.start_time = now
        self.last_activity_time = now
        self.is_started = True
    
    def record_activity(self) -> None:
        """Record activity to reset inactivity timer."""
        self.last_activity_time = time.time()
    
    @property
    def elapsed_seconds(self) -> float:
        """Get elapsed time since start."""
        if not self.is_started:
            return 0.0
        return time.time() - self.start_time
    
    @property
    def remaining_seconds(self) -> float:
        """Get remaining time before max duration."""
        remaining = self.max_duration_seconds - self.elapsed_seconds
        return max(0.0, remaining)
    
    @property
    def inactivity_seconds(self) -> float:
        """Get time since last activity."""
        if not self.is_started:
            return 0.0
        return time.time() - self.last_activity_time
    
    def check_expired(self) -> bool:
        """Check if any timeout has expired."""
        if self.is_expired:
            return True
        
        if not self.is_started:
            return False
        
        # Check max duration
        if self.elapsed_seconds >= self.max_duration_seconds:
            self.is_expired = True
            self.expiry_reason = "max_duration"
            return True
        
        # Check inactivity
        if self.inactivity_seconds >= self.inactivity_timeout_seconds:
            self.is_expired = True
            self.expiry_reason = "timeout"
            return True
        
        return False


class TimeoutManager:
    """
    Manages session timeouts.
    
    Monitors max duration and inactivity timeouts,
    calling the provided callback when expired.
    """
    
    def __init__(
        self,
        max_duration_seconds: int,
        inactivity_timeout_seconds: int,
        on_timeout: Callable[[str], Awaitable[None]],
    ):
        self.state = TimeoutState(
            max_duration_seconds=max_duration_seconds,
            inactivity_timeout_seconds=inactivity_timeout_seconds,
        )
        self.on_timeout = on_timeout
        self.logger = get_logger("timeout")
        
        self._monitor_task: asyncio.Task | None = None
        self._check_interval = 1.0  # Check every second
    
    async def start(self) -> None:
        """Start timeout monitoring."""
        self.state.start()
        self._monitor_task = asyncio.create_task(self._monitor_loop())
        
        self.logger.info(
            "timeout_started",
            max_duration=self.state.max_duration_seconds,
            inactivity_timeout=self.state.inactivity_timeout_seconds,
        )
    
    async def stop(self) -> None:
        """Stop timeout monitoring."""
        if self._monitor_task:
            self._monitor_task.cancel()
            try:
                await self._monitor_task
            except asyncio.CancelledError:
                pass
            self._monitor_task = None
        
        self.logger.debug("timeout_stopped")
    
    def record_activity(self) -> None:
        """Record user activity (speech detected)."""
        self.state.record_activity()
    
    def get_remaining_seconds(self) -> float:
        """Get remaining time before max duration expires."""
        return self.state.remaining_seconds
    
    async def _monitor_loop(self) -> None:
        """Background loop to check timeouts."""
        try:
            while not self.state.is_expired:
                await asyncio.sleep(self._check_interval)
                
                if self.state.check_expired():
                    reason = self.state.expiry_reason or "unknown"
                    
                    self.logger.warning(
                        "timeout_expired",
                        reason=reason,
                        elapsed_seconds=int(self.state.elapsed_seconds),
                        inactivity_seconds=int(self.state.inactivity_seconds),
                    )
                    
                    # Call the callback
                    await self.on_timeout(reason)
                    break
                
                # Log remaining time periodically (every 30 seconds)
                elapsed = int(self.state.elapsed_seconds)
                if elapsed > 0 and elapsed % 30 == 0:
                    self.logger.debug(
                        "time_remaining",
                        remaining_seconds=int(self.state.remaining_seconds),
                    )
                    
        except asyncio.CancelledError:
            pass


def create_timeout_manager(
    max_duration_seconds: int,
    inactivity_timeout_seconds: int,
    on_timeout: Callable[[str], Awaitable[None]],
) -> TimeoutManager:
    """Create a new timeout manager."""
    return TimeoutManager(
        max_duration_seconds=max_duration_seconds,
        inactivity_timeout_seconds=inactivity_timeout_seconds,
        on_timeout=on_timeout,
    )
