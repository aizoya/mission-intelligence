import { defineAgent } from "eve";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const crusoe = createOpenAICompatible({
  name: "crusoe",
  baseURL: "https://api.inference.crusoecloud.com/v1",
  apiKey: process.env.CRUSOE_API_KEY,
  includeUsage: true,
  fetch: async (input, init) => {
    if (process.env.ALLOW_LIVE_CALLS !== "true") throw new Error("Live calls disabled pending approved credit budget");
    return fetch(input, init);
  },
});

export default defineAgent({
  model: crusoe(process.env.CRUSOE_MODEL || "nvidia/Nemotron-3-Super-120B-A12B"),
  modelContextWindowTokens: 262144,
  defaultTools: false,
  tool: false,
  limits: { maxInputTokensPerSession: 60000, maxOutputTokensPerSession: 10000, sessionTimeoutMs: 3600000 },
});
