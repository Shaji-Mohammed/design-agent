import { addElements } from "./tools/add-elements";
import { removeElements } from "./tools/remove-elements";
import { updateElements } from "./tools/update-elements";
import { queryCanvas } from "./tools/query-canvas";
import { makeSearchWeb } from "./tools/search-web";
import { makeSearchKnowledge } from "./tools/search-knowledge";

export interface ToolEnv {
  TAVILY_API_KEY?: string;
  UPSTASH_VECTOR_REST_URL?: string;
  UPSTASH_VECTOR_REST_TOKEN?: string;
}

export function buildTools(env: ToolEnv) {
  return {
    addElements,
    removeElements,
    updateElements,
    queryCanvas,
    searchWeb: makeSearchWeb(env.TAVILY_API_KEY),
    searchKnowledge: makeSearchKnowledge({
      UPSTASH_VECTOR_REST_URL: env.UPSTASH_VECTOR_REST_URL,
      UPSTASH_VECTOR_REST_TOKEN: env.UPSTASH_VECTOR_REST_TOKEN,
    }),
  };
}
