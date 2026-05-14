import { query, queryMany, queryOne } from '../../../platform/index.js';
import type { Property } from './property.repository.js';

export interface PropertySearchFilters {
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
}

export interface PropertySearchParams extends PropertySearchFilters {
    tenant_id: string;
    page: number;
    limit: number;
}

export interface SearchResult<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
}

interface ProjectSearchFilters {
    city?: string;
    status?: string;
    search?: string;
}

interface ProjectSearchParams extends ProjectSearchFilters {
    tenant_id: string;
    page: number;
    limit: number;
}

interface ScoredProperty extends Property {
    match_score: number;
    score_breakdown: {
        location_match: number;
        budget_fit: number;
        property_type_match: number;
        project_popularity: number;
    };
}

const BASE_SCORE = {
    LOCATION_MATCH: 40,
    BUDGET_FIT: 30,
    PROPERTY_TYPE_MATCH: 20,
    PROJECT_POPULARITY: 10,
};

export async function searchProperties(
    params: PropertySearchParams
): Promise<SearchResult<Property>> {
    const { tenant_id, city, locality, project_id, bhk_types, property_type, min_price, max_price, min_sqft, max_sqft, status, search, page, limit } = params;

    const conditions: string[] = ['p.tenant_id = $1', 'p.status = $2'];
    const queryParams: any[] = [tenant_id, status ?? 'available'];
    let paramIndex = 3;

    if (city) {
        conditions.push(`p.city = $${paramIndex++}`);
        queryParams.push(city);
    }
    if (locality) {
        conditions.push(`p.locality ILIKE $${paramIndex++}`);
        queryParams.push(`%${locality}%`);
    }
    if (project_id) {
        conditions.push(`p.project_id = $${paramIndex++}`);
        queryParams.push(project_id);
    }
    if (bhk_types && bhk_types.length > 0) {
        conditions.push(`p.bhk_types && $${paramIndex++}`);
        queryParams.push(bhk_types);
    }
    if (property_type) {
        conditions.push(`p.property_type = $${paramIndex++}`);
        queryParams.push(property_type);
    }
    if (min_price !== undefined) {
        conditions.push(`p.max_price >= $${paramIndex++}`);
        queryParams.push(min_price);
    }
    if (max_price !== undefined) {
        conditions.push(`p.min_price <= $${paramIndex++}`);
        queryParams.push(max_price);
    }
    if (min_sqft !== undefined) {
        conditions.push(`p.max_sqft >= $${paramIndex++}`);
        queryParams.push(min_sqft);
    }
    if (max_sqft !== undefined) {
        conditions.push(`p.min_sqft <= $${paramIndex++}`);
        queryParams.push(max_sqft);
    }
    if (search) {
        conditions.push(`(p.property_name ILIKE $${paramIndex} OR p.locality ILIKE $${paramIndex} OR p.address ILIKE $${paramIndex} OR p.builder_name ILIKE $${paramIndex})`);
        queryParams.push(`%${search}%`);
        paramIndex++;
    }

    const whereClause = conditions.join(' AND ');
    const offset = (page - 1) * limit;

    const countResult = await queryOne<{ count: string }>(
        `SELECT COUNT(*) as count 
         FROM properties p 
         WHERE ${whereClause}`,
        queryParams
    );
    const total = parseInt(countResult?.count ?? '0', 10);
    const total_pages = Math.ceil(total / limit);

    queryParams.push(limit, offset);
    const properties = await queryMany<Property>(
        `SELECT p.*, pr.project_name as project_name 
         FROM properties p 
         LEFT JOIN property_projects pr ON p.project_id = pr.id
         WHERE ${whereClause}
         ORDER BY p.created_at DESC
         LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
        queryParams
    );

    return {
        data: properties,
        total,
        page,
        limit,
        total_pages,
    };
}

export async function searchProjects(
    params: ProjectSearchParams
): Promise<SearchResult<any>> {
    const { tenant_id, city, status, search, page, limit } = params;

    const conditions: string[] = ['tenant_id = $1'];
    const queryParams: any[] = [tenant_id];
    let paramIndex = 2;

    if (city) {
        conditions.push(`city = $${paramIndex++}`);
        queryParams.push(city);
    }
    if (status) {
        conditions.push(`status = $${paramIndex++}`);
        queryParams.push(status);
    }
    if (search) {
        conditions.push(`(project_name ILIKE $${paramIndex} OR locality ILIKE $${paramIndex} OR builder_name ILIKE $${paramIndex})`);
        queryParams.push(`%${search}%`);
        paramIndex++;
    }

    const whereClause = conditions.join(' AND ');
    const offset = (page - 1) * limit;

    const countResult = await queryOne<{ count: string }>(
        `SELECT COUNT(*) as count 
         FROM property_projects 
         WHERE ${whereClause}`,
        queryParams
    );
    const total = parseInt(countResult?.count ?? '0', 10);
    const total_pages = Math.ceil(total / limit);

    queryParams.push(limit, offset);
    const projects = await queryMany<any>(
        `SELECT * FROM property_projects 
         WHERE ${whereClause}
         ORDER BY created_at DESC
         LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
        queryParams
    );

    return {
        data: projects,
        total,
        page,
        limit,
        total_pages,
    };
}

