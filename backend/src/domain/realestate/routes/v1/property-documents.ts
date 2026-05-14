import { Router, Request, Response } from 'express';
import multer from 'multer';
import { authenticateUser, type AuthenticatedRequest } from '../../../../core/middleware/auth.js';
import { ValidationError } from '../../../../shared/index.js';
import { ingestFileDocument } from '../../services/rag/ingestion.service.js';

const router = Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024,
    },
    fileFilter: (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
        const allowed = ['application/pdf', 'text/plain', 
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF, DOCX, and TXT are allowed.'));
        }
    },
});

interface MulterRequest extends Request {
    file?: Express.Multer.File;
}

router.post('/:propertyId/documents', authenticateUser(), upload.single('file'), async (req: MulterRequest, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const tenantId = authReq.auth.tenantId;
        const { propertyId } = req.params;

        if (!req.file) {
            throw new ValidationError('No file uploaded');
        }

        const result = await ingestFileDocument(
            tenantId,
            req.file.buffer,
            req.file.originalname,
            req.file.mimetype,
            req.file.size
        );

        console.log('[Property] Document linked to property', {
            property_id: propertyId,
            document_id: result.document_id,
            filename: req.file.originalname,
        });

        res.status(201).json({
            success: true,
            document_id: result.document_id,
            filename: req.file.originalname,
            message: 'Document uploaded and processing started',
        });
    } catch (e: any) {
        console.error('[Property] document upload error:', e);
        res.status(500).json({ error: e.message });
    }
});

export default router;