"""
Structured Logging for Leadmate Agent

Uses structlog for structured, contextual logging.
All logs include session_id for correlation.
"""

import logging
import sys
from typing import Any

import structlog
from structlog.types import Processor

from config.settings import get_settings


def configure_logging() -> None:
    """Configure structured logging based on settings."""
    settings = get_settings()
    
    # Determine log level
    log_level = getattr(logging, settings.agent.log_level)
    
    # Shared processors
    shared_processors: list[Processor] = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.UnicodeDecoder(),
    ]
    
    if settings.agent.log_format == "json":
        # JSON format for production
        processors = shared_processors + [
            structlog.processors.format_exc_info,
            structlog.processors.JSONRenderer(),
        ]
    else:
        # Console format for development
        processors = shared_processors + [
            structlog.dev.ConsoleRenderer(
                colors=True,
                exception_formatter=structlog.dev.plain_traceback,
            ),
        ]
    
    structlog.configure(
        processors=processors,
        wrapper_class=structlog.make_filtering_bound_logger(log_level),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )
    
    # Configure standard library logging to use structlog
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=log_level,
    )


def get_logger(name: str = "agent") -> structlog.stdlib.BoundLogger:
    """Get a logger instance."""
    return structlog.get_logger(name)


def bind_session_context(
    session_id: str,
    tenant_id: str,
    room_name: str | None = None,
) -> None:
    """Bind session context to current execution context."""
    structlog.contextvars.bind_contextvars(
        session_id=session_id,
        tenant_id=tenant_id,
        room_name=room_name,
    )


def clear_session_context() -> None:
    """Clear session context from current execution context."""
    structlog.contextvars.clear_contextvars()


def log_event(
    event: str,
    level: str = "info",
    **kwargs: Any,
) -> None:
    """Log an event with the current context."""
    logger = get_logger()
    log_method = getattr(logger, level.lower(), logger.info)
    log_method(event, **kwargs)
