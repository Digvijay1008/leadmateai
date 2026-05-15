// @ts-ignore
import * as pdfParseModule from 'pdf-parse';
const pdfParse = (pdfParseModule as any).default || pdfParseModule;
// @ts-ignore
import * as mammoth from 'mammoth';
import { query, queryOne } from '../../../../platform/index.js';
import { generateId } from '../../../../shared/utils/helpers.js';
import { batchEmbedChunks } from './embedding.service.js';

/**
 * Basic chunking algorithm for text processing
 * Target: ~500 tokens (approx 2000 chars) with 50 tokens (200 chars) overlap
 */
function chunkText(text: string, maxChars: number = 2000, overlapChars: number = 200): string[] {
    const chunks: string[] = [];
    if (!text) return chunks;

    // Naive implementation based on characters rather than tokens
    let startIndex = 0;
    while (startIndex < text.length) {
        let endIndex = startIndex + maxChars;

        if (endIndex < text.length) {
            // Try to break on the nearest space character to avoid splitting words
            const spaceIndex = text.lastIndexOf(' ', endIndex);
            if (spaceIndex > startIndex) {
                endIndex = spaceIndex;
            }
        }

        const chunk = text.slice(startIndex, endIndex).trim();
        if (chunk.length > 0) {
            chunks.push(chunk);
        }

        // Advance start index, accounting for overlap
        startIndex = endIndex - overlapChars;
        // Prevent infinite loops on edge cases
        if (startIndex < 0 || endIndex - overlapChars <= startIndex) {
            startIndex = endIndex;
        }
    }

    return chunks;
}

/**
 * Ingest document file buffer and process via RAG pipeline.
 */
export async function ingestFileDocument(
    tenant_id: string,
    buffer: Buffer,
    filename: string,
    mimetype: string,
    sizeBytes: number
): Promise<{ document_id: string }> {
    const documentId = generateId();

    // 1. Create document record
    await query(
        `INSERT INTO kb_documents (
            id, tenant_id, filename, original_filename, file_type, file_size_bytes, status, source_type
        ) VALUES ($1, $2, $3, $4, $5, $6, 'processing', 'file')`,
        [documentId, tenant_id, filename, filename, mimetype, sizeBytes]
    );

    // Process file asynchronously
    processFileDocumentAsync(documentId, tenant_id, buffer, filename, mimetype).catch((err) => {
        console.error(`Error processing file document ${documentId}:`, err);
    });

    return { document_id: documentId };
}

async function processFileDocumentAsync(
    documentId: string,
    tenant_id: string,
    buffer: Buffer,
    filename: string,
    mimetype: string
): Promise<void> {
    try {
        let textContent = '';

        // 2. Extract text
        if (mimetype === 'application/pdf') {
            const pdfData = await pdfParse(buffer);
            textContent = pdfData.text;
        } else if (mimetype === 'text/plain') {
            textContent = buffer.toString('utf-8');
        } else if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            const mammothData = await mammoth.extractRawText({ buffer });
            textContent = mammothData.value;
        } else {
            throw new Error(`Unsupported file type: ${mimetype}`);
        }

        // 3. Chunking pipeline
        const chunks = chunkText(textContent);
        if (chunks.length === 0) {
            throw new Error('No text content extracted from file.');
        }

        // 4. Send to embedding batch processor
        await batchEmbedChunks(chunks, tenant_id, documentId, filename);

        // 5. Update complete
        await query(
            `UPDATE kb_documents SET status = 'ready', chunk_count = $1, updated_at = NOW() WHERE id = $2`,
            [chunks.length, documentId]
        );
    } catch (e: any) {
        // Track error on failure
        await query(
            `UPDATE kb_documents SET status = 'error', error_message = $1, updated_at = NOW() WHERE id = $2`,
            [e.message || 'Unknown processing error', documentId]
        );
    }
}

/**
 * Ingest manual raw text input and process via RAG pipeline.
 */
export async function ingestManualText(
    tenant_id: string,
    title: string,
    content: string
): Promise<{ document_id: string }> {
    const documentId = generateId();
    const sizeBytes = Buffer.byteLength(content, 'utf8');

    // 1. Create document record immediately ready or queued depending on architecture,
    // Since processing is fast we do it similarly (async for consistency or sync if fast)
    await query(
        `INSERT INTO kb_documents (
            id, tenant_id, filename, original_filename, file_type, file_size_bytes, status, source_type
        ) VALUES ($1, $2, $3, $4, 'text/plain', $5, 'processing', 'manual_text')`,
        [documentId, tenant_id, title, title, sizeBytes]
    );

    // Process manually async 
    processManualTextAsync(documentId, tenant_id, content, title).catch((err) => {
        console.error(`Error processing manual text ${documentId}:`, err);
    });

    return { document_id: documentId };
}

async function processManualTextAsync(
    documentId: string,
    tenant_id: string,
    content: string,
    title: string
): Promise<void> {
    try {
        const chunks = chunkText(content);
        if (chunks.length === 0) {
            throw new Error('Text input is empty');
        }

        await batchEmbedChunks(chunks, tenant_id, documentId, title);

        await query(
            `UPDATE kb_documents SET status = 'ready', chunk_count = $1, updated_at = NOW() WHERE id = $2`,
            [chunks.length, documentId]
        );
    } catch (e: any) {
        await query(
            `UPDATE kb_documents SET status = 'error', error_message = $1, updated_at = NOW() WHERE id = $2`,
            [e.message || 'Unknown processing error', documentId]
        );
    }
}
