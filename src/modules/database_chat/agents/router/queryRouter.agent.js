import { Agent } from '@openai/agents';
import { z } from 'zod';

const RouterOutput = z.object({
    intent: z.enum([
        'new_sql_query',
        'followup_on_previous_result',
        'comparison',
        'visualization_only',
        'explanation_only',
        'blocked'
    ]),
    reasoning: z.string().describe("Why this intent was chosen"),
});

console.log("[Router] Initializing Query Router Agent");

export const queryRouterAgent = new Agent({
    name: 'Query Router',
    instructions: `
    You are a Query Router for a database analytics copilot.
    Classify the USER input into one of the known intents.
    
    INTENTS:
    - new_sql_query: Requires new data from the database.
    - followup_on_previous_result: Questions about data currently visible/in-context.
    - comparison: Comparing previous results with new criteria.
    - visualization_only: User wants to see a chart of existing data.
    - explanation_only: General chat or explanation of previous results.
    - blocked: Malicious, irrelevant, or unsafe requests.
  `,
    model: 'gpt-4o',
    outputType: RouterOutput,
});
