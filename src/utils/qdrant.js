import { QdrantClient } from "@qdrant/js-client-rest";

export const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
  checkCompatibility: false,
});

/**
 * Ensures a collection exists with the correct vector configuration.
 * @param {string} collectionName 
 * @param {number} vectorSize - Default 1536 for OpenAI small embeddings
 */
/**
 * Ensures a collection exists with BOTH Dense (OpenAI) and Sparse (Keywords) config.
 */
export async function ensureCollection(collectionName, vectorSize = 1536) {
  try {
    const response = await qdrant.getCollections();
    const exists = response.collections.some((c) => c.name === collectionName);

    if (!exists) {
      console.log(`🚀 Creating Hybrid Qdrant collection: ${collectionName}`);
      await qdrant.createCollection(collectionName, {
        // 1. Dense Vectors (for Semantic/Meaning search)
        vectors: {
          size: vectorSize, 
          distance: "Cosine", 
        },
        // 2. Sparse Vectors (for Keyword search)
        sparse_vectors: {
          "text-sparse": {
            modifier: "idf", // This makes it act like the BM25 algorithm (industry standard)
          },
        },
      });
      
      // Optional: Add a payload index for workspace_id for even faster filtering
      await qdrant.createPayloadIndex(collectionName, {
        field_name: "workspace_id",
        field_schema: "keyword",
      });
    }
  } catch (error) {
    console.error("❌ Qdrant initialization failed:", error);
    throw new Error("Vector database is not reachable.");
  }
}