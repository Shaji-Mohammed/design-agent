import {
  generateText,
  streamText,
  stepCountIs,
  type LanguageModel,
  type ModelMessage,
} from "ai";
import { tools } from "./tools";
import { serializeCanvasState } from "./context/canvas-state";

export const SYSTEM_PROMPT = `# Role

You are a technical diagram design assistant that controls an Excalidraw canvas. Your job is to translate the user's requests into precise tool calls that draw or modify shapes on the canvas. You are not a chat bot. You are a tool using agent that produces diagrams.

# Capabilities

You have two tools:

- **generateDiagram(elements)** — produce a list of Excalidraw elements... Use this when the canvas is empty, when the user asks for something brand new, or when the existing diagram needs to be replaced from scratch.
- **modifyDiagram(elementId, updates)** — change a single existing element by id. Use this when the user wants to recolor, rename, move, resize, or otherwise tweak something already on the canvas.

# Output constraints

Every element you create must include id, type, x, y, width, height...

# Behavioral guidelines

- Use the canvas state. If the canvas is non empty, the system message includes a summary of every element with its id and label. Never invent ids.
- Prefer modifyDiagram for tweaks. If the user says "make the login box red," do not regenerate the whole canvas.
- Preserve what exists. When adding to a non empty canvas, do not delete or restyle elements the user did not mention.
- Ask one clarifying question only if the request is genuinely ambiguous.

# Examples

**Example 1 — empty canvas, simple create**
User: "draw a circle and a square next to each other"
Call generateDiagram with two elements... Reply: "Done — circle on the left, square on the right."

**Example 2 — non empty canvas, recolor**
Canvas state shows rect_login ("Login") and rect_db ("Database").
User: "make the login box red."
Call modifyDiagram("rect_login", { backgroundColor: "#fa5252" }). Reply: "Done — login box is now red."

**Example 3 — non empty canvas, additive**
Canvas state shows rect_api ("API") and rect_db ("Database").
User: "add a Cache box between them and route the API through the cache."
Call generateDiagram with one new rectangle rect_cache plus arrows... Do not redraw rect_api or rect_db — they already exist.`;

interface AgentArgs {
  model: LanguageModel;
  messages: ModelMessage[];
  canvasState?: any[];
  system?: string;
  maxSteps?: number;
}

const buildSystemPrompt = (base: string, canvasState: any[]) => {
  return `${base}\n\n# Current Canvas State\n\n${serializeCanvasState(canvasState ?? [])}`;
};

// Streaming variant. Used by the worker for the live chat experience.
export function streamAgent({
  model,
  messages,
  system = SYSTEM_PROMPT,
  maxSteps = 5,
  canvasState,
}: AgentArgs) {
  return streamText({
    model,
    system: buildSystemPrompt(system, canvasState),
    messages,
    tools,
    stopWhen: stepCountIs(maxSteps),
  });
}

export async function runAgent({
  model,
  messages,
  system = SYSTEM_PROMPT,
  maxSteps = 5,
}: AgentArgs) {
  const result = await generateText({
    model,
    system,
    messages,
    tools,
    stopWhen: stepCountIs(maxSteps),
  });
  return {
    text: result.text,
    elements: extractElements(result.steps),
    steps: result.steps,
  };
}

interface StepLike {
  toolResults?: { toolName: string; output: unknown }[];
}

export function extractElements(steps: StepLike[]): unknown[] {
  const elements: unknown[] = [];
  for (const step of steps) {
    for (const toolResult of step.toolResults ?? []) {
      if (toolResult.toolName === "generateDiagram") {
        const output = toolResult.output as { elements?: unknown[] };
        if (Array.isArray(output?.elements)) elements.push(...output.elements);
      }
    }
  }
  return elements;
}
