import test from "node:test";
import assert from "node:assert/strict";
import { gradeQuizAnswers, resolveAnswerIndex } from "../utils/quizScoring.js";

const question = (correctAnswer = "O2") => ({
  question: "Which option?", options: ["O2", "3", "0", "Option 2"], correctAnswer,
});
const submit = (selectedAnswer, questionIndex = 0) => ({ questionIndex, selectedAnswer });

test("literal O2 and numeric option text win over legacy answer labels", () => {
  const questions = [question(), question("3"), question("0"), question("Option 2")];
  const result = gradeQuizAnswers(questions, [submit("O2"), submit("3", 1), submit("0", 2), submit("Option 2", 3)]);
  assert.equal(result.correctCount, 4);
  assert.equal(result.score, 100);
  assert.equal(result.totalQuestions, 4);
  assert.deepEqual(result.userAnswers.map((answer) => answer.selectedAnswer), ["O2", "3", "0", "Option 2"]);
  assert.equal(gradeQuizAnswers([question()], [submit("3")]).score, 0);
});

test("preserves compatible old AI labels and numeric selection indices", () => {
  const options = ["One", "Two", "Three", "Four"];
  for (const answer of ["O2", "Option 2", "option2", "2", 1]) {
    assert.equal(resolveAnswerIndex(answer, options), 1);
  }
  assert.equal(resolveAnswerIndex(0, options), 0);
  assert.equal(resolveAnswerIndex(4, options), 3);
  const result = gradeQuizAnswers([{ options, correctAnswer: "O2" }], [submit(1)]);
  assert.equal(result.score, 100);
  assert.equal(result.userAnswers[0].selectedAnswer, "Two");
});

test("grades normalized option text without interpreting unrelated embedded numbers", () => {
  assert.equal(resolveAnswerIndex("  o2  ", question().options), 0);
  assert.equal(resolveAnswerIndex("not an option 2", question().options), -1);
  assert.throws(() => gradeQuizAnswers([question()], [submit("not an option 2")]), { statusCode: 400 });
  assert.throws(() => gradeQuizAnswers([{ options: ["A", "B", "C", "D"], correctAnswer: "unknown2" }], [submit("B")]), { statusCode: 400 });
});

test("rejects duplicate answers before an inflated score can be stored", () => {
  assert.throws(() => gradeQuizAnswers([question()], [submit("O2"), submit("O2")]), { statusCode: 400 });
});

test("rejects invalid question indices and malformed submissions", () => {
  for (const index of [-1, 1, 0.5, "0", undefined, null, NaN, Infinity]) {
    assert.throws(() => gradeQuizAnswers([question()], [{ questionIndex: index, selectedAnswer: "O2" }]), { statusCode: 400 });
  }
  for (const answer of [null, undefined, [], 1, "O2", {}, { questionIndex: 0 }]) {
    assert.throws(() => gradeQuizAnswers([question()], [answer]), { statusCode: 400 });
  }
  for (const answer of [null, {}, [], -1, 4.5, NaN, Infinity, "", "unknown", "O9"]) {
    assert.throws(() => gradeQuizAnswers([question()], [submit(answer)]), { statusCode: 400 });
  }
});

test("counts skipped questions as wrong, permits empty submissions, rejects empty quizzes", () => {
  const questions = [question(), question("3")];
  assert.equal(gradeQuizAnswers(questions, [submit("O2")]).score, 50);
  assert.deepEqual(gradeQuizAnswers(questions, []), { userAnswers: [], correctCount: 0, totalQuestions: 2, score: 0 });
  assert.throws(() => gradeQuizAnswers([], []), { statusCode: 400 });
  assert.throws(() => gradeQuizAnswers(questions, null), { statusCode: 400 });
});
