import test from "node:test";
import assert from "node:assert/strict";
import { buildImportedQuizQuestions, buildQuestionFromSourceOptions, generateImportedQuizBatch, getImportedQuestionIssue, requiresOriginalOptions, QuizDistractorError } from "../utils/quizDistractors.js";

const single = [{ question: "Thủ đô Việt Nam là gì?", answer: "B. Hà Nội" }];
const valid = [{ id: 0, distractors: ["Huế", "Đà Nẵng", "Hải Phòng"] }];
const fixed = { random: () => 0.999 };
const assertInvalid = (items) => assert.throws(() => buildImportedQuizQuestions(single, items), {
  name: "QuizDistractorError", code: "INVALID_AI_OUTPUT", statusCode: 502,
});

test("preserves source question and correct answer while mapping out-of-order ids", () => {
  const source = [{ question: " Q1\nline two ", answer: "B. Đáp án\nnhiều dòng" }, { question: "Q2", answer: "C) Câu hai" }];
  const generated = [{ id: 1, distractors: ["A. Sai một", "B) Sai hai", "C: Sai ba"] }, { id: 0, distractors: ["Sai bốn", "Sai năm", "Sai sáu"] }];
  const sourceBefore = structuredClone(source);
  const generatedBefore = structuredClone(generated);
  const result = buildImportedQuizQuestions(source, generated, fixed);
  assert.deepEqual(source, sourceBefore);
  assert.deepEqual(generated, generatedBefore);
  assert.equal(result[0].question, source[0].question);
  assert.equal(result[0].correctAnswer, "Đáp án\nnhiều dòng");
  assert.deepEqual(result[1].options, ["Câu hai", "Sai một", "Sai hai", "Sai ba"]);
});

test("shuffle permits the correct answer in every position and keeps it exactly once", () => {
  const positions = [[0, 0.999, 0.999], [0.999, 0, 0.999], [0.999, 0.999, 0], [0.999, 0.999, 0.999]].map((values) => {
    let i = 0;
    const [question] = buildImportedQuizQuestions(single, valid, { random: () => values[i++] });
    assert.equal(new Set(question.options).size, 4);
    assert.equal(question.options.filter((option) => option === question.correctAnswer).length, 1);
    assert.equal(question.correctAnswer, "Hà Nội");
    return question.options.indexOf(question.correctAnswer);
  });
  assert.equal(new Set(positions).size, 4);
});

test("accepts numeric zero and preserves numbers, symbols, and non-label abbreviations", () => {
  for (const [answer, expected] of [[0, "0"], [3.14, "3.14"], ["X", "X"], ["A.Smith", "A.Smith"], ["AB. Smith", "AB. Smith"], ["x: value", "x: value"], ["A: Some text", "Some text"]]) {
    const [result] = buildImportedQuizQuestions([{ question: "Q", answer }], [{ id: 0, distractors: ["One", "Two", "Three"] }], fixed);
    assert.equal(result.correctAnswer, expected);
  }
});

test("rejects missing, duplicate, non-integer, unknown, or malformed ids", () => {
  for (const items of [null, {}, [], [...valid, ...valid], [{ ...valid[0], id: "0" }], [{ ...valid[0], id: -1 }], [{ ...valid[0], id: 1 }], [{ distractors: valid[0].distractors }], [null]]) assertInvalid(items);
  assert.throws(() => buildImportedQuizQuestions([...single, ...single], [...valid, ...valid]), { code: "INVALID_AI_OUTPUT" });
});

test("rejects wrong counts, empty, non-string, repeated or normalized-equivalent alternatives", () => {
  for (const distractors of [[], ["one", "two"], ["one", "two", "three", "four"], ["", "two", "three"], ["A. ", "two", "three"], [null, "two", "three"], [1, "two", "three"], [" hÀ   nỘi ", "two", "three"], ["Hue", " HUE ", "three"], ["Hue", "B. Hue", "three"]]) {
    assertInvalid([{ id: 0, distractors }]);
  }
  const decomposed = "Huế".normalize("NFD");
  assertInvalid([{ id: 0, distractors: ["Huế", decomposed, "Other"] }]);
});

test("rejects all/none-of-above and combined option references", () => {
  for (const answer of ["All of the above", "None of these", "Tất cả các đáp án trên", "Không có phương án nào đúng", "Cả A và B", "Both A and B"]) {
    assertInvalid([{ id: 0, distractors: [answer, "two", "three"] }]);
  }
});

