import { readFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";
import { Eval } from "braintrust";
import { createOpenAI } from "@ai-sdk/openai";

import { runAgent } from "../src/agent-core";
import { buildMessages, type GoldenTestCase } from "./buildMessages";
import { schemaScorer, type AgentOutput } from "./scorers/schema";
import { structureScorer } from "./scorers/structure";
import { toolChoiceScorer } from "./scorers/toolChoice";
import { labelKeywordScorer } from "./scorers/labelKeyword";

config({ path: ".dev.vars" });

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

const testCases: GoldenTestCase[] = JSON.parse(
  readFileSync(join("evals", "datasets", "golden_2.json"), "utf-8"),
);

Eval<GoldenTestCase, AgentOutput, GoldenTestCase>("Diagram Agent", {
  data: () =>
    testCases.map((tc) => ({
      input: tc,
      expected: tc,
      metadata: {
        id: tc.id,
        difficulty: tc.difficulty,
        category: tc.category,
      },
    })),

  task: async (testCase) => {
    const result = await runAgent({
      model: openai("gpt-5.4-mini"),
      messages: buildMessages(testCase),
      seedCanvas: testCase.seed?.elements ?? [],
      env: { TAVILY_API_KEY: process.env.TAVILY_API_KEY },
    });
    return {
      text: result.text,
      elements: result.elements,
      toolCalls: result.toolCalls,
    };
  },

  scores: [schemaScorer, structureScorer, toolChoiceScorer, labelKeywordScorer],
});
