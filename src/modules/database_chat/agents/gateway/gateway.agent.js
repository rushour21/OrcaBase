import { Agent } from '@openai/agents';
import { createSqlGeneratorAgent } from '../sql/sqlGenerator.agent.js';
import { resultAnalysisAgent } from '../analysis/resultAnalysis.agent.js';
import { chartAgent } from '../visualization/chart.agent.js';
import { queryRouterAgent } from '../router/queryRouter.agent.js';

/**
 * Creates the Gateway Agent which acts as the orchestrator.
 * It has access to other agents as tools.
 * 
 * @param {Object} context - { schema, history }
 */
export const createGatewayAgent = (context) => {
    const { schema, agentConfig } = context;

    console.log(`[Gateway] Initializing Gateway Agent.`);

    // Instantiate sub-agents with context where needed
    const sqlGenAgent = createSqlGeneratorAgent(schema);

    // Helper to wrap tools with logging
    const withLogging = (tool) => {
        const originalExecute = tool.execute;
        tool.execute = async (...args) => {
            console.log(`[Gateway] 🟢 Calling Tool: ${tool.name}`);
            try {
                const result = await originalExecute.apply(tool, args);
                console.log(`[Gateway] ✅ Tool ${tool.name} finished.`);
                return result;
            } catch (error) {
                console.error(`[Gateway] ❌ Tool ${tool.name} failed:`, error);
                throw error;
            }
        };
        return tool;
    };

    // --- Create Custom Tools ---

    const executeSqlTool = withLogging({
        type: 'function',
        name: 'execute_sql',
        description: 'Execute a SELECT query against the database and return the results.',
        parameters: {
            type: 'object',
            properties: {
                sql: {
                    type: 'string',
                    description: 'The SQL query to execute (must be SELECT).',
                },
            },
            required: ['sql'],
            additionalProperties: false,
        },
        needsApproval: () => true, // Enforce approval for this tool
        execute: async ({ sql }) => {
            if (!agentConfig) {
                return { error: "Agent configuration missing. Cannot execute SQL." };
            }

            console.log(`[Gateway] Executing SQL: ${sql}`);
            try {
                const response = await fetch(`${agentConfig.agent_endpoint}/agent/execute-query`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${agentConfig.agent_token}`
                    },
                    body: JSON.stringify({ sql })
                });

                if (!response.ok) {
                    const errText = await response.text();
                    throw new Error(`Agent Execution Failed: ${errText}`);
                }

                const data = await response.json();
                return { rows: data.rows };
            } catch (err) {
                return { error: err.message };
            }
        }
    });

    // --- Convert Agents to Tools ---

    const sqlTool = withLogging(sqlGenAgent.asTool({
        toolName: 'generate_sql',
        toolDescription: 'Generate a SQL query when the user asks a new question about data.',
    }));

    const analysisTool = withLogging(resultAnalysisAgent.asTool({
        toolName: 'analyze_results',
        toolDescription: 'Summarize or explain the results of a query.',
    }));

    const chartTool = withLogging(chartAgent.asTool({
        toolName: 'generate_chart_config',
        toolDescription: 'Generate a visualization configuration for data.',
    }));

    const routerTool = withLogging(queryRouterAgent.asTool({
        toolName: 'classify_intent',
        toolDescription: 'Classify the user intent. ALWAYS call this first.',
    }));

    const tools = [routerTool, sqlTool, executeSqlTool, analysisTool, chartTool];
    console.log(`[Gateway] Tools registered:`, tools.map(t => ({ name: t.name, type: t.type })));

    return new Agent({
        name: 'Gateway',
        instructions: `
      You are the Gateway Agent for a Database Analytics Copilot.
      Your ONLY job is to orchestrate the conversation by calling the right tools.

      Follow this STRICT FLOW for new data requests:
      1. Call 'classify_intent' -> 'new_sql_query'.
      2. Call 'generate_sql' to get the SQL.
      3. Call 'execute_sql' with the generated SQL to get the data.
      4. Call 'analyze_results' with the data from step 3 to summarize it.

      OTHER INTENTS:
         - 'followup_on_previous_result': Call 'analyze_results'.
         - 'visualization_only': Call 'generate_chart_config'.
         - 'comparison': Call 'generate_sql' -> 'execute_sql' -> 'analyze_results'.
         - 'explanation_only': specific explanation or analyze.
      
      DO NOT generate SQL yourself. Use the tool.
      DO NOT execute SQL yourself (you can't). Use 'execute_sql'.
      DO NOT make up data.
    `,
        model: 'gpt-4o',
        tools: tools,
    });
};
