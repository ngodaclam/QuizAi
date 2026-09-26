export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";

// Read at request time so all AI tools share the same environment override.
export const getGeminiModel = (env = process.env) =>
  env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
