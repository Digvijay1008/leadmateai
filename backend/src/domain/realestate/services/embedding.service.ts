import {
    createPropertyEmbedding,
    updatePropertyEmbedding,
    deletePropertyEmbedding,
    semanticSearchProperties,
    hasPropertyEmbedding,
    getPropertyEmbedding,
    batchCreateEmbeddings,
    type SemanticSearchResult,
} from '../repositories/embedding.repository.js';
import { getPropertyById, listProperties } from '../repositories/property.repository.js';
import { NotFoundError, ValidationError } from '../../../shared/index.js';

export interface CreateEmbeddingRequest {
    property_id: string;
}

export interface UpdateEmbeddingRequest {
    property_id: string;
}

export interface SemanticSearchRequest {
    query: string;
    top_k?: number;
    min_score?: number;
}

const DEFAULT_TOP_K = 10;
const MIN_TOP_K = 1;
const MAX_TOP_K = 50;
const DEFAULT_MIN_SCORE = 0.5;
const MIN_MIN_SCORE = 0.0;
const MAX_MIN_SCORE = 1.0;

export async function createEmbeddingService(
    tenantId: string,
    request: CreateEmbeddingRequest
): Promise<{ success: boolean; message: string }> {
    if (!request.property_id) {
        throw new ValidationError('property_id is required');
    }

    const property = await getPropertyById(request.property_id, tenantId);
    if (!property) {
        throw new NotFoundError('Property');
    }

    const existingEmbedding = await hasPropertyEmbedding(tenantId, request.property_id);
    if (existingEmbedding) {
        throw new ValidationError('Embedding already exists for this property. Use update endpoint.');
    }

    await createPropertyEmbedding(tenantId, property);

    return {
        success: true,
        message: 'Property embedding created successfully',
    };
}

export async function updateEmbeddingService(
    tenantId: string,
    request: UpdateEmbeddingRequest
): Promise<{ success: boolean; message: string }> {
    if (!request.property_id) {
        throw new ValidationError('property_id is required');
    }

    const property = await getPropertyById(request.property_id, tenantId);
    if (!property) {
        throw new NotFoundError('Property');
    }

    await updatePropertyEmbedding(tenantId, request.property_id, property);

    return {
        success: true,
        message: 'Property embedding updated successfully',
    };
}

export async function deleteEmbeddingService(
    tenantId: string,
    propertyId: string
): Promise<{ success: boolean; message: string }> {
    if (!propertyId) {
        throw new ValidationError('property_id is required');
    }

    const property = await getPropertyById(propertyId, tenantId);
    if (!property) {
        throw new NotFoundError('Property');
    }

    const deleted = await deletePropertyEmbedding(tenantId, propertyId);
    if (!deleted) {
        throw new Error('Failed to delete embedding');
    }

    return {
        success: true,
        message: 'Property embedding deleted successfully',
    };
}

export async function semanticSearchService(
    tenantId: string,
    request: SemanticSearchRequest
): Promise<{
    results: SemanticSearchResult[];
    query: string;
    total: number;
}> {
    if (!request.query || !request.query.trim()) {
        throw new ValidationError('query is required and must not be empty');
    }

    const topK = Math.max(MIN_TOP_K, Math.min(MAX_TOP_K, request.top_k ?? DEFAULT_TOP_K));
    const minScore = Math.max(MIN_MIN_SCORE, Math.min(MAX_MIN_SCORE, request.min_score ?? DEFAULT_MIN_SCORE));

    const results = await semanticSearchProperties(
        tenantId,
        request.query.trim(),
        topK,
        minScore
    );

    return {
        results,
        query: request.query,
        total: results.length,
    };
}

export async function rebuildAllEmbeddingsService(
    tenantId: string
): Promise<{ success: boolean; created: number; total_properties: number }> {
    const result = await listProperties(tenantId, { status: 'available', limit: 1000, offset: 0 });
    
    const totalProperties = result.total;
    const created = await batchCreateEmbeddings(tenantId, result.properties);

    return {
        success: true,
        created,
        total_properties: totalProperties,
    };
}

export async function getEmbeddingStatusService(
    tenantId: string,
    propertyId: string
): Promise<{ has_embedding: boolean; property_id: string }> {
    if (!propertyId) {
        throw new ValidationError('property_id is required');
    }

    const property = await getPropertyById(propertyId, tenantId);
    if (!property) {
        throw new NotFoundError('Property');
    }

    const hasEmbedding = await hasPropertyEmbedding(tenantId, propertyId);

    return {
        has_embedding: hasEmbedding,
        property_id: propertyId,
    };
}