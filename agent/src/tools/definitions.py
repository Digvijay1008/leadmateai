import time
import random
from typing import Annotated
from livekit.agents import Agent
from livekit.agents.llm import function_tool
from src.core.utils import get_logger

logger = get_logger("tools")

# ---------------------------------------------------------------------------
# Backchanneling — filler phrases spoken instantly after the user finishes
# talking. These mask LLM + RAG latency so the caller hears no dead air.
# Rotated randomly to avoid sounding robotic.
# ---------------------------------------------------------------------------
_FILLER_PHRASES = [
    "Hmm...",
    "Got it...",
    "Let me check that...",
    "Sure, one moment...",
    "Right...",
    "Okay...",
]

class UchcharAssistant(Agent):
    """
    Uchchar Voice AI Assistant.
    Instructions are set dynamically per-session from the manifest.
    Tools execute via backend requests.
    """

    def __init__(self, instructions: str, manifest, backend_client) -> None:
        super().__init__(instructions=instructions)
        self.manifest = manifest
        self.backend_client = backend_client

    async def on_user_turn_completed(self, turn_ctx, new_message):
        try:
            user_text = new_message.text_content()
            if not user_text or len(user_text.strip()) < 3:
                return

            has_kb = getattr(self.manifest, 'knowledge_base_id', None)

            # ------------------------------------------------------------------
            # LATENCY OPT: Backchannel immediately after VAD fires.
            # The filler phrase plays concurrently while RAG + LLM are working.
            # Eliminates perceived dead-air by ~400-700ms for KB-enabled agents.
            # ------------------------------------------------------------------
            if has_kb:
                filler = random.choice(_FILLER_PHRASES)
                await self.session.say(filler, allow_interruptions=True)
                logger.debug(
                    "backchannel_injected",
                    filler=filler,
                    session_id=getattr(self.manifest, 'session_id', 'unknown'),
                )

            # Only query RAG if tenant has a knowledge base
            if not has_kb:
                return

            t0 = time.monotonic()

            # Query backend RAG endpoint
            rag_context = await self.backend_client.query_rag(query=user_text)

            logger.info(
                "rag_query_complete",
                latency_ms=int((time.monotonic() - t0) * 1000),
                has_context=bool(rag_context),
                session_id=getattr(self.manifest, 'session_id', 'unknown'),
            )

            # Inject context into conversation if results found
            if rag_context:
                turn_ctx.add_message(
                    role="assistant",
                    content=f"[Knowledge Base Context — use this to answer]: {rag_context}"
                )
        except Exception as e:
            # NEVER crash the call due to RAG failure — log and continue
            logger.warning(
                "rag_hook_error",
                error=str(e),
                session_id=getattr(self.manifest, 'session_id', 'unknown'),
                tenant_id=getattr(self.manifest, 'tenant_id', 'unknown'),
            )

    @function_tool()
    async def check_availability(
        self,
        date: Annotated[str, "Date in YYYY-MM-DD format"],
        service_type: Annotated[str, "Type of service requested"] = None
    ) -> str:
        """Check available appointment slots for a given date."""
        result = await self.backend_client.execute_tool(
            manifest=self.manifest,
            tool_name="check_availability",
            tool_input={"date": date, "service_type": service_type}
        )
        return result

    @function_tool()
    async def book_appointment(
        self,
        date: Annotated[str, "Date in YYYY-MM-DD format"],
        time: Annotated[str, "Time in HH:MM format"],
        patient_name: Annotated[str, "Full name of the patient"],
        phone: Annotated[str, "Patient phone number"],
        service_type: Annotated[str, "Type of appointment"] = None,
        notes: Annotated[str, "Any additional notes"] = None
    ) -> str:
        """Book an appointment for the caller."""
        result = await self.backend_client.execute_tool(
            manifest=self.manifest,
            tool_name="book_appointment", 
            tool_input={
                "date": date, "time": time,
                "patient_name": patient_name, "phone": phone,
                "service_type": service_type, "notes": notes
            }
        )
        return result

    @function_tool()
    async def get_business_info(
        self,
        info_type: Annotated[str, "One of: hours, services, location, fees"]
    ) -> str:
        """Get business information like hours, services, location, or fees."""
        result = await self.backend_client.execute_tool(
            manifest=self.manifest,
            tool_name="get_business_info",
            tool_input={"info_type": info_type}
        )
        return result

    @function_tool()
    async def capture_lead(
        self,
        name: Annotated[str, "Caller's full name"],
        phone: Annotated[str, "Caller's phone number"],
        interest: Annotated[str, "What they are interested in"],
        notes: Annotated[str, "Additional context"] = None
    ) -> str:
        """Capture a lead when caller is interested but not ready to book."""
        result = await self.backend_client.execute_tool(
            manifest=self.manifest,
            tool_name="capture_lead",
            tool_input={
                "name": name, "phone": phone,
                "interest": interest, "notes": notes
            }
        )
        return result

    @function_tool()
    async def transfer_to_human(
        self,
        reason: Annotated[str, "Why the caller wants to speak to a human"]
    ) -> str:
        """Transfer call to a human agent when requested."""
        result = await self.backend_client.execute_tool(
            manifest=self.manifest,
            tool_name="transfer_to_human",
            tool_input={"reason": reason}
        )
        return result
