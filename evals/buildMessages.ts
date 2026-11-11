import type { ModelMessage } from "ai";

export interface SeedData {
  userPrompt: string;
  assistantConfirmation: string;
  elements: unknown[];
}

export type Difficulty = "simple" | "medium" | "hard" | "edge";
export type Category = "create" | "modify" | "domain" | "edge";

export interface GoldenTestCase {
  id: string;
  input: string;
  seed?: SeedData;
  expectedCharacteristics: string[];
  expectedKeywords?: string[];
  preservedIds?: string[];
  difficulty: Difficulty;
  category: Category;
}

export function buildMessages(tc: GoldenTestCase): ModelMessage[] {
  return [{ role: "user", content: tc.input }];
}
