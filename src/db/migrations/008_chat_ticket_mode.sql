ALTER TABLE chat_sessions
ADD COLUMN mode TEXT NOT NULL DEFAULT 'ai'
CHECK (mode IN ('ai', 'human'));

ALTER TABLE chat_sessions
ADD COLUMN status TEXT NOT NULL DEFAULT 'open'
CHECK (status IN ('open', 'assigned', 'resolved', 'closed'));

ALTER TABLE chat_sessions
ADD COLUMN assigned_to_user_id UUID NULL
REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE chat_sessions
ADD COLUMN assigned_at TIMESTAMPTZ NULL;
