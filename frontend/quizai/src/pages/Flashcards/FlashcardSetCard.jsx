import React from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Sparkles, TrendingUp, Trash2 } from "lucide-react";
import moment from "moment";

const FlashcardSetCard = ({ flashcardSet, onRequestDelete }) => {
  const navigate = useNavigate();
  const handleStudyNow = () => {
    navigate(`/flashcards/${flashcardSet._id}`);
  };

  const cards = Array.isArray(flashcardSet?.cards) ? flashcardSet.cards : [];
  const reviewedCount = cards.filter(
    (card) => card.lastReviewed,
  ).length;
  const totalCards = cards.length;
  const progressPercentage =
    totalCards > 0 ? Math.round((reviewedCount / totalCards) * 100) : 0;

  return (
    <div
      className="group relative bg-white/80 backdrop-blur-xl border-2 border-slate-200 hover:border-emerald-300 rounded-2xl p-4 cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-emerald-500/10 flex flex-col justify-between"
      onClick={handleStudyNow}
    >
      {typeof onRequestDelete === "function" && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRequestDelete(flashcardSet);
          }}
          className="absolute top-3 right-3 w-9 h-9 rounded-xl bg-white/80 backdrop-blur border border-slate-200 text-slate-500 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-all duration-200 flex items-center justify-center opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto"
          aria-label="Delete flashcard set"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" strokeWidth={2.25} />
        </button>
      )}
      <div className="space-y-4">
        {/* Icon & Title */}
        <div className="flex items-center gap-4">
          <div className="shrink-0 w-12 h-12 rounded-xl bg-linear-to-br from-emerald-100 to-cyan-100 flex items-center justify-center ">
            <BookOpen className="w-6 h-6 text-emerald-600" strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <h3
              className="text-base font-semibold text-slate-900 line-clamp-2 mb-1"
              title={flashcardSet.title || flashcardSet?.documentId?.title || "Flashcards"}
            >
              {flashcardSet.title || flashcardSet?.documentId?.title || "Flashcards"}
            </h3>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Created {moment(flashcardSet.createdAt).fromNow()}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 pt-2">
          <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-sm font-semibold text-slate-700">
              {totalCards} {totalCards === 1 ? "card" : "cards"}
            </span>
          </div>
          {flashcardSet.source === "excel" && <span className="text-xs text-emerald-700 bg-emerald-50 rounded-lg px-2 py-1">Excel</span>}
          {reviewedCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg">
              <TrendingUp
                className="w-3.5 h-3.5 text-emerald-600 "
                strokeWidth={2.5}
              />
              <span className="text-sm font-semibold text-emerald-700">
                {progressPercentage}%
              </span>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {totalCards > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600">
                Progress
              </span>
              <span className="text-xs font-semibold text-slate-700">
                {reviewedCount}/{totalCards} reviewed
              </span>
            </div>
            <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-linear-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Study Button */}
      <div className="mt-6 pt-4 border-t border-slate-100">
        <button
          className="group/btn relative w-full h-11 bg-linear-to-r from-emerald-50 to-teal-100 hover:from-emerald-600 hover:to-teal-600 text-emerald-700 hover:text-white rounded-xl text-sm font-semibold transition-all duration-200 active:scale-95 overflow-hidden "
          onClick={(e) => {
            e.stopPropagation();
            handleStudyNow();
          }}
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4" strokeWidth={2.5} />
            Study Now
          </span>
          <div className="absolute inset-0 bg-linear-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700" />
        </button>
      </div>
    </div>
  );
};

export default FlashcardSetCard;
