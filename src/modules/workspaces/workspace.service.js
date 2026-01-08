import { pool } from "../../../config/db.js";

export const createWorkspace = async (userId, { name }) => {
  if (!name || name.trim().length < 2) {
    throw new Error("Workspace name is required");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Create workspace
    const workspaceResult = await client.query(
      `INSERT INTO workspaces (name, created_by)
       VALUES ($1, $2)
       RETURNING id, name, created_at`,
      [name.trim(), userId]
    );

    const workspace = workspaceResult.rows[0];

    // 2. Assign creator as admin
    await client.query(
      `INSERT INTO workspace_members (workspace_id, user_id, role)
       VALUES ($1, $2, 'admin')`,
      [workspace.id, userId]
    );

    // 3. Assign free plan (default)
    const freePlan = await client.query(
      `SELECT id FROM plans WHERE name = 'free'`
    );

    await client.query(
      `INSERT INTO subscriptions (workspace_id, plan_id, status)
       VALUES ($1, $2, 'active')`,
      [workspace.id, freePlan.rows[0].id]
    );

    await client.query("COMMIT");
    return workspace;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

export const listUserWorkspaces = async (userId) => {
  const result = await pool.query(
    `
    SELECT w.id, w.name, wm.role
    FROM workspaces w
    JOIN workspace_members wm ON wm.workspace_id = w.id
    WHERE wm.user_id = $1
    ORDER BY w.created_at DESC
    `,
    [userId]
  );

  return result.rows;
};
