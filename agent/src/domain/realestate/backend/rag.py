"""
RAG Query Interface

Calls backend RAG API to retrieve relevant knowledge base chunks.
"""

from dataclasses import dataclass
from typing import Any

from src.domain.realestate.backend.client import BackendClient
from src.core.utils import get_logger


@dataclass
class RAGChunk:
    """A chunk of retrieved knowledge."""
    
    content: str
    similarity: float
    document_id: str
    chunk_index: int
    metadata: dict[str, Any] | None = None


@dataclass
class RAGResult:
    """Result of a RAG query."""
    
    chunks: list[RAGChunk]
    query_tokens: int = 0
    
    @property
    def has_results(self) -> bool:
        """Check if any results were found."""
        return len(self.chunks) > 0
    
    def get_context_string(self) -> str:
        """Get concatenated context for LLM."""
        if not self.chunks:
            return ""
        
        context_parts = [
            f"[{i+1}] {chunk.content}"
            for i, chunk in enumerate(self.chunks)
        ]
        
        return (
            "RELEVANT INFORMATION FROM KNOWLEDGE BASE:\n"
            + "\n\n".join(context_parts)
            + "\n\nUse the above information to answer the user's question if relevant."
        )


class RAGQueryService:
    """Service for querying the knowledge base via backend."""
    
    def __init__(self, client: BackendClient, tenant_id: str):
        self.client = client
        self.tenant_id = tenant_id
        self.logger = get_logger("rag")
    
    async def query(
        self,
        query: str,
        top_k: int = 3,
        min_similarity: float = 0.7,
    ) -> RAGResult:
        """
        Query the knowledge base.
        
        Args:
            query: The search query
            top_k: Maximum number of chunks to return
            min_similarity: Minimum similarity threshold
            
        Returns:
            RAGResult with relevant chunks
        """
        self.logger.debug("rag_query", query=query[:100], top_k=top_k)
        
        try:
            response = await self.client.post(
                "/v1/rag/query",
                json={
                    "tenant_id": self.tenant_id,
                    "query": query,
                    "top_k": top_k,
                    "min_similarity": min_similarity,
                },
            )
            
            chunks = [
                RAGChunk(
                    content=chunk["content"],
                    similarity=chunk["similarity"],
                    document_id=chunk["document_id"],
                    chunk_index=chunk["chunk_index"],
                    metadata=chunk.get("metadata"),
                )
                for chunk in response.get("chunks", [])
            ]
            
            self.logger.info(
                "rag_query_complete",
                chunks_found=len(chunks),
                tokens=response.get("query_embedding_tokens", 0),
            )
            
            return RAGResult(
                chunks=chunks,
                query_tokens=response.get("query_embedding_tokens", 0),
            )
            
        except Exception as e:
            self.logger.error("rag_query_failed", error=str(e))
            # Return empty result on error - don't crash the conversation
            return RAGResult(chunks=[], query_tokens=0)
