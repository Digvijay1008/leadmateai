import { queryMany } from '../../../../platform/index.js';
import { generateEmbedding } from './embedding.service.js';

export async function queryKnowledgeBase(
    tenant_id: string,
    query_text: string,
    limit: number = 5
): Promise<string> {
    if (!query_text || query_text.trim().length === 0) {
        return '';
    }

    try {
        // 1. Generate query embedding
        const queryEmbedding = await generateEmbedding(query_text);

        // 2. Perform vector search (TENANT ISOLATION — DO NOT REMOVE)
        const results = await queryMany<{ content: string; similarity: number }>(
            `SELECT content, 1 - (embedding <=> $1::vector) as similarity
             FROM kb_embeddings
             WHERE tenant_id = $2
             ORDER BY embedding <=> $1::vector
             LIMIT $3`,
            [JSON.stringify(queryEmbedding), tenant_id, limit]
        );

        // 3. Filter results by similarity
        const filteredResults = results.filter((row: any) => row.similarity > 0.7);

        // 4. Fallback if no results matched threshold
        if (filteredResults.length === 0) {
            console.log(`rag_query tenant_id=${tenant_id} results=0 similarity_max=0`);
            return '';
        }

        const maxSimilarity = Math.max(...filteredResults.map((r: any) => parseFloat(r.similarity)));
        console.log(`rag_query tenant_id=${tenant_id} results=${filteredResults.length} similarity_max=${maxSimilarity.toFixed(4)}`);

        // 5. Format results as context
        const chunks = filteredResults.map((row: any) => row.content);
        return `Based on our knowledge base:\n\n${chunks.join('\n\n')}`;
    } catch (e: any) {
        console.error(`Error querying RAG tenant_id=${tenant_id}: ${e.message}`);
        return '';
    }
}
