import { Router } from "express";
import { workspaceContext } from "../../middlewares/workspace.middleware.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import {
  listTickets,
  getMessages,
  sendReply,
  updateStatus,
} from "./adminConversation.controller.js";

const router = Router();

router.use(requireAuth);
router.use(workspaceContext);


/**
 * List all tickets (human mode)
 */
router.get("/", listTickets);

/**
 * Get messages for a ticket
 */
router.get("/:sessionId/messages", getMessages);

/**
 * Admin sends reply
 */
router.post("/:sessionId/reply", sendReply);

/**
 * Update ticket status
 */
router.patch("/:sessionId/status", updateStatus);

export default router;
