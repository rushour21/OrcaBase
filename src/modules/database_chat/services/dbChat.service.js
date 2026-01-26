import { run } from '@openai/agents';
import { intentUnderstandingAgent } from '../agents/intent/intentUnderstanding.agent.js';
import { schemaGroundingAgent } from '../agents/schema/schemaGrounding.agent.js';
import { queryPlanningAgent } from '../agents/planning/queryPlanning.agent.js';
import { sqlGeneratorAgent } from '../agents/sql/sqlGenerator.agent.js';
import { resultAnalysisAgent } from '../agents/analysis/resultAnalysis.agent.js';
import { webSearchTool } from '../tools/webSearch.tool.js';
import { sessionService } from './session.service.js';
import { getSchemaSnapshot, getAgentConfig } from '../../database_integration/database.service.js';

/**
 * Extract final structured output from agent run
 */
const extractFinalOutput = (agentRun) => {
    if (!agentRun) return null;

    const currentStep = agentRun.state?._currentStep;

    if (currentStep?.type === "next_step_final_output" && currentStep.output) {
        try {
            return JSON.parse(currentStep.output);
        } catch (e) {
            console.error("[Service] Failed to parse output:", e.message);
        }
    }

    if (agentRun.summary || agentRun.intent_type) return agentRun;

    return null;
};

/**
 * Database Chat Service - Industry-Standard 7-Stage Pipeline
 */
