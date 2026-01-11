import { pool } from "../../../config/db.js";

export const acceptInvite = async ({ inviteId, userId }) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const inviteRes = await client.query(
      `
      SELECT workspace_id, role
      FROM workspace_invites
      WHERE id = $1
        AND invited_user_id = $2
        AND status = 'pending'
      `,
      [inviteId, userId]
    );

    if (!inviteRes.rowCount) {
      throw new Error("Invalid or expired invite");
    }

    const { workspace_id, role } = inviteRes.rows[0];

    await client.query(
      `
      INSERT INTO workspace_members (workspace_id, user_id, role)
      VALUES ($1, $2, $3)
      `,
      [workspace_id, userId, role]
    );

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
