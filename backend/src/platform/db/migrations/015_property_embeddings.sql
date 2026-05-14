-- ===========================================
-- PROPERTY EMBEDDINGS + SEMANTIC SEARCH
-- Migration: 015_property_embeddings
-- Multi-tenant Vector Search for Properties
-- ===========================================

-- Enable vector extension (pgvector)
-- Note: If vector extension is not available, this will fail.
-- For production, ensure pgvector extension is installed:
-- CREATE EXTENSION vector;

-- Try to enable vector extension, continue if already exists
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS vector;
EXCEPTION
    WHEN duplicate_object THEN
        NULL;
END
$$;

-- ===========================================
-- PROPERTY EMBEDDINGS TABLE
-- Store vector embeddings for semantic property search
-- ===========================================
CREATE TABLE IF NOT EXISTS property_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding vector(1536) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for property embeddings
CREATE INDEX idx_property_embeddings_tenant ON property_embeddings(tenant_id);
CREATE INDEX idx_property_embeddings_property ON property_embeddings(property_id);

-- IVFFlat vector index for cosine similarity search
-- lists=100 works well for up to ~10k embeddings per tenant
-- For larger datasets, consider HNSW index
CREATE INDEX idx_property_embeddings_vector_ivfflat 
    ON property_embeddings USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- Composite index for tenant-scoped vector search
CREATE INDEX idx_property_embeddings_tenant_vector 
    ON property_embeddings(tenant_id);

-- ===========================================
-- FUNCTION: Search properties by semantic similarity
-- ===========================================
-- This function enables efficient SQL-side semantic search
-- Returns properties with their similarity scores

CREATE OR REPLACE FUNCTION search_properties_by_embedding(
    search_embedding vector(1536),
    tenant_id_val uuid,
    top_k int DEFAULT 10
)
RETURNS TABLE (
    property_id uuid,
    similarity_score float,
    content text,
    property_data jsonb
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pe.property_id,
        1 - (pe.embedding <=> search_embedding) as similarity_score,
        pe.content,
        row_to_json(p)::jsonb as property_data
    FROM property_embeddings pe
    JOIN properties p ON pe.property_id = p.id
    WHERE pe.tenant_id = tenant_id_val
      AND p.status = 'available'
      AND 1 - (pe.embedding <=> search_embedding) >= 0.5
    ORDER BY pe.embedding <=> search_embedding
    LIMIT top_k;
END;
$$ LANGUAGE plpgsql STABLE;

-- ===========================================
-- FUNCTION: Hybrid search combining semantic + popularity
-- ===========================================
CREATE OR REPLACE FUNCTION hybrid_property_search(
    search_embedding vector(1536),
    tenant_id_val uuid,
    top_k int DEFAULT 10,
    semantic_weight float DEFAULT 0.7,
    popularity_weight float DEFAULT 0.3
)
RETURNS TABLE (
    property_id uuid,
    combined_score float,
    similarity_score float,
    popularity_score float,
    content text,
    property_data jsonb
) AS $$
BEGIN
    RETURN QUERY
    WITH semantic_scores AS (
        SELECT 
            pe.property_id,
            pe.content,
            1 - (pe.embedding <=> search_embedding) as similarity_score
        FROM property_embeddings pe
        JOIN properties p ON pe.property_id = p.id
        WHERE pe.tenant_id = tenant_id_val
          AND p.status = 'available'
    ),
    popularity_scores AS (
        SELECT 
            p.id as property_id,
            COALESCE(
                (SELECT COUNT(*)::float 
                 FROM properties p2 
                 WHERE p2.project_id = p.project_id 
                   AND p2.status = 'available') / 100.0,
                0
            ) as popularity_score
        FROM properties p
        WHERE p.tenant_id = tenant_id_val
          AND p.status = 'available'
    )
    SELECT 
        s.property_id,
        (s.similarity_score * semantic_weight + COALESCE(p.popularity_score, 0) * popularity_weight) as combined_score,
        s.similarity_score,
        COALESCE(p.popularity_score, 0) as popularity_score,
        s.content,
        row_to_json(p2)::jsonb as property_data
    FROM semantic_scores s
    LEFT JOIN popularity_scores p ON s.property_id = p.property_id
    JOIN properties p2 ON s.property_id = p2.id
    ORDER BY combined_score DESC
    LIMIT top_k;
END;
$$ LANGUAGE plpgsql STABLE;

-- ===========================================
-- COMMENTS
-- ===========================================
COMMENT ON TABLE property_embeddings IS 'Vector embeddings for semantic property search - always filter by tenant_id';
COMMENT ON INDEX idx_property_embeddings_vector_ivfflat IS 'IVFFlat index for cosine similarity search - O(log n) for large datasets';

-- ===========================================
-- MONITORING NOTES
-- ===========================================
-- To check vector index usage:
-- EXPLAIN ANALYZE SELECT * FROM search_properties_by_embedding(...)

-- To rebuild index after data changes:
-- REINDEX INDEX idx_property_embeddings_vector_ivfflat;

-- For very large datasets (>100k), consider HNSW index instead:
-- CREATE INDEX idx_property_embeddings_vector_hnsw 
--     ON property_embeddings USING hnsw (embedding vector_cosine_ops)
--     WITH (m = 16, ef_construction = 200);