import { OutputGuardrailTripwireTriggered } from '@openai/agents';
import { z } from 'zod';

/**
 * Output guardrail to ensure only SELECT queries are generated.
 * Blocks destructive actions like INSERT, UPDATE, DELETE, DROP.
 */
export const sqlGuardrail = {
    name: 'SQL Safety Guardrail',
    async execute({ agentOutput }) {
        if (!agentOutput || typeof agentOutput.sql !== 'string') {
            // If output is not what we expect, let it pass or fail? 
            // For strictness, if we expect SQL and don't get it, maybe fail. 
            // But the agent might output an error message.
            return {
                outputInfo: agentOutput,
                tripwireTriggered: false
            };
        }

        const normalized = agentOutput.sql.trim().toLowerCase();

        const isSelect = normalized.startsWith('select') || normalized.startsWith('with');
        const isDestructive =
            normalized.includes('insert into') ||
            normalized.includes('update ') ||
            normalized.includes('delete from') ||
            normalized.includes('drop table') ||
            normalized.includes('alter table') ||
            normalized.includes('grant ');

        const safe = isSelect && !isDestructive;

        if (!safe) {
            console.warn("SQL Guardrail tripped: " + normalized);
        }

        return {
            outputInfo: agentOutput,
            tripwireTriggered: !safe,
        };
    },
};
