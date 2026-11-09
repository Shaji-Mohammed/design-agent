import { z } from "zod";
import { tool } from "ai";

export const queryCanvas = tool({
  description: `Read the current contents of the canvas. Call this when you need to know about elements before using other tools like update, remove, add, etc. Returns the summary of all elements including things like id, pos, dimensions, groupIds, etc. `,
  inputSchema: z.object({}),
});