export async function getProjectPropertyCount(
    tenantId: string,
    projectId: string
): Promise<number> {
    const result = await queryOne<{ count: string }>(
        `SELECT COUNT(*) as count 
         FROM properties 
         WHERE tenant_id = $1 AND project_id = $2 AND status = 'available'`,
        [tenantId, projectId]
    );
    return parseInt(result?.count ?? '0', 10);
}

interface LeadBudgetProfile {
    budget_min: number | null;
    budget_max: number | null;
    preferred_location: string | null;
    property_type: string | null;
}

export async function matchLeadToProperties(
    tenantId: string,
    leadId: string,
    limit: number = 10
): Promise<SearchResult<ScoredProperty>> {
    const lead = await queryOne<LeadBudgetProfile>(
        `SELECT budget_min, budget_max, preferred_location, property_type 
         FROM leads WHERE id = $1 AND tenant_id = $2`,
        [leadId, tenantId]
    );

    if (!lead || (!lead.budget_min && !lead.budget_max && !lead.preferred_location && !lead.property_type)) {
        return {
            data: [],
            total: 0,
            page: 1,
            limit,
            total_pages: 0,
        };
    }

    const conditions: string[] = ['p.tenant_id = $1', 'p.status = $2'];
    const queryParams: any[] = [tenantId, 'available'];
    let paramIndex = 3;

    if (lead.budget_max) {
        conditions.push(`p.min_price <= $${paramIndex++}`);
        queryParams.push(lead.budget_max);
    }
    if (lead.budget_min) {
        conditions.push(`p.max_price >= $${paramIndex++}`);
        queryParams.push(lead.budget_min);
    }
    if (lead.preferred_location) {
        conditions.push(`(p.locality ILIKE $${paramIndex} OR p.city ILIKE $${paramIndex})`);
        queryParams.push(`%${lead.preferred_location}%`);
        paramIndex++;
    }
    if (lead.property_type) {
        conditions.push(`p.property_type = $${paramIndex++}`);
        queryParams.push(lead.property_type);
    }

    const whereClause = conditions.join(' AND ');

    const scoredProperties = await queryMany<ScoredProperty>(
        `SELECT p.*, pr.project_name as project_name,
                ${calculateScoreSQL(lead)} as match_score,
                ${calculateScoreBreakdownSQL(lead)} as score_breakdown
         FROM properties p
         LEFT JOIN property_projects pr ON p.project_id = pr.id
         WHERE ${whereClause}
         ORDER BY match_score DESC, p.created_at DESC
         LIMIT ${limit}`,
        queryParams
    );

    const total = scoredProperties.length;
    const total_pages = Math.ceil(total / limit);

    return {
        data: scoredProperties,
        total,
        page: 1,
        limit,
        total_pages,
    };
}

function calculateScoreSQL(lead: LeadBudgetProfile): string {
    const parts: string[] = [];

    if (lead.preferred_location) {
        parts.push(`CASE WHEN p.locality ILIKE '%${lead.preferred_location}%' OR p.city ILIKE '%${lead.preferred_location}%' THEN ${BASE_SCORE.LOCATION_MATCH} ELSE 0 END`);
    }

    if (lead.budget_min && lead.budget_max) {
        parts.push(`CASE WHEN p.min_price >= ${lead.budget_min} * 0.9 AND p.max_price <= ${lead.budget_max} * 1.1 THEN ${BASE_SCORE.BUDGET_FIT} WHEN p.min_price <= ${lead.budget_max} AND p.max_price >= ${lead.budget_min} THEN ${BASE_SCORE.BUDGET_FIT} / 2 ELSE 0 END`);
    } else if (lead.budget_max) {
        parts.push(`CASE WHEN p.min_price <= ${lead.budget_max} * 1.1 THEN ${BASE_SCORE.BUDGET_FIT} ELSE 0 END`);
    } else if (lead.budget_min) {
        parts.push(`CASE WHEN p.max_price >= ${lead.budget_min} * 0.9 THEN ${BASE_SCORE.BUDGET_FIT} ELSE 0 END`);
    }

    if (lead.property_type) {
        parts.push(`CASE WHEN p.property_type = '${lead.property_type}' THEN ${BASE_SCORE.PROPERTY_TYPE_MATCH} ELSE 0 END`);
    }

    parts.push(`COALESCE((SELECT COUNT(*)::int FROM properties p2 WHERE p2.project_id = p.project_id AND p2.status = 'available'), 0) / 10`);

    return `(${parts.join(' + ')})`;
}

function calculateScoreBreakdownSQL(lead: LeadBudgetProfile): string {
    return `json_build_object(
        'location_match', CASE WHEN p.locality ILIKE '%${lead.preferred_location ?? ''}%' OR p.city ILIKE '%${lead.preferred_location ?? ''}%' THEN ${BASE_SCORE.LOCATION_MATCH} ELSE 0 END,
        'budget_fit', CASE WHEN p.min_price <= ${lead.budget_max ?? '999999999'} AND p.max_price >= ${lead.budget_min ?? '0'} THEN ${BASE_SCORE.BUDGET_FIT} ELSE 0 END,
        'property_type_match', CASE WHEN p.property_type = '${lead.property_type ?? ''}' THEN ${BASE_SCORE.PROPERTY_TYPE_MATCH} ELSE 0 END,
        'project_popularity', COALESCE((SELECT COUNT(*)::int FROM properties p2 WHERE p2.project_id = p.project_id AND p2.status = 'available') / 10, 0)
    )`;
}