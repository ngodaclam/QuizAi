import express from "express";
import {
  getQuizzes,
  getQuizById,
  submitQuiz,
  getQuizResults,
  deleteQuiz,
  createQuizAttempt,
  getQuizChat,
  chatAboutQuiz,
} from "../controllers/quizController.js";
import protect from "../middleware/auth.js";

const router = express.Router();

router.use(protect);

router.get("/quiz/:id", getQuizById);
router.get("/:documentId", getQuizzes);
router.post("/:id/submit", submitQuiz);
router.post("/:id/attempts", createQuizAttempt);
router.get("/:id/chat", getQuizChat);
router.post("/:id/chat", chatAboutQuiz);
router.get("/:id/results", getQuizResults);
router.delete("/:id", deleteQuiz);

export default router;
