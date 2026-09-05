"""
UchcharAssistant — Dynamic tool registration based on manifest.tools_enabled.

CRITICAL: Tools are only registered if explicitly enabled in the manifest.
This ensures that booking, transfer, and lead capture tools are ONLY available
when the tenant has configured them. Disabled tools will NEVER appear to the LLM.
"""

import time
import random
from typing import Annotated, Any
from livekit.agents import Agent, RunContext, function_tool
from src.core.utils import get_logger

logger = get_logger("tools")

# ---------------------------------------------------------------------------
# Backchannel — filler phrases to mask LLM + RAG latency.
# ---------------------------------------------------------------------------
_FILLER_PHRASES = [
    "Hmm...",
    "Got it...",
    "Let me check that...",
    "Sure, one moment...",
    "Right...",
    "Okay...",
]


# ---------------------------------------------------------------------------
# Base Assistant (no tools — just RAG + backchanneling)
# ---------------------------------------------------------------------------

class UchcharAssistantBase(Agent):
    """
    Base voice AI assistant.
    All tool variants inherit from this.
    Tools are injected dynamically at session init based on manifest.tools_enabled.
    """

    def __init__(self, instructions: str, manifest, backend_client) -> None:
        super().__init__(instructions=instructions)
        self.manifest = manifest
        self.backend_client = backend_client
        self._tools_enabled: set[str] = set(getattr(manifest, "tools_enabled", []))
        # Store greeting for on_enter lifecycle hook
        self._greeting_message: str = getattr(manifest, "greeting_message", "")

        logger.info(
            "assistant_initialized",
            session_id=getattr(manifest, "session_id", "unknown"),
            tenant_id=getattr(manifest, "tenant_id", "unknown"),
            tools_enabled=list(self._tools_enabled),
        )

    async def on_enter(self):
        """Official Agent lifecycle hook — fires when session starts.

        Uses generate_reply() for greeting instead of session.say() because:
        1. It's the documented pattern (see LiveKit Agent docs)
        2. It integrates with turn-taking properly (session knows the agent spoke)
        3. The session will then correctly listen for user speech after greeting
        """
        if self._greeting_message:
            await self.session.generate_reply(
                instructions=f"Greet the user with this exact message: {self._greeting_message}"
            )
        else:
            await self.session.generate_reply(
                instructions="Greet the user warmly and introduce yourself."
            )

    async def on_user_turn_completed(self, turn_ctx, new_message):
        try:
            user_text = new_message.text_content
            if not user_text or len(user_text.strip()) < 3:
                return

            has_kb = getattr(self.manifest, "knowledge_base_id", None)

            # ------------------------------------------------------------------
            # LATENCY OPT: Backchannel immediately after VAD fires.
            # Eliminates perceived dead-air by ~400-700ms for KB-enabled agents.
            # ------------------------------------------------------------------
            if has_kb:
                filler = random.choice(_FILLER_PHRASES)
                if self.session is not None:
                    await self.session.say(filler, allow_interruptions=True)
                logger.debug(
                    "backchannel_injected",
                    filler=filler,
                    session_id=getattr(self.manifest, "session_id", "unknown"),
                )

            if not has_kb:
                return

            t0 = time.monotonic()
            rag_context = await self.backend_client.query_rag(query=user_text)

            logger.info(
                "rag_query_complete",
                latency_ms=int((time.monotonic() - t0) * 1000),
                has_context=bool(rag_context),
                session_id=getattr(self.manifest, "session_id", "unknown"),
            )

            if rag_context:
                turn_ctx.add_message(
                    role="assistant",
                    content=f"[Knowledge Base Context — use this to answer]: {rag_context}",
                )
        except Exception as e:
            logger.warning(
                "rag_hook_error",
                error=str(e),
                session_id=getattr(self.manifest, "session_id", "unknown"),
            )

    def _tool_allowed(self, tool_name: str) -> bool:
        """Check if a tool is enabled in the manifest."""
        return tool_name in self._tools_enabled


# ---------------------------------------------------------------------------
# Booking Mixin
# ---------------------------------------------------------------------------

class BookingMixin:
    # Type hints for the IDE to stop showing 'red' errors
    backend_client: Any
    manifest: Any
    def _tool_allowed(self, tool_name: str) -> bool: ...

    @function_tool()
    async def check_availability(
        self,
        date: Annotated[str, "Date in YYYY-MM-DD format"],
        service_type: Annotated[str | None, "Type of service requested"] = None,
    ) -> str:
        """Check available appointment slots for a given date."""
        if not self._tool_allowed("check_availability"):
            return "Appointment checking is not available."
        result = await self.backend_client.execute_tool(
            manifest=self.manifest,
            tool_name="check_availability",
            tool_input={"date": date, "service_type": service_type},
        )
        return result

    @function_tool()
    async def book_appointment(
        self,
        date: Annotated[str, "Date in YYYY-MM-DD format"],
        time_slot: Annotated[str, "Time in HH:MM format"],
        patient_name: Annotated[str, "Full name of the caller"],
        phone: Annotated[str, "Caller phone number"],
        service_type: Annotated[str | None, "Type of appointment"] = None,
        notes: Annotated[str | None, "Any additional notes"] = None,
    ) -> str:
        """Book an appointment for the caller."""
        if not self._tool_allowed("book_appointment"):
            return "Appointment booking is not available."
        result = await self.backend_client.execute_tool(
            manifest=self.manifest,
            tool_name="book_appointment",
            tool_input={
                "date": date,
                "time": time_slot,
                "patient_name": patient_name,
                "phone": phone,
                "service_type": service_type,
                "notes": notes,
            },
        )
        return result


