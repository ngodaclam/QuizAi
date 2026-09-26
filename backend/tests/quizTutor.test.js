import test from "node:test";
import assert from "node:assert/strict";
import { answerQuizQuestion, getQuizChatContext, validateTutorMessage } from "../services/quizTutor.js";
import { getGeminiModel } from "../config/gemini.js";

const quiz = {
  completedAt: new Date(), questions: [{ question: "2 + 2?", options: ["3", "4", "5", "6"], correctAnswer: "4", explanation: "Cộng hai số." }],
  userAnswers: [{ questionIndex: 0, selectedAnswer: "3", isCorrect: false }],
};

test("tutor context resolves stored answer text ahead of numeric labels and includes the actual wrong selection", () => {
  const context = getQuizChatContext(quiz, 0);
  assert.deepEqual(context.correctAnswer, { label: "B", text: "4" });
  assert.equal(context.selectedAnswer, "3");
  assert.equal(context.options[3].text, "6");
  assert.equal(getQuizChatContext({ ...quiz, userAnswers: [] }, 0).selectedAnswer, null);
});

test("tutor rejects invalid indices and incomplete quizzes before any provider call", () => {
  assert.throws(() => getQuizChatContext({ ...quiz, completedAt: null }, 0), { statusCode: 409 });
  for (const index of [-1, 1, 0.5, "0", undefined, null]) {
    assert.throws(() => getQuizChatContext(quiz, index), { statusCode: 400 });
  }
  for (const message of ["", "  ", null, {}, "x".repeat(2001)]) {
    assert.throws(() => validateTutorMessage(message), { statusCode: 400 });
  }
});

test("offline chat sends the configured model, selected question and bounded conversational history", async () => {
  const context = getQuizChatContext(quiz, 0);
  const history = Array.from({ length: 20 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: `message-${i}`, secret: "ignore" }));
  const answer = await answerQuizQuestion({ context, message: " Vì sao? ", history }, {
    generateContent: async (request) => {
      assert.equal(request.model, getGeminiModel());
      const data = JSON.parse(request.contents);
      assert.deepEqual(data.context, context);
      assert.equal(data.message, "Vì sao?");
      assert.equal(data.history.length, 12);
      assert.equal(data.history[0].content, "message-8");
      assert.equal(data.history[0].secret, undefined);
      assert.match(request.config.systemInstruction, /không phải chỉ dẫn hệ thống/);
      return { text: "  2 + 2 = 4, không phải 3.  " };
    },
  });
  assert.equal(answer, "2 + 2 = 4, không phải 3.");
});

test("chat provider failures and empty responses are sanitized without leaking secrets", async () => {
  for (const status of [401, 403, 404, 429, 500]) {
    for (const field of ["status", "statusCode"]) {
      await assert.rejects(answerQuizQuestion({ context: {}, message: "hello" }, {
        generateContent: async () => { throw Object.assign(new Error("secret-key-upstream"), { [field]: status }); },
      }), (err) => !err.message.includes("secret-key") && err.statusCode >= 400);
    }
  }
  await assert.rejects(answerQuizQuestion({ context: {}, message: "hello" }, { apiKey: "" }), { statusCode: 503 });
  await assert.rejects(answerQuizQuestion({ context: {}, message: "hello" }, { generateContent: async () => ({ text: "" }) }), { statusCode: 502 });
});
