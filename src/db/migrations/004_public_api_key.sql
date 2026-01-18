-- 1. Enable the cryptographic extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Add the column with a default random generator
-- We use a 'pk_' prefix to make it easily identifiable (like Stripe)
ALTER TABLE workspaces 
ADD COLUMN public_api_key TEXT UNIQUE DEFAULT (
  'pk_live_' || encode(gen_random_bytes(16), 'hex')
);

-- 3. Add an index for lightning-fast lookups when the chatbot queries
CREATE INDEX idx_workspaces_api_key ON workspaces(public_api_key);