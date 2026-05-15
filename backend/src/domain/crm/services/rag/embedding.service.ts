import OpenAI from 'openai';
import { query } from '../../../../platform/index.js';

export abstract class EmbeddingProvider {
    abstract embed(text: string): Promise<number[]>;
}

export class OpenAIEmbeddingAdapter extends EmbeddingProvider {
    private openai: OpenAI;
    constructor() {
        super();
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }

    async embed(text: string): Promise<number[]> {
        let attempts = 0;
        const maxAttempts = 3;
        let delay = 1000;

        while (attempts < maxAttempts) {
            try {
                const response = await this.openai.embeddings.create({
                    model: 'text-embedding-3-small',
                    input: text,
                    dimensions: 1536
                });
                return (response as any).data[0].embedding;
            } catch (error: any) {
                attempts++;
                if (error?.status === 429 && attempts < maxAttempts) {
                    await new Promise(res => setTimeout(res, delay));
                    delay *= 2; // exponential backoff
                } else {
                    throw error;
                }
            }
        }
        throw new Error('Embedding failed after retries');
    }
}

const embeddingProvider = new OpenAIEmbeddingAdapter();

/**
 * Generate a single embedding, using the text-embedding-3-small model.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    return embeddingProvider.embed(text);
}

/**
 * Embed multiple chunks and store them in the database for a specific tenant and document.
 * Processes chunks in batches of 20 to respect OpenAI typical rate limit.
 * CRITICAL: every row MUST have tenant_id — this is the isolation guarantee.
 */
export async function batchEmbedChunks(
    chunks: string[],
    tenant_id: string,
    document_id: string,
    source_filename?: string
): Promise<void> {
    const batchSize = 20;

    for (let i = 0; i < chunks.length; i += batchSize) {
        const batchChunks = chunks.slice(i, i + batchSize);

        // Generate embeddings concurrently for the batch
        const embeddingPromises = batchChunks.map((chunk, index) => {
            const globalIndex = i + index;
            console.log(`embedding_generated chunk_index=${globalIndex} tenant_id=${tenant_id}`);
            return generateEmbedding(chunk);
        });

        const embeddings = await Promise.all(embeddingPromises);

        // Batch insert to database
        for (let j = 0; j < batchChunks.length; j++) {
            const chunk = batchChunks[j];
            const embedding = embeddings[j];
            const globalIndex = i + j;

            const metadata = {
                chunk_index: globalIndex,
                total_chunks: chunks.length,
                source_filename: source_filename || 'manual_text',
                page_number: 1 // Naive page number mapping, would be properly resolved if needed
            };

            await query(
                `INSERT INTO kb_embeddings (
                    tenant_id, document_id, chunk_index, content, embedding, metadata
                ) VALUES ($1, $2, $3, $4, $5, $6)`,
                [
                    tenant_id,
                    document_id,
                    globalIndex,
                    chunk,
                    JSON.stringify(embedding), // the pgvector driver accepts json string array
                    JSON.stringify(metadata)
                ]
            );
        }
    }
}
