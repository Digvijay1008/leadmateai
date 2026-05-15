import {
    query,
    queryOne,
    queryMany,
} from '../../../platform/index.js';
import { generateId } from '../../../shared/index.js';

export interface Property {
    id: string;
    tenant_id: string;
    project_id: string | null;
    property_name: string | null;
    property_type: string;
    status: string;
    city: string;
    locality: string | null;
    address: string | null;
    pincode: string | null;
    bhk_types: string[] | null;
    min_price: number | null;
    max_price: number | null;
    min_sqft: number | null;
    max_sqft: number | null;
    builder_name: string | null;
    project_name: string | null;
    possession_date: Date | null;
    launch_date: Date | null;
    amenities_json: Record<string, any> | null;
    description: string | null;
    image_urls: string[] | null;
    video_url: string | null;
    brochure_url: string | null;
    source_type: string;
    source_reference: string | null;
    created_at: Date;
    updated_at: Date;
}

export interface PropertyProject {
    id: string;
    tenant_id: string;
    project_name: string;
    city: string;
    locality: string | null;
    builder_name: string | null;
    description: string | null;
    total_units: number | null;
    status: string;
    created_at: Date;
    updated_at: Date;
}

export interface PropertyFilters {
    city?: string;
    locality?: string;
    property_type?: string;
    status?: string;
    min_price?: number;
    max_price?: number;
    bhk_types?: string[];
    project_id?: string;
    search?: string;
    limit?: number;
    offset?: number;
}

export interface PaginatedProperties {
    properties: Property[];
    total: number;
    limit: number;
    offset: number;
}

export async function createProperty(params: {
    tenantId: string;
    projectId?: string | null;
    propertyName?: string;
    propertyType: string;
    status?: string;
    city: string;
    locality?: string;
    address?: string;
    pincode?: string;
    bhkTypes?: string[];
    minPrice?: number;
    maxPrice?: number;
    minSqft?: number;
    maxSqft?: number;
    builderName?: string;
    projectName?: string;
    possessionDate?: Date;
    launchDate?: Date;
    amenities?: Record<string, any>;
    description?: string;
    imageUrls?: string[];
    videoUrl?: string;
    brochureUrl?: string;
    sourceType?: string;
    sourceReference?: string;
}): Promise<Property> {
    const id = generateId();

    const result = await queryOne<Property>(
        `INSERT INTO properties (
            id, tenant_id, project_id, property_name, property_type, status,
            city, locality, address, pincode, bhk_types, min_price, max_price,
            min_sqft, max_sqft, builder_name, project_name, possession_date,
            launch_date, amenities_json, description, image_urls, video_url,
            brochure_url, source_type, source_reference
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27)
        RETURNING *`,
        [
            id,
            params.tenantId,
            params.projectId ?? null,
            params.propertyName ?? null,
            params.propertyType,
            params.status ?? 'available',
            params.city,
            params.locality ?? null,
            params.address ?? null,
            params.pincode ?? null,
            params.bhkTypes ?? null,
            params.minPrice ?? null,
            params.maxPrice ?? null,
            params.minSqft ?? null,
            params.maxSqft ?? null,
            params.builderName ?? null,
            params.projectName ?? null,
            params.possessionDate ?? null,
            params.launchDate ?? null,
            params.amenities ? JSON.stringify(params.amenities) : null,
            params.description ?? null,
            params.imageUrls ?? null,
            params.videoUrl ?? null,
            params.brochureUrl ?? null,
            params.sourceType ?? 'manual',
            params.sourceReference ?? null,
        ]
    );

    return result!;
}

export async function getPropertyById(
    propertyId: string,
    tenantId: string
): Promise<Property | null> {
    return queryOne<Property>(
        `SELECT * FROM properties WHERE id = $1 AND tenant_id = $2`,
        [propertyId, tenantId]
    );
}

