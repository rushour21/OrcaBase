import { pool } from "../../../config/db.js";

/**
 * List all human-mode tickets for a workspace
 */
export async function listTickets(workspaceId) {
  const res = await pool.query(
    `
    SELECT
      id,
      lead_name,
      lead_email,
      status,
      last_active_at
    FROM chat_sessions
    WHERE workspace_id = $1
      AND mode = 'human'
    ORDER BY last_active_at DESC
    `,
    [workspaceId]
  );

  return res.rows;
}

/**
 * Get messages for a ticket (workspace-safe)
 */
export async function getMessages(sessionId, workspaceId) {
  // Verify session belongs to workspace
  const sessionRes = await pool.query(
    `
    SELECT id
    FROM chat_sessions
    WHERE id = $1 AND workspace_id = $2
    `,
    [sessionId, workspaceId]
  );

  if (!sessionRes.rowCount) {
    throw new Error("Conversation not found");
  }

  const res = await pool.query(
    `
    SELECT role, content, created_at
    FROM chat_messages
    WHERE session_id = $1
    ORDER BY created_at ASC
    `,
    [sessionId]
  );

  return res.rows;
}

/**
 * Admin sends a reply
 */
export async function sendReply(sessionId, workspaceId, message) {
  const sessionRes = await pool.query(
    `
    SELECT id
    FROM chat_sessions
    WHERE id = $1 AND workspace_id = $2
    `,
    [sessionId, workspaceId]
  );

  if (!sessionRes.rowCount) {
    throw new Error("Conversation not found");
  }

  await pool.query(
    `
    INSERT INTO chat_messages (session_id, role, content)
    VALUES ($1, 'assistant', $2)
    `,
    [sessionId, message]
  );

  await pool.query(
    `
    UPDATE chat_sessions
    SET last_active_at = NOW()
    WHERE id = $1
    `,
    [sessionId]
  );
}

/**
 * Update ticket status
 */
export async function updateStatus(sessionId, workspaceId, status) {
  if (status !== "closed") {
    throw new Error("Only closing conversations is supported");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Verify conversation
    const sessionRes = await client.query(
      `
      SELECT id
      FROM chat_sessions
      WHERE id = $1 AND workspace_id = $2
      `,
      [sessionId, workspaceId]
    );

    if (!sessionRes.rowCount) {
      throw new Error("Conversation not found");
    }

    // 2. Insert closing system message
    await client.query(
      `
      INSERT INTO chat_messages (session_id, role, content)
      VALUES ($1, 'assistant', $2)
      `,
      [
        sessionId,
        "✅ This conversation has been closed. If you have more questions, feel free to start a new chat."
      ]
    );

    // 3. Update session state
    await client.query(
      `
      UPDATE chat_sessions
      SET status = 'closed',
          mode = 'ai'
      WHERE id = $1 AND workspace_id = $2
      `,
      [sessionId, workspaceId]
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
