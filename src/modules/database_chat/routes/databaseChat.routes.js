import express from 'express';
import { chat, approveSql, getSessions, createSession, toggleWebSearch, getSessionMessages } from '../controllers/databaseChat.controller.js';
import { requireAuth } from "../../../middlewares/auth.middleware.js";
import { workspaceContext } from "../../../middlewares/workspace.middleware.js";

const router = express.Router();

// Session management
router.post('/sessions', requireAuth, workspaceContext, createSession);
router.get('/sessions', requireAuth, getSessions);
router.put('/sessions/:sessionId/web-search', requireAuth, toggleWebSearch);
router.get('/sessions/:sessionId/messages', requireAuth, getSessionMessages);

// Chat endpoints
router.post('/query', requireAuth, workspaceContext, chat);
router.post('/approve', requireAuth, workspaceContext, approveSql);

export default router;
