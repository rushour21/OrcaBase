import { pool } from "../../config/db.js";

/**
 * Workspace Context Middleware
 * - Resolves active workspace from X-Workspace-Id header
 * - Verifies user membership
 * - Attaches workspace context to req.workspace
 */
export const workspaceContext = async (req, res, next) => {
  const workspaceId = req.header("X-Workspace-Id");
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: "Unauthenticated" });
  }

  if (!workspaceId) {
    return res.status(400).json({ error: "Workspace context missing" });
  }

  const result = await pool.query(
    `
    SELECT
      wm.role,
      w.id,
      w.name
    FROM workspace_members wm
    JOIN workspaces w ON w.id = wm.workspace_id
    WHERE wm.workspace_id = $1
      AND wm.user_id = $2
    `,
    [workspaceId, userId]
  );

  if (!result.rowCount) {
    return res.status(403).json({ error: "Access denied for this workspace" });
  }

  req.workspace = {
    id: result.rows[0].id,
    name: result.rows[0].name,
    role: result.rows[0].role,
  };

  next();
};
