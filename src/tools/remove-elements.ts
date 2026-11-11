import { z } from "zod";
import { tool } from "ai";

export const removeElements = tool({
  description: `Remove elements from the canvas by id. Use this when the user wants to delete shapes. Ids must come from the canvas, call queryCanvas first if you don't know what's there.

Example: removeElements({ ids: ["rect_old", "arrow_stale"] })`,
  inputSchema: z.object({
    ids: z.array(z.string()).describe("Array of element ids to remove"),
  }),
  strict: true,
});
