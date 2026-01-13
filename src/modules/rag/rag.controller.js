import * as ragService from "./rag.service.js";

export const uploadAndIndexDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "PDF file is required" });
    }

    const result = await ragService.indexPdf({
      filePath: req.file.path,
      originalName: req.file.originalname,
      workspaceId: req.workspace.id,
      userId: req.user.id,
    });

    res.status(201).json(result);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
};

export const queryChatbot = async (req, res) => {
  try {
    const { prompt, workspaceId } = req.body; 

    if (!prompt) {
      return res.status(400).json({ error: "Query prompt is required" });
    }

    // Call the unified RAG service
    const answer = await ragService.answerQuery({
      prompt,
      workspaceId,
    });

    res.status(200).json({ answer });
  } catch (err) {
    console.error("Query Error:", err);
    res.status(500).json({ error: "Failed to process query" });
  }
};