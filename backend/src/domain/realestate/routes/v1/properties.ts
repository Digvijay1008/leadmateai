import { Router, Request, Response } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { authenticateUser, type AuthenticatedRequest } from '../../../../core/middleware/auth.js';
import { ValidationError } from '../../../../shared/index.js';
import * as propertyService from '../../services/property.service.js';

const router = Router();

const upload = multer({ storage: multer.memoryStorage() });

interface MulterRequest extends Request {
    file?: Express.Multer.File;
}

function getStringParam(param: string | string[] | undefined): string | undefined {
    if (Array.isArray(param)) return param[0];
    return param;
}

const createPropertySchema = z.object({
    project_id: z.string().uuid().optional(),
    property_name: z.string().optional(),
    property_type: z.string().min(1),
    city: z.string().min(1),
    locality: z.string().optional(),
    address: z.string().optional(),
    pincode: z.string().optional(),
    bhk_types: z.array(z.string()).optional(),
    min_price: z.number().positive().optional(),
    max_price: z.number().positive().optional(),
    min_sqft: z.number().positive().optional(),
    max_sqft: z.number().positive().optional(),
    builder_name: z.string().optional(),
    project_name: z.string().optional(),
    possession_date: z.string().optional(),
    launch_date: z.string().optional(),
    amenities: z.record(z.unknown()).optional(),
    description: z.string().optional(),
    image_urls: z.array(z.string()).optional(),
    video_url: z.string().url().optional(),
    brochure_url: z.string().url().optional(),
});

const updatePropertySchema = z.object({
    project_id: z.string().uuid().optional(),
    property_name: z.string().optional(),
    property_type: z.string().optional(),
    status: z.string().optional(),
    city: z.string().optional(),
    locality: z.string().optional(),
    address: z.string().optional(),
    pincode: z.string().optional(),
    bhk_types: z.array(z.string()).optional(),
    min_price: z.number().positive().optional(),
    max_price: z.number().positive().optional(),
    min_sqft: z.number().positive().optional(),
    max_sqft: z.number().positive().optional(),
    builder_name: z.string().optional(),
    project_name: z.string().optional(),
    possession_date: z.string().optional(),
    launch_date: z.string().optional(),
    amenities: z.record(z.unknown()).optional(),
    description: z.string().optional(),
    image_urls: z.array(z.string()).optional(),
    video_url: z.string().url().optional(),
    brochure_url: z.string().url().optional(),
});

const listPropertiesQuerySchema = z.object({
    city: z.coerce.string().optional(),
    locality: z.coerce.string().optional(),
    property_type: z.coerce.string().optional(),
    status: z.coerce.string().optional(),
    min_price: z.coerce.number().positive().optional(),
    max_price: z.coerce.number().positive().optional(),
    project_id: z.coerce.string().uuid().optional(),
    search: z.coerce.string().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0),
});

router.post('/', authenticateUser(), async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const tenantId = authReq.auth.tenantId;

        const parseResult = createPropertySchema.safeParse(req.body);
        if (!parseResult.success) {
            throw new ValidationError('Invalid request', { errors: parseResult.error.errors });
        }

        const property = await propertyService.createPropertyService(tenantId, parseResult.data);
        res.status(201).json(property);
    } catch (e: any) {
        if (e instanceof ValidationError) {
            res.status(400).json({ error: e.message, details: e.details });
        } else {
            console.error('[Property] create error:', e);
            res.status(500).json({ error: e.message });
        }
    }
});

router.get('/', authenticateUser(), async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const tenantId = authReq.auth.tenantId;

        const parseResult = listPropertiesQuerySchema.safeParse(req.query);
        if (!parseResult.success) {
            throw new ValidationError('Invalid query', { errors: parseResult.error.errors });
        }

        const result = await propertyService.listPropertiesService(tenantId, parseResult.data);
        res.json(result);
    } catch (e: any) {
        if (e instanceof ValidationError) {
            res.status(400).json({ error: e.message, details: e.details });
        } else {
            console.error('[Property] list error:', e);
            res.status(500).json({ error: e.message });
        }
    }
});

