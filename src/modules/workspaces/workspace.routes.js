import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { workspaceContext } from "../../middlewares/workspace.middleware.js";
import {
  createWorkspace,
  listUserWorkspaces,
  inviteUser,
} from "./workspace.controller.js";

const router = Router();

// Global
router.post("/", requireAuth, createWorkspace);
router.get("/", requireAuth, listUserWorkspaces);

// Workspace-scoped
router.post(
  "/invite",
  requireAuth,
  workspaceContext,
  inviteUser
);

export default router;
