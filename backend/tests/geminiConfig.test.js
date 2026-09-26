import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_GEMINI_MODEL, getGeminiModel } from "../config/gemini.js";
import { generateImportedQuizBatch } from "../utils/quizDistractors.js";

test("AI tools use the new model by default and respect a trimmed override", () => {
  assert.equal(DEFAULT_GEMINI_MODEL, "gemini-3.5-flash-lite");
  for (const env of [{}, { GEMINI_MODEL: "" }, { GEMINI_MODEL: " \t" }]) {
    assert.equal(getGeminiModel(env), DEFAULT_GEMINI_MODEL);
  }
  assert.equal(getGeminiModel({ GEMINI_MODEL: " models/custom-model " }), "models/custom-model");
});

test("Excel quiz generation actually sends the shared configured model", async () => {
  const selectedModel = getGeminiModel();
  let request;
  await generateImportedQuizBatch([{ question: "2 + 2?", answer: "4" }], {
    generateContent: async (value) => {
      request = value;
      return { text: JSON.stringify([{ id: 0, distractors: ["3", "5", "6"] }]) };
    },
  });
  assert.equal(request.model, selectedModel);
});
