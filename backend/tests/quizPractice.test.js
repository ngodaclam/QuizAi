import test from "node:test";
import assert from "node:assert/strict";
import Quiz from "../models/Quiz.js";
import { sampleQuizQuestions, quizForTaking } from "../utils/quizPractice.js";
import { gradeQuizAnswers } from "../utils/quizScoring.js";
import { createQuizAttempt, chatAboutQuiz, getQuizChat, createQuizChatHandler } from "../controllers/quizController.js";

const questions = Array.from({ length: 232 }, (_, i) => ({
  _id: `original-${i}`, question: `Câu ${i + 1}`, options: ["A", "B", "C", "Tất cả đáp án trên"],
  correctAnswer: "Tất cả đáp án trên", explanation: "Giải thích", difficulty: "easy",
}));

test("30-question practice is a separate subset with no duplicates, preserved option order and source data", () => {
  const before = structuredClone(questions);
  const subset = sampleQuizQuestions(questions, 30, () => 0.75);
  assert.equal(subset.length, 30);
  assert.equal(new Set(subset.map((q) => q.question)).size, 30);
  assert.deepEqual(questions, before);
  assert.ok(subset.some((q, i) => q.question !== questions[i].question));
  for (const q of subset) {
    assert.deepEqual(q.options, questions[0].options);
    assert.equal(q.correctAnswer, "Tất cả đáp án trên");
    assert.equal(q._id, undefined);
    assert.notEqual(q.options, questions[0].options);
  }
  const graded = gradeQuizAnswers(subset, subset.slice(0, 15).map((q, questionIndex) => ({ questionIndex, selectedAnswer: q.correctAnswer })));
  assert.equal(graded.score, 50);
  assert.equal(graded.totalQuestions, 30);
});

test("sampling validates exact integer boundaries without silently clamping requests", () => {
  for (const count of [0, -1, 233, 30.5, "30", "", null, undefined, NaN, Infinity, true]) {
    assert.throws(() => sampleQuizQuestions(questions, count), { statusCode: 400 });
  }
  assert.equal(sampleQuizQuestions(questions, 1).length, 1);
  assert.equal(new Set(sampleQuizQuestions(questions, 232).map((q) => q.question)).size, 232);
});

test("unsubmitted quiz responses conceal answers and explanations without mutating source", () => {
  const quiz = { questions, completedAt: null, chatMessages: [{ content: "private" }] };
  const publicQuiz = quizForTaking(quiz);
  assert.equal(publicQuiz.questions[0].correctAnswer, undefined);
  assert.equal(publicQuiz.questions[0].explanation, undefined);
  assert.equal(publicQuiz.chatMessages, undefined);
  assert.equal(questions[0].correctAnswer, "Tất cả đáp án trên");
});

const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });

test("attempt endpoint scopes bank ownership and creates a new practice quiz even for completed banks", async (t) => {
  const bank = { _id: "bank", userId: "owner", documentId: "document", title: "Ngân hàng", source: "excel", questions, completedAt: new Date(), score: 90 };
  t.mock.method(Quiz, "findOne", async (filter) => { assert.deepEqual(filter, { _id: "bank", userId: "owner" }); return bank; });
  t.mock.method(Quiz, "create", async (data) => {
    assert.equal(data.source, "practice");
    assert.equal(data.parentQuizId, "bank");
    assert.equal(data.questions.length, 30);
    assert.equal(data.totalQuestions, 30);
    assert.equal(data.completedAt, undefined);
    return { ...data, _id: "new-attempt", completedAt: null };
  });
  const res = response();
  await createQuizAttempt({ params: { id: "bank" }, user: { _id: "owner" }, body: { numQuestions: 30 } }, res, (err) => { throw err; });
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.data._id, "new-attempt");
  assert.equal(res.body.data.questions[0].correctAnswer, undefined);
  assert.equal(bank.score, 90);
  assert.equal(bank.questions.length, 232);
});

test("a different user's bank cannot be used to create an attempt", async (t) => {
  t.mock.method(Quiz, "findOne", async (filter) => { assert.equal(filter.userId, "other-user"); return null; });
  const create = t.mock.method(Quiz, "create", () => { throw Error("should not create"); });
  let failure;
  await createQuizAttempt({ params: { id: "bank" }, user: { _id: "other-user" }, body: { numQuestions: 30 } }, response(), (err) => { failure = err; });
  assert.equal(failure.statusCode, 404);
  assert.equal(create.mock.callCount(), 0);
});

test("chat endpoints scope ownership, reject unfinished attempts, and isolate histories by question", async (t) => {
  let quiz = null;
  t.mock.method(Quiz, "findOne", (filter) => { assert.equal(filter.userId, "owner"); return { select: async () => quiz }; });
  const req = { params: { id: "attempt" }, user: { _id: "owner" }, body: { questionIndex: 0, message: "Tại sao?" }, query: { questionIndex: "0" } };
  let failure;
  await chatAboutQuiz(req, response(), (err) => { failure = err; });
  assert.equal(failure.statusCode, 404);
  quiz = { questions, userAnswers: [], completedAt: null };
  await chatAboutQuiz(req, response(), (err) => { failure = err; });
  assert.equal(failure.statusCode, 409);
  quiz.completedAt = new Date();
  quiz.chatMessages = [{ questionIndex: 0, role: "user", content: "câu 1" }, { questionIndex: 1, role: "user", content: "câu 2" }];
  const res = response();
  await getQuizChat(req, res, (err) => { throw err; });
  assert.equal(res.body.data.length, 1);
  assert.equal(res.body.data[0].content, "câu 1");
});

test("chat uses server-owned question context, saves only a successful exchange, and reuses that question's history", async (t) => {
  const quiz = { _id: "attempt", questions, completedAt: new Date(), userAnswers: [{ questionIndex: 2, selectedAnswer: "B" }], chatMessages: [
    { questionIndex: 0, role: "user", content: "unrelated" },
    { questionIndex: 2, role: "user", content: "earlier question" },
    { questionIndex: 2, role: "assistant", content: "earlier answer" },
  ] };
  t.mock.method(Quiz, "findOne", () => ({ select: async () => quiz }));
  const update = t.mock.method(Quiz, "updateOne", async (filter, change) => {
    assert.deepEqual(filter, { _id: "attempt", userId: "owner" });
    assert.equal(change.$push.chatMessages.$slice, -200);
    assert.deepEqual(change.$push.chatMessages.$each, [
      { questionIndex: 2, role: "user", content: "follow-up" },
      { questionIndex: 2, role: "assistant", content: "mock answer" },
    ]);
    return { matchedCount: 1 };
  });
  const handler = createQuizChatHandler(async ({ context, message, history }) => {
    assert.equal(context.question, "Câu 3");
    assert.equal(context.selectedAnswer, "B");
    assert.equal(context.correctAnswer.text, "Tất cả đáp án trên");
    assert.equal(message, "follow-up");
    assert.deepEqual(history.map((m) => m.content), ["earlier question", "earlier answer"]);
    return "mock answer";
  });
  const req = { params: { id: "attempt" }, user: { _id: "owner" }, body: { questionIndex: 2, message: "follow-up", correctAnswer: "forged", context: "forged", history: [] } };
  const res = response();
  await handler(req, res, (err) => { throw err; });
  assert.equal(res.body.data.answer, "mock answer");
  assert.equal(update.mock.callCount(), 1);
  let failure;
  await createQuizChatHandler(async () => { throw Object.assign(new Error("quota"), { statusCode: 429 }); })(req, response(), (err) => { failure = err; });
  assert.equal(failure.statusCode, 429);
  assert.equal(update.mock.callCount(), 1);
});
