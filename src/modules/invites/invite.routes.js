import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { createInvite, getInvites, acceptInvite } from "./invite.controller.js";

const router = Router();

router.post("/", requireAuth, createInvite);
router.get("/", requireAuth, getInvites);

router.post(
  "/:inviteId/accept",
  requireAuth,
  acceptInvite
);

export default router;
