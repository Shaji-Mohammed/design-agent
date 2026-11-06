import { generateText, streamText, stepCountIs } from "ai";
import { tools } from "./tools";
import { SYSTEM_PROMPT } from "./system-prompt";

export function streamAgent({
  model,
  messages,
  system = SYSTEM_PROMPT,
  maxSteps = 5,
}) {
  return streamText({
    model,
    system,
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
}) {
  const result = await generateText({
    model,
    system,
    messages,
    tools,
    stopWhen: stepCountIs(maxSteps),
  });

  return {
    text: result.text,
    steps: result.steps,
    elements: extractElements(result.steps),
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