router.get('/:id', authenticateUser(), async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const tenantId = authReq.auth.tenantId;
        const id = getStringParam(req.params.id);

        if (!id) {
            throw new ValidationError('Property ID is required');
        }

        const property = await propertyService.getPropertyService(id, tenantId);
        res.json(property);
    } catch (e: any) {
        if (e.message?.includes('not found')) {
            res.status(404).json({ error: e.message });
        } else {
            console.error('[Property] get error:', e);
            res.status(500).json({ error: e.message });
        }
    }
});

router.put('/:id', authenticateUser(), async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const tenantId = authReq.auth.tenantId;
        const id = getStringParam(req.params.id);

        if (!id) {
            throw new ValidationError('Property ID is required');
        }

        const parseResult = updatePropertySchema.safeParse(req.body);
        if (!parseResult.success) {
            throw new ValidationError('Invalid request', { errors: parseResult.error.errors });
        }

        const property = await propertyService.updatePropertyService(id, tenantId, parseResult.data);
        res.json(property);
    } catch (e: any) {
        if (e instanceof ValidationError) {
            res.status(400).json({ error: e.message, details: e.details });
        } else if (e.message?.includes('not found')) {
            res.status(404).json({ error: e.message });
        } else {
            console.error('[Property] update error:', e);
            res.status(500).json({ error: e.message });
        }
    }
});

router.delete('/:id', authenticateUser(), async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const tenantId = authReq.auth.tenantId;
        const id = getStringParam(req.params.id);

        if (!id) {
            throw new ValidationError('Property ID is required');
        }

        const result = await propertyService.deletePropertyService(id, tenantId);
        res.json(result);
    } catch (e: any) {
        if (e.message?.includes('not found')) {
            res.status(404).json({ error: e.message });
        } else {
            console.error('[Property] delete error:', e);
            res.status(500).json({ error: e.message });
        }
    }
});

router.post('/bulk-upload', authenticateUser(), upload.single('file'), async (req: MulterRequest, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const tenantId = authReq.auth.tenantId;

        if (!req.file) {
            throw new ValidationError('No file uploaded');
        }

        const content = req.file.buffer.toString('utf-8');
        const properties = parseCSV(content);

        const result = await propertyService.bulkUploadPropertiesService(tenantId, { properties });
        res.json(result);
    } catch (e: any) {
        if (e instanceof ValidationError) {
            res.status(400).json({ error: e.message, details: e.details });
        } else {
            console.error('[Property] bulk upload error:', e);
            res.status(500).json({ error: e.message });
        }
    }
});

function parseCSV(content: string): Array<{
    property_type: string;
    city: string;
    locality?: string;
    bhk_types?: string[];
    min_price?: number;
    max_price?: number;
    builder_name?: string;
    project_name?: string;
}> {
    const lines = content.trim().split('\n').filter(line => line.trim());
    if (lines.length < 2) {
        throw new ValidationError('CSV file is empty or has no data rows');
    }

    const firstLine = lines[0];
    if (!firstLine) {
        throw new ValidationError('CSV file has no header row');
    }

    const headers = firstLine.split(',').map(h => h.trim().toLowerCase());
    const rows = lines.slice(1);

    const properties = rows.map(line => {
        const values = line.split(',').map(v => v.trim());
        const obj: any = {};

        headers.forEach((header, i) => {
            const value = values[i];
            if (!value) return;

            switch (header) {
                case 'property_type':
                    obj.property_type = value;
                    break;
                case 'city':
                    obj.city = value;
                    break;
                case 'locality':
                    obj.locality = value;
                    break;
                case 'bhk_types':
                    obj.bhk_types = value.split('|').map(s => s.trim());
                    break;
                case 'min_price':
                    obj.min_price = parseFloat(value);
                    break;
                case 'max_price':
                    obj.max_price = parseFloat(value);
                    break;
                case 'builder_name':
                    obj.builder_name = value;
                    break;
                case 'project_name':
                    obj.project_name = value;
                    break;
            }
        });

        return obj;
    }).filter(p => p.property_type && p.city);

    return properties;
}

export default router;