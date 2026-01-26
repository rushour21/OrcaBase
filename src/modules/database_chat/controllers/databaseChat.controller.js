import { dbChatService } from '../services/dbChat.service.js';
import { sessionService } from '../services/session.service.js';

export async function chat(req, res) {
    try {
        const { query, sessionId } = req.body;
        const workspaceId = req.workspace.id;
        const userId = req.user.id;

        console.log(`[Controller] Chat endpoint hit. Query: "${query}", SessionId: ${sessionId}, WorkspaceId: ${workspaceId}`);

        if (!query) {
            return res.status(400).json({ error: "Query is required" });
        }

        const response = await dbChatService.processMessage({
            userQuery: query,
            workspaceId,
            sessionId,
            userId
        });

        console.log(`[Controller] Chat response received. SessionId: ${response.sessionId}`);
        res.json(response);
    } catch (error) {
        console.error("[Controller] Chat Error:", error);
        res.status(500).json({ error: error.message || "Internal Server Error" });
    }
}

export async function approveSql(req, res) {
    try {
        const { sql, sessionId } = req.body;
        const workspaceId = req.workspace.id;

        console.log(`[Controller] Approve SQL endpoint hit. SessionId: ${sessionId}`);

        const results = await dbChatService.executeApprovedSql({ sql, sessionId, workspaceId });
        res.json(results);
    } catch (error) {
        console.error("Execute Error:", error);
        res.status(500).json({ error: error.message });
    }
}

export async function createSession(req, res) {
    try {
        const { title } = req.body;
        const workspaceId = req.workspace.id;
        const userId = req.user.id;

        const session = await sessionService.createSession({
            userId,
            workspaceId,
            title: title || 'New Session'
        });

        res.json(session);
    } catch (error) {
        console.error("Create Session Error:", error);
        res.status(500).json({ error: error.message });
    }
}

export async function getSessions(req, res) {
    try {
        const userId = req.user.id;

        const sessions = await sessionService.getSessionsByUser(userId);
        res.json(sessions);
    } catch (error) {
        console.error("Get Sessions Error:", error);
        res.status(500).json({ error: error.message });
    }
}

export async function toggleWebSearch(req, res) {
    try {
        const { sessionId } = req.params;
        const { enabled } = req.body;

        await sessionService.toggleWebSearch(sessionId, enabled);
        res.json({ success: true, enabled });
    } catch (error) {
        console.error("Toggle Web Search Error:", error);
        res.status(500).json({ error: error.message });
    }
}

export async function getSessionMessages(req, res) {
    try {
        const { sessionId } = req.params;

        const messages = await sessionService.getMessages(sessionId);
        res.json(messages);
    } catch (error) {
        console.error("Get Messages Error:", error);
        res.status(500).json({ error: error.message });
    }
}
