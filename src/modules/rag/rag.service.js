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

export async function answerQuery({ prompt, workspaceId }) {
  // 1. Convert user question to vector
  const queryVector = await embeddings.embedQuery(prompt);

  // 2. Standard Search (Compatible with v1.8.1)
  const searchResults = await qdrant.search("workspace_documents", {
    vector: queryVector, // Use 'vector' directly instead of 'query'
    filter: {
      must: [
        { 
          key: "workspace_id", 
          match: { value: workspaceId } 
        }
      ]
    },
    limit: 5,
    with_payload: true // Ensure payload is returned
  });
console.log("Search Results:", searchResults);
  // 3. Prepare context for the LLM
  // Note: .search() returns a flat array of points, not .points
  const context = searchResults
    .map((p) => p.payload.content)
    .join("\n\n---\n\n");

  if (!context) {
    return "I couldn't find any relevant information in your documents.";
  }

  const systemPrompt = `
    You are a professional assistant. Answer the user's question using ONLY the context provided below.
    If the context doesn't contain the answer, say "I don't have enough information in the uploaded documents."
    
    CONTEXT:
    ${context}
  `;

  // 4. Get the answer
  const response = await llm.invoke([
    ["system", systemPrompt],
    ["user", prompt],
  ]);

  return response.content;
}