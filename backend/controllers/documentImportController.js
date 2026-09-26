import Document from "../models/Document.js";
import { parseFlashcardWorkbook, importSummary } from "../utils/flashcardImport.js";
import { chunkText } from "../utils/textChunker.js";
import { enqueueImportedQuiz } from "../services/importedQuizWorker.js";
import { getImportedQuestionIssue } from "../utils/quizDistractors.js";

const readImport = async (req) => {
  if (!req.file) throw Object.assign(new Error("Vui lòng chọn file Excel .xlsx."), { statusCode: 400 });
  return parseFlashcardWorkbook(req.file.buffer, { includeOptions: true });
};

export const documentImportSummary = (parsed) => {
  const summary = importSummary(parsed);
  const needsReview = parsed.cards.flatMap((card, index) => {
    const reason = getImportedQuestionIssue(card);
    return reason ? [{ index, sheet: card.sheet, row: card.row, question: card.question, answer: card.answer, reason }] : [];
  });
  return { ...summary, needsReview, generatableCount: parsed.cards.length - needsReview.length,
    canGenerateQuiz: summary.canImport && needsReview.length === 0 };
};

export const previewDocumentImport = async (req, res, next) => {
  try {
    res.json({ success: true, data: documentImportSummary(await readImport(req)) });
  } catch (error) { next(error); }
};

export const importExcelDocument = async (req, res, next) => {
  try {
    const title = typeof req.body.title === "string" ? req.body.title.trim() : "";
    if (!title || title.length > 150) return res.status(400).json({ success: false, error: "Tên tài liệu phải có từ 1 đến 150 ký tự." });
    const parsed = await readImport(req);
    const summary = documentImportSummary(parsed);
    if (!summary.canImport) return res.status(400).json({ success: false, error: "Hãy sửa các dòng thiếu câu hỏi hoặc đáp án rồi chọn lại file. Chưa có dữ liệu được lưu.", data: summary });
    const importedQuestions = parsed.cards.map(({ question, answer, options }) => ({ question, answer, ...(options ? { options } : {}) }));
    const extractedText = importedQuestions.map((item, index) => `${index + 1}. ${item.question}\nĐáp án: ${item.answer}`).join("\n\n");
    const document = await Document.create({
      userId: req.user._id, title, fileName: req.file.originalname, fileSize: req.file.size,
      fileType: "excel", status: "ready", importedQuestions, extractedText,
      chunks: chunkText(extractedText, 500, 50),
      quizGeneration: {
        status: summary.canGenerateQuiz ? "pending" : "needs_review",
        completed: 0, total: importedQuestions.length,
        needsReview: summary.needsReview.map(({ index, sheet, row, reason }) => ({ index, sheet, row, reason })),
      },
    });
    res.status(201).json({ success: true, data: document, message: summary.canGenerateQuiz
      ? "Đã import câu hỏi. Đang tạo bài trắc nghiệm."
      : "Đã lưu đầy đủ câu hỏi. Trắc nghiệm chờ bổ sung lựa chọn gốc." });
    if (summary.canGenerateQuiz) enqueueImportedQuiz(document._id);
  } catch (error) { next(error); }
};

export const retryImportedQuiz = async (req, res, next) => {
  try {
    const document = await Document.findOne({ _id: req.params.id, userId: req.user._id, fileType: "excel" });
    if (!document) return res.status(404).json({ success: false, error: "Không tìm thấy tài liệu Excel." });
    if (document.quizGeneration?.status === "needs_review") {
      return res.status(409).json({ success: false, error: "Tài liệu đã được lưu. Cần bổ sung lựa chọn gốc cho các câu được đánh dấu trước khi tạo trắc nghiệm." });
    }
    if (["failed", "not_started"].includes(document.quizGeneration?.status)) {
      const restarted = await Document.findOneAndUpdate(
        { _id: document._id, "quizGeneration.status": document.quizGeneration.status },
        { $set: { "quizGeneration.status": "pending", "quizGeneration.error": "" } },
        { new: true },
      );
      enqueueImportedQuiz(document._id);
      return res.status(202).json({ success: true, data: restarted || document });
    }
    if (["pending", "processing"].includes(document.quizGeneration?.status)) enqueueImportedQuiz(document._id);
    res.json({ success: true, data: document });
  } catch (error) { next(error); }
};
