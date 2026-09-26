import test from "node:test";
import assert from "node:assert/strict";
import { parseFlashcardSheets } from "../utils/flashcardImport.js";
import { documentImportSummary } from "../controllers/documentImportController.js";
import Document from "../models/Document.js";

const parse = (rows) => parseFlashcardSheets([{ sheet: "Câu hỏi", data: rows }], { includeOptions: true });

test("missing choices allow the whole document to be saved while preventing quiz generation", () => {
  const parsed = parse([["Tiêu đề"], ["Câu hỏi", "Đáp án"],
    ["AI là gì?", "B. Trí tuệ nhân tạo"], ["Dữ liệu nào?", "D. Tất cả các dữ liệu trên"]]);
  const summary = documentImportSummary(parsed);
  assert.equal(summary.count, 2);
  assert.equal(summary.canImport, true);
  assert.equal(summary.canGenerateQuiz, false);
  assert.equal(summary.generatableCount, 1);
  assert.equal(summary.needsReview[0].sheet, "Câu hỏi");
  assert.equal(summary.needsReview[0].row, 4);
});

test("mixed rows with original choices and AI choices become importable", () => {
  const parsed = parse([["Câu hỏi", "Đáp án", "A", "B", "C", "D"],
    ["Dữ liệu nào?", "D. Tất cả các dữ liệu trên", "Văn bản", "Âm thanh", "Hình ảnh", "Tất cả các dữ liệu trên"],
    ["AI là gì?", "B. Trí tuệ nhân tạo"]]);
  const summary = documentImportSummary(parsed);
  assert.equal(summary.canImport, true);
  assert.equal(summary.canGenerateQuiz, true);
  assert.equal(summary.needsReview.length, 0);
  assert.deepEqual(parsed.cards[0].options, ["Văn bản", "Âm thanh", "Hình ảnh", "Tất cả các dữ liệu trên"]);
  assert.equal(parsed.cards[1].options, undefined);
});

test("incomplete rows block import while contradictory choices only block quizzes", () => {
  const partial = documentImportSummary(parse([["Câu hỏi", "Đáp án", "A", "B", "C", "D"],
    ["Q", "A. One", "One", "Two"]]));
  assert.equal(partial.canImport, false);
  assert.equal(partial.errors[0].row, 2);
  const mismatch = documentImportSummary(parse([["Câu hỏi", "Đáp án", "A", "B", "C", "D"],
    ["Q", "B. One", "One", "Two", "Three", "Four"]]));
  assert.equal(mismatch.canImport, true);
  assert.equal(mismatch.canGenerateQuiz, false);
  assert.equal(mismatch.needsReview.length, 1);
});

test("Excel documents need no PDF path, PDF validation stays intact", async () => {
  const fields = { userId: "507f1f77bcf86cd799439011", title: "Import", fileName: "test.xlsx", fileSize: 100 };
  await new Document({ ...fields, fileType: "excel", importedQuestions: [{ question: "Q", answer: "A" }] }).validate();
  await assert.rejects(new Document(fields).validate(), /filePath/);
});
