import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { acceptInvite } from "./invite.controller.js";

const router = Router();

router.post(
  "/:inviteId/accept",
  requireAuth,
  acceptInvite
);

export default router;
