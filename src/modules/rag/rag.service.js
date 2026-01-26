import fs from "fs";
import crypto from "crypto";
import { pool } from "../../../config/db.js";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { OpenAIEmbeddings } from "@langchain/openai";
import { qdrant, ensureCollection } from "../../utils/qdrant.js";
import { ChatOpenAI } from "@langchain/openai";

const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-small",
});

const llm = new ChatOpenAI({
  modelName: "gpt-4o-mini", // Cost-effective and fast
  temperature: 0, // Keep it factual
});

export async function indexPdf({ filePath, originalName, workspaceId, userId }) {
  await ensureCollection("workspace_documents");
  const client = await pool.connect();
 
  try {
    await client.query("BEGIN");

    /* ---------- 1️⃣ CREATE DOCUMENT IN PG ---------- */
    const docRes = await client.query(
      `INSERT INTO documents (workspace_id, uploaded_by, name, file_type, file_path, status)
       VALUES ($1, $2, $3, 'pdf', $4, 'processing') RETURNING id`,
      [workspaceId, userId, originalName, filePath]
    );
    const documentId = docRes.rows[0].id;

    /* ---------- 2️⃣ LOAD & SPLIT ---------- */
    const loader = new PDFLoader(filePath);
    const docs = await loader.load();
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 150,
      separators: ["\n\n", "\n", " ", ""]
    });
    const chunks = await splitter.splitDocuments(docs);

    /* ---------- 3️⃣ PROCESS CHUNKS (HYBRID) ---------- */
    // Note: To be efficient, we embed the text first
    const contents = chunks.map(c => c.pageContent);
    const denseVectors = await embeddings.embedDocuments(contents);

    for (let i = 0; i < chunks.length; i++) {
      const content = contents[i];
      const denseVector = denseVectors[i];
      const qdrantId = crypto.randomUUID();

      // Store in Qdrant using Hybrid Format
      await qdrant.upsert("workspace_documents", {
        points: [{
          id: qdrantId,
          vector: {
            "": denseVector, // Your standard dense vector (OpenAI)
            // If using Qdrant's automatic sparse vector generation (v1.10+):
            // "text-sparse": { text: content } 
          },
          payload: {
            workspace_id: workspaceId,
            document_id: documentId,
            chunk_index: i,
            content: content,
          },
        }],
      });

      // Note: If your Qdrant version requires manual sparse vectors, 
      // you would use a library like 'fastembed-js' to generate them here.

      /* ---------- 4️⃣ STORE METADATA IN PG ---------- */
      await client.query(
        `INSERT INTO document_chunks (document_id, workspace_id, chunk_index, content, qdrant_point_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [documentId, workspaceId, i, content, qdrantId]
      );
    }

    await client.query("UPDATE documents SET status = 'indexed' WHERE id = $1", [documentId]);
    await client.query("COMMIT");

    return { documentId, chunks: chunks.length };
  } catch (err) {
    await client.query("ROLLBACK");
    // ... error handling
    throw err;
  } finally {
    client.release();
  }
}

// export async function answerQuery({ prompt, workspaceApiKey, sessionId = null, externalUserId = null }) {
//   const client = await pool.connect();

//   try {
//     console.log("Answering query for workspace API Key:", workspaceApiKey);
//     // 1. Resolve internal workspace_id from the public API Key
//     const wsRes = await client.query(
//       "SELECT id FROM workspaces WHERE public_api_key = $1",
//       [workspaceApiKey]
//     );
//     if (wsRes.rows.length === 0) throw new Error("Invalid API Key");
//     const workspaceId = wsRes.rows[0].id;

//     await client.query("BEGIN");

//     // 2. Handle Session (Create if it's the first message)
//     let currentSessionId = sessionId;
//     if (!currentSessionId) {
//       const sessRes = await client.query(
//         `INSERT INTO chat_sessions (workspace_id, external_user_id) 
//          VALUES ($1, $2) RETURNING id`,
//         [workspaceId, externalUserId]
//       );
//       currentSessionId = sessRes.rows[0].id;
//     }

//     // 3. Fetch History (Last 6 messages for context)
//     const historyRes = await client.query(
//       `SELECT role, content FROM chat_messages 
//        WHERE session_id = $1 ORDER BY created_at DESC LIMIT 6`,
//       [currentSessionId]
//     );
//     const history = historyRes.rows.reverse();

//     // 4. RAG: Search Qdrant
//     const queryVector = await embeddings.embedQuery(prompt);
//     const searchResults = await qdrant.search("workspace_documents", {
//       vector: queryVector,
//       filter: { must: [{ key: "workspace_id", match: { value: workspaceId } }] },
//       limit: 3,
//       with_payload: true
//     });

//     const context = searchResults.map(p => p.payload.content).join("\n\n---\n\n");

//     // 5. LLM Call with Context + History
//     const response = await llm.invoke([
//       ["system", `Answer using ONLY this context: ${context || "No context found."}`],
//       ...history.map(m => [m.role, m.content]),
//       ["user", prompt]
//     ]);

//     // 6. Save messages & Update Usage
//     await client.query(
//       `INSERT INTO chat_messages (session_id, role, content) 
//        VALUES ($1, 'user', $2), ($1, 'assistant', $3)`,
//       [currentSessionId, prompt, response.content]
//     );

//     const monthYear = new Date().toISOString().slice(0, 7); // '2026-01'
//     await client.query(
//       `INSERT INTO workspace_usage (workspace_id, month_year, total_queries, total_tokens)
//        VALUES ($1, $2, 1, $3)
//        ON CONFLICT (workspace_id, month_year) 
//        DO UPDATE SET total_queries = workspace_usage.total_queries + 1, 
//                      total_tokens = workspace_usage.total_tokens + $3`,
//       [workspaceId, monthYear, response.usage_metadata?.total_tokens || 0]
//     );

//     await client.query("COMMIT");

//     return {
//       answer: response.content,
//       sessionId: currentSessionId
//     };

//   } catch (err) {
//     await client.query("ROLLBACK");
//     throw err;
//   } finally {
//     client.release();
//   }
// }

export async function answerWithRAG({
  workspaceId,
  prompt,
  history = [],
}) {
  // 1️⃣ Embed query
  const queryVector = await embeddings.embedQuery(prompt);

  // 2️⃣ Search Qdrant
  const searchResults = await qdrant.search("workspace_documents", {
    vector: queryVector,
    filter: {
      must: [{ key: "workspace_id", match: { value: workspaceId } }],
    },
    limit: 3,
    with_payload: true,
  });

  const context = searchResults
    .map(p => p.payload.content)
    .join("\n\n---\n\n");

  if (!context) {
    return "I don’t have enough information in the uploaded documents.";
  }

  // 3️⃣ LLM call
  const response = await llm.invoke([
    ["system", `Answer ONLY using this context:\n${context}`],
    ...history.map(m => [m.role, m.content]),
    ["user", prompt],
  ]);

  return response.content;
}


export async function getWorkspaceDocuments(workspaceId) {

  console.log("Fetching documents for workspace:", workspaceId);
  const client = await pool.connect();
  try {
    const res = await client.query(
      "SELECT id, name, file_type, status, created_at, file_path FROM documents WHERE workspace_id = $1 ORDER BY created_at DESC",
      [workspaceId]
    );
    return res.rows;
  } finally {
    client.release();
  }
}

export async function deleteDocument(documentId, workspaceId) {
  const client = await pool.connect();
  try {
    // 1. Verify ownership & get info
    const docRes = await client.query(
      "SELECT * FROM documents WHERE id = $1 AND workspace_id = $2",
      [documentId, workspaceId]
    );

    if (docRes.rows.length === 0) {
      throw new Error("Document not found or access denied");
    }
    const doc = docRes.rows[0];

    await client.query("BEGIN");

    // 2. Delete from DB 
    // Delete chunks first
    await client.query("DELETE FROM document_chunks WHERE document_id = $1", [documentId]);
    // Delete document record
    await client.query("DELETE FROM documents WHERE id = $1", [documentId]);

    // 3. Delete from Qdrant
    try {
      await qdrant.delete("workspace_documents", {
        filter: {
          must: [
            { key: "document_id", match: { value: documentId } }
          ]
        }
      });
    } catch (qdrantError) {
      console.error("Failed to delete from Qdrant:", qdrantError);
      // Continue if Qdrant fails, as DB consistency is more important here
    }

    // 4. Delete file from disk
    if (doc.file_path) {
      try {
        if (fs.existsSync(doc.file_path)) {
          fs.unlinkSync(doc.file_path);
        }
      } catch (fsError) {
        console.error("Failed to delete file from disk:", fsError);
      }
    }

    await client.query("COMMIT");
    return { success: true, id: documentId };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function getAnalytics(workspaceId) {
  const client = await pool.connect();
  try {
    // 1. Total Queries (All time)
    const totalQueriesRes = await client.query(
      `SELECT COALESCE(SUM(total_queries), 0) as total FROM workspace_usage WHERE workspace_id = $1`,
      [workspaceId]
    );
    const totalQueries = parseInt(totalQueriesRes.rows[0].total);

    // 2. Documents Indexed
    const docsRes = await client.query(
      `SELECT COUNT(*) as count FROM documents WHERE workspace_id = $1 AND status = 'indexed'`,
      [workspaceId]
    );
    const documentsIndexed = parseInt(docsRes.rows[0].count);

    // 3. Daily Queries (Last 7 Days)
    const dailyRes = await client.query(
      `
      SELECT TO_CHAR(chat_messages.created_at, 'Dy') as date, COUNT(*) as documents
      FROM chat_messages 
      JOIN chat_sessions ON chat_messages.session_id = chat_sessions.id
      WHERE chat_sessions.workspace_id = $1 
        AND chat_messages.role = 'user'
        AND chat_messages.created_at >= NOW() - INTERVAL '6 days'
      GROUP BY TO_CHAR(chat_messages.created_at, 'Dy'), DATE(chat_messages.created_at)
      ORDER BY DATE(chat_messages.created_at) ASC
      `,
      [workspaceId]
    );

    // Fill in missing days
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const chartData = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dayName = days[d.getDay()];

      const found = dailyRes.rows.find(r => r.date === dayName);
      chartData.push({
        date: dayName,
        documents: found ? parseInt(found.documents) : 0,
        database: 0
      });
    }

    // 4. Recent Activity
    const activityRes = await client.query(
      `
      (SELECT 
        'query' as type, 
        substring(content from 1 for 30) || '...' as description, 
        chat_messages.created_at 
       FROM chat_messages 
       JOIN chat_sessions ON chat_messages.session_id = chat_sessions.id
       WHERE chat_sessions.workspace_id = $1 AND role = 'user'
       LIMIT 5)
      UNION ALL
      (SELECT 
        'upload' as type, 
        name as description, 
        created_at 
       FROM documents 
       WHERE workspace_id = $1
       LIMIT 5)
      ORDER BY created_at DESC
      LIMIT 5
      `,
      [workspaceId]
    );

    return {
      totalQueries,
      documentsIndexed,
      chartData,
      recentActivity: activityRes.rows
    };

  } finally {
    client.release();
  }
}

export async function getChatHistory(sessionId) {
  const client = await pool.connect();
  try {
    const res = await client.query(
      `SELECT role, content, created_at FROM chat_messages 
       WHERE session_id = $1 ORDER BY created_at ASC`,
      [sessionId]
    );
    return res.rows;
  } finally {
    client.release();
  }
}