import { Router } from "express";
import {
  handleMessage,
  escalateConversation,
  getMessages,
} from "./conversation.controller.js";

const router = Router();

/**
 * MAIN endpoint used by embedded chatbot
 * - Creates session if sessionId is missing
 * - Routes to AI or Human internally
 */
router.post("/message", handleMessage);

/**
 * User clicks "Talk to Team"
 * Switches conversation from AI → Human
 */
router.post("/escalate", escalateConversation); 

/**
 * Fetch chat history (widget + dashboard)
 */
router.get("/:sessionId/messages", getMessages);

export default router;