export async function listProperties(
    tenantId: string,
    filters: PropertyFilters = {}
): Promise<PaginatedProperties> {
    const conditions: string[] = ['tenant_id = $1'];
    const params: any[] = [tenantId];
    let paramIndex = 2;

    if (filters.city) {
        conditions.push(`city = $${paramIndex++}`);
        params.push(filters.city);
    }
    if (filters.locality) {
        conditions.push(`locality ILIKE $${paramIndex++}`);
        params.push(`%${filters.locality}%`);
    }
    if (filters.property_type) {
        conditions.push(`property_type = $${paramIndex++}`);
        params.push(filters.property_type);
    }
    if (filters.status) {
        conditions.push(`status = $${paramIndex++}`);
        params.push(filters.status);
    }
    if (filters.min_price !== undefined) {
        conditions.push(`max_price >= $${paramIndex++}`);
        params.push(filters.min_price);
    }
    if (filters.max_price !== undefined) {
        conditions.push(`min_price <= $${paramIndex++}`);
        params.push(filters.max_price);
    }
    if (filters.project_id) {
        conditions.push(`project_id = $${paramIndex++}`);
        params.push(filters.project_id);
    }
    if (filters.search) {
        conditions.push(`(property_name ILIKE $${paramIndex} OR locality ILIKE $${paramIndex} OR address ILIKE $${paramIndex})`);
        params.push(`%${filters.search}%`);
        paramIndex++;
    }

    const whereClause = conditions.join(' AND ');
    const limit = filters.limit ?? 20;
    const offset = filters.offset ?? 0;

    const countResult = await queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM properties WHERE ${whereClause}`,
        params
    );
    const total = parseInt(countResult?.count ?? '0', 10);

    params.push(limit, offset);
    const properties = await queryMany<Property>(
        `SELECT * FROM properties WHERE ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
        params
    );

    return { properties, total, limit, offset };
}

export async function updateProperty(
    propertyId: string,
    tenantId: string,
    updates: Partial<{
        propertyName: string;
        propertyType: string;
        status: string;
        city: string;
        locality: string;
        address: string;
        pincode: string;
        bhkTypes: string[];
        minPrice: number;
        maxPrice: number;
        minSqft: number;
        maxSqft: number;
        builderName: string;
        projectName: string;
        projectId: string;
        possessionDate: Date;
        launchDate: Date;
        amenities: Record<string, any>;
        description: string;
        imageUrls: string[];
        videoUrl: string;
        brochureUrl: string;
    }>
): Promise<Property | null> {
    const setClauses: string[] = ['updated_at = NOW()'];
    const params: any[] = [];
    let paramIndex = 1;

    if (updates.propertyName !== undefined) {
        setClauses.push(`property_name = $${paramIndex++}`);
        params.push(updates.propertyName);
    }
    if (updates.propertyType !== undefined) {
        setClauses.push(`property_type = $${paramIndex++}`);
        params.push(updates.propertyType);
    }
    if (updates.status !== undefined) {
        setClauses.push(`status = $${paramIndex++}`);
        params.push(updates.status);
    }
    if (updates.city !== undefined) {
        setClauses.push(`city = $${paramIndex++}`);
        params.push(updates.city);
    }
    if (updates.locality !== undefined) {
        setClauses.push(`locality = $${paramIndex++}`);
        params.push(updates.locality);
    }
    if (updates.address !== undefined) {
        setClauses.push(`address = $${paramIndex++}`);
        params.push(updates.address);
    }
    if (updates.pincode !== undefined) {
        setClauses.push(`pincode = $${paramIndex++}`);
        params.push(updates.pincode);
    }
    if (updates.bhkTypes !== undefined) {
        setClauses.push(`bhk_types = $${paramIndex++}`);
        params.push(updates.bhkTypes);
    }
    if (updates.minPrice !== undefined) {
        setClauses.push(`min_price = $${paramIndex++}`);
        params.push(updates.minPrice);
    }
    if (updates.maxPrice !== undefined) {
        setClauses.push(`max_price = $${paramIndex++}`);
        params.push(updates.maxPrice);
    }
    if (updates.minSqft !== undefined) {
        setClauses.push(`min_sqft = $${paramIndex++}`);
        params.push(updates.minSqft);
    }
    if (updates.maxSqft !== undefined) {
        setClauses.push(`max_sqft = $${paramIndex++}`);
        params.push(updates.maxSqft);
    }
    if (updates.builderName !== undefined) {
        setClauses.push(`builder_name = $${paramIndex++}`);
        params.push(updates.builderName);
    }
    if (updates.projectName !== undefined) {
        setClauses.push(`project_name = $${paramIndex++}`);
        params.push(updates.projectName);
    }
    if (updates.projectId !== undefined) {
        setClauses.push(`project_id = $${paramIndex++}`);
        params.push(updates.projectId);
    }
    if (updates.possessionDate !== undefined) {
        setClauses.push(`possession_date = $${paramIndex++}`);
        params.push(updates.possessionDate);
    }
    if (updates.launchDate !== undefined) {
        setClauses.push(`launch_date = $${paramIndex++}`);
        params.push(updates.launchDate);
    }
    if (updates.amenities !== undefined) {
        setClauses.push(`amenities_json = $${paramIndex++}`);
        params.push(JSON.stringify(updates.amenities));
    }
    if (updates.description !== undefined) {
        setClauses.push(`description = $${paramIndex++}`);
        params.push(updates.description);
    }
    if (updates.imageUrls !== undefined) {
        setClauses.push(`image_urls = $${paramIndex++}`);
        params.push(updates.imageUrls);
    }
    if (updates.videoUrl !== undefined) {
        setClauses.push(`video_url = $${paramIndex++}`);
        params.push(updates.videoUrl);
    }
    if (updates.brochureUrl !== undefined) {
        setClauses.push(`brochure_url = $${paramIndex++}`);
        params.push(updates.brochureUrl);
    }

    if (setClauses.length === 1) {
        return getPropertyById(propertyId, tenantId);
    }

    params.push(propertyId, tenantId);

    return queryOne<Property>(
        `UPDATE properties SET ${setClauses.join(', ')} WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex} RETURNING *`,
        params
    );
}

