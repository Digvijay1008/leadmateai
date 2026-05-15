"""
Backend HTTP Client — Agent → Backend communication.

Handles session activation, session end reporting, and all backend API calls.
All requests are authenticated. Retry logic with exponential backoff.
"""

import asyncio
from datetime import datetime, timezone
from typing import Any

import httpx

from src.core.session import SessionManifest
from src.core.utils import get_logger

logger = get_logger("backend_client")


# ===========================================
# EXCEPTIONS
# ===========================================

class BackendClientError(Exception):
    """Base exception for backend client errors."""
    pass


class BackendTimeoutError(BackendClientError):
    """Backend request timed out."""
    pass


class BackendServerError(BackendClientError):
    """Backend returned server error."""
    pass


class BackendUnauthorizedError(BackendClientError):
    """Backend authentication/authorization failure."""
    pass


# ===========================================
# SESSION REPORTING CLIENT
# ===========================================

class SessionReporter:
    """
    Reports session lifecycle events to the backend.

    Created per-session from manifest. Uses the manifest's backend URL
    and auth token — each tenant's calls talk to the right backend.
    """

    def __init__(self, manifest: SessionManifest):
        self.manifest = manifest
        self.session_id = manifest.session_id
        self.tenant_id = manifest.tenant_id
        self.base_url = manifest.backend_api_url.rstrip("/")
        self.auth_token = manifest.backend_auth_token

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.auth_token}",
            "Content-Type": "application/json",
            "X-Session-Id": self.session_id,
            "X-Tenant-Id": self.tenant_id,
        }

    async def activate_session(self) -> None:
        """
        Tell backend agent is live. Billing clock starts.

        Retry 3x. If fails, log error but DO NOT reject call.
        The call continues even if activation reporting fails.
        """
        url = f"{self.base_url}/api/v1/voice/sessions/{self.session_id}/activate"
        success = await self._post_with_retry(url, {})

        if not success:
            logger.error(
                "activate_session_failed",
                session_id=self.session_id,
                tenant_id=self.tenant_id,
            )

    async def report_session_end(
        self,
        duration_seconds: int,
        transcript: list[dict[str, Any]],
        termination_reason: str,
    ) -> None:
        """
        Report call end to backend. Triggers billing settlement.

        Retry 3x. If all fail, log CRITICAL for manual reconciliation.
        This is called in a finally block — fires even if agent crashes.
        """
        url = f"{self.base_url}/api/v1/voice/sessions/{self.session_id}/end"
        end_reason = _map_termination_reason_to_end_reason(termination_reason)
        
        # Use strictly UTC 'Z' format for Zod .datetime() compatibility
        reported_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        
        body = {
            "session_id": self.session_id,
            "duration_seconds": max(0, int(duration_seconds)),
            "transcript": transcript,
            "end_reason": end_reason,
            "termination_reason": termination_reason,
            "agent_reported_at": reported_at,
        }

        success = await self._post_with_retry(url, body)

        if not success:
            logger.critical(
                "SESSION_END_REPORT_FAILED",
                session_id=self.session_id,
                tenant_id=self.tenant_id,
                duration_seconds=duration_seconds,
                termination_reason=termination_reason,
                end_reason=end_reason,
                action_required="MANUAL_BILLING_RECONCILIATION_NEEDED",
            )

    async def _post_with_retry(
        self,
        url: str,
        body: dict[str, Any],
        max_retries: int = 3,
    ) -> bool:
        """POST with exponential backoff. Returns True if succeeded."""
        for attempt in range(max_retries):
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.post(
                        url, json=body, headers=self._headers()
                    )
                    if response.status_code >= 400:
                        logger.warning(
                            "backend_call_failed",
                            status=response.status_code,
                            body=response.text[:500],
                            url=url,
                            session_id=self.session_id,
                        )
                    response.raise_for_status()
                    return True

            except Exception as e:
                wait = 2 ** attempt  # 1s, 2s, 4s
                logger.warning(
                    "backend_retry_log",
                    attempt=f"{attempt + 1}/{max_retries}",
                    url=url,
                    error=str(e),
                    session_id=self.session_id,
                    retry_in_seconds=wait,
                )
                if attempt < max_retries - 1:
                    await asyncio.sleep(wait)
        return False

    async def query_rag(self, query: str) -> str:
        url = f"{self.base_url}/api/v1/rag/query-formatted"
        body = { "query": query, "limit": 5 }
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, json=body, headers=self._headers())
                response.raise_for_status()
                return response.json().get("context", "")
        except Exception as e:
            logger.warning("rag_query_failed", error=str(e), 
                           session_id=self.session_id, tenant_id=self.tenant_id)
            return ""  # Fail silently — call continues without RAG context

    async def execute_tool(
        self,
        manifest: SessionManifest,
        tool_name: str,
        tool_input: dict
    ) -> str:
        url = f"{self.base_url}/api/v1/tools/execute"
        body = {"tool_name": tool_name, "tool_input": tool_input}
        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                response = await client.post(
                    url, json=body, 
                    headers=self._headers()
                )
                response.raise_for_status()
                result = response.json()
                return str(result.get("result", "Tool completed successfully"))
        except Exception as e:
            logger.warning(
                "tool_execution_failed",
                tool_name=tool_name,
                session_id=manifest.session_id,
                tenant_id=manifest.tenant_id,
                error=str(e)
            )
            return "I'm sorry, I couldn't complete that action right now. Please try again."


def _map_termination_reason_to_end_reason(termination_reason: str) -> str:
    """Map legacy termination reasons to backend end_reason enum."""
    mapping = {
        "user_disconnected": "user_hangup",
        "agent_disconnected": "agent_hangup",
        "session_ended": "agent_hangup",
        "max_duration_reached": "max_duration",
        "inactivity_timeout": "timeout",
        "insufficient_funds": "insufficient_funds",
        "error": "error",
    }
    return mapping.get(termination_reason, "error")


# Backward-compatible aliases for legacy modules under src/backend/*
BackendClient = SessionReporter


def create_backend_client(manifest: SessionManifest) -> SessionReporter:
    return SessionReporter(manifest)