# ---------------------------------------------------------------------------
# Lead Capture Mixin
# ---------------------------------------------------------------------------

class LeadCaptureMixin:
    # Type hints for the IDE
    backend_client: Any
    manifest: Any
    def _tool_allowed(self, tool_name: str) -> bool: ...

    @function_tool()
    async def capture_lead(
        self,
        name: Annotated[str, "Caller's full name"],
        phone: Annotated[str, "Caller's phone number"],
        interest: Annotated[str, "What they are interested in"],
        notes: Annotated[str | None, "Additional context"] = None,
    ) -> str:
        """Capture a lead when caller is interested but not ready to book."""
        if not self._tool_allowed("capture_lead"):
            return "Lead capture is not available."
        result = await self.backend_client.execute_tool(
            manifest=self.manifest,
            tool_name="capture_lead",
            tool_input={"name": name, "phone": phone, "interest": interest, "notes": notes},
        )
        return result


# ---------------------------------------------------------------------------
# Transfer Mixin
# ---------------------------------------------------------------------------

class TransferMixin:
    # Type hints for the IDE
    backend_client: Any
    manifest: Any
    def _tool_allowed(self, tool_name: str) -> bool: ...

    @function_tool()
    async def transfer_to_human(
        self,
        reason: Annotated[str, "Why the caller wants to speak to a human"],
    ) -> str:
        """Transfer the call to a human agent when requested."""
        if not self._tool_allowed("transfer_to_human"):
            return "Call transfer is not available."
        result = await self.backend_client.execute_tool(
            manifest=self.manifest,
            tool_name="transfer_to_human",
            tool_input={"reason": reason},
        )
        return result


# ---------------------------------------------------------------------------
# Business Info Mixin
# ---------------------------------------------------------------------------

class BusinessInfoMixin:
    # Type hints for the IDE
    backend_client: Any
    manifest: Any

    @function_tool()
    async def get_business_info(
        self,
        info_type: Annotated[str, "One of: hours, services, location, fees"],
    ) -> str:
        """Get business information like hours, services, location, or fees."""
        result = await self.backend_client.execute_tool(
            manifest=self.manifest,
            tool_name="get_business_info",
            tool_input={"info_type": info_type},
        )
        return result


# ---------------------------------------------------------------------------
# FULL Assistant — always includes all mixins, but each tool internally
# checks self._tool_allowed() so the LLM only gets useful responses.
# ---------------------------------------------------------------------------

class UchcharAssistant(
    BookingMixin,
    LeadCaptureMixin,
    TransferMixin,
    BusinessInfoMixin,
    UchcharAssistantBase,
):
    """
    Full voice AI assistant with all tools available.
    Each tool checks manifest.tools_enabled before executing — disabled tools
    return a polite 'not available' response so the LLM knows to stop.

    If you want to HIDE tools from the LLM entirely (saves tokens), use
    build_assistant() below to create a dynamically composed class.
    """
    pass


# ---------------------------------------------------------------------------
# Dynamic assistant factory — creates a class with ONLY enabled tools exposed
# to the LLM. This is the most efficient approach: the LLM never even sees
# tools that aren't enabled, saving context window + preventing hallucination.
# ---------------------------------------------------------------------------

def build_assistant(manifest, backend_client) -> UchcharAssistantBase:
    """
    Build an assistant with only the tools enabled in the manifest.

    This dynamically composes a class so that disabled tools are completely
    invisible to the LLM (not just rejected at runtime).
    """
    tools_enabled = set(getattr(manifest, "tools_enabled", []))

    logger.info(
        "building_dynamic_assistant",
        session_id=getattr(manifest, "session_id", "unknown"),
        tools_enabled=list(tools_enabled),
    )

    # Determine which mixins to include
    bases: list[type] = []

    has_booking = bool(tools_enabled & {"book_appointment", "check_availability"})
    has_lead    = "capture_lead" in tools_enabled
    has_transfer = "transfer_to_human" in tools_enabled

    if has_booking:
        bases.append(BookingMixin)
    if has_lead:
        bases.append(LeadCaptureMixin)
    if has_transfer:
        bases.append(TransferMixin)

    # Always include business info
    bases.append(BusinessInfoMixin)
    bases.append(UchcharAssistantBase)

    # Dynamically construct a class with only the relevant mixins
    DynamicAssistant = type("DynamicAssistant", tuple(bases), {})

    return DynamicAssistant(
        instructions=manifest.llm.system_prompt,
        manifest=manifest,
        backend_client=backend_client,
    )
