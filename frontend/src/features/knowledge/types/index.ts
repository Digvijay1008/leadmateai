export interface KnowledgeDocument {
  id: string;
  tenant_id: string;
  title: string;
  content: string;
  document_type: string;
  source_url?: string;
  status: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeQuery {
  query: string;
  max_results?: number;
  filter?: {
    document_type?: string;
    status?: string;
  };
}

export interface KnowledgeQueryResult {
  results: KnowledgeResult[];
  query: string;
  total_results: number;
  processing_time_ms: number;
}

export interface KnowledgeResult {
  document: KnowledgeDocument;
  chunk: string;
  score: number;
  highlights: string[];
}

export interface KnowledgeIngestInput {
  title: string;
  content: string;
  document_type: string;
  source_url?: string;
  metadata?: Record<string, unknown>;
}

export interface KnowledgeStats {
  total_documents: number;
  ready_documents: number;
  processing_documents: number;
  failed_documents: number;
  total_chunks: number;
  total_tokens: number;
}