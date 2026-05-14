import { Router } from 'express';
// @ts-ignore
import multer from 'multer';
import { authenticateUser, type AuthenticatedRequest } from '../../../../core/middleware/auth.js';
import { getAgentConfig, updateAgentConfig } from '../../services/agent-config.service.js';
import { ingestFileDocument, ingestManualText } from '../../services/rag/ingestion.service.js';
import { query, queryMany, queryOne } from '../../../../platform/index.js';

const router = Router();

// Setup Multer for memory storage, limiting up to 10MB
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req: any, file: any, cb: any) => {
        const allowedMimeTypes = [
            'application/pdf',
            'text/plain',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Invalid file type: ${file.mimetype}`));
        }
    }
});

// Apply middleware only to specific paths in this router so it doesn't bleed
// to other /v1 routes when mounted at the /v1 level in index.ts
import { configRateLimit } from '../../../../core/middleware/rate-limit.js';
router.use('/agent/config', authenticateUser(), configRateLimit);
router.use('/knowledge-base', authenticateUser(), configRateLimit);

/**
 * ==============================
 * Unified Agent & Voice Profile
 * ==============================
 */

// Get current unified config
router.get('/agent/config', async (req, res) => {
    try {
        const tenantId = (req as any).auth.tenantId;

        // Fetch user basic config
        const tenant = await queryOne<{ system_prompt: string; greeting_message: string }>(
            `SELECT system_prompt, greeting_message FROM tenants WHERE id = $1`,
            [tenantId]
        );

        if (!tenant) {
            return res.status(404).json({ error: 'Tenant not found' });
        }

        // Fetch advanced voice config
        const voiceConfig = await queryOne<{
            preset_id: string;
            voice_persona_id: string;
            goodbye_message: string;
            max_session_duration_seconds: number;
        }>(
            `SELECT preset_id, voice_persona_id, goodbye_message, max_session_duration_seconds 
             FROM tenant_voice_config WHERE tenant_id = $1`,
            [tenantId]
        ) || {
            preset_id: 'standard',
            voice_persona_id: 'maya',
            goodbye_message: 'Thank you for calling. Goodbye!',
            max_session_duration_seconds: 900
        };

        const config = {
            system_prompt: tenant.system_prompt || '',
            greeting_message: tenant.greeting_message || '',
            voice_preset: voiceConfig.preset_id,
            language: voiceConfig.voice_persona_id === 'maya' || voiceConfig.voice_persona_id === 'raj' ? 'en-IN' : 'en-US',
            goodbye_message: voiceConfig.goodbye_message,
            interruption_mode: 'adaptive', // static for now as requested
            max_call_duration_seconds: voiceConfig.max_session_duration_seconds
        };

        res.json({ config });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Update unified config
router.put('/agent/config', async (req, res) => {
    try {
        const tenantId = (req as any).auth.tenantId;
        const { 
            system_prompt, 
            greeting_message, 
            voice_preset, 
            language,
            goodbye_message, 
            interruption_mode,
            max_call_duration_seconds,
            tone,
            behavior_rules
        } = req.body;

        // Build combined prompt if parts are provided
        let finalPrompt = system_prompt;
        if (tone || behavior_rules) {
            finalPrompt = (system_prompt || '') + '\n\n';
            if (tone) finalPrompt += `Tone: ${tone}\n`;
            if (behavior_rules) finalPrompt += `Behavior Rules: ${behavior_rules}\n`;
            finalPrompt = finalPrompt.trim();
        }

        // Update core agent prompt
        if (finalPrompt !== undefined || greeting_message !== undefined) {
             const updates: string[] = [];
             const values: any[] = [];
             let i = 1;

             if (finalPrompt !== undefined) {
                 updates.push(`system_prompt = $${i++}`);
                 values.push(finalPrompt);
             }
             if (greeting_message !== undefined) {
                 updates.push(`greeting_message = $${i++}`);
                 values.push(greeting_message);
             }

             if (updates.length > 0) {
                 values.push(tenantId);
                 await query(`UPDATE tenants SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${i}`, values);
             }
        }

        // Update voice config
        const voiceUpdates: string[] = [];
        const voiceValues: any[] = [];
        let j = 1;

        if (voice_preset !== undefined) {
            voiceUpdates.push(`preset_id = $${j++}`);
            voiceValues.push(voice_preset);
        }
        if (goodbye_message !== undefined) {
            voiceUpdates.push(`goodbye_message = $${j++}`);
            voiceValues.push(goodbye_message);
        }
        if (max_call_duration_seconds !== undefined) {
            voiceUpdates.push(`max_session_duration_seconds = $${j++}`);
            voiceValues.push(max_call_duration_seconds);
        }
        if (language !== undefined) {
            // map language back to persona
            const personaId = language === 'en-IN' ? 'maya' : 'sarah';
            voiceUpdates.push(`voice_persona_id = $${j++}`);
            voiceValues.push(personaId);
        }

        if (voiceUpdates.length > 0) {
            voiceValues.push(tenantId);
            const voiceRes = await query(`UPDATE tenant_voice_config SET ${voiceUpdates.join(', ')}, updated_at = NOW() WHERE tenant_id = $${j}`, voiceValues);

            // Upsert if not exists
            if (voiceRes.rowCount === 0) {
               await query(`INSERT INTO tenant_voice_config (tenant_id) VALUES ($1) ON CONFLICT DO NOTHING`, [tenantId]);
               await query(`UPDATE tenant_voice_config SET ${voiceUpdates.join(', ')} WHERE tenant_id = $${j}`, voiceValues);
            }
        }

        res.json({ message: 'Profile updated successfully' });
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});

/**
 * ==============================
 * Knowledge Base Endpoints
 * ==============================
 */

// List documents
router.get('/knowledge-base', async (req, res) => {
    try {
        const tenantId = (req as any).auth.tenantId;
        const docs = await queryMany(
            `SELECT id, filename, original_filename, file_type, status, error_message, chunk_count, created_at 
             FROM kb_documents 
             WHERE tenant_id = $1 
             ORDER BY created_at DESC`,
            [tenantId]
        );
        res.json({ documents: docs });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Get stats
router.get('/knowledge-base/stats', async (req, res) => {
    try {
        const tenantId = (req as any).auth.tenantId;
        const totalDocsQuery = await queryOne<{ count: string }>(
            `SELECT COUNT(*) as count FROM kb_documents WHERE tenant_id = $1`, [tenantId]
        );
        const processingDocsQuery = await queryOne<{ count: string }>(
            `SELECT COUNT(*) as count FROM kb_documents WHERE tenant_id = $1 AND status = 'processing'`, [tenantId]
        );
        const readyDocsQuery = await queryOne<{ count: string }>(
            `SELECT COUNT(*) as count FROM kb_documents WHERE tenant_id = $1 AND status = 'ready'`, [tenantId]
        );
        const totalChunksQuery = await queryOne<{ sum: string }>(
            `SELECT SUM(chunk_count) as sum FROM kb_documents WHERE tenant_id = $1`, [tenantId]
        );

        res.json({
            totalDocuments: parseInt(totalDocsQuery?.count || '0', 10),
            processingDocuments: parseInt(processingDocsQuery?.count || '0', 10),
            readyDocuments: parseInt(readyDocsQuery?.count || '0', 10),
            totalChunks: parseInt(totalChunksQuery?.sum || '0', 10)
        });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Check processing status
router.get('/knowledge-base/:doc_id/status', async (req, res) => {
    try {
        const tenantId = (req as any).auth.tenantId;
        const docId = req.params.doc_id;

        const doc = await queryOne<{ status: string; error_message: string; chunk_count: number }>(
            `SELECT status, error_message, chunk_count FROM kb_documents WHERE id = $1 AND tenant_id = $2`,
            [docId, tenantId]
        );

        if (!doc) {
            return res.status(404).json({ error: 'Document not found' });
        }

        res.json({ status: doc.status, error_message: doc.error_message, chunks: doc.chunk_count });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Upload a document via multipart/form-data
router.post('/knowledge-base/upload', upload.single('file'), async (req, res) => {
    try {
        const file = (req as any).file;
        if (!file) {
            return res.status(400).json({ error: 'File is required' });
        }

        const tenantId = (req as any).auth.tenantId;
        const result = await ingestFileDocument(
            tenantId,
            file.buffer,
            file.originalname,
            file.mimetype,
            file.size
        );

        res.json({ message: 'File uploaded and is processing', document_id: result.document_id });
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});

// Add manual text source
router.post('/knowledge-base/text', async (req, res) => {
    try {
        const tenantId = (req as any).auth.tenantId;
        const { title, content } = req.body;

        if (!title || !content) {
            return res.status(400).json({ error: 'Title and content are required' });
        }

        const result = await ingestManualText(tenantId, title, content);

        res.json({ message: 'Text added and is processing', document_id: result.document_id });
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});

// Delete document and all cascading data
router.delete('/knowledge-base/:doc_id', async (req, res) => {
    try {
        const tenantId = (req as any).auth.tenantId;
        const docId = req.params.doc_id;

        const result = await query(
            `DELETE FROM kb_documents WHERE id = $1 AND tenant_id = $2`,
            [docId, tenantId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Document not found' });
        }

        res.json({ message: 'Document removed' });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
