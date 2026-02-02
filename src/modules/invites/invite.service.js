import { pool } from "../../../config/db.js";
import crypto from "crypto";

export const createInvite = async ({ workspaceId, email, role }) => {
  const client = await pool.connect();
  try {
    // Generate a secure token
    const token = crypto.randomBytes(32).toString("hex");

    // Create the invite
    const res = await client.query(
      `
      INSERT INTO workspace_invites (workspace_id, email, role, token, status)
      VALUES ($1, $2, $3, $4, 'pending')
      RETURNING *
      `,
      [workspaceId, email, role, token]
    );

    return res.rows[0];
  } finally {
    client.release();
  }
};

export const getInvites = async (email, userId) => {
  const client = await pool.connect();
  try {
    const res = await client.query(
      `
      SELECT 
        wi.*,
        w.name as workspace_name,
        u.email as inviter_email
      FROM workspace_invites wi
      JOIN workspaces w ON wi.workspace_id = w.id
      LEFT JOIN users u ON w.created_by = u.id 
      WHERE (
          LOWER(wi.email) = LOWER($1) 
          OR 
          wi.invited_user_id = $2
        )
        AND wi.status = 'pending'
      ORDER BY wi.created_at DESC
      `,
      [email, userId]
    );
    return res.rows;
  } finally {
    client.release();
  }
};

export const acceptInvite = async ({ inviteId, userId, userEmail }) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Fetch the invite and verify it matches the user's email
    const inviteRes = await client.query(
      `
      SELECT workspace_id, role, email, status
      FROM workspace_invites
      WHERE id = $1
      `,
      [inviteId]
    );

    if (!inviteRes.rowCount) {
      throw new Error("Invite not found");
    }

    const invite = inviteRes.rows[0];

    if (invite.status !== 'pending') {
      throw new Error("Invite is no longer valid");
    }

    if (invite.email !== userEmail) {
      throw new Error("This invite belongs to a different email address");
    }

    // Add user to workspace
    await client.query(
      `
      INSERT INTO workspace_members (workspace_id, user_id, role)
      VALUES ($1, $2, $3)
      ON CONFLICT (workspace_id, user_id) DO NOTHING
      `,
      [invite.workspace_id, userId, invite.role]
    );

    // Update invite status
    await client.query(
      `
      UPDATE workspace_invites
      SET status = 'accepted'
      WHERE id = $1
      `,
      [inviteId]
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};
