import { pool } from '../../../../config/db.js';

/**
 * Session Service - Manages database chat sessions
 */
export const sessionService = {
    /**
     * Create a new chat session
     */
    async createSession({ userId, workspaceId, title = 'New Session' }) {
        const result = await pool.query(
            `INSERT INTO db_query_sessions (user_id, workspace_id, title)
       VALUES ($1, $2, $3)
       RETURNING *`,
            [userId, workspaceId, title]
        );

        console.log(`[Session] Created new session: ${result.rows[0].id}`);
        return result.rows[0];
    },

    /**
     * Get all sessions for a user
     */
    async getSessionsByUser(userId) {
        const result = await pool.query(
            `SELECT id, title, created_at, updated_at, web_search_enabled
       FROM db_query_sessions
       WHERE user_id = $1
       ORDER BY updated_at DESC`,
            [userId]
        );

        return result.rows;
    },

    /**
     * Get a specific session with its state
     */
    async getSession(sessionId) {
        const result = await pool.query(
            `SELECT * FROM db_query_sessions WHERE id = $1`,
            [sessionId]
        );

        if (result.rows.length === 0) {
            throw new Error('Session not found');
        }

        return result.rows[0];
    },

    /**
     * Update session state after a query
     */
    async updateSessionState({ sessionId, queryPlan, tablesUsed, filters }) {
        await pool.query(
            `UPDATE db_query_sessions
       SET last_query_plan = $1,
           last_tables_used = $2,
           last_filters = $3,
           updated_at = NOW()
       WHERE id = $4`,
            [
                JSON.stringify(queryPlan),
                tablesUsed,
                JSON.stringify(filters),
                sessionId
            ]
        );

        console.log(`[Session] Updated state for session: ${sessionId}`);
    },

    /**
     * Toggle web search for a session
     */
    async toggleWebSearch(sessionId, enabled) {
        await pool.query(
            `UPDATE db_query_sessions
       SET web_search_enabled = $1,
           updated_at = NOW()
       WHERE id = $2`,
            [enabled, sessionId]
        );

        console.log(`[Session] Web search ${enabled ? 'enabled' : 'disabled'} for session: ${sessionId}`);
    },

    /**
     * Update session title
     */
    async updateTitle(sessionId, title) {
        await pool.query(
            `UPDATE db_query_sessions
       SET title = $1,
           updated_at = NOW()
       WHERE id = $2`,
            [title, sessionId]
        );

        console.log(`[Session] Updated title for session: ${sessionId}`);
    },

    /**
     * Generate a title from the first user message
     */
    generateTitleFromMessage(message) {
        // Truncate and clean the message for a title
        const cleaned = message.trim().replace(/\n/g, ' ');
        if (cleaned.length <= 50) {
            return cleaned;
        }
        return cleaned.substring(0, 47) + '...';
    },

    /**
     * Add a message to a session
     */
    async addMessage({ sessionId, role, content, metadata = null }) {
        const result = await pool.query(
            `INSERT INTO session_messages (session_id, role, content, metadata)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
            [sessionId, role, content, JSON.stringify(metadata)]
        );

        return result.rows[0];
    },

    /**
     * Get messages for a session
     */
    async getMessages(sessionId, limit = 50) {
        const result = await pool.query(
            `SELECT * FROM session_messages
       WHERE session_id = $1
       ORDER BY created_at ASC
       LIMIT $2`,
            [sessionId, limit]
        );

        return result.rows.map(row => ({
            ...row,
            metadata: row.metadata || {}
        }));
    },

    /**
     * Delete a session and all its messages
     */
    async deleteSession(sessionId) {
        await pool.query(
            `DELETE FROM db_query_sessions WHERE id = $1`,
            [sessionId]
        );

        console.log(`[Session] Deleted session: ${sessionId}`);
    }
}; 
