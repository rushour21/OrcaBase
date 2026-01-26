import { Agent } from '@openai/agents';
import { z } from 'zod';

const AnalysisOutput = z.object({
  summary: z.string().describe("Concise summary of the data insights"),
  key_metrics: z.array(z.string()).describe("List of key metrics or findings"),
  follow_up_suggestions: z.array(z.string()).describe("3 relevant follow-up questions"),
});

console.log("[Analysis] Initializing Result Analysis Agent");

export const resultAnalysisAgent = new Agent({
  name: 'Result Analyst',
  instructions: `
    You are a Data Analyst.
    Your job is to explain the results of a database query to the user.
    
    INSTRUCTIONS:
    1. Summarize the key insights from the 'data' provided in the context.
    2. Be concise but informative.
    3. If the data is empty, explain that no results were found.
    4. Do not mention "ID" columns unless relevant.
    5. Suggest 3 logical follow-up questions the user might ask next.
    
    IMPORTANT: Return ONLY valid JSON. Do not wrap in markdown code blocks.
  `,
  model: 'gpt-4o',
  outputType: AnalysisOutput,
});
