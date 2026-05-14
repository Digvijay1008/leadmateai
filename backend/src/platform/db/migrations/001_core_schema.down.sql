-- ===========================================
-- ROLLBACK: 001_core_schema
-- ===========================================

-- Drop triggers first
DROP TRIGGER IF EXISTS trg_voice_sessions_state_machine ON voice_sessions;
DROP TRIGGER IF EXISTS trg_kb_documents_updated_at ON kb_documents;
DROP TRIGGER IF EXISTS trg_voice_sessions_updated_at ON voice_sessions;
DROP TRIGGER IF EXISTS trg_wallets_updated_at ON wallets;
DROP TRIGGER IF EXISTS trg_tenant_voice_config_updated_at ON tenant_voice_config;
DROP TRIGGER IF EXISTS trg_voice_presets_updated_at ON voice_presets;
DROP TRIGGER IF EXISTS trg_tenants_updated_at ON tenants;

-- Drop functions
DROP FUNCTION IF EXISTS validate_session_state_transition();
DROP FUNCTION IF EXISTS update_updated_at();

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS session_tool_calls;
DROP TABLE IF EXISTS session_transcripts;
DROP TABLE IF EXISTS kb_embeddings;
DROP TABLE IF EXISTS kb_documents;
DROP TABLE IF EXISTS wallet_holds;
DROP TABLE IF EXISTS voice_sessions;
DROP TABLE IF EXISTS wallet_transactions;
DROP TABLE IF EXISTS wallets;
DROP TABLE IF EXISTS tenant_voice_config;
DROP TABLE IF EXISTS voice_personas;
DROP TABLE IF EXISTS voice_presets;
DROP TABLE IF EXISTS tenants;

-- Drop custom types
DROP TYPE IF EXISTS wallet_transaction_type;
DROP TYPE IF EXISTS wallet_hold_status;
DROP TYPE IF EXISTS session_status;

-- Note: We don't drop the extensions as they may be used elsewhere
-- DROP EXTENSION IF EXISTS vector;
-- DROP EXTENSION IF EXISTS "uuid-ossp";
