-- Make database_id nullable since workspace_id is sufficient
ALTER TABLE db_query_sessions 
ALTER COLUMN database_id DROP NOT NULL;