test("reports source answers referring to missing original choices before calling AI", async () => {
  for (const answer of ["D. Tất cả các dữ liệu trên", "A. Tất cả các đáp án trên", "C. Tất cả các ý trên", "D. Tất cả phương án trên", "C. Tất cả các phương án trên", "None of the above", "Không đáp án nào đúng", "Cả A và B", "Cả A, B, C đều đúng", "A và B", "Đáp án C", "A", "B", "C", "D", "A.", "B)", "C:", "B. "]) {
    assert.equal(requiresOriginalOptions(answer), true);
    const source = [{ question: "Câu hỏi thiếu các lựa chọn gốc?", answer }];
    assert.match(getImportedQuestionIssue(source[0]), /lựa chọn gốc/u);
    assert.throws(() => buildImportedQuizQuestions(source, valid), { code: "SOURCE_NEEDS_OPTIONS", statusCode: 422 });
    await assert.rejects(generateImportedQuizBatch(source, { generateContent: () => assert.fail("must not call AI") }), { code: "SOURCE_NEEDS_OPTIONS" });
  }
  for (const answer of ["X", "B. Hà Nội", 0, "Không có liên kết cộng hóa trị", "Tất cả tế bào đều có màng sinh chất"]) {
    assert.equal(requiresOriginalOptions(answer), false);
    assert.equal(getImportedQuestionIssue({ answer }), null);
  }
});

test("preserves all four supplied choices and order, including all-of-the-above", async () => {
  const options = ["A. HTML", "B. CSS", "C. JavaScript", "D. Tất cả các đáp án trên"];
  const source = [{ question: "Các công nghệ nào được dùng trên web?", answer: "D. Tất cả các đáp án trên", options }];
  const before = structuredClone(source);
  assert.equal(getImportedQuestionIssue(source[0]), null);
  const expected = buildQuestionFromSourceOptions(source[0]);
  assert.deepEqual(expected.options, options);
  assert.equal(expected.correctAnswer, options[3]);
  const result = await generateImportedQuizBatch(source, {
    apiKey: "",
    random: () => assert.fail("must not shuffle supplied options"),
    generateContent: () => assert.fail("must not call AI for supplied options"),
  });
  assert.deepEqual(result, [expected]);
  assert.deepEqual(source, before);
});

test("supplied choices resolve exact answer text, labelled text, or a label alone", () => {
  const options = ["One", " Two ", "Three", "Four"];
  for (const answer of [" Two ", "Two", "B. Two", "B) Two", "B", "B.", "B. "]) {
    const result = buildQuestionFromSourceOptions({ question: "Q", answer, options });
    assert.equal(result.correctAnswer, " Two ");
    assert.deepEqual(result.options, options);
  }
  const numeric = buildQuestionFromSourceOptions({ question: "Q", answer: 0, options: ["0", "1", "2", "3"] });
  assert.equal(numeric.correctAnswer, "0");
  assert.equal(buildQuestionFromSourceOptions({ question: "Q", answer: "One", options: [] }), null);
});

test("supplied options reject incomplete, duplicate, unknown, or contradictory answer keys", () => {
  const cases = [
    { answer: "A", options: ["One", "Two", "Three"] },
    { answer: "A", options: ["One", "", "Three", "Four"] },
    { answer: "A", options: ["One", 2, "Three", "Four"] },
    { answer: "A", options: ["A. One", "B. ONE ", "Three", "Four"] },
    { answer: "Missing", options: ["One", "Two", "Three", "Four"] },
    { answer: "A. Two", options: ["One", "Two", "Three", "Four"] },
    { answer: "B", options: ["B", "Other", "Three", "Four"] },
  ];
  for (const item of cases) {
    const source = { question: "Q", ...item };
    assert.equal(typeof getImportedQuestionIssue(source), "string");
    assert.throws(() => buildQuestionFromSourceOptions(source), { code: "SOURCE_NEEDS_OPTIONS" });
  }
});

