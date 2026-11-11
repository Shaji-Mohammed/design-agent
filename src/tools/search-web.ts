import { tool } from "ai";
import { z } from "zod";

interface TavilyResult {
  title?: string;
  content?: string;
  url?: string;
}

interface TavilyResponse {
  results?: TavilyResult[];
}

export function makeSearchWeb(apiKey: string | undefined) {
  return tool({
    description: `Search the web for current information. Use this when the user asks about recent technology, frameworks, services, or systems where you may not have up to date knowledge — for example "draw an architecture diagram of how Cloudflare Workers handle requests" should trigger a search before you start drawing.

Example: searchWeb({ query: "how Cloudflare Workers handle incoming requests", maxResults: 5 })`,
    inputSchema: z.object({
      query: z.string().describe("Search query"),
      maxResults: z
        .number()
        .optional()
        .describe("How many results to return (default 5)"),
    }),
    execute: async ({ query, maxResults }) => {
      if (!apiKey) {
        return { error: "Tavily API key is not configured" };
      }
      try {
        const response = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: apiKey,
            query,
            max_results: maxResults ?? 5,
            search_depth: "basic",
          }),
        });
        if (!response.ok) {
          return {
            error: `Tavily returned ${response.status}: ${await response.text()}`,
          };
        }
        const data = (await response.json()) as TavilyResponse;
        const results = (data.results ?? []).map((r) => ({
          title: r.title ?? "",
          content: r.content ?? "",
          url: r.url ?? "",
        }));
        return { results };
      } catch (err) {
        return {
          error: `Search failed: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    },
  });
}
