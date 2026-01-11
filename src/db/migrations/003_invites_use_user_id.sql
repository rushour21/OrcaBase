-- 003_invites_use_user_id.sql
-- Purpose: support in-app invites for existing users (no email)

ALTER TABLE workspace_invites
ADD COLUMN invited_user_id UUID REFERENCES users(id);

-- Ensure either email OR invited_user_id exists (future-proof)
ALTER TABLE workspace_invites
ADD CONSTRAINT workspace_invites_target_check
CHECK (
  email IS NOT NULL OR invited_user_id IS NOT NULL
);

-- Prevent duplicate invites for same user in same workspace
CREATE UNIQUE INDEX IF NOT EXISTS unique_workspace_user_invite
ON workspace_invites (workspace_id, invited_user_id)
WHERE invited_user_id IS NOT NULL;
