import * as workspaceService from "./workspace.service.js";

export const createWorkspace = async (req, res) => {
  try {
    console.log("Listing workspaces for user:", req.user.id);
    const workspace = await workspaceService.createWorkspace(
      req.user.id,
      req.body
    );
    res.status(201).json(workspace);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const listUserWorkspaces = async (req, res) => {
  try {
    const workspaces = await workspaceService.listUserWorkspaces(req.user.id);
    res.json(workspaces);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const inviteUser = async (req, res) => {
  try {
    const { userId, role } = req.body;

    const invite = await workspaceService.inviteUser({
      workspace: req.workspace,
      inviterId: req.user.id,
      invitedUserId: userId,
      role,
    });

    res.status(201).json(invite);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
