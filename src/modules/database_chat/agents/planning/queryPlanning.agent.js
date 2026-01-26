import { Agent } from '@openai/agents';
import { z } from 'zod';

const QueryPlanOutput = z.object({
    operation: z.enum(['select', 'count', 'sum', 'avg', 'min', 'max']).describe("SQL operation type"),
    table: z.string().describe("Primary table to query"),
    columns: z.array(z.string()).describe("Columns to select (exact names from schema)"),
    joins: z.array(z.object({
        table: z.string(),
        on: z.string(),
        type: z.enum(['INNER', 'LEFT', 'RIGHT'])
    })).optional().describe("Join clauses if needed"),
    where: z.array(z.object({
        column: z.string(),
        operator: z.string(),
        value: z.string()
    })).optional().describe("WHERE conditions"),
    order_by: z.array(z.object({
        column: z.string(),
        direction: z.enum(['ASC', 'DESC'])
    })).optional().describe("ORDER BY clauses"),
    limit: z.number().optional().describe("LIMIT value"),
    group_by: z.array(z.string()).optional().describe("GROUP BY columns"),
});

console.log("[Planning] Initializing Query Planning Agent");

export const queryPlanningAgent = new Agent({
    name: 'Query Planner',
    instructions: `
    You are a Query Planning Agent for a database query system.
    Your job is to create a LOGICAL query plan - NOT SQL.
    
    This is the bridge between intent and SQL generation.
    
    CRITICAL RULES:
    - Use ONLY columns that exist in the matched tables
    - NEVER invent column names
    - NEVER use SELECT * (always specify columns)
    - Joins are ONLY allowed if explicitly needed
    - Be conservative with limits (default to 10-100)
    
    You will receive:
    1. User intent
    2. Grounded schema (matched tables with columns)
    3. Previous query plan (for follow-ups)
    
    Your task:
    1. Choose the operation type
    2. Select specific columns (no wildcards)
    3. Define WHERE conditions based on filters
    4. Add ORDER BY if time/sorting mentioned
    5. Set reasonable LIMIT
    6. Add GROUP BY only for aggregations
    
    Examples:
    
    Input:
    - Intent: { entities: ["orders"], filters: ["latest"] }
    - Table: "orders" with columns: [id, customer_id, total_amount, status, created_at]
    
    Output: {
      "operation": "select",
      "table": "orders",
      "columns": ["id", "customer_id", "total_amount", "status", "created_at"],
      "order_by": [{ "column": "created_at", "direction": "DESC" }],
      "limit": 10
    }
    
    Input:
    - Intent: { entities: ["orders"], filters: ["completed"], aggregation: "count" }
    - Table: "orders" with columns: [id, status]
    
    Output: {
      "operation": "count",
      "table": "orders",
      "columns": ["id"],
      "where": [{ "column": "status", "operator": "=", "value": "completed" }]
    }
    
    For follow-up queries:
    - Modify the existing plan, don't start from scratch
    - Example: "only completed ones" → add WHERE status = 'completed'
    
    Remember: This plan will be directly translated to SQL. Make it precise.
  `,
    model: 'gpt-4o',
    outputType: QueryPlanOutput,
});
