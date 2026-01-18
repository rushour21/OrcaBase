-- 1. CHAT SESSIONS: The container for a single conversation
CREATE TABLE IF NOT EXISTS chat_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    -- 'external_user_id' helps identify the visitor on the client's website
    external_user_id text, 
    created_at timestamptz DEFAULT now(),
    last_active_at timestamptz DEFAULT now()
);

-- 2. CHAT MESSAGES: Stores the actual dialogue
CREATE TABLE IF NOT EXISTS chat_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role text NOT NULL CHECK (role IN ('system', 'user', 'assistant')),
    content text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- 3. USAGE TRACKING: For billing and analytics per workspace
CREATE TABLE IF NOT EXISTS workspace_usage (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    month_year text NOT NULL, -- Format: 'YYYY-MM'
    total_queries int DEFAULT 0,
    total_tokens int DEFAULT 0,
    UNIQUE(workspace_id, month_year)
);

-- 4. PERFORMANCE INDEXES: Crucial for production speed
CREATE INDEX idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX idx_chat_sessions_workspace ON chat_sessions(workspace_id);
CREATE INDEX idx_usage_workspace_month ON workspace_usage(workspace_id, month_year);