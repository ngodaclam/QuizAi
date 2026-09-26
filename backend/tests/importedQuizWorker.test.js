import test from "node:test";
import assert from "node:assert/strict";
import { processImportedQuiz, MAX_GENERATED_QUIZ_BYTES } from "../services/importedQuizWorker.js";

const copy = (value) => value == null ? value : structuredClone(value);
const readPath = (value, path) => path.split(".").reduce((item, key) => item?.[key], value);
const matches = (value, filter) => value && Object.entries(filter).every(([path, expected]) => {
  const actual = readPath(value, path);
  return expected && typeof expected === "object" && "$in" in expected
    ? expected.$in.includes(actual)
    : actual === expected;
});
const setPath = (value, path, entry) => {
  const parts = path.split(".");
  const leaf = parts.pop();
  let target = value;
  for (const part of parts) target = target[part] ||= {};
  target[leaf] = copy(entry);
};

const sourceQuestions = (count) => Array.from({ length: count }, (_, index) => ({
  question: `Original question ${index + 1}?`, answer: `A. Supplied answer ${index + 1}`,
}));
const generate = (source) => source.map(({ question, answer }) => ({
  question,
  correctAnswer: answer.slice(3),
  options: [answer.slice(3), "Wrong one", "Wrong two", "Wrong three"],
  explanation: "Original answer retained", difficulty: "medium",
}));

function memoryModels(source, { existingQuiz, generatedQuestions = [] } = {}) {
  const state = {
    document: {
      _id: "document-1", userId: "user-1", title: "Imported workbook", fileType: "excel",
      importedQuestions: copy(source), generatedQuestions: copy(generatedQuestions),
      quizGeneration: { status: "pending", completed: generatedQuestions.length, total: source.length, error: "" },
    },
    quizzes: existingQuiz ? [copy(existingQuiz)] : [],
    writes: [], quizUpserts: 0, onUpsert: null,
  };
  const DocumentModel = {
    findById(id) {
      const get = () => copy(state.document?._id === id ? state.document : null);
      return {
        select() { return Promise.resolve(get()); },
        then(resolve, reject) { return Promise.resolve(get()).then(resolve, reject); },
      };
    },
    async updateOne(filter, update) {
      if (!matches(state.document, filter)) return { matchedCount: 0 };
      for (const [path, value] of Object.entries(update.$set || {})) setPath(state.document, path, value);
      state.writes.push(copy(update));
      return { matchedCount: 1 };
    },
  };
  const QuizModel = {
    async findOneAndUpdate(filter, update, options) {
      assert.equal(options.upsert, true);
      state.quizUpserts++;
      let quiz = state.quizzes.find((entry) => matches(entry, filter));
      if (!quiz) {
        quiz = { _id: `quiz-${state.quizUpserts}`, ...copy(filter), ...copy(update.$setOnInsert) };
        state.quizzes.push(quiz);
      }
      if (state.onUpsert) await state.onUpsert();
      return copy(quiz);
    },
    async deleteOne(filter) {
      const before = state.quizzes.length;
      state.quizzes = state.quizzes.filter((quiz) => !matches(quiz, filter));
      return { deletedCount: before - state.quizzes.length };
    },
  };
  return { state, DocumentModel, QuizModel };
}

test("documents awaiting review or a start action never call AI even if enqueued", async () => {
  for (const status of ["needs_review", "not_started"]) {
    const models = memoryModels(sourceQuestions(2));
    models.state.document.quizGeneration.status = status;
    await processImportedQuiz("document-1", { ...models, generateBatch: () => assert.fail("AI must not run") });
    assert.equal(models.state.writes.length, 0);
    assert.equal(models.state.quizzes.length, 0);
  }
});

test("missing source options anywhere stop generation before the first AI call", async () => {
  const source = [...sourceQuestions(12), { question: "Which are correct?", answer: "D. All of the above" }];
  const models = memoryModels(source);
  await processImportedQuiz("document-1", { ...models, generateBatch: () => assert.fail("AI must not run") });
  assert.equal(models.state.document.quizGeneration.status, "needs_review");
  assert.equal(models.state.document.quizGeneration.needsReview[0].index, 12);
  assert.equal(models.state.document.importedQuestions.length, 13);
  assert.equal(models.state.quizzes.length, 0);
});

