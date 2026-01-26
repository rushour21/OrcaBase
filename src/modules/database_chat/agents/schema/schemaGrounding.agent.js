import { Agent } from '@openai/agents';
import { z } from 'zod';

const TableMatch = z.object({
    table: z.string().describe("Exact table name from schema"),
    confidence: z.number().min(0).max(1).describe("Confidence score for this match"),
    reason: z.string().describe("Why this table was matched"),
});

const SchemaGroundingOutput = z.object({
    matched_tables: z.array(TableMatch).describe("Tables that match the user's intent"),
    rejected_tables: z.array(z.object({
        table: z.string(),
        reason: z.string()
    })).describe("Tables that were considered but rejected"),
    ambiguous: z.boolean().describe("Whether the grounding is ambiguous"),
    clarification_needed: z.string().nullable().describe("What clarification is needed from user, if any"),
});

console.log("[Schema] Initializing Schema Grounding Agent");

export const schemaGroundingAgent = new Agent({
    name: 'Schema Grounding Expert',
    instructions: `
    You are a Schema Grounding Agent for a database query system.
    Your job is to map user intent to ACTUAL database tables.
    
    This is the most critical step for preventing hallucinations.
    
    CRITICAL RULES:
    - ONLY use tables that exist in the provided schema
    - NEVER invent table names
    - NEVER use disallowed/audit tables
    - Prefer single tables unless join is clearly needed
    - Use semantic matching, not just string matching
    
    You will receive:
    1. Intent output (what user wants)
    2. Schema snapshot (available tables and columns)
    3. Allowed tables list (if restricted)
    
    Your task:
    1. Match entities from intent to actual table names
    2. Explain WHY each table was matched
    3. List tables you rejected and why
    4. Flag if the intent is ambiguous
    5. Request clarification if needed
    
    Examples:
    
    Input Intent: { entities: ["orders"], filters: ["latest"] }
    Schema: { tables: ["orders", "order_logs", "customers"] }
    
    Output: {
      "matched_tables": [{
        "table": "orders",
        "confidence": 0.94,
        "reason": "Direct match with entity 'orders'"
      }],
      "rejected_tables": [{
        "table": "order_logs",
        "reason": "Audit table, not for user queries"
      }],
      "ambiguous": false,
      "clarification_needed": null
    }
    
    Input Intent: { entities: ["sales"], filters: [] }
    Schema: { tables: ["orders", "products", "customers"] }
    
    Output: {
      "matched_tables": [{
        "table": "orders",
        "confidence": 0.75,
        "reason": "Orders likely represent sales transactions"
      }],
      "rejected_tables": [],
      "ambiguous": true,
      "clarification_needed": "Did you mean orders (transactions) or products (items sold)?"
    }
    
    Remember: This step eliminates 70% of hallucinations. Be conservative.
  `,
    model: 'gpt-4o',
    outputType: SchemaGroundingOutput,
});