export async function deleteProperty(
    propertyId: string,
    tenantId: string
): Promise<boolean> {
    const result = await query(
        `DELETE FROM properties WHERE id = $1 AND tenant_id = $2`,
        [propertyId, tenantId]
    );
    return (result.rowCount ?? 0) > 0;
}

export async function bulkCreateProperties(
    tenantId: string,
    properties: Array<{
        propertyType: string;
        city: string;
        locality?: string;
        bhkTypes?: string[];
        minPrice?: number;
        maxPrice?: number;
        builderName?: string;
        projectName?: string;
    }>
): Promise<number> {
    let inserted = 0;

    for (const p of properties) {
        try {
            await createProperty({
                tenantId,
                propertyType: p.propertyType,
                city: p.city,
                locality: p.locality,
                bhkTypes: p.bhkTypes,
                minPrice: p.minPrice,
                maxPrice: p.maxPrice,
                builderName: p.builderName,
                projectName: p.projectName,
                sourceType: 'csv_import',
            });
            inserted++;
        } catch (error) {
            console.error('[Property] bulk insert failed:', error);
        }
    }

    return inserted;
}

export async function createPropertyProject(params: {
    tenantId: string;
    projectName: string;
    city: string;
    locality?: string;
    builderName?: string;
    description?: string;
    totalUnits?: number;
    status?: string;
}): Promise<PropertyProject> {
    const id = generateId();

    const result = await queryOne<PropertyProject>(
        `INSERT INTO property_projects (
            id, tenant_id, project_name, city, locality, builder_name,
            description, total_units, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
            id,
            params.tenantId,
            params.projectName,
            params.city,
            params.locality ?? null,
            params.builderName ?? null,
            params.description ?? null,
            params.totalUnits ?? null,
            params.status ?? 'active',
        ]
    );

    return result!;
}

export async function getPropertyProjectById(
    projectId: string,
    tenantId: string
): Promise<PropertyProject | null> {
    return queryOne<PropertyProject>(
        `SELECT * FROM property_projects WHERE id = $1 AND tenant_id = $2`,
        [projectId, tenantId]
    );
}

export async function listPropertyProjects(
    tenantId: string,
    filters: { city?: string; status?: string } = {}
): Promise<PropertyProject[]> {
    const conditions: string[] = ['tenant_id = $1'];
    const params: any[] = [tenantId];
    let paramIndex = 2;

    if (filters.city) {
        conditions.push(`city = $${paramIndex++}`);
        params.push(filters.city);
    }
    if (filters.status) {
        conditions.push(`status = $${paramIndex++}`);
        params.push(filters.status);
    }

    return queryMany<PropertyProject>(
        `SELECT * FROM property_projects WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`,
        params
    );
}
