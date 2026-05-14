-- Agent config columns
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS system_prompt TEXT DEFAULT 'You are a helpful voice assistant for {business_name}. Be polite, professional, and helpful.',
ADD COLUMN IF NOT EXISTS greeting_message TEXT DEFAULT 'Hello! How can I help you today?';

-- Knowledge base improvements  
ALTER TABLE kb_documents
ADD COLUMN IF NOT EXISTS source_type VARCHAR(20) DEFAULT 'file',
ADD COLUMN IF NOT EXISTS error_message TEXT;
-- chunk_count is already in 001_core_schema.sql, but we can safely try to add it with IF NOT EXISTS in case it isn't
ALTER TABLE kb_documents ADD COLUMN IF NOT EXISTS chunk_count INTEGER DEFAULT 0;

-- Ensure vector extension and index exist
CREATE EXTENSION IF NOT EXISTS vector;
CREATE INDEX IF NOT EXISTS idx_kb_embeddings_vector 
ON kb_embeddings USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_kb_embeddings_tenant 
ON kb_embeddings(tenant_id);
