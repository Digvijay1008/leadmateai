-- Add assigned_agent_id to phone_numbers table

ALTER TABLE phone_numbers ADD COLUMN IF NOT EXISTS assigned_agent_id UUID;