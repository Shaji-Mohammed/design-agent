import { z } from "zod";
import { tool } from "ai";

export function makeSearchWeb(apiKey: string) {
  return tool({
    description: `Search the web for current information. Use this when a user asks you about tech you don't know about or never heard or if they give you a url to reference.`,
    inputSchema: z.object({
      query: z.string(),
      maxResults: z.number().nullable(),
    }),
    execute: async ({ query, maxResults }) => {
      if (!apiKey) return { error: "apiKey not configured, tell the user." };

      try {
        const response = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            apiKey: apiKey,
            query,
            maxResults: maxResults ?? 5,
            search_depth: "basic",
          }),
        });

        if (!response.ok) {
          return {
            error: `Search came back with an error: ${await response.text()}`,
          };
        }

        const data = (await response.json()) as any;
        const result = (data.results ?? []).map((r) => ({
          title: r.title ?? "",
          content: r.content ?? "",
          url: r.url ?? "",
        }));
      } catch (e) {
        return { error: `Search failed with some error` };
      }
    },
  });
}
