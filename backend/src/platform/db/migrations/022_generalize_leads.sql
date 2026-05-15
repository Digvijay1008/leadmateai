-- Migration 022: Generalize Leads to Contacts & Drop Real Estate Tables

-- 1. Generalize Leads Table
ALTER TABLE leads 
  DROP COLUMN IF EXISTS property_id CASCADE,
  DROP COLUMN IF EXISTS project_id CASCADE,
  DROP COLUMN IF EXISTS budget_min,
  DROP COLUMN IF EXISTS budget_max,
  DROP COLUMN IF EXISTS preferred_location,
  DROP COLUMN IF EXISTS property_type;

-- Rename leads to contacts conceptually, but keeping the table name `leads` for now to avoid breaking too many backend queries immediately.
-- Or we can rename it. The user said: "DO NOT immediately DROP tables if still referenced. First remove frontend usage, remove API usage... THEN create cleanup migration"

-- Wait, the user said NOT to drop them immediately.
-- So I will just write the migration, but NOT run it yet.

