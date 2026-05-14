"""
Tool Execution Interface

Calls backend Tool API for executing tools (booking, CRM, etc).
"""

from dataclasses import dataclass
from typing import Any

from src.domain.realestate.backend.client import BackendClient, BackendClientError
from src.core.utils import get_logger


@dataclass
class ToolResult:
    """Result of a tool execution."""
    
    tool_name: str
    success: bool
    result: dict[str, Any] | None = None
    error: str | None = None
    
    def get_response_for_llm(self) -> str:
        """Format the result for LLM consumption."""
        if self.success:
            return f"Tool '{self.tool_name}' executed successfully. Result: {self.result}"
        else:
            return f"Tool '{self.tool_name}' failed. Error: {self.error}"


class ToolExecutionService:
    """Service for executing tools via backend."""
    
    # Known tools and their descriptions
    AVAILABLE_TOOLS = {
        "get_business_hours": {
            "description": "Get business operating hours",
            "parameters": {}
        },
        "book_appointment": {
            "description": "Book an appointment",
            "parameters": {
                "date": "The date for the appointment (YYYY-MM-DD)",
                "time": "The time for the appointment (HH:MM)",
                "name": "Customer name",
                "phone": "Customer phone number",
                "service": "Service requested (optional)",
            }
        },
        "check_availability": {
            "description": "Check appointment availability",
            "parameters": {
                "date": "The date to check (YYYY-MM-DD)",
            }
        },
        "get_product_info": {
            "description": "Get information about a product or service",
            "parameters": {
                "query": "Product or service to look up",
            }
        },
        "create_lead": {
            "description": "Create a lead in CRM",
            "parameters": {
                "name": "Lead name",
                "phone": "Lead phone number",
                "email": "Lead email (optional)",
                "notes": "Additional notes (optional)",
            }
        },
    }
    
    def __init__(self, client: BackendClient, enabled_tools: list[str]):
        self.client = client
        self.enabled_tools = set(enabled_tools)
        self.logger = get_logger("tools")
    
    def get_available_tools(self) -> dict[str, dict[str, Any]]:
        """Get tools available for this session."""
        return {
            name: info
            for name, info in self.AVAILABLE_TOOLS.items()
            if name in self.enabled_tools
        }
    
    def get_tools_for_llm(self) -> list[dict[str, Any]]:
        """Get tool definitions formatted for OpenAI function calling."""
        tools = []
        
        for name in self.enabled_tools:
            if name not in self.AVAILABLE_TOOLS:
                continue
            
            tool_info = self.AVAILABLE_TOOLS[name]
            
            # Convert to OpenAI function format
            properties = {}
            required = []
            
            for param_name, param_desc in tool_info.get("parameters", {}).items():
                properties[param_name] = {
                    "type": "string",
                    "description": param_desc,
                }
                # Mark as required if not marked optional
                if "(optional)" not in param_desc.lower():
                    required.append(param_name)
            
            tools.append({
                "type": "function",
                "function": {
                    "name": name,
                    "description": tool_info["description"],
                    "parameters": {
                        "type": "object",
                        "properties": properties,
                        "required": required,
                    },
                },
            })
        
        return tools
    
    async def execute(
        self,
        tool_name: str,
        parameters: dict[str, Any],
    ) -> ToolResult:
        """
        Execute a tool via the backend.
        
        Args:
            tool_name: Name of the tool to execute
            parameters: Tool parameters
            
        Returns:
            ToolResult with execution result or error
        """
        self.logger.info(
            "tool_execution_start",
            tool_name=tool_name,
            param_keys=list(parameters.keys()),
        )
        
        # Validate tool is enabled
        if tool_name not in self.enabled_tools:
            self.logger.warning("tool_not_enabled", tool_name=tool_name)
            return ToolResult(
                tool_name=tool_name,
                success=False,
                error=f"Tool '{tool_name}' is not enabled for this session",
            )
        
        try:
            response = await self.client.post(
                "/v1/tools/execute",
                json={
                    "tool_name": tool_name,
                    "parameters": parameters,
                },
            )
            
            success = response.get("success", False)
            
            self.logger.info(
                "tool_execution_complete",
                tool_name=tool_name,
                success=success,
            )
            
            return ToolResult(
                tool_name=tool_name,
                success=success,
                result=response.get("result"),
                error=response.get("error"),
            )
            
        except BackendClientError as e:
            self.logger.error(
                "tool_execution_failed",
                tool_name=tool_name,
                error=str(e),
            )
            return ToolResult(
                tool_name=tool_name,
                success=False,
                error=str(e),
            )
