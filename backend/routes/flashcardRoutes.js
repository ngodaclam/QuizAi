import express from "express";
import {
  getFlashcards,
  getAllFlashcardSets,
  reviewFlashcard,
  toggleStarFlashcard,
  deleteFlashcardSet,
} from "../controllers/flashcardController.js";
import protect from "../middleware/auth.js";
import flashcardUpload from "../config/flashcardUpload.js";
import { previewFlashcardImport, importFlashcards, getFlashcardSet } from "../controllers/flashcardImportController.js";

const router = express.Router();

router.use(protect);

router.get("/", getAllFlashcardSets);
router.post("/import/preview", flashcardUpload.single("file"), previewFlashcardImport);
router.post("/import", flashcardUpload.single("file"), importFlashcards);
router.get("/sets/:id", getFlashcardSet);
router.get("/:documentId", getFlashcards);
router.post("/:cardId/review", reviewFlashcard);
router.put("/:cardId/star", toggleStarFlashcard);
router.delete("/:id", deleteFlashcardSet);

export default router;