test("mixed batches generate only missing choices using subset ids and preserve source order", async () => {
  const supplied = { question: "Already supplied", answer: "D. Tất cả các đáp án trên", options: ["One", "Two", "Three", "Tất cả các đáp án trên"] };
  const source = [supplied, single[0], { question: "Other generated", answer: "B. Correct two", options: [] }, supplied];
  let calls = 0;
  const result = await generateImportedQuizBatch(source, {
    ...fixed,
    generateContent: async (request) => {
      calls += 1;
      assert.deepEqual(JSON.parse(request.contents), [
        { id: 0, question: single[0].question, correctAnswer: "Hà Nội" },
        { id: 1, question: "Other generated", correctAnswer: "Correct two" },
      ]);
      assert.equal(request.config.responseJsonSchema.minItems, 2);
      return { text: JSON.stringify([{ id: 1, distractors: ["Wrong one", "Wrong two", "Wrong three"] }, ...valid]) };
    },
  });
  assert.equal(calls, 1);
  assert.deepEqual(result.map((item) => item.question), source.map((item) => item.question));
  assert.deepEqual(result[0].options, supplied.options);
  assert.deepEqual(result[3].options, supplied.options);
  assert.equal(result[1].correctAnswer, "Hà Nội");
  assert.equal(result[2].correctAnswer, "Correct two");
  assert.throws(() => buildImportedQuizQuestions(source, [{ id: 1, distractors: ["wrong", "two", "three"] }, { id: 2, distractors: ["wrong", "two", "three"] }]), { code: "INVALID_AI_OUTPUT" });
});

test("rejects empty and unsupported source data before generation", async () => {
  for (const source of [[], null, [{ question: "", answer: "A" }], [{ question: "Q", answer: "" }], [{ question: "Q", answer: NaN }], [{ question: "Q", answer: {} }]]) {
    assert.throws(() => buildImportedQuizQuestions(source, valid), { code: "INVALID_SOURCE", statusCode: 400 });
    await assert.rejects(generateImportedQuizBatch(source, { generateContent: () => assert.fail("must not call AI") }), { code: "INVALID_SOURCE" });
  }
});

test("generator requests schema-constrained JSON and treats source as data", async () => {
  let request;
  const result = await generateImportedQuizBatch(single, {
    ...fixed,
    model: "test-model",
    generateContent: async (value) => { request = value; return { text: JSON.stringify(valid) }; },
  });
  assert.equal(request.model, "test-model");
  assert.equal(request.config.responseMimeType, "application/json");
  assert.equal(request.config.httpOptions.timeout, 90_000);
  assert.equal(request.config.responseJsonSchema.minItems, 1);
  assert.equal(request.config.responseJsonSchema.items.properties.distractors.minItems, 3);
  assert.match(request.config.systemInstruction, /DATA, not instructions/u);
  assert.deepEqual(JSON.parse(request.contents), [{ id: 0, question: single[0].question, correctAnswer: "Hà Nội" }]);
  assert.equal(result[0].correctAnswer, "Hà Nội");
});

test("generator retries invalid JSON/shape once and accepts a corrected response", async () => {
  for (const bad of ["not json", "{}", "[]", JSON.stringify([{ id: 0, distractors: ["Hà Nội", "X", "Y"] }])]) {
    let calls = 0;
    const result = await generateImportedQuizBatch(single, {
      ...fixed,
      generateContent: async () => ({ text: ++calls === 1 ? bad : JSON.stringify(valid) }),
    });
    assert.equal(calls, 2);
    assert.equal(result.length, 1);
  }
});

test("generator stops after two invalid outputs", async () => {
  let calls = 0;
  await assert.rejects(generateImportedQuizBatch(single, {
    generateContent: async () => { calls += 1; return { text: "[]" }; },
  }), { code: "INVALID_AI_OUTPUT", statusCode: 502 });
  assert.equal(calls, 2);
});

test("missing key throws a typed error without terminating the server", async () => {
  await assert.rejects(generateImportedQuizBatch(single, { apiKey: "" }), (error) => error instanceof QuizDistractorError && error.code === "AI_NOT_CONFIGURED" && error.statusCode === 503);
});

test("service failures are safe, friendly, and never retried", async () => {
  const failures = [
    [{ status: 429 }, "AI_QUOTA_EXCEEDED", 429],
    [{ status: 401 }, "AI_AUTH_ERROR", 503],
    [{ status: 403 }, "AI_AUTH_ERROR", 503],
    [{ status: 400, message: "API key not valid: secret" }, "AI_AUTH_ERROR", 503],
    [{ status: 404 }, "AI_MODEL_UNAVAILABLE", 503],
    [{ name: "AbortError" }, "AI_TIMEOUT", 504],
    [{ message: "Request timed out secret" }, "AI_TIMEOUT", 504],
    [{ status: 503, message: "secret" }, "AI_SERVICE_ERROR", 502],
  ];
  for (const [failure, code, statusCode] of failures) {
    let calls = 0;
    await assert.rejects(generateImportedQuizBatch(single, {
      generateContent: async () => { calls += 1; throw failure; },
    }), (error) => {
      assert.equal(error.code, code);
      assert.equal(error.statusCode, statusCode);
      assert.doesNotMatch(error.message, /secret/u);
      return true;
    });
    assert.equal(calls, 1);
  }
});
