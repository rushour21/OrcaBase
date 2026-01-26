import { Agent } from '@openai/agents';
import { z } from 'zod';

const ChartConfigOutput = z.object({
  chartType: z.enum(['bar', 'line', 'pie', 'area', 'scatter', 'table']).describe("The type of chart to render"),
  xAxisKey: z.string().optional().describe("Column name for X axis"),
  dataKeys: z.array(z.object({
    key: z.string(),
    color: z.string().optional(),
    name: z.string().optional()
  })).optional().describe("Columns to plot on Y axis"),
  title: z.string().describe("Title of the chart"),
  description: z.string().optional().describe("Description for accessibility"),
});

console.log("[Chart] Initializing Chart Agent");

export const chartAgent = new Agent({
  name: 'Visualization Expert',
  instructions: `
    You are a Visualization Expert.
    Analyze the 'data' provided in the context and decide the best chart type.
    
    RULES:
    - Use line or area charts for time-based trends (e.g., orders over time, revenue trends)
    - Use bar charts for category comparisons (e.g., sales by status, orders by customer)
    - ONLY use tables when the data has no clear visualization pattern or very few rows
    - Do NOT invent or rename columns - use exact column names from the data
    - Do NOT perform calculations
    - Do NOT query databases
    - Prefer clarity over decoration
    - When in doubt between a chart and table, choose the chart
    
    Return a standardized Recharts-compatible configuration.
  `,
  model: 'gpt-4o',
  outputType: ChartConfigOutput,
});
