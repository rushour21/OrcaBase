-- ============================================================
-- FIX: Workspace Databases Constraints
-- ============================================================

-- 1. Add unique constraint to workspace_id to support ON CONFLICT
ALTER TABLE workspace_databases
ADD CONSTRAINT workspace_databases_workspace_id_key UNIQUE (workspace_id);
