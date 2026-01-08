import * as workspaceService from "./workspace.service.js";

export const createWorkspace = async (req, res) => {
  try {
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
