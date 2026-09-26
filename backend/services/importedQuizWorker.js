import Document from "../models/Document.js";
import Quiz from "../models/Quiz.js";
import { generateImportedQuizBatch, getImportedQuestionIssue } from "../utils/quizDistractors.js";

const BATCH_SIZE = 10;
export const MAX_GENERATED_QUIZ_BYTES = 4 * 1024 * 1024;
const pending = new Set();
let running = false;

const validateGeneratedSize = (questions) => {
  if (Buffer.byteLength(JSON.stringify(questions), "utf8") > MAX_GENERATED_QUIZ_BYTES) {
    throw new Error("Nội dung bài trắc nghiệm vượt quá 4 MiB. Hãy chia file Excel thành các phần nhỏ hơn rồi import lại.");
  }
};

export async function processImportedQuiz(documentId, {
  DocumentModel = Document, QuizModel = Quiz, generateBatch = generateImportedQuizBatch,
} = {}) {
  try {
    let document = await DocumentModel.findById(documentId).select("+generatedQuestions");
    if (!document || document.fileType !== "excel" || !["pending", "processing"].includes(document.quizGeneration?.status)) return;
    const source = document.importedQuestions;
    if (!source?.length) throw new Error("Tài liệu chưa có câu hỏi để tạo bài trắc nghiệm.");
    const needsReview = source.flatMap((item, index) => {
      const reason = getImportedQuestionIssue(item);
      return reason ? [{ index, reason }] : [];
    });
    if (needsReview.length) {
      await DocumentModel.updateOne({ _id: documentId }, { $set: {
        "quizGeneration.status": "needs_review", "quizGeneration.needsReview": needsReview,
        "quizGeneration.total": source.length, "quizGeneration.error": "",
      } });
      return;
    }
    const questions = [...(document.generatedQuestions || [])];
    validateGeneratedSize(questions);
    await DocumentModel.updateOne({ _id: documentId }, { $set: {
      "quizGeneration.status": "processing", "quizGeneration.error": "",
      "quizGeneration.total": source.length, "quizGeneration.completed": questions.length,
    } });

    while (questions.length < source.length) {
      const start = questions.length;
      const batch = source.slice(start, start + BATCH_SIZE).map(({ question, answer, options }) => ({ question, answer, ...(options ? { options } : {}) }));
      const generated = await generateBatch(batch);
      if (generated.length !== batch.length) throw new Error("AI trả về thiếu câu hỏi. Vui lòng thử lại.");
      questions.push(...generated);
      validateGeneratedSize(questions);
      const saved = await DocumentModel.updateOne({ _id: documentId, "quizGeneration.status": "processing" }, { $set: {
        generatedQuestions: questions, "quizGeneration.completed": questions.length,
      } });
      if (!saved.matchedCount) return; // Document may have been deleted while the API call ran.
    }

    document = await DocumentModel.findById(documentId);
    if (!document) return;
    const quiz = await QuizModel.findOneAndUpdate(
      { documentId, source: "excel" },
      { $setOnInsert: {
        userId: document.userId, documentId, source: "excel", title: `${document.title} - Quiz`,
        questions, totalQuestions: questions.length, userAnswers: [], score: 0,
      } },
      { upsert: true, new: true, runValidators: true },
    );
    const saved = await DocumentModel.updateOne({ _id: documentId }, { $set: {
      "quizGeneration.status": "ready", "quizGeneration.completed": questions.length,
      "quizGeneration.quizId": quiz._id, "quizGeneration.error": "",
    } });
    if (!saved.matchedCount) await QuizModel.deleteOne({ _id: quiz._id });
  } catch (error) {
    await DocumentModel.updateOne({ _id: documentId }, { $set: {
      "quizGeneration.status": "failed",
      "quizGeneration.error": error.message || "Không thể tạo đáp án bằng AI. Vui lòng thử lại.",
    } });
  }
}

async function drainQueue() {
  if (running) return;
  running = true;
  try {
    while (pending.size) {
      const documentId = pending.values().next().value;
      pending.delete(documentId);
      try { await processImportedQuiz(documentId); }
      catch { console.error("Could not save Excel quiz generation status."); }
    }
  } finally { running = false; }
}

export function enqueueImportedQuiz(documentId) {
  pending.add(String(documentId));
  void drainQueue();
}

export async function resumeImportedQuizzes() {
  const documents = await Document.find({ fileType: "excel", "quizGeneration.status": { $in: ["pending", "processing"] } }).select("_id");
  for (const document of documents) enqueueImportedQuiz(document._id);
}
