import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import QuizSetup from "../../components/quizzes/QuizSetup";
import quizService from "../../services/quizService";
import PageHeader from "../../components/common/PageHeader";
import Spinner from "../../components/common/Spinner";
import toast from "react-hot-toast";
import Button from "../../components/common/Button";

const QuizTakePage = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const newTest = searchParams.get("new") === "1";
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    const fetchQuiz = async () => {
      try {
        const res = await quizService.getQuizById(quizId);
        if (!active) return;
        if (res.source === "practice" && res.completedAt && !newTest) {
          navigate(`/quizzes/${quizId}/results`, { replace: true });
          return;
        }
        setQuiz(res);
      } catch (error) {
        if (active) { setQuiz(null); toast.error(error.error || error.message || "Không tải được bài test."); }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchQuiz();
    return () => { active = false; };
  }, [quizId, newTest, navigate]);

  const handleOptionChange = (questionId, optionIndex) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const handleSubmitQuiz = async () => {
    setSubmitting(true);

    try {
      const formattedAnswers = Object.keys(selectedAnswers).map(
        (questionId) => {
          const question = quiz.questions.find((q) => q._id === questionId);
          const questionIndex = quiz.questions.findIndex(
            (q) => q._id === questionId,
          );
          const optionIndex = selectedAnswers[questionId];
          const selectedAnswer = question.options[optionIndex];

          return {
            questionIndex,
            selectedAnswer,
          };
        },
      );

      await quizService.submitQuiz(quizId, formattedAnswers);
      toast.success("Đã nộp bài. Bạn có thể hỏi chatbot về từng đáp án.");
      navigate(`/quizzes/${quizId}/results`);
    } catch (error) {
      toast.error(error.error || error.message || "Không nộp được bài test.");
      console.error("Error submitting quiz:", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner />
      </div>
    );

  if (!quiz || quiz.questions.length === 0)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-slate-600 text-lg">
            Quiz not found or has no questions
          </p>
        </div>
      </div>
    );

  if (quiz.source !== "practice" || newTest) return <QuizSetup key={quiz._id} quiz={quiz} />;

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const answeredCount = Object.keys(selectedAnswers).length;

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader title={quiz.title || "Take Quiz"} />

      {/* Progress Bar */}

      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-slate-700">
            Câu {currentQuestionIndex + 1} / {quiz.questions.length}
          </span>

          <span className="text-sm font-medium text-slate-500">
            Đã trả lời {answeredCount} câu
          </span>
        </div>

        <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-linear-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-500 ease-in-out"
            style={{
              width: `${((currentQuestionIndex + 1) / quiz.questions.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-white/80 backdrop-blur-xl border-2 border-slate-200 rounded-2xl shadow-xl shadow-slate-200/50 p-6 mb-8">
        {/* Question Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-linear-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl mb-4">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-sm font-semibold text-emerald-700">
            Câu {currentQuestionIndex + 1}
          </span>
        </div>

        {/* Question Text */}
        <h3 className="text-lg font-semibold text-slate-900 mb-6 leading-relaxed">
          {currentQuestion.question}
        </h3>

        {/* Options */}
        <div className="space-y-3">
          {currentQuestion.options.map((option, index) => {
            const isSelected = selectedAnswers[currentQuestion._id] === index;
            return (
              <label
                key={index}
                className={`group relative flex items-center p-3 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                  isSelected
                    ? "border-emerald-300 bg-emerald-50 shadow-lg shadow-emerald-500/10"
                    : "border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-white hover:shadow-md"
                }`}
              >
                <input
                  type="radio"
                  name={`question-${currentQuestion._id}`}
                  checked={isSelected}
                  disabled={submitting}
                  onChange={() =>
                    handleOptionChange(currentQuestion._id, index)
                  }
                  className="sr-only"
                />

                {/* Custom Radio */}
                <div
                  className={`shrink-0 w-5 h-5 rounded-full border-2 ${
                    isSelected
                      ? "bg-emerald-500 border-emerald-500"
                      : "bg-white border-slate-300"
                  }`}
                >
                  {isSelected && (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full" />
                    </div>
                  )}
                </div>

                {/* Option Text */}
                <span
                  className={`ml-4 text-sm font-medium ${
                    isSelected ? "text-emerald-900" : "text-slate-700"
                  }`}
                >
                  {option}
                </span>
                {isSelected && (
                  <CheckCircle2 className="ml-auto w-5 h-5 text-emerald-500" />
                )}
              </label>
            );
          })}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between gap-4">
        <Button
          onClick={handlePreviousQuestion}
          disabled={currentQuestionIndex === 0 || submitting}
          variant="secondary"
          className="group"
        >
          <ChevronLeft
            className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200"
            strokeWidth={2.5}
          />
          Câu trước
        </Button>

        {currentQuestionIndex === quiz.questions.length - 1 ? (
          <button
            onClick={handleSubmitQuiz}
            disabled={submitting}
            className="group relative px-8 h-12 bg-linear-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-sm font-semibold text-white rounded-xl transition-all duration-200 shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100 overflow-hidden"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Đang nộp bài
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" strokeWidth={2.5} />
                  Nộp bài
                </>
              )}
            </span>

            <div className="absolute inset-0 bg-linear-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          </button>
        ) : (
          <Button
            onClick={handleNextQuestion}
            disabled={submitting}
            className="group"
          >
            Câu tiếp
            <ChevronRight
              className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200"
              strokeWidth={2.5}
            />
          </Button>
        )}
      </div>

      {/* Question Navigation dots */}
      <p className="mt-6 mb-3 text-sm text-slate-500">Câu bỏ trống được tính là sai. Sau khi nộp, chatbot sẽ giúp bạn giải thích đáp án.</p>
      <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
        {quiz.questions.map((_, index) => {
          const isAnsweredQuestion = Object.hasOwn(selectedAnswers, quiz.questions[index]._id);

          const isCurrent = index === currentQuestionIndex;

          return (
            <button
              key={index}
              aria-label={`Đến câu ${index + 1}`}
              onClick={() => setCurrentQuestionIndex(index)}
              disabled={submitting}
              className={`w-8 h-8 rounded-lg font-semibold text-xs transition-all duration-200 ${
                isCurrent
                  ? "bg-linear-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25 scale-110"
                  : isAnsweredQuestion
                    ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {index + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default QuizTakePage;
