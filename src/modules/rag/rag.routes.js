import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { workspaceContext } from "../../middlewares/workspace.middleware.js";
import { upload } from "../../config/multer.js";
import { uploadAndIndexDocument, queryChatbot, getDocuments, deleteDocument, getAnalytics, getChatHistory } from "./rag.controller.js";

const router = Router();

router.get("/history/:sessionId", getChatHistory);

router.get(
  "/analytics",
  requireAuth,
  workspaceContext,
  getAnalytics
);

router.post(
  "/documents",
  requireAuth,
  workspaceContext,
  upload.single("file"), // 👈 THIS IS REQUIRED
  uploadAndIndexDocument
);

router.post(
  "/query",
  queryChatbot
);

router.get(
  "/documents",
  requireAuth,
  workspaceContext,
  getDocuments
);

router.delete(
  "/documents/:id",
  requireAuth,
  workspaceContext,
  deleteDocument
);




export default router;
