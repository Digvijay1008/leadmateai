import OpenAI from 'openai';
import { config } from '../../../core/index.js';
import { searchSimilarChunks } from '../repositories/rag.repository.js';
import { isTenantActive } from '../repositories/tenant.repository.js';
import { NotFoundError, ForbiddenError } from '../../../shared/index.js';
import type { RAGQueryRequest, RAGQueryResponse } from '../../../shared/index.js';

// ===========================================
// RAG SERVICE
// ===========================================

// Initialize OpenAI client (lazy)
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
    if (!openaiClient) {
        if (!config.openai.apiKey) {
            throw new Error('OpenAI API key not configured');
        }
        openaiClient = new OpenAI({ apiKey: config.openai.apiKey });
    }
    return openaiClient;
}

/**
 * Generate embedding for a query
 */
async function generateEmbedding(text: string): Promise<{
    embedding: number[];
    tokens: number;
}> {
    const openai = getOpenAIClient();

    const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
        dimensions: 1536,
    });

    const firstEmbedding = response.data[0];
    if (!firstEmbedding) {
        throw new Error('No embedding returned from OpenAI');
    }

    return {
        embedding: firstEmbedding.embedding,
        tokens: response.usage?.total_tokens ?? 0,
    };
}

/**
 * Search knowledge base for relevant chunks
 * This is called by the agent during conversation
 */
export async function queryKnowledgeBase(
    request: RAGQueryRequest
): Promise<RAGQueryResponse> {
    const { tenant_id, query, top_k = 3, min_similarity = 0.7 } = request;

    // 1. Validate tenant
    const isActive = await isTenantActive(tenant_id);
    if (!isActive) {
        throw new ForbiddenError('Tenant is not active');
    }

    // 2. Generate embedding for query
    const { embedding, tokens } = await generateEmbedding(query);

    // 3. Search for similar chunks
    const chunks = await searchSimilarChunks({
        tenantId: tenant_id,
        embedding,
        topK: top_k,
        minSimilarity: min_similarity,
    });

    return {
        chunks: chunks.map(chunk => ({
            content: chunk.content,
            similarity: chunk.similarity,
            document_id: chunk.document_id,
            chunk_index: chunk.chunk_index,
            metadata: chunk.metadata,
        })),
        query_embedding_tokens: tokens,
    };
}

/**
 * Format RAG results for LLM context
 * Returns a formatted string to inject into the system prompt
 */
export function formatRAGContext(chunks: RAGQueryResponse['chunks']): string {
    if (chunks.length === 0) {
        return '';
    }

    const formattedChunks = chunks
        .map((chunk, i) => `[${i + 1}] ${chunk.content}`)
        .join('\n\n');

    return `RELEVANT INFORMATION FROM KNOWLEDGE BASE:
${formattedChunks}

Use the above information to answer the user's question if relevant.`;
}
