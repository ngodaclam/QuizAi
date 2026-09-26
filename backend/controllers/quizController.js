import Quiz from "../models/Quiz.js";
import Document from "../models/Document.js";
import { gradeQuizAnswers, resolveAnswerIndex } from "../utils/quizScoring.js";
import { quizError, quizForTaking, sampleQuizQuestions } from "../utils/quizPractice.js";
import { answerQuizQuestion, getQuizChatContext, validateTutorMessage } from "../services/quizTutor.js";

// @desc     Get all quizzes of a document
// @route    GET /api/quizzes/:documentId
// @access   Private
export const getQuizzes = async (req, res, next) => {
  try {
    const quizzes = await Quiz.find({
      userId: req.user._id,
      documentId: req.params.documentId,
    })
      .populate("documentId", "title fileName")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: quizzes.length,
      data: quizzes.map(quizForTaking),
    });
  } catch (error) {
    next(error);
  }
};

// @desc     Get single quiz related to a document
// @route    GET /api/quizzes/quiz/:id
// @access   Private
export const getQuizById = async (req, res, next) => {
  try {
    const quiz = await Quiz.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!quiz) {
      return res.status(404).json({
        success: false,
        error: "Quiz not found",
        statusCode: 404,
      });
    }

    res.status(200).json({
      success: true,
      data: quizForTaking(quiz),
    });
  } catch (error) {
    next(error);
  }
};

