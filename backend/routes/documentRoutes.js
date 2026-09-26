import express from "express";
import {
  uploadDocument,
  getDocuments,
  getDocument,
  deleteDocument,
} from "../controllers/documentController.js";
import protect from "../middleware/auth.js";
import upload from "../config/multer.js";
import excelUpload from "../config/flashcardUpload.js";
import { previewDocumentImport, importExcelDocument, retryImportedQuiz } from "../controllers/documentImportController.js";

const router = express.Router();

// Protecting all routes below
router.use(protect);

router.post("/upload", upload.single("file"), uploadDocument);
router.post("/import-excel/preview", excelUpload.single("file"), previewDocumentImport);
router.post("/import-excel", excelUpload.single("file"), importExcelDocument);
router.post("/:id/retry-quiz", retryImportedQuiz);
router.get("/", getDocuments);
router.get("/:id", getDocument);
router.delete("/:id", deleteDocument);

export default router;
