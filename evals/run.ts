import { tools } from "../src/tools";
import { SYSTEM_PROMPT } from "../src/system-prompt";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText, stepCountIs } from "ai";
import { fileURLToPath } from "node:url";
import { EvalResult, TestCase } from "./types";
import { join, dirname } from "node:path";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const _dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join();

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function runTestCase(TestCase: TestCase): Promise<EvalResult> {
  const start = Date.now();
  try {
    const result = await generateText({
      model: openai("gpt-5.4-mini"),
      system: SYSTEM_PROMPT,
      prompt: TestCase.input,
      tools,
      stopWhen: stepCountIs(5),
    });

    const elements = [];
    for (const step of result.steps) {
      for (const toolResult of step.toolResults ?? []) {
        if (toolResult.toolName == "generateDiagram") {
          const output = toolResult.output as any;
          if (Array.isArray(output?.elements)) {
            elements.push(...output.elements);
          }
        }
      }
    }

    return {
      testCaseId: TestCase.id,
      input: TestCase.input,
      response: result.text,
      elements,
      durationMs: Date.now() - start,
    };
  } catch (e: any) {
    return {
      testCaseId: TestCase.id,
      input: TestCase.input,
      response: "",
      elements: [],
      durationMs: 0,
      error: String(e.message),
    };
  }
}

async function main() {
  const datasetPath = join(ROOT, "evals/datasets/golden.json");
  const testCases = JSON.parse(readFileSync(datasetPath, "utf-8"));

  console.log(`Running ${testCases.length} test case ... \n`);
  const results: EvalResult[] = [];

  for (const testCase of testCases) {
    process.stdout.write(`[${testCase.id}] ${testCase.difficulty.padEnd(6)}`);
    const result = await runTestCase(testCase);
    results.push(result);
    if (result.error) {
      console.log(`ERROR: ${result.error}`);
    } else {
      console.log(`${result.elements.length} elements, ${result.durationMs}ms`);
    }
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const resultsDir = join(ROOT, "evals/results");
  mkdirSync(resultsDir, { recursive: true });
  const outPath = join(resultsDir, `${timestamp}.json`);
  writeFileSync(outPath, JSON.stringify(results, null, 2));

  console.log(`\nResults written to ${outPath}`);
  console.log(
    `\nNext: open the file, review each result, and add score (1-5) and notes.`,
  );

  console.log("\n=== Summary ===");
  console.log(`Total: ${results.length}`);
  console.log(`Errors: ${results.filter((r) => r.error).length}`);
  console.log(
    `Empty results (no elements): ${results.filter((r) => !r.error && r.elements.length === 0).length}`,
  );
  const avgDuration = Math.round(
    results.reduce((sum, r) => sum + r.durationMs, 0) / results.length,
  );
  console.log(`Average duration: ${avgDuration}ms`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