export const dbChatService = {
    /**
     * Process a user message through the 7-stage pipeline
     */
    async processMessage({ userQuery, sessionId, workspaceId, userId }) {
        console.log(`[Service] Processing message for session: ${sessionId}`);

        // Get or create session
        let session;
        let isNewSession = false;
        if (!sessionId) {
            const title = sessionService.generateTitleFromMessage(userQuery);
            session = await sessionService.createSession({
                userId,
                workspaceId,
                title
            });
            sessionId = session.id;
            isNewSession = true;
            console.log(`[Service] Created new session: ${sessionId} with title: "${title}"`);
        } else {
            session = await sessionService.getSession(sessionId);

            // Update title if it's still "New Session" and this is the first user message
            if (session.title === 'New Session') {
                const title = sessionService.generateTitleFromMessage(userQuery);
                await sessionService.updateTitle(sessionId, title);
                console.log(`[Service] Updated session title to: "${title}"`);
            }
        }

        // Save user message
        await sessionService.addMessage({
            sessionId,
            role: 'user',
            content: userQuery
        });

        // Get last 5 messages for context (for follow-up questions)
        const recentMessages = await sessionService.getMessages(sessionId, 5);
        const conversationContext = recentMessages
            .filter(msg => msg.role !== 'system')
            .map(msg => `${msg.role}: ${msg.content}`)
            .join('\n');

        // Check if web search is needed and enabled
        if (session.web_search_enabled && webSearchTool.requiresWebSearch(userQuery)) {
            console.log(`[Service] Web search triggered for query`);
            const searchResults = await webSearchTool.search(userQuery);
            const formatted = webSearchTool.formatResults(searchResults);

            await sessionService.addMessage({
                sessionId,
                role: 'assistant',
                content: formatted.content,
                metadata: { source: 'web_search', disclaimer: formatted.disclaimer }
            });

            return {
                sessionId,
                text: formatted.content,
                source: 'web_search'
            };
        }

        // ========================================
        // STAGE 1: Intent Understanding
        // ========================================
        console.log(`[Service] Stage 1: Intent Understanding`);

        // Include conversation context for better intent understanding
        const intentInput = conversationContext
            ? `Previous conversation:\n${conversationContext}\n\nCurrent question: ${userQuery}`
            : userQuery;

        const intentResult = await run(intentUnderstandingAgent, intentInput);
        const intent = extractFinalOutput(intentResult);

        if (!intent) {
            throw new Error("Failed to understand user intent");
        }

        console.log(`[Service] Intent: ${intent.intent_type}, Entities: ${intent.entities.join(', ')}`);

        // Handle non-database queries (conversational, greetings, etc.)
        if (intent.intent_type === 'other' || intent.intent_type === 'explain') {
            console.log(`[Service] Non-database query detected, providing conversational response`);

            const conversationalResponse = await this.handleConversationalQuery(userQuery);

            await sessionService.addMessage({
                sessionId,
                role: 'assistant',
                content: conversationalResponse,
                metadata: { type: 'conversational' }
            });

            return {
                sessionId,
                text: conversationalResponse,
                type: 'conversational'
            };
        }

        // ========================================
        // STAGE 2: Schema Grounding
        // ========================================
        console.log(`[Service] Stage 2: Schema Grounding`);
        const schema = await getSchemaSnapshot(workspaceId);

        if (!schema) {
            throw new Error("No database schema found for this workspace");
        }

        const schemaContext = `
            User Intent: ${JSON.stringify(intent)}
            
            Available Schema:
            ${JSON.stringify(schema, null, 2)}
        `;

        const groundingResult = await run(schemaGroundingAgent, schemaContext);
        const grounded = extractFinalOutput(groundingResult);

        if (!grounded || grounded.matched_tables.length === 0) {
            // If no tables matched, treat as conversational
            console.log(`[Service] No tables matched, treating as conversational query`);
            const conversationalResponse = await this.handleConversationalQuery(userQuery);

            await sessionService.addMessage({
                sessionId,
                role: 'assistant',
                content: conversationalResponse,
                metadata: { type: 'conversational' }
            });

            return {
                sessionId,
                text: conversationalResponse,
                type: 'conversational'
            };
        }

        if (grounded.clarification_needed) {
            await sessionService.addMessage({
                sessionId,
                role: 'assistant',
                content: grounded.clarification_needed
            });

            return {
                sessionId,
                text: grounded.clarification_needed,
                needsClarification: true
            };
        }

        console.log(`[Service] Matched tables: ${grounded.matched_tables.map(t => t.table).join(', ')}`);

        // ========================================
        // STAGE 3: Query Planning
        // ========================================
        console.log(`[Service] Stage 3: Query Planning`);

        // Check for follow-up query
        const lastPlan = session.last_query_plan;
        const planningContext = lastPlan
            ? `
                User Intent: ${JSON.stringify(intent)}
                Grounded Schema: ${JSON.stringify(grounded)}
                Previous Query Plan: ${JSON.stringify(lastPlan)}
                
                This is a follow-up query. Modify the previous plan based on the new intent.
              `
            : `
                User Intent: ${JSON.stringify(intent)}
                Grounded Schema: ${JSON.stringify(grounded)}
                
                Create a new query plan.
              `;

        const planningResult = await run(queryPlanningAgent, planningContext);
        const queryPlan = extractFinalOutput(planningResult);

        if (!queryPlan) {
            throw new Error("Failed to create query plan");
        }

        console.log(`[Service] Query Plan: ${queryPlan.operation} on ${queryPlan.table}`);

        // ========================================
        // STAGE 4: SQL Generation
        // ========================================
        console.log(`[Service] Stage 4: SQL Generation`);

        const sqlContext = `
            Query Plan: ${JSON.stringify(queryPlan)}
            SQL Dialect: postgresql
        `;

        const sqlResult = await run(sqlGeneratorAgent, sqlContext);
        const sqlOutput = extractFinalOutput(sqlResult);

        if (!sqlOutput || !sqlOutput.sql) {
            throw new Error("Failed to generate SQL");
        }

        console.log(`[Service] Generated SQL: ${sqlOutput.sql}`);

        // ========================================
        // STAGE 5: Approval (return for user approval)
        // ========================================
        console.log(`[Service] Stage 5: Awaiting Approval`);

        // Update session state for follow-ups
        await sessionService.updateSessionState({
            sessionId,
            queryPlan,
            tablesUsed: grounded.matched_tables.map(t => t.table),
            filters: intent.filters
        });

        return {
            sessionId,
            text: "I generated a SQL query for you. Please approve it to proceed.",
            sql: sqlOutput.sql,
            queryPlan,
            approvalRequired: true
        };
    },

    /**
     * Execute approved SQL and interpret results
     * STAGES 6-7: Execution + Interpretation
     */
    async executeApprovedSql({ sql, sessionId, workspaceId }) {
        console.log(`[Service] Executing approved SQL for session: ${sessionId}`);

        let rows = [];

        try {
            // ========================================
            // STAGE 6: Execution
            // ========================================
            const agentConfig = await getAgentConfig(workspaceId);
            if (!agentConfig) {
                throw new Error("Agent configuration not found");
            }

            const sanitizedSql = sql.trim().replace(/;+$/, '');

            const response = await fetch(`${agentConfig.agent_endpoint}/agent/execute-query`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${agentConfig.agent_token}`
                },
                body: JSON.stringify({ sql: sanitizedSql })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Query execution failed: ${errText}`);
            }

            const data = await response.json();
            rows = data.rows;
            console.log(`[Service] Query executed. Rows: ${rows.length}`);

        } catch (error) {
            console.error(`[Service] Execution error:`, error);
            throw error;
        }

        // ========================================
        // STAGE 7: Result Interpretation
        // ========================================
        try {
            const dataContext = `
                I have executed the following SQL:
                \`\`\`sql
                ${sql}
                \`\`\`
                
                The result data is:
                ${JSON.stringify(rows, null, 2)}
            `;

            console.log(`[Service] Stage 7: Result Interpretation`);
            const analysisResult = await run(resultAnalysisAgent, dataContext);
            const analysisOutput = extractFinalOutput(analysisResult);

            let analysisText = "";
            if (analysisOutput?.summary) {
                analysisText = `**Summary:** ${analysisOutput.summary}\n\n**Insights:**\n${analysisOutput.key_metrics?.map(m => `- ${m}`).join('\n') || ''}`;
                if (analysisOutput.follow_up_suggestions?.length > 0) {
                    analysisText += `\n\n**Suggested Next Steps:**\n${analysisOutput.follow_up_suggestions.map(q => `> ${q}`).join('\n')}`;
                }
            } else {
                analysisText = "Query executed successfully.";
            }

            // Save assistant response
            await sessionService.addMessage({
                sessionId,
                role: 'assistant',
                content: analysisText,
                metadata: { sql, rowCount: rows.length }
            });

            return {
                sessionId,
                text: analysisText,
                rows,
                sql,
                analysis: analysisOutput
            };

        } catch (error) {
            console.error("[Service] Analysis failed:", error);
            return {
                sessionId,
                text: "Query executed successfully. Here is the data.",
                rows,
                sql
            };
        }
    },

    /**
     * Handle conversational queries that don't need database access
     */
    async handleConversationalQuery(userQuery) {
        const lowerQuery = userQuery.toLowerCase();

        // Simple greeting responses
        if (lowerQuery.match(/^(hi|hello|hey|greetings)/)) {
            return "Hello! I'm your database assistant. I can help you query your database, analyze data, and answer questions about your data. What would you like to know?";
        }

        if (lowerQuery.match(/how are you|how's it going/)) {
            return "I'm doing great, thank you! I'm here to help you explore and analyze your database. What can I help you with today?";
        }

        if (lowerQuery.match(/thank/)) {
            return "You're welcome! Let me know if you need anything else.";
        }

        if (lowerQuery.match(/bye|goodbye/)) {
            return "Goodbye! Feel free to come back anytime you need help with your data.";
        }

        // Default conversational response
        return "I'm a database assistant. I can help you query and analyze your data. Try asking me about your orders, customers, or any other data in your database!";
    }
};
