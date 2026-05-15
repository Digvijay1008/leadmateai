import OpenAI from 'openai';
import { config } from '../../../core/index.js';
import { query, queryOne, queryMany } from '../../../platform/index.js';
import { generateId } from '../../../shared/index.js';
import type { Property } from './property.repository.js';

export interface PropertyEmbedding {
    id: string;
    tenant_id: string;
    property_id: string;
    content: string;
    embedding: number[];
    created_at: Date;
}

export interface SemanticSearchResult {
    property_id: string;
    combined_score: number;
    similarity_score: number;
    popularity_score: number;
    content: string;
    property_data: Property;
}

interface HybridSearchRow {
    property_id: string;
    combined_score: number;
    similarity_score: number;
    popularity_score: number;
    content: string;
    property_data: Property;
}

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

export async function generateEmbedding(text: string): Promise<number[]> {
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

    return firstEmbedding.embedding;
}

function buildPropertyContent(property: Property): string {
    const parts: string[] = [];

    if (property.property_name) parts.push(property.property_name);
    if (property.property_type) parts.push(property.property_type);
    if (property.city) parts.push(property.city);
    if (property.locality) parts.push(property.locality);
    if (property.address) parts.push(property.address);
    if (property.builder_name) parts.push(property.builder_name);
    if (property.project_name) parts.push(property.project_name);
    if (property.bhk_types && property.bhk_types.length > 0) parts.push(...property.bhk_types);
    if (property.min_price && property.max_price) parts.push(`Price range ${property.min_price} to ${property.max_price}`);
    if (property.min_sqft && property.max_sqft) parts.push(`Area ${property.min_sqft} to ${property.max_sqft} sqft`);
    if (property.amenities_json) {
        const amenities = property.amenities_json as Record<string, any>;
        if (amenities.features) {
            parts.push(...(amenities.features as string[]).slice(0, 10));
        }
    }
    if (property.description) parts.push(property.description);

    return parts.join('. ');
}

export async function createPropertyEmbedding(
    tenantId: string,
    property: Property
): Promise<PropertyEmbedding> {
    const content = buildPropertyContent(property);
    const embedding = await generateEmbedding(content);
    const embeddingStr = `[${embedding.join(',')}]`;
    const id = generateId();

    const result = await queryOne<PropertyEmbedding>(
        `INSERT INTO property_embeddings (id, tenant_id, property_id, content, embedding)
         VALUES ($1, $2, $3, $4, $5::vector)
         RETURNING *`,
        [id, tenantId, property.id, content, embeddingStr]
    );

    return result!;
}

export async function updatePropertyEmbedding(
    tenantId: string,
    propertyId: string,
    property: Property
): Promise<PropertyEmbedding> {
    const existing = await queryOne<PropertyEmbedding>(
        `SELECT * FROM property_embeddings 
         WHERE tenant_id = $1 AND property_id = $2`,
        [tenantId, propertyId]
    );

    if (existing) {
        const content = buildPropertyContent(property);
        const embedding = await generateEmbedding(content);
        const embeddingStr = `[${embedding.join(',')}]`;

        return queryOne<PropertyEmbedding>(
            `UPDATE property_embeddings 
             SET content = $3, embedding = $4::vector, created_at = NOW()
             WHERE tenant_id = $1 AND property_id = $2
             RETURNING *`,
            [tenantId, propertyId, content, embeddingStr]
        ) as Promise<PropertyEmbedding>;
    }

    return createPropertyEmbedding(tenantId, property);
}

export async function deletePropertyEmbedding(
    tenantId: string,
    propertyId: string
): Promise<boolean> {
    const result = await query(
        `DELETE FROM property_embeddings 
         WHERE tenant_id = $1 AND property_id = $2`,
        [tenantId, propertyId]
    );
    return (result.rowCount ?? 0) > 0;
}

export async function semanticSearchProperties(
    tenantId: string,
    queryText: string,
    topK: number = 10,
    minScore: number = 0.5
): Promise<SemanticSearchResult[]> {
    const embedding = await generateEmbedding(queryText);
    const embeddingStr = `[${embedding.join(',')}]`;

    const results = await queryMany<HybridSearchRow>(
        `SELECT 
            pe.property_id,
            (1 - (pe.embedding <=> $3::vector) * 0.7 + 
             COALESCE((SELECT COUNT(*)::float FROM properties p2 
                       WHERE p2.project_id = p.project_id 
                         AND p2.status = 'available') / 100.0, 0) * 0.3) as combined_score,
            1 - (pe.embedding <=> $3::vector) as similarity_score,
            COALESCE((SELECT COUNT(*)::float FROM properties p2 
                      WHERE p2.project_id = p.project_id 
                        AND p2.status = 'available') / 100.0, 0) as popularity_score,
            pe.content,
            row_to_json(p)::jsonb as property_data
         FROM property_embeddings pe
         JOIN properties p ON pe.property_id = p.id
         WHERE pe.tenant_id = $1
           AND p.status = 'available'
           AND 1 - (pe.embedding <=> $3::vector) >= $4
         ORDER BY combined_score DESC
         LIMIT $2`,
        [tenantId, topK, embeddingStr, minScore]
    );

    return results.map(r => ({
        property_id: r.property_id,
        combined_score: Number(r.combined_score),
        similarity_score: Number(r.similarity_score),
        popularity_score: Number(r.popularity_score),
        content: r.content,
        property_data: r.property_data,
    }));
}

export async function hasPropertyEmbedding(
    tenantId: string,
    propertyId: string
): Promise<boolean> {
    const result = await queryOne<{ count: string }>(
        `SELECT COUNT(*) as count 
         FROM property_embeddings 
         WHERE tenant_id = $1 AND property_id = $2`,
        [tenantId, propertyId]
    );
    return parseInt(result?.count ?? '0', 10) > 0;
}

export async function getPropertyEmbedding(
    tenantId: string,
    propertyId: string
): Promise<PropertyEmbedding | null> {
    return queryOne<PropertyEmbedding>(
        `SELECT * FROM property_embeddings 
         WHERE tenant_id = $1 AND property_id = $2`,
        [tenantId, propertyId]
    );
}

export async function batchCreateEmbeddings(
    tenantId: string,
    properties: Property[]
): Promise<number> {
    let created = 0;

    for (const property of properties) {
        try {
            await createPropertyEmbedding(tenantId, property);
            created++;
        } catch (error) {
            console.error('[Embedding] Failed to create embedding for property:', property.id, error);
        }
    }

    return created;
}
