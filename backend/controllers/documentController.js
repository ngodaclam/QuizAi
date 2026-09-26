import { error } from "console";
import Document from "../models/Document.js";
import Flashcard from "../models/Flashcard.js";
import Quiz from "../models/Quiz.js";
import ChatHistory from "../models/ChatHistory.js";
import { extractTextFromPDF } from "../utils/pdfParser.js";
import { chunkText } from "../utils/textChunker.js";
import { uploadPDFToCloudinary } from "../utils/cloudinary.js";
import fs from "fs/promises";
import mongoose from "mongoose";

// @desc    Upload a document
// @route   POST /api/documents/upload
// @access  Private
export const uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "Please upload a PDF file",
        statusCode: 400,
      });
    }

    const { title } = req.body;

    if (!title) {
      // Delete the uploaded file if title is missing
      await fs.unlink(req.file.path);
      return res.status(400).json({
        success: false,
        error: "Please provide a document title",
        statusCode: 400,
      });
    }

    // Constructing file URL for accessing the uploaded file
    const baseUrl =
      process.env.SERVER_URL || `${req.protocol}://${req.get("host")}`;
    const fileUrl = `${baseUrl}/uploads/documents/${req.file.filename}`;

    const document = await Document.create({
      userId: req.user._id,
      title,
      fileName: req.file.originalname,
      filePath: fileUrl, // Storing the file URL instead of path
      url: fileUrl,
      fileSize: req.file.size,
      status: "processing",
    });

    processPDF(document._id, req.file.path).catch(async (err) => {
      console.error("Error processing PDF:", err);
    });

    res.status(201).json({
      success: true,
      data: document,
      message: "Document uploaded successfully. Processing is in progress...",
      statusCode: 201,
    });
  } catch (error) {
    // Cleanup uploaded file in case of error
    if (req.file) {
      await fs.unlink(req.file.path);
    }
    next(error);
  }
};

// helper function to process PDF
const processPDF = async (documentId, filePath) => {
  try {
    const { text } = await extractTextFromPDF(filePath);

    // Chunking text into smaller pieces
    const chunks = chunkText(text, 500, 50);

    // Updating document with chunks and setting status to 'processed'
    await Document.findByIdAndUpdate(documentId, {
      extractedText: text,
      chunks: chunks,
      status: "ready",
    });

    try {
      const uploadResult = await uploadPDFToCloudinary(filePath);
      await Document.findByIdAndUpdate(documentId, {
        filePath: uploadResult.secure_url,
        url: uploadResult.secure_url,
      });
    } catch (err) {
      console.error(`Error uploading PDF ${documentId} to Cloudinary:`, err);
    }

    console.log(`Document ${documentId} processed successfully.`);
  } catch (error) {
    console.error(`Error processing PDF ${documentId}:`, error);

    await Document.findByIdAndUpdate(documentId, {
      status: "failed",
    });
  }
};

// @desc    Get all documents for the logged-in user
// @route   GET /api/documents
// @access  Private
export const getDocuments = async (req, res, next) => {
  try {
    const documents = await Document.aggregate([
      {
        $match: { userId: new mongoose.Types.ObjectId(req.user._id) },
      },
      {
        $lookup: {
          from: "flashcards",
          localField: "_id",
          foreignField: "documentId",
          as: "flashcardSets",
        },
      },
      {
        $lookup: {
          from: "quizzes",
          localField: "_id",
          foreignField: "documentId",
          as: "quizzes",
        },
      },
      {
        $addFields: {
          flashcardCount: { $size: "$flashcardSets" },
          quizCount: { $size: "$quizzes" },
        },
      },
      {
        $project: {
          extractedText: 0,
          chunks: 0,
          flashcardSets: 0,
          quizzes: 0,
          importedQuestions: 0,
          generatedQuestions: 0,
        },
      },
      {
        $sort: { uploadDate: -1 },
      },
    ]);

    res.status(200).json({
      success: true,
      count: documents.length,
      data: documents,
      message: "Documents fetched successfully",
      statusCode: 200,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single document by with chunks
// @route   GET /api/documents/:id
// @access  Private
export const getDocument = async (req, res, next) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: "Document not found",
        statusCode: 404,
      });
    }

    // Count flashcards and quizzes
    const flashcardCount = await Flashcard.countDocuments({
      documentId: document._id,
      userId: req.user._id,
    });

    const quizCount = await Quiz.countDocuments({
      documentId: document._id,
      userId: req.user._id,
    });

    document.lastAccessed = Date.now();
    await Document.updateOne({ _id: document._id }, { $set: { lastAccessed: document.lastAccessed } });

    // combining document data with flashcard and quiz counts
    const documentData = document.toObject();
    documentData.flashcardCount = flashcardCount;
    documentData.quizCount = quizCount;

    res.status(200).json({ success: true, data: documentData });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a document
// @route   DELETE /api/documents/:id
// @access  Private
export const deleteDocument = async (req, res, next) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: "Document not found",
        statusCode: 404,
      });
    }

    if (document.filePath && !document.filePath.startsWith("http")) {
      await fs.unlink(document.filePath).catch(() => {});
    }

    await document.deleteOne();
    await Promise.all([
      Flashcard.deleteMany({ documentId: document._id, userId: req.user._id }),
      Quiz.deleteMany({ documentId: document._id, userId: req.user._id }),
      ChatHistory.deleteMany({ documentId: document._id, userId: req.user._id }),
    ]);

    res.status(200).json({
      success: true,
      message: "Document deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
