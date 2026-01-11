import * as inviteService from "./invite.service.js";

export const acceptInvite = async (req, res) => {
  try {
    const inviteId = req.params.inviteId;
    const userId = req.user.id;

    await inviteService.acceptInvite({ inviteId, userId });

    res.json({ message: "Invite accepted" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