test("generates all source questions in ordered batches and links the completed quiz", async () => {
  const source = sourceQuestions(23);
  const models = memoryModels(source);
  const batches = [];
  await processImportedQuiz("document-1", {
    ...models,
    generateBatch: async (batch) => { batches.push(copy(batch)); return generate(batch); },
  });
  assert.deepEqual(batches.map((batch) => batch.length), [10, 10, 3]);
  assert.deepEqual(batches.flat(), source);
  assert.equal(models.state.quizzes.length, 1);
  const quiz = models.state.quizzes[0];
  assert.deepEqual(quiz.questions.map((entry) => entry.question), source.map((entry) => entry.question));
  assert.deepEqual(quiz.questions.map((entry) => entry.correctAnswer), source.map((entry) => entry.answer.slice(3)));
  assert.equal(quiz.totalQuestions, 23);
  assert.equal(quiz.userId, "user-1");
  assert.equal(quiz.documentId, "document-1");
  assert.equal(models.state.document.quizGeneration.status, "ready");
  assert.equal(models.state.document.quizGeneration.completed, 23);
  assert.equal(models.state.document.quizGeneration.quizId, quiz._id);
  assert.deepEqual(models.state.document.importedQuestions, source);
});

test("retains successful batches on failure and resumes only unfinished questions on retry", async () => {
  const source = sourceQuestions(23);
  const models = memoryModels(source);
  let calls = 0;
  await processImportedQuiz("document-1", {
    ...models,
    generateBatch: async (batch) => {
      if (++calls === 2) throw new Error("Temporary AI failure");
      return generate(batch);
    },
  });
  assert.equal(models.state.document.quizGeneration.status, "failed");
  assert.equal(models.state.document.quizGeneration.error, "Temporary AI failure");
  assert.equal(models.state.document.quizGeneration.completed, 10);
  const checkpoint = copy(models.state.document.generatedQuestions);
  assert.deepEqual(checkpoint, generate(source.slice(0, 10)));
  assert.equal(models.state.quizzes.length, 0);

  models.state.document.quizGeneration.status = "pending";
  const resumed = [];
  await processImportedQuiz("document-1", {
    ...models,
    generateBatch: async (batch) => { resumed.push(...copy(batch)); return generate(batch); },
  });
  assert.deepEqual(resumed, source.slice(10));
  assert.deepEqual(models.state.document.generatedQuestions.slice(0, 10), checkpoint);
  assert.equal(models.state.document.quizGeneration.status, "ready");
  assert.equal(models.state.document.quizGeneration.error, "");
  assert.equal(models.state.quizzes[0].totalQuestions, 23);
});

test("reuses an existing generated quiz after a crash without overwriting answers or scores", async () => {
  const source = sourceQuestions(12);
  const generatedQuestions = generate(source);
  const existingQuiz = {
    _id: "existing-quiz", documentId: "document-1", userId: "user-1", source: "excel",
    questions: generatedQuestions, totalQuestions: 12, score: 75,
    userAnswers: [{ questionIndex: 0, selectedAnswer: "Supplied answer 1", isCorrect: true }],
    completedAt: "2026-09-25T00:00:00.000Z",
  };
  const models = memoryModels(source, { existingQuiz, generatedQuestions });
  const unexpectedGeneration = async () => assert.fail("Completed source questions must not regenerate");
  await processImportedQuiz("document-1", { ...models, generateBatch: unexpectedGeneration });
  assert.equal(models.state.document.quizGeneration.quizId, existingQuiz._id);
  assert.deepEqual(models.state.quizzes, [existingQuiz]);

  models.state.document.quizGeneration.status = "pending";
  await processImportedQuiz("document-1", { ...models, generateBatch: unexpectedGeneration });
  assert.equal(models.state.quizUpserts, 2);
  assert.deepEqual(models.state.quizzes, [existingQuiz]);
  assert.equal(models.state.document.quizGeneration.status, "ready");
});

test("resumes a processing checkpoint after restart and ignores an already-ready document", async () => {
  const source = sourceQuestions(15);
  const checkpoint = generate(source.slice(0, 10));
  const models = memoryModels(source, { generatedQuestions: checkpoint });
  models.state.document.quizGeneration.status = "processing";
  const resumed = [];
  await processImportedQuiz("document-1", {
    ...models,
    generateBatch: async (batch) => { resumed.push(...copy(batch)); return generate(batch); },
  });
  assert.deepEqual(resumed, source.slice(10));
  assert.deepEqual(models.state.quizzes[0].questions.slice(0, 10), checkpoint);
  assert.equal(models.state.document.quizGeneration.status, "ready");

  await processImportedQuiz("document-1", {
    ...models,
    generateBatch: async () => assert.fail("Ready documents must not regenerate"),
  });
  assert.equal(models.state.quizUpserts, 1);
});

