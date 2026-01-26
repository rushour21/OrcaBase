import * as service from "./adminConversation.service.js";

/**
 * GET /api/admin/conversations
 */
export async function listTickets(req, res) {
  try {
    console.log("list api hit")
    const workspaceId = req.workspace.id;
    console.log("Workspace ID:", workspaceId);
    const tickets = await service.listTickets(workspaceId);
    res.json(tickets);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

/**
 * GET /api/admin/conversations/:sessionId/messages
 */
export async function getMessages(req, res) {
  try {
    const { sessionId } = req.params;
    const workspaceId = req.workspace.id;

    const messages = await service.getMessages(sessionId, workspaceId);
    res.json(messages);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

/**
 * POST /api/admin/conversations/:sessionId/reply
 */
export async function sendReply(req, res) {
  try {
    const { sessionId } = req.params;
    const { message } = req.body;
    const workspaceId = req.workspace.id;

    if (!message) {
      return res.status(400).json({ error: "Message required" });
    }

    await service.sendReply(sessionId, workspaceId, message);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

/**
 * PATCH /api/admin/conversations/:sessionId/status
 */
export async function updateStatus(req, res) {
  try {
    const { sessionId } = req.params;
    const { status } = req.body;
    const workspaceId = req.workspace.id;

    if (!["open", "closed", "pending"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    await service.updateStatus(sessionId, workspaceId, status);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}
