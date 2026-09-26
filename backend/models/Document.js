import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: [true, "Please provide a title for the document"],
      trim: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    filePath: {
      type: String,
      required: function () { return this.fileType !== "excel"; },
    },
    fileType: { type: String, enum: ["pdf", "excel"], default: "pdf" },
    importedQuestions: {
      type: [{
        _id: false,
        question: { type: String, required: true },
        answer: { type: String, required: true },
        options: { type: [String], default: undefined },
        optionsNote: String,
      }],
      default: undefined,
    },
    quizGeneration: {
      type: new mongoose.Schema({
        status: { type: String, enum: ["pending", "processing", "ready", "failed", "needs_review", "not_started"], default: "pending" },
        completed: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
        error: { type: String, default: "" },
        quizId: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz", default: null },
        needsReview: { type: [{ _id: false, index: Number, sheet: String, row: Number, reason: String }], default: undefined },
      }, { _id: false }),
      default: undefined,
    },
    // Persist successful batches so retries/server restarts do not regenerate them.
    generatedQuestions: { type: [mongoose.Schema.Types.Mixed], default: undefined, select: false },
    url: {
      type: String,
      default: "",
    },
    fileSize: {
      type: Number,
      required: true,
    },
    extractedText: {
      type: String,
      default: "",
    },
    chunks: [
      {
        content: {
          type: String,
          required: true,
        },
        pageNumber: {
          type: Number,
          default: 0,
        },
        chunkIndex: {
          type: Number,
          required: true,
        },
      },
    ],
    uploadDate: {
      type: Date,
      default: Date.now,
    },
    lastAccessed: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["processing", "ready", "failed"],
      default: "processing",
    },
  },
  { timestamps: true }
);

// Index to optimize queries by userId
documentSchema.index({ userId: 1, uploadDate: -1 });

const Document = mongoose.model("Document", documentSchema);
export default Document;