test("does not create an orphan quiz when the document is deleted during generation", async () => {
  const models = memoryModels(sourceQuestions(12));
  await processImportedQuiz("document-1", {
    ...models,
    generateBatch: async (batch) => { models.state.document = null; return generate(batch); },
  });
  assert.equal(models.state.document, null);
  assert.equal(models.state.quizUpserts, 0);
  assert.deepEqual(models.state.quizzes, []);
});

test("cleans up a quiz when deletion races with saving its document link", async () => {
  const models = memoryModels(sourceQuestions(2));
  models.state.onUpsert = () => { models.state.document = null; };
  await processImportedQuiz("document-1", { ...models, generateBatch: async (batch) => generate(batch) });
  assert.equal(models.state.quizUpserts, 1);
  assert.deepEqual(models.state.quizzes, []);
});

test("does not save an incomplete AI batch or publish a partial quiz", async () => {
  const models = memoryModels(sourceQuestions(12));
  await processImportedQuiz("document-1", {
    ...models,
    generateBatch: async (batch) => generate(batch).slice(0, -1),
  });
  assert.equal(models.state.document.quizGeneration.status, "failed");
  assert.equal(models.state.document.quizGeneration.completed, 0);
  assert.deepEqual(models.state.document.generatedQuestions, []);
  assert.deepEqual(models.state.quizzes, []);
});

test("permits a generated quiz exactly at the UTF-8 checkpoint byte limit", async () => {
  const models = memoryModels(sourceQuestions(1));
  const generated = generate(models.state.document.importedQuestions);
  const paddingBytes = MAX_GENERATED_QUIZ_BYTES - Buffer.byteLength(JSON.stringify(generated), "utf8");
  generated[0].explanation += "ấ".repeat(Math.floor(paddingBytes / 3)) + "x".repeat(paddingBytes % 3);
  assert.equal(Buffer.byteLength(JSON.stringify(generated), "utf8"), MAX_GENERATED_QUIZ_BYTES);
  await processImportedQuiz("document-1", { ...models, generateBatch: async () => generated });
  assert.equal(models.state.document.quizGeneration.status, "ready");
  assert.equal(models.state.quizzes.length, 1);
});

test("rejects an oversized generated batch before checkpoint and keeps previous progress", async () => {
  const source = sourceQuestions(12);
  const models = memoryModels(source);
  let calls = 0;
  await processImportedQuiz("document-1", {
    ...models,
    generateBatch: async (batch) => {
      const generated = generate(batch);
      if (++calls === 2) {
        const current = [...models.state.document.generatedQuestions, ...generated];
        const paddingBytes = MAX_GENERATED_QUIZ_BYTES + 1 - Buffer.byteLength(JSON.stringify(current), "utf8");
        generated[0].explanation += "ấ".repeat(Math.floor(paddingBytes / 3)) + "x".repeat(paddingBytes % 3);
        assert.equal(Buffer.byteLength(JSON.stringify(current), "utf8"), MAX_GENERATED_QUIZ_BYTES + 1);
      }
      return generated;
    },
  });
  assert.equal(models.state.document.quizGeneration.status, "failed");
  assert.match(models.state.document.quizGeneration.error, /4 MiB/);
  assert.equal(models.state.document.quizGeneration.completed, 10);
  assert.deepEqual(models.state.document.generatedQuestions, generate(source.slice(0, 10)));
  assert.deepEqual(models.state.quizzes, []);
});

test("does not publish an oversized checkpoint saved by an older worker", async () => {
  const source = sourceQuestions(1);
  const generatedQuestions = generate(source);
  generatedQuestions[0].explanation = "x".repeat(MAX_GENERATED_QUIZ_BYTES);
  const models = memoryModels(source, { generatedQuestions });
  await processImportedQuiz("document-1", {
    ...models,
    generateBatch: async () => assert.fail("Oversized checkpoints must be rejected without calling AI"),
  });
  assert.equal(models.state.document.quizGeneration.status, "failed");
  assert.match(models.state.document.quizGeneration.error, /4 MiB/);
  assert.deepEqual(models.state.quizzes, []);
});
