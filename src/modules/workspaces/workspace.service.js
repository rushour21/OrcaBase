import { pool } from "../../../config/db.js";

export const createWorkspace = async (userId, { name }) => {
  if (!name || name.trim().length < 2) {
    throw new Error("Workspace name is required");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    console.log("Creating workspace:", name, "for user:", userId);

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

export const inviteUser = async ({
  workspace,
  inviterId,
  invitedUserId,
  role,
}) => {
  // 1. Only admin can invite
  if (workspace.role !== "admin") {
    throw new Error("Admin access required");
  }

  // 2. Ensure invited user exists
  const userExists = await pool.query(
    `SELECT id FROM users WHERE id = $1`,
    [invitedUserId]
  );
  if (!userExists.rowCount) {
    throw new Error("User does not exist");
  }

  // 3. Prevent duplicate membership
  const alreadyMember = await pool.query(
    `
    SELECT 1 FROM workspace_members
    WHERE workspace_id = $1 AND user_id = $2
    `,
    [workspace.id, invitedUserId]
  );
  if (alreadyMember.rowCount) {
    throw new Error("User already a member");
  }

  // 4. Create invite
  const result = await pool.query(
    `
    INSERT INTO workspace_invites (
      workspace_id,
      invited_user_id,
      role,
      status
    )
    VALUES ($1, $2, $3, 'pending')
    RETURNING id, role, status, created_at
    `,
    [workspace.id, invitedUserId, role]
  );

  return result.rows[0];
};

