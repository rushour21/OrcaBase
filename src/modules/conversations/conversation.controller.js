import * as conversationService from "./conversation.service.js";

export const handleMessage = async (req, res) => {
  try {
    const { prompt, workspaceApiKey, sessionId, externalUserId } = req.body;

    if (!prompt || !workspaceApiKey) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const result = await conversationService.handleMessage({
      prompt,
      workspaceApiKey,
      sessionId,
      externalUserId,
    });

    res.json(result);
  } catch (err) {
    console.error("Conversation error:", err);
    res.status(400).json({ error: err.message });
  }
};


export async function escalateConversation(req, res) {
  try {
    const { sessionId, workspaceApiKey, name, email } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: "Session ID required" });
    }

    if (!name || !email) {
      return res.status(400).json({ error: "Name and email required" });
    }

    await conversationService.escalateConversationService({
      sessionId,
      workspaceApiKey,
      name,
      email,
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("Escalate error:", err);
    return res.status(400).json({ error: err.message });
  }
}



export const getMessages = async (req, res) => {
  try {
    console.log(req.body);
    const { sessionId } = req.params;
    const workspaceApiKey = req.headers["x-workspace-api-key"];
    
    if (!sessionId) {
      return res.status(400).json({ error: "Session ID required" });
    }
    if(!workspaceApiKey){
      return res.status(400).json({ error: "Workspace API key required" });
    }

    const messages = await conversationService.getMessages(sessionId, workspaceApiKey);
    res.json(messages);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
