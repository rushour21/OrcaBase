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
    const { prompt, workspaceApiKey, sessionId, externalUserId } = req.body;

    if (!prompt || !workspaceApiKey) {
      return res.status(400).json({ error: "Query prompt and workspace API key are required" });
    }

    // Call the unified RAG service
    const result = await ragService.answerQuery({
      prompt,
      workspaceApiKey,
      sessionId,
      externalUserId,
    });

    res.status(200).json(result);
  } catch (err) {
    console.error("Query Error:", err);
    res.status(500).json({ error: err.message });
  }
};

export const getDocuments = async (req, res) => {
  try {
    const documents = await ragService.getWorkspaceDocuments(req.workspace.id);
    res.status(200).json(documents);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
};

export const deleteDocument = async (req, res) => {
  try {
    const result = await ragService.deleteDocument(req.params.id, req.workspace.id);
    res.status(200).json(result);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
};

export const getAnalytics = async (req, res) => {
  try {
    console.log("Fetching analytics for workspace:", req.workspace.id);
    const analytics = await ragService.getAnalytics(req.workspace.id);
    res.status(200).json(analytics);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

export const getChatHistory = async (req, res) => {
  try {
    const { sessionId } = req.params;
    if (!sessionId) {
      return res.status(400).json({ error: "Session ID is required" });
    }
    const history = await ragService.getChatHistory(sessionId);
    res.status(200).json(history);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch chat history" });
  }
};