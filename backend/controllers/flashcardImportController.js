import Flashcard from "../models/Flashcard.js";
import { parseFlashcardWorkbook, importSummary } from "../utils/flashcardImport.js";

const readUpload = async (req) => {
  if (!req.file) throw Object.assign(new Error("Vui lòng chọn file Excel .xlsx."), { statusCode: 400 });
  return parseFlashcardWorkbook(req.file.buffer);
};

export const previewFlashcardImport = async (req, res, next) => {
  try {
    const parsed = await readUpload(req);
    res.json({ success: true, data: importSummary(parsed) });
  } catch (error) { next(error); }
};

export const importFlashcards = async (req, res, next) => {
  try {
    const title = typeof req.body.title === "string" ? req.body.title.trim() : "";
    if (!title || title.length > 150) {
      return res.status(400).json({ success: false, error: "Tên bộ câu hỏi phải có từ 1 đến 150 ký tự." });
    }
    const parsed = await readUpload(req);
    const summary = importSummary(parsed);
    if (!summary.canImport) {
      return res.status(400).json({ success: false, error: "Hãy sửa các dòng lỗi trong file rồi import lại. Chưa có dữ liệu nào được lưu.", data: summary });
    }
    const set = await Flashcard.create({
      userId: req.user._id, title, source: "excel", sourceFileName: req.file.originalname,
      cards: parsed.cards,
    });
    res.status(201).json({ success: true, data: { id: set._id, title: set.title, count: set.cards.length, duplicates: parsed.duplicates } });
  } catch (error) { next(error); }
};

export const getFlashcardSet = async (req, res, next) => {
  try {
    const set = await Flashcard.findOne({ _id: req.params.id, userId: req.user._id }).populate("documentId", "title");
    if (!set) return res.status(404).json({ success: false, error: "Không tìm thấy bộ flashcard." });
    res.json({ success: true, data: set });
  } catch (error) { next(error); }
};
