import {
    createProperty,
    getPropertyById,
    listProperties,
    updateProperty,
    deleteProperty,
    bulkCreateProperties,
    createPropertyProject,
    getPropertyProjectById,
    listPropertyProjects,
    type PropertyFilters,
} from '../repositories/property.repository.js';
import { NotFoundError, ValidationError } from '../../../shared/index.js';

export interface CreatePropertyRequest {
    project_id?: string;
    property_name?: string;
    property_type: string;
    city: string;
    locality?: string;
    address?: string;
    pincode?: string;
    bhk_types?: string[];
    min_price?: number;
    max_price?: number;
    min_sqft?: number;
    max_sqft?: number;
    builder_name?: string;
    project_name?: string;
    possession_date?: string;
    launch_date?: string;
    amenities?: Record<string, any>;
    description?: string;
    image_urls?: string[];
    video_url?: string;
    brochure_url?: string;
}

export interface UpdatePropertyRequest {
    property_name?: string;
    property_type?: string;
    status?: string;
    city?: string;
    locality?: string;
    address?: string;
    pincode?: string;
    bhk_types?: string[];
    min_price?: number;
    max_price?: number;
    min_sqft?: number;
    max_sqft?: number;
    builder_name?: string;
    project_name?: string;
    project_id?: string;
    possession_date?: string;
    launch_date?: string;
    amenities?: Record<string, any>;
    description?: string;
    image_urls?: string[];
    video_url?: string;
    brochure_url?: string;
}

export interface ListPropertiesRequest extends PropertyFilters {}

export interface BulkUploadRequest {
    properties: Array<{
        property_type: string;
        city: string;
        locality?: string;
        bhk_types?: string[];
        min_price?: number;
        max_price?: number;
        builder_name?: string;
        project_name?: string;
    }>;
}

export async function createPropertyService(
    tenantId: string,
    request: CreatePropertyRequest
) {
    if (!request.property_type) {
        throw new ValidationError('property_type is required');
    }
    if (!request.city) {
        throw new ValidationError('city is required');
    }

    return createProperty({
        tenantId,
        projectId: request.project_id,
        propertyName: request.property_name,
        propertyType: request.property_type,
        city: request.city,
        locality: request.locality,
        address: request.address,
        pincode: request.pincode,
        bhkTypes: request.bhk_types,
        minPrice: request.min_price,
        maxPrice: request.max_price,
        minSqft: request.min_sqft,
        maxSqft: request.max_sqft,
        builderName: request.builder_name,
        projectName: request.project_name,
        possessionDate: request.possession_date ? new Date(request.possession_date) : undefined,
        launchDate: request.launch_date ? new Date(request.launch_date) : undefined,
        amenities: request.amenities,
        description: request.description,
        imageUrls: request.image_urls,
        videoUrl: request.video_url,
        brochureUrl: request.brochure_url,
    });
}

export async function getPropertyService(
    propertyId: string,
    tenantId: string
) {
    const property = await getPropertyById(propertyId, tenantId);
    if (!property) {
        throw new NotFoundError('Property');
    }
    return property;
}

export async function listPropertiesService(
    tenantId: string,
    filters: ListPropertiesRequest
) {
    return listProperties(tenantId, filters);
}

export async function updatePropertyService(
    propertyId: string,
    tenantId: string,
    request: UpdatePropertyRequest
) {
    const property = await getPropertyById(propertyId, tenantId);
    if (!property) {
        throw new NotFoundError('Property');
    }

    return updateProperty(propertyId, tenantId, {
        propertyName: request.property_name,
        propertyType: request.property_type,
        status: request.status,
        city: request.city,
        locality: request.locality,
        address: request.address,
        pincode: request.pincode,
        bhkTypes: request.bhk_types,
        minPrice: request.min_price,
        maxPrice: request.max_price,
        minSqft: request.min_sqft,
        maxSqft: request.max_sqft,
        builderName: request.builder_name,
        projectName: request.project_name,
        projectId: request.project_id,
        possessionDate: request.possession_date ? new Date(request.possession_date) : undefined,
        launchDate: request.launch_date ? new Date(request.launch_date) : undefined,
        amenities: request.amenities,
        description: request.description,
        imageUrls: request.image_urls,
        videoUrl: request.video_url,
        brochureUrl: request.brochure_url,
    });
}

export async function deletePropertyService(
    propertyId: string,
    tenantId: string
) {
    const property = await getPropertyById(propertyId, tenantId);
    if (!property) {
        throw new NotFoundError('Property');
    }

    const deleted = await deleteProperty(propertyId, tenantId);
    if (!deleted) {
        throw new Error('Failed to delete property');
    }

    return { success: true };
}

export async function bulkUploadPropertiesService(
    tenantId: string,
    request: BulkUploadRequest
) {
    if (!request.properties || request.properties.length === 0) {
        throw new ValidationError('No properties provided');
    }

    const inserted = await bulkCreateProperties(
        tenantId,
        request.properties.map(p => ({
            propertyType: p.property_type,
            city: p.city,
            locality: p.locality,
            bhkTypes: p.bhk_types,
            minPrice: p.min_price,
            maxPrice: p.max_price,
            builderName: p.builder_name,
            projectName: p.project_name,
        }))
    );

    return {
        success: true,
        imported: inserted,
        total: request.properties.length,
    };
}

export async function createPropertyProjectService(
    tenantId: string,
    request: {
        project_name: string;
        city: string;
        locality?: string;
        builder_name?: string;
        description?: string;
        total_units?: number;
    }
) {
    if (!request.project_name) {
        throw new ValidationError('project_name is required');
    }
    if (!request.city) {
        throw new ValidationError('city is required');
    }

    return createPropertyProject({
        tenantId,
        projectName: request.project_name,
        city: request.city,
        locality: request.locality,
        builderName: request.builder_name,
        description: request.description,
        totalUnits: request.total_units,
    });
}

export async function getPropertyProjectService(
    projectId: string,
    tenantId: string
) {
    const project = await getPropertyProjectById(projectId, tenantId);
    if (!project) {
        throw new NotFoundError('Property Project');
    }
    return project;
}

export async function listPropertyProjectsService(
    tenantId: string,
    filters: { city?: string; status?: string } = {}
) {
    return listPropertyProjects(tenantId, filters);
}