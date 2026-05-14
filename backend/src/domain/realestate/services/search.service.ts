import {
    searchProperties,
    searchProjects,
    matchLeadToProperties,
    type PropertySearchFilters,
    type SearchResult,
} from '../repositories/search.repository.js';
import { getLeadById } from '../repositories/lead.repository.js';
import { NotFoundError, ValidationError } from '../../../shared/index.js';

export interface PropertySearchRequest {
    city?: string;
    locality?: string;
    project_id?: string;
    bhk_types?: string[];
    property_type?: string;
    min_price?: number;
    max_price?: number;
    min_sqft?: number;
    max_sqft?: number;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
}

export interface ProjectSearchRequest {
    city?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
}

export interface MatchLeadRequest {
    limit?: number;
}

export const VALID_PROPERTY_TYPES = ['apartment', 'villa', 'independent_house', 'plot', 'commercial', 'other'];
export const VALID_PROPERTY_STATUSES = ['available', 'sold', 'reserved', 'under_construction'];
export const VALID_PROJECT_STATUSES = ['active', 'completed', 'on_hold', 'cancelled'];
export const VALID_BHK_TYPES = ['1BHK', '2BHK', '3BHK', '4BHK', '5BHK', '6+BHK'];

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function normalizePagination(page?: number, limit?: number) {
    const p = Math.max(1, page ?? DEFAULT_PAGE);
    const l = Math.min(MAX_LIMIT, Math.max(1, limit ?? DEFAULT_LIMIT));
    return { page: p, limit: l };
}

export async function searchPropertiesService(
    tenantId: string,
    request: PropertySearchRequest
): Promise<SearchResult<any>> {
    if (request.min_price !== undefined && request.min_price < 0) {
        throw new ValidationError('min_price must be positive');
    }
    if (request.max_price !== undefined && request.max_price < 0) {
        throw new ValidationError('max_price must be positive');
    }
    if (request.min_price !== undefined && request.max_price !== undefined && request.min_price > request.max_price) {
        throw new ValidationError('min_price cannot be greater than max_price');
    }
    if (request.min_sqft !== undefined && request.min_sqft < 0) {
        throw new ValidationError('min_sqft must be positive');
    }
    if (request.max_sqft !== undefined && request.max_sqft < 0) {
        throw new ValidationError('max_sqft must be positive');
    }
    if (request.property_type && !VALID_PROPERTY_TYPES.includes(request.property_type)) {
        throw new ValidationError(`Invalid property_type. Must be one of: ${VALID_PROPERTY_TYPES.join(', ')}`);
    }
    if (request.status && !VALID_PROPERTY_STATUSES.includes(request.status)) {
        throw new ValidationError(`Invalid status. Must be one of: ${VALID_PROPERTY_STATUSES.join(', ')}`);
    }
    if (request.bhk_types && request.bhk_types.length > 0) {
        for (const bhk of request.bhk_types) {
            if (!VALID_BHK_TYPES.includes(bhk)) {
                throw new ValidationError(`Invalid bhk_type: ${bhk}. Must be one of: ${VALID_BHK_TYPES.join(', ')}`);
            }
        }
    }

    const { page, limit } = normalizePagination(request.page, request.limit);

    return searchProperties({
        tenant_id: tenantId,
        city: request.city,
        locality: request.locality,
        project_id: request.project_id,
        bhk_types: request.bhk_types,
        property_type: request.property_type,
        min_price: request.min_price,
        max_price: request.max_price,
        min_sqft: request.min_sqft,
        max_sqft: request.max_sqft,
        status: request.status,
        search: request.search,
        page,
        limit,
    });
}

export async function searchProjectsService(
    tenantId: string,
    request: ProjectSearchRequest
): Promise<SearchResult<any>> {
    if (request.status && !VALID_PROJECT_STATUSES.includes(request.status)) {
        throw new ValidationError(`Invalid status. Must be one of: ${VALID_PROJECT_STATUSES.join(', ')}`);
    }

    const { page, limit } = normalizePagination(request.page, request.limit);

    const result = await searchProjects({
        tenant_id: tenantId,
        city: request.city,
        status: request.status,
        search: request.search,
        page,
        limit,
    });

    const dataWithPropertyCount = await Promise.all(
        result.data.map(async (project: any) => {
            const propertyCount = await getProjectPropertyCountSafe(tenantId, project.id);
            return {
                ...project,
                property_count: propertyCount,
            };
        })
    );

    return {
        ...result,
        data: dataWithPropertyCount,
    };
}

async function getProjectPropertyCountSafe(tenantId: string, projectId: string): Promise<number> {
    try {
        const { getProjectPropertyCount } = await import('../repositories/search.repository.js');
        return await getProjectPropertyCount(tenantId, projectId);
    } catch {
        return 0;
    }
}

export async function matchLeadToPropertiesService(
    tenantId: string,
    leadId: string,
    request: MatchLeadRequest = {}
): Promise<SearchResult<any>> {
    const lead = await getLeadById(leadId, tenantId);
    if (!lead) {
        throw new NotFoundError('Lead');
    }

    if (!lead.budget_min && !lead.budget_max && !lead.preferred_location && !lead.property_type) {
        throw new ValidationError('Lead has no matching criteria (budget, location, or property_type)');
    }

    const limit = Math.min(MAX_LIMIT, Math.max(1, request.limit ?? 10));

    return matchLeadToProperties(tenantId, leadId, limit);
}