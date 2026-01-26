/**
 * SaaS → VPC Agent communication layer
 * Node.js >= 18 (native fetch)
 */

const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * Internal helper to fetch with timeout
 */
async function fetchWithTimeout(url, options = {}, timeout = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return res;
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("Agent request timed out");
    }
    throw err;
  } finally {
    clearTimeout(id);
  }
}

/**
 * 1️⃣ Health check
 */
export async function callAgentHealth(config) {
  if (!config.agent_endpoint) {
    throw new Error("Agent endpoint missing");
  }

  const res = await fetchWithTimeout(
    `${config.agent_endpoint}/agent/health`
  );

  if (!res.ok) {
    throw new Error("Agent health check failed");
  }

  return true;
}

/**
 * 2️⃣ Test database connection (inside VPC)
 */
export async function callAgentTest(config) {
  if (!config.agent_endpoint || !config.agent_token) {
    throw new Error("Agent configuration incomplete");
  }

  const res = await fetchWithTimeout(
    `${config.agent_endpoint}/agent/test-connection`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.agent_token}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!res.ok) {
    let errorMessage = "Agent test connection failed";
    try {
      const err = await res.json();
      errorMessage = err.error || errorMessage;
    } catch (_) {}
    throw new Error(errorMessage);
  }

  return true;
}

/**
 * 3️⃣ Sync schema from agent
 */
export async function callAgentSyncSchema(config) {
  if (!config.agent_endpoint || !config.agent_token) {
    throw new Error("Agent configuration incomplete");
  }

  const res = await fetchWithTimeout(
    `${config.agent_endpoint}/agent/sync-schema`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.agent_token}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!res.ok) {
    let errorMessage = "Schema sync failed";
    try {
      const err = await res.json();
      errorMessage = err.error || errorMessage;
    } catch (_) {}
    throw new Error(errorMessage);
  }

  const data = await res.json();

  if (!data || !data.schema) {
    throw new Error("Invalid schema response from agent");
  }

  return data.schema;
}
