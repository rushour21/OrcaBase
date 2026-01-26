import { pool } from "../../../config/db.js";
import crypto from "crypto";

export async function saveAgentConfig({ workspaceId, agent_url, agent_token }) {
  await pool.query(
    `
    INSERT INTO workspace_databases
      (workspace_id, agent_endpoint, agent_token, status, name)
    VALUES ($1, $2, $3, 'active', 'Primary Database')
    ON CONFLICT (workspace_id)
    DO UPDATE SET
      agent_endpoint = EXCLUDED.agent_endpoint,
      agent_token = EXCLUDED.agent_token,
      name = EXCLUDED.name
    `,
    [workspaceId, agent_url, agent_token]
  );
}

export async function getAgentConfig(workspaceId) {
  const { rows } = await pool.query(
    `
    SELECT * FROM workspace_databases
    WHERE workspace_id = $1
    `,
    [workspaceId]
  );

  if (!rows[0]) throw new Error("Agent not registered");
  return rows[0];
}

export async function saveSchemaSnapshot({ workspaceId, databaseId, schema }) {
  // initialize allowed=false
  Object.keys(schema.tables).forEach(t => {
    schema.tables[t].allowed = false;
  });

  const hash = crypto.createHash("md5").update(JSON.stringify(schema)).digest("hex");

  await pool.query(
    `
    INSERT INTO db_schema_snapshot
      (workspace_id, database_id, snapshot, schema_hash)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (database_id)
    DO UPDATE SET 
      snapshot = EXCLUDED.snapshot,
      schema_hash = EXCLUDED.schema_hash
    `,
    [workspaceId, databaseId, schema, hash]
  );
}

export async function getSchemaSnapshot(workspaceId) {
  const { rows } = await pool.query(
    `
    SELECT snapshot
    FROM db_schema_snapshot
    WHERE workspace_id = $1
    `,
    [workspaceId]
  );

  if (!rows[0]) return null;
  return rows[0].snapshot;
}

export async function updateSnapshotTableAccess({ workspaceId, table, allowed }) {
  await pool.query(
    `
    UPDATE db_schema_snapshot
    SET snapshot = jsonb_set(
      snapshot,
      ARRAY['tables', $2, 'allowed'],
      to_jsonb($3::boolean)
    )
    WHERE workspace_id = $1
    `,
    [workspaceId, table, allowed]
  );
}
