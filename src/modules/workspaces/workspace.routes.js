import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { workspaceContext } from "../../middlewares/workspace.middleware.js";
import {
  createWorkspace,
  listUserWorkspaces,
  updateWorkspace,
  deleteWorkspace,
  inviteUser,
  getWorkspaceMembers,
} from "./workspace.controller.js";

const router = Router();

// Global
router.post("/", requireAuth, createWorkspace);
router.get("/", requireAuth, listUserWorkspaces);

// Workspace-specific operations
router.patch("/:workspaceId", requireAuth, updateWorkspace);
router.delete("/:workspaceId", requireAuth, deleteWorkspace);

// Workspace-scoped
router.post(
  "/invite",
  requireAuth,
  workspaceContext,
  inviteUser
);

router.get(
  "/:workspaceId/members",
  requireAuth,
  workspaceContext, // Ensures user belongs to workspace
  getWorkspaceMembers
);

export default router;
