import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import {
  createWorkspace,
  listUserWorkspaces,
} from "./workspace.controller.js";

const router = Router();

router.post("/", requireAuth, createWorkspace);
router.get("/", requireAuth, listUserWorkspaces);

export default router;
