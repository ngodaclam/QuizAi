import test from "node:test";
import assert from "node:assert/strict";
import { parseFlashcardSheets, parseFlashcardWorkbook, importSummary, MAX_IMPORT_ROWS, MAX_IMPORT_TEXT_BYTES } from "../utils/flashcardImport.js";
import Flashcard from "../models/Flashcard.js";

const parse = (data) => parseFlashcardSheets([{ sheet: "Câu hỏi", data }]);

test("finds Vietnamese headers below a title, preserves answer labels and order", () => {
  const result = parse([
    ["BỘ CÂU HỎI"], ["STT", "Câu hỏi", "Đáp án"],
    [1, "AI là gì?", "B. Trí tuệ nhân tạo"],
    [2, "Dòng một\nDòng hai", "D. Đáp án\nnhiều dòng"],
  ]);
  assert.equal(result.cards.length, 2);
  assert.equal(result.cards[0].answer, "B. Trí tuệ nhân tạo");
  assert.equal(result.cards[1].question, "Dòng một\nDòng hai");
  assert.equal(importSummary(result).canImport, true);
});

test("supports reordered English and unaccented headers, numeric zero", () => {
  assert.deepEqual(parse([["Answer", "Question"], [0, "How many?"]]).cards[0], {
    question: "How many?", answer: "0", difficulty: "medium",
  });
  assert.equal(parse([["Dap an", "Cau hoi"], ["Yes", "OK?"]]).cards.length, 1);
});

test("skips blank rows, exact duplicates and repeated headers without dropping different answers", () => {
  const result = parse([["Câu hỏi", "Đáp án"], ["Q", "A"], [], ["Q", "A"], ["Q", "B"], ["Câu hỏi", "Đáp án"]]);
  assert.equal(result.totalRows, 3);
  assert.equal(result.duplicates, 1);
  assert.equal(result.cards.length, 2);
});

test("reports original row numbers and blocks partial imports with missing or unsupported cells", () => {
  const result = parse([["STT", "Câu hỏi", "Đáp án"], [1, "Good", "Answer"], [2, "Missing", null], [3], [4, new Date(), "Answer"]]);
  assert.deepEqual(result.errors.map((error) => error.row), [3, 4, 5]);
  assert.equal(importSummary(result).canImport, false);
});

test("combines matching sheets and reports unrelated sheets", () => {
  const result = parseFlashcardSheets([
    { sheet: "Notes", data: [["Instructions"]] },
    { sheet: "One", data: [["Question", "Answer"], ["Q1", "A1"]] },
    { sheet: "Two", data: [["Question", "Answer"], ["Q2", "A2"]] },
  ]);
  assert.deepEqual(result.sheets, ["One", "Two"]);
  assert.deepEqual(result.ignoredSheets, ["Notes"]);
  assert.equal(result.cards.length, 2);
});

test("rejects no headers, empty data, corrupt files and row limits", async () => {
  assert.throws(() => parse([["Other"]]), { statusCode: 400 });
  assert.throws(() => parse([["Question", "Answer"]]), { statusCode: 400 });
  await assert.rejects(parseFlashcardWorkbook(Buffer.from("not an xlsx")), { statusCode: 400 });
  assert.throws(() => parse([["Question", "Answer"], ...Array.from({ length: MAX_IMPORT_ROWS + 1 }, (_, i) => [String(i), "A"])]), { statusCode: 400 });
});

test("imported sets need no PDF while AI sets still require a document", async () => {
  const userId = "507f1f77bcf86cd799439011";
  await new Flashcard({ userId, title: "Imported", source: "excel", cards: [{ question: "Q", answer: "A" }] }).validate();
  await assert.rejects(new Flashcard({ userId, cards: [] }).validate(), /documentId/);
});

test("Documents counts UTF-8 question, answer and option bytes once per unique row", () => {
  const options = ["One", "Two", "Three", "Four"];
  const optionBytes = options.reduce((sum, option) => sum + Buffer.byteLength(option), 0);
  const rows = Array.from({ length: MAX_IMPORT_TEXT_BYTES / 8192 }, (_, index) => {
    const question = `Question ${index}`;
    const bytes = 8192 - Buffer.byteLength(question) - optionBytes;
    return [question, "ấ".repeat(Math.floor(bytes / 3)) + "x".repeat(bytes % 3), ...options];
  });
  const parseDocument = (data) => parseFlashcardSheets([
    { sheet: "Source", data: [["Question", "Answer", "A", "B", "C", "D"], ...data] },
  ], { includeOptions: true });
  const result = parseDocument([...rows, rows[0]]);
  assert.equal(result.cards.length, rows.length);
  assert.equal(result.duplicates, 1);
  assert.equal(result.cards[0].row, 2);
  assert.equal(result.cards[0].sheet, "Source");
  assert.equal(importSummary(result).canImport, true);

  const oversized = rows.map((row) => [...row]);
  oversized.at(-1)[1] += "x";
  assert.throws(() => parseDocument(oversized), { statusCode: 400, message: /1 MiB/ });
});

test("the Documents total text budget does not change legacy flashcard imports", () => {
  const rows = Array.from({ length: 130 }, (_, index) => [`Question ${index}`, "ấ".repeat(3000)]);
  assert.ok(rows.reduce((bytes, row) => bytes + Buffer.byteLength(row.join("")), 0) > MAX_IMPORT_TEXT_BYTES);
  assert.equal(parse([["Question", "Answer"], ...rows]).cards.length, rows.length);
  assert.throws(() => parseFlashcardSheets([
    { sheet: "Source", data: [["Question", "Answer"], ...rows] },
  ], { includeOptions: true }), { statusCode: 400 });
});
