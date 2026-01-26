import OpenAI from "openai";

console.log("[WebSearch] Initializing Web Search Tool");

/**
 * Web Search Tool - Optional tool for external data retrieval
 * Only invoked when user explicitly asks for information outside the database
 */
export class WebSearchTool {
    constructor() {
        this.client = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
    }

    /**
     * Perform web search using OpenAI's web_search tool
     * @param {string} query - Search query
     * @returns {Promise<string>} - Search results as text
     */
    async search(query) {
        try {
            console.log(`[WebSearch] Executing search: "${query}"`);

            const response = await this.client.responses.create({
                model: "gpt-4o",
                tools: [{ type: "web_search" }],
                input: query,
            });

            console.log(`[WebSearch] Search completed successfully`);
            return response.output_text;
        } catch (error) {
            console.error("[WebSearch] Search failed:", error.message);
            throw new Error(`Web search failed: ${error.message}`);
        }
    }

    /**
     * Check if a query requires web search
     * @param {string} userQuery - User's query
     * @returns {boolean} - Whether web search is needed
     */
    requiresWebSearch(userQuery) {
        const webSearchKeywords = [
            'benchmark',
            'industry standard',
            'best practice',
            'market trend',
            'compare to',
            'what is',
            'how does',
            'explain',
            'definition of'
        ];

        const lowerQuery = userQuery.toLowerCase();
        return webSearchKeywords.some(keyword => lowerQuery.includes(keyword));
    }

    /**
     * Format web search results with source attribution
     * @param {string} results - Raw search results
     * @returns {object} - Formatted results with metadata
     */
    formatResults(results) {
        return {
            content: results,
            source: 'web_search',
            timestamp: new Date().toISOString(),
            disclaimer: 'This information is from external sources and may not reflect your database data.'
        };
    }
}

// Export singleton instance
export const webSearchTool = new WebSearchTool();
