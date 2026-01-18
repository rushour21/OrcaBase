import { pool } from "../../../config/db.js";
import { answerWithRAG } from "../rag/rag.service.js"; 

export async function handleMessage({
  prompt,
  workspaceApiKey,
  sessionId = null,
  externalUserId = null,
}) {
  const client = await pool.connect();

  try {
    /* --------------------------------------------------
       1️⃣ Resolve workspace from public API key
    --------------------------------------------------- */
    const wsRes = await client.query(
      `SELECT id FROM workspaces WHERE public_api_key = $1`,
      [workspaceApiKey]
    );

    if (!wsRes.rowCount) {
      throw new Error("Invalid workspace API key");
    }

    const workspaceId = wsRes.rows[0].id;

    await client.query("BEGIN");

    /* --------------------------------------------------
       2️⃣ Create session ONLY on first message
    --------------------------------------------------- */
    let currentSessionId = sessionId;
    let mode = "ai";

    if (!currentSessionId) {
      const sessRes = await client.query(
        `
        INSERT INTO chat_sessions (workspace_id, external_user_id)
        VALUES ($1, $2)
        RETURNING id, mode
        `,
        [workspaceId, externalUserId]
      );

      currentSessionId = sessRes.rows[0].id;
      mode = sessRes.rows[0].mode;
    } else {
      const sessRes = await client.query(
        `SELECT mode FROM chat_sessions WHERE id = $1`,
        [currentSessionId]
      );

      if (!sessRes.rowCount) {
        throw new Error("Conversation session not found");
      }

      mode = sessRes.rows[0].mode;
    }

    /* --------------------------------------------------
       3️⃣ Save USER message
    --------------------------------------------------- */
    await client.query(
      `
      INSERT INTO chat_messages (session_id, role, content)
      VALUES ($1, 'user', $2)
      `,
      [currentSessionId, prompt]
    );

    let answer = null;

    /* --------------------------------------------------
       4️⃣ AI MODE → Call RAG
       (Human mode does NOT auto-reply)
    --------------------------------------------------- */
    if (mode === "ai") {
      // Fetch last 6 messages for context
      const historyRes = await client.query(
        `
        SELECT role, content
        FROM chat_messages
        WHERE session_id = $1
        ORDER BY created_at DESC
        LIMIT 6
        `,
        [currentSessionId]
      );

      const history = historyRes.rows.reverse();

      answer = await answerWithRAG({
        workspaceId,
        prompt,
        history,
      });

      await client.query(
        `
        INSERT INTO chat_messages (session_id, role, content)
        VALUES ($1, 'assistant', $2)
        `,
        [currentSessionId, answer]
      );

      /* --------------------------------------------------
         5️⃣ Update usage (billing / analytics)
      --------------------------------------------------- */
      const monthYear = new Date().toISOString().slice(0, 7);

      await client.query(
        `
        INSERT INTO workspace_usage (workspace_id, month_year, total_queries)
        VALUES ($1, $2, 1)
        ON CONFLICT (workspace_id, month_year)
        DO UPDATE SET total_queries = workspace_usage.total_queries + 1
        `,
        [workspaceId, monthYear]
      );
    }

    await client.query("COMMIT");

    return {
      sessionId: currentSessionId,
      answer, // null when in human mode
      mode,   // frontend can show "Connected to agent"
    };

  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function escalateConversationService({
  sessionId,
  workspaceApiKey,
  name,
  email,
}) {
  const wsRes = await pool.query(
    `SELECT id FROM workspaces WHERE public_api_key = $1`,
    [workspaceApiKey]
  );

  if (!wsRes.rowCount) {
    throw new Error("Invalid workspace API key");
  }

  await pool.query(
    `
    UPDATE chat_sessions
    SET 
      mode = 'human',
      lead_name = $2,
      lead_email = $3
    WHERE id = $1
    `,
    [sessionId, name, email]
  );

  return { success: true };
}


export async function getMessages(sessionId, workspaceApiKey) {
  const wsRes = await pool.query(
    `SELECT id FROM workspaces WHERE public_api_key = $1`,
    [workspaceApiKey]
  );

  if (!wsRes.rowCount) {
    throw new Error("Invalid workspace API key");
  }

  const workspaceId = wsRes.rows[0].id;

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
