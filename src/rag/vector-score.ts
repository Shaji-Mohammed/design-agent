import { Index } from "@upstash/vector";

export interface VectorEnv {
  UPSTASH_VECTOR_REST_URL?: string;
  UPSTASH_VECTOR_REST_TOKEN?: string;
}

export function getIndex(env: VectorEnv): Index {
  if (!env.UPSTASH_VECTOR_REST_URL || !env.UPSTASH_VECTOR_REST_TOKEN) {
    throw new Error(
      "Upstash Vector is not configured: set UPSTASH_VECTOR_REST_URL and UPSTASH_VECTOR_REST_TOKEN",
    );
  }
  return new Index({
    url: env.UPSTASH_VECTOR_REST_URL,
    token: env.UPSTASH_VECTOR_REST_TOKEN,
  });
}