// @desc     Submit Quiz Answers
// @route    POST /api/quizzes/:id/submit
// @access   Private
export const submitQuiz = async (req, res, next) => {
  try {
    const { answers } = req.body;

    if (!Array.isArray(answers)) {
      return res.status(400).json({
        success: false,
        error: "Please provide an array of answers",
        statusCode: 400,
      });
    }

    const quiz = await Quiz.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!quiz) {
      return res.status(404).json({
        success: false,
        error: "Quiz not found",
        statusCode: 404,
      });
    }

    if (quiz.completedAt) {
      return res.status(400).json({
        success: false,
        error: "Quiz already completed",
        statusCode: 400,
      });
    }

    const { userAnswers, correctCount, score, totalQuestions } = gradeQuizAnswers(quiz.questions, answers);

    // Update Quiz
    quiz.userAnswers = userAnswers;
    quiz.score = score;
    quiz.totalQuestions = totalQuestions;
    quiz.completedAt = new Date();

    await quiz.save();

    res.status(200).json({
      success: true,
      data: {
        quizId: quiz._id,
        score,
        correctCount,
        totalQuestions: quiz.totalQuestions,
        percentage: score,
        userAnswers,
      },
      message: "Quiz submitted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// @desc     Get Quiz Results
// @route    GET /api/quizzes/:id/results
// @access   Private
export const getQuizResults = async (req, res, next) => {
  try {
    const quiz = await Quiz.findOne({
      _id: req.params.id,
      userId: req.user._id,
    }).populate("documentId", "title");

    if (!quiz) {
      return res.status(404).json({
        success: false,
        error: "Quiz not found",
        statusCode: 404,
      });
    }

    if (!quiz.completedAt) {
      return res.status(400).json({
        success: false,
        error: "Quiz not completed",
        statusCode: 400,
      });
    }

    // Constructing the detailed results
    const practiceSourceId = quiz.parentQuizId && await Quiz.exists({ _id: quiz.parentQuizId, userId: req.user._id })
      ? quiz.parentQuizId : quiz._id;
    const detailedResults = quiz.questions.map((question, index) => {
      const userAnswer = quiz.userAnswers.find(
        (a) => a.questionIndex === index
      );

      return {
        questionIndex: index,
        question: question.question,
        options: question.options,
        correctAnswer: question.correctAnswer,
        correctAnswerIndex: resolveAnswerIndex(question.correctAnswer, question.options),
        selectedAnswerIndex: resolveAnswerIndex(userAnswer?.selectedAnswer, question.options),
        selectedAnswer: userAnswer?.selectedAnswer || null,
        isCorrect: userAnswer?.isCorrect || false,
        explanation: question.explanation,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        quiz: {
          id: quiz._id,
          title: quiz.title,
          document: quiz.documentId,
          score: quiz.score,
          totalQuestions: quiz.totalQuestions,
          completedAt: quiz.completedAt,
          parentQuizId: quiz.parentQuizId,
          practiceSourceId,
        },
        results: detailedResults,
      },
      message: "Quiz results fetched successfully",
    });
  } catch (error) {
    next(error);
  }
};

// Create a separate attempt; the source bank and earlier results stay intact.
export const createQuizAttempt = async (req, res, next) => {
  try {
    const bank = await Quiz.findOne({ _id: req.params.id, userId: req.user._id });
    if (!bank) throw quizError("Không tìm thấy bộ câu hỏi.", 404);
    const questions = sampleQuizQuestions(bank.questions, req.body.numQuestions);
    const attempt = await Quiz.create({
      userId: req.user._id, documentId: bank.documentId,
      parentQuizId: bank.source === "practice" ? bank.parentQuizId || bank._id : bank._id,
      title: `${bank.title.replace(/ · Bài test \d+ câu$/, "")} · Bài test ${questions.length} câu`,
      source: "practice", questions, totalQuestions: questions.length,
    });
    res.status(201).json({ success: true, data: quizForTaking(attempt) });
  } catch (error) { next(error); }
};

export const getQuizChat = async (req, res, next) => {
  try {
    const quiz = await Quiz.findOne({ _id: req.params.id, userId: req.user._id }).select("+chatMessages");
    if (!quiz) throw quizError("Không tìm thấy bài test.", 404);
    const index = /^\d+$/.test(req.query.questionIndex) ? Number(req.query.questionIndex) : NaN;
    getQuizChatContext(quiz, index);
    res.json({ success: true, data: quiz.chatMessages.filter((m) => m.questionIndex === index) });
  } catch (error) { next(error); }
};

export const createQuizChatHandler = (respond = answerQuizQuestion) => async (req, res, next) => {
  try {
    const message = validateTutorMessage(req.body.message);
    const quiz = await Quiz.findOne({ _id: req.params.id, userId: req.user._id }).select("+chatMessages");
    if (!quiz) throw quizError("Không tìm thấy bài test.", 404);
    const questionIndex = req.body.questionIndex;
    const context = getQuizChatContext(quiz, questionIndex);
    const history = quiz.chatMessages.filter((m) => m.questionIndex === questionIndex);
    const answer = await respond({ context, message, history });
    const messages = [{ questionIndex, role: "user", content: message }, { questionIndex, role: "assistant", content: answer }];
    const updated = await Quiz.updateOne({ _id: quiz._id, userId: req.user._id }, {
      $push: { chatMessages: { $each: messages, $slice: -200 } },
    });
    if (!updated.matchedCount) throw quizError("Bài test đã bị xóa.", 404);
    res.json({ success: true, data: { answer, messages } });
  } catch (error) { next(error); }
};

export const chatAboutQuiz = createQuizChatHandler();

// @desc     Delete Quiz
// @route    DELETE /api/quizzes/:id
// @access   Private
export const deleteQuiz = async (req, res, next) => {
  try {
    const quiz = await Quiz.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!quiz) {
      return res.status(404).json({
        success: false,
        error: "Quiz not found",
        statusCode: 404,
      });
    }

    await quiz.deleteOne();
    if (quiz.source === "excel") {
      await Document.updateOne({ _id: quiz.documentId, userId: req.user._id, "quizGeneration.quizId": quiz._id }, { $set: {
        "quizGeneration.status": "failed", "quizGeneration.quizId": null,
        "quizGeneration.error": "Bài trắc nghiệm đã được xóa. Chọn thử lại để tạo lại từ các lựa chọn đã lưu.",
      } });
    }

    res.status(200).json({
      success: true,
      message: "Quiz deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
