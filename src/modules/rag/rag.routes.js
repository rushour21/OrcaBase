import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { workspaceContext } from "../../middlewares/workspace.middleware.js";
import { upload } from "../../config/multer.js";
import { uploadAndIndexDocument, queryChatbot } from "./rag.controller.js";

const router = Router();

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

export default router;
