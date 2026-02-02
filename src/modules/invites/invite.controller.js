import * as inviteService from "./invite.service.js";

export const createInvite = async (req, res) => {
  try {
    const { email, role, workspaceId } = req.body;

    // Basic validation
    if (!email || !role || !workspaceId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const invite = await inviteService.createInvite({
      workspaceId,
      email,
      role
    });

    res.status(201).json(invite);
  } catch (err) {
    console.error("Create invite error:", err);
    res.status(500).json({ error: "Failed to create invite" });
  }
};

export const getInvites = async (req, res) => {
  try {
    const email = req.user.email;
    const userId = req.user.id;
    const invites = await inviteService.getInvites(email, userId);
    res.json(invites);
  } catch (err) {
    console.error("Get invites error:", err);
    res.status(500).json({ error: "Failed to fetch invites" });
  }
};

export const acceptInvite = async (req, res) => {
  try {
    const inviteId = req.params.inviteId;
    const userId = req.user.id;
    const userEmail = req.user.email;

    await inviteService.acceptInvite({ inviteId, userId, userEmail });

    res.json({ message: "Invite accepted" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
