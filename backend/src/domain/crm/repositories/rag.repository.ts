import { query, queryOne, queryMany } from '../../../platform/index.js';
import { generateId } from '../../../shared/index.js';
import type { KBDocument, KBEmbedding } from '../../../shared/index.js';

// ===========================================
// RAG REPOSITORY
// ===========================================

/**
 * Search for similar chunks using vector similarity
 * CRITICAL: tenant_id filter is MANDATORY
 */
export async function searchSimilarChunks(params: {
    tenantId: string;
    embedding: number[];
    topK?: number;
    minSimilarity?: number;
}): Promise<Array<{
    content: string;
    similarity: number;
    document_id: string;
    chunk_index: number;
    metadata: Record<string, any> | null;
}>> {
    const { tenantId, embedding, topK = 3, minSimilarity = 0.7 } = params;

    // Convert embedding array to pgvector format
    const embeddingStr = `[${embedding.join(',')}]`;

    const results = await queryMany<{
        content: string;
        similarity: string;
        document_id: string;
        chunk_index: number;
        metadata: Record<string, any> | null;
    }>(
        `SELECT 
      e.content,
      1 - (e.embedding <=> $1::vector) as similarity,
      e.document_id,
      e.chunk_index,
      e.metadata
     FROM kb_embeddings e
     JOIN kb_documents d ON e.document_id = d.id
     WHERE e.tenant_id = $2
       AND d.status = 'ready'
       AND 1 - (e.embedding <=> $1::vector) >= $3
     ORDER BY e.embedding <=> $1::vector
     LIMIT $4`,
        [embeddingStr, tenantId, minSimilarity, topK]
    );

    return results.map(r => ({
        ...r,
        similarity: parseFloat(r.similarity),
    }));
}

/**
 * Get document by ID with tenant validation
 */
export async function getDocumentById(
    documentId: string,
    tenantId: string
): Promise<KBDocument | null> {
    return queryOne<KBDocument>(
        `SELECT * FROM kb_documents WHERE id = $1 AND tenant_id = $2`,
        [documentId, tenantId]
    );
}

/**
 * List documents for a tenant
 */
export async function listDocumentsForTenant(
    tenantId: string
): Promise<KBDocument[]> {
    return queryMany<KBDocument>(
        `SELECT * FROM kb_documents 
     WHERE tenant_id = $1 AND status != 'deleted'
     ORDER BY created_at DESC`,
        [tenantId]
    );
}

/**
 * Create a new document record
 */
export async function createDocument(params: {
    tenantId: string;
    filename: string;
    originalFilename?: string;
    fileType?: string;
    fileSizeBytes?: number;
    contentHash?: string;
}): Promise<KBDocument> {
    const id = generateId();

    const result = await queryOne<KBDocument>(
        `INSERT INTO kb_documents (
      id, tenant_id, filename, original_filename, file_type, file_size_bytes, content_hash
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *`,
        [
            id,
            params.tenantId,
            params.filename,
            params.originalFilename ?? null,
            params.fileType ?? null,
            params.fileSizeBytes ?? null,
            params.contentHash ?? null,
        ]
    );

    return result!;
}

/**
 * Update document status
 */
export async function updateDocumentStatus(
    documentId: string,
    status: 'processing' | 'ready' | 'error' | 'deleted',
    errorMessage?: string
): Promise<void> {
    await query(
        `UPDATE kb_documents 
     SET status = $2, error_message = $3, updated_at = NOW()
     WHERE id = $1`,
        [documentId, status, errorMessage ?? null]
    );
}

/**
 * Store embeddings for a document
 */
export async function storeEmbeddings(params: {
    tenantId: string;
    documentId: string;
    chunks: Array<{
        content: string;
        embedding: number[];
        tokenCount?: number;
        metadata?: Record<string, any>;
    }>;
}): Promise<number> {
    const { tenantId, documentId, chunks } = params;

    // Batch insert embeddings
    let insertedCount = 0;

    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        if (!chunk) continue;

        const embeddingStr = `[${chunk.embedding.join(',')}]`;

        await query(
            `INSERT INTO kb_embeddings (
        id, tenant_id, document_id, chunk_index, content, embedding, token_count, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6::vector, $7, $8)`,
            [
                generateId(),
                tenantId,
                documentId,
                i,
                chunk.content,
                embeddingStr,
                chunk.tokenCount ?? null,
                chunk.metadata ? JSON.stringify(chunk.metadata) : null,
            ]
        );

        insertedCount++;
    }

    // Update document chunk count
    await query(
        `UPDATE kb_documents SET chunk_count = $1, updated_at = NOW() WHERE id = $2`,
        [insertedCount, documentId]
    );

    return insertedCount;
}

/**
 * Delete embeddings for a document
 */
export async function deleteEmbeddingsForDocument(
    documentId: string
): Promise<number> {
    const result = await query(
        `DELETE FROM kb_embeddings WHERE document_id = $1`,
        [documentId]
    );

    return result.rowCount ?? 0;
}

/**
 * Count embeddings for a tenant
 */
export async function countEmbeddingsForTenant(
    tenantId: string
): Promise<number> {
    const result = await queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM kb_embeddings WHERE tenant_id = $1`,
        [tenantId]
    );

    return parseInt(result?.count ?? '0', 10);
}
