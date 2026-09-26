import mongoose from "mongoose";

const quizSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    source: { type: String, enum: ["ai", "excel", "practice"], default: "ai" },
    parentQuizId: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz", default: null },
    chatMessages: {
      type: [{
        _id: false,
        questionIndex: { type: Number, required: true },
        role: { type: String, enum: ["user", "assistant"], required: true },
        content: { type: String, required: true },
      }],
      default: [],
      select: false,
    },
    questions: [
      {
        question: {
          type: String,
          required: true,
        },
        options: {
          type: [String],
          required: true,
          validate: [
            (array) => array.length === 4,
            "A question must have exactly four options",
          ],
        },
        correctAnswer: {
          type: String,
          required: true,
        },
        explanation: {
          type: String,
          default: "",
        },
        difficulty: {
          type: String,
          enum: ["easy", "medium", "hard"],
          default: "medium",
        },
      },
    ],
    userAnswers: [
      {
        questionIndex: {
          type: Number,
          required: true,
        },
        selectedAnswer: {
          type: String,
          required: true,
        },
        isCorrect: {
          type: Boolean,
          required: true,
        },
        answeredAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    score: {
      type: Number,
      default: 0,
    },
    totalQuestions: {
      type: Number,
      required: true,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Index to optimize queries by userId and documentId
quizSchema.index({ userId: 1, documentId: 1 });
// Only one automatically generated quiz for an imported document, even after retries.
quizSchema.index({ documentId: 1, source: 1 }, { unique: true, partialFilterExpression: { source: "excel" } });

const Quiz = mongoose.model("Quiz", quizSchema);
export default Quiz;
