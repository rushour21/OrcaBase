import {
  saveAgentConfig,
  getAgentConfig,
  saveSchemaSnapshot,
  getSchemaSnapshot,
  updateSnapshotTableAccess
} from "./database.service.js";
import {
  callAgentHealth,
  callAgentTest,
  callAgentSyncSchema
} from "./agent.service.js";

export async function registerAgent(req, res) {
  const { agent_url, agent_token } = req.body;
  const { id: workspaceId } = req.workspace;

  if (!agent_url || !agent_token) {
    return res.status(400).json({ error: "agent_url and agent_token required" });
  }

  await saveAgentConfig({ workspaceId, agent_url, agent_token });

  res.json({ status: "registered" });
}

export async function testAgentConnection(req, res) {
  let config;

  if (req.body.agent_url && req.body.agent_token) {
    config = {
      agent_endpoint: req.body.agent_url,
      agent_token: req.body.agent_token
    };
  } else {
    config = await getAgentConfig(req.workspace.id);
  }

  await callAgentHealth(config);
  await callAgentTest(config);

  res.json({ status: "connected" });
}

export async function syncSchema(req, res) {
  const config = await getAgentConfig(req.workspace.id);

  const tablesMap = await callAgentSyncSchema(config);
  const fullSchema = { tables: tablesMap };

  await saveSchemaSnapshot({
    workspaceId: req.workspace.id,
    databaseId: config.id,
    schema: fullSchema
  });

  res.json({ status: "synced" });
}

export async function listTables(req, res) {
  const snapshot = await getSchemaSnapshot(req.workspace.id);

  if (!snapshot) {
    return res.json([]);
  }

  const tables = Object.entries(snapshot.tables).map(
    ([name, meta]) => ({
      name,
      columns: meta.columns,
      allowed: meta.allowed
    })
  );

  res.json(tables);
}

export async function updateTableAccess(req, res) {
  const { table, allowed } = req.body;

  await updateSnapshotTableAccess({
    workspaceId: req.workspace.id,
    table,
    allowed
  });

  res.json({ status: "updated" });
}

export async function connectAgent(req, res) {
  const { agent_url, agent_token } = req.body;
  const { id: workspaceId } = req.workspace;

  if (!agent_url || !agent_token) {
    return res.status(400).json({ error: "agent_url and agent_token required" });
  }

  // 1. Validate connection BEFORE saving
  const tempConfig = { agent_endpoint: agent_url, agent_token };
  await callAgentHealth(tempConfig);
  await callAgentTest(tempConfig);

  // 2. Save Config
  await saveAgentConfig({ workspaceId, agent_url, agent_token });

  // 3. Sync Schema
  // Fetch config with ID (from DB or just assume we have what we need, but we need DB ID for snapshot)
  // Actually saveAgentConfig inserts/updates workspace_databases.
  // We need the database ID.
  const config = await getAgentConfig(workspaceId); // Get fresh config including ID

  const tablesMap = await callAgentSyncSchema(config);
  const fullSchema = { tables: tablesMap };

  await saveSchemaSnapshot({
    workspaceId,
    databaseId: config.id,
    schema: fullSchema
  });

  // 4. Return formatted tables
  const snapshot = await getSchemaSnapshot(workspaceId);
  const tables = Object.entries(snapshot.tables).map(
    ([name, meta]) => ({
      name,
      columns: meta.columns,
      allowed: meta.allowed
    })
  );

  res.json({ status: "connected", tables });
}

