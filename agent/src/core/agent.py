"""
Voice Agent Core (LiveKit Agents 1.4+)

This module is kept for backward compatibility with the session/manifest system.
The actual agent orchestration now happens in main.py using AgentSession.
"""

from src.core.session import SessionManifest


def create_agent(manifest: SessionManifest):
    """
    Legacy factory function. 
    In LiveKit 1.4+, the agent is created via AgentSession in main.py.
    This is kept for import compatibility.
    """
    return manifest
