import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { CheckCircle2, XCircle, MessageSquare, Trophy } from "lucide-react";
import quizService from "../../services/quizService";
import Spinner from "../../components/common/Spinner";
import QuizTutor from "../../components/quizzes/QuizTutor";
import toast from "react-hot-toast";

export default function QuizResultPage() {
  const { quizId } = useParams();
  return <QuizResultContent key={quizId} quizId={quizId} />;
}

function QuizResultContent({ quizId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [onlyWrong, setOnlyWrong] = useState(false);
  const tutorRef = useRef(null);
  const reviewRef = useRef(null);

  useEffect(() => {
    let active = true;
    quizService.getQuizResults(quizId).then((result) => {
      if (!active) return;
      setData(result);
      setSelectedIndex(Math.max(0, result.results.findIndex((q) => !q.isCorrect)));
      setOnlyWrong(false);
    }).catch((error) => {
      if (active) { setData(null); toast.error(error.error || error.message || "Không tải được kết quả."); }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [quizId]);

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;
  if (!data?.quiz) return <p className="text-center py-20">Không tìm thấy kết quả bài test.</p>;
  const { quiz, results } = data;
  const correct = results.filter((q) => q.isCorrect).length;
  const wrong = results.length - correct;
  const selected = results[selectedIndex];

  const chooseQuestion = (index) => {
    setSelectedIndex(index);
    if (window.matchMedia("(max-width: 1279px)").matches) {
      tutorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-wrap justify-between gap-3 mb-6 text-sm text-emerald-700">
        <Link to={quiz.document ? `/documents/${quiz.document._id}` : "/documents"} className="hover:underline">← Về tài liệu</Link>
        <Link to={`/quizzes/${quiz.practiceSourceId || quiz.id}?new=1`} className="font-semibold hover:underline">Tạo bài test mới →</Link>
      </div>
      <div className="rounded-2xl bg-white border border-slate-200 p-6 mb-8">
        <div className="flex flex-wrap items-center gap-4">
          <div className="rounded-xl bg-emerald-50 p-3"><Trophy className="text-emerald-600" size={28} /></div>
          <div className="flex-1 min-w-0"><h1 className="text-xl font-bold text-slate-900">Kết quả bài test</h1><p className="mt-1 text-sm text-slate-500 break-words">{quiz.title}</p></div>
          <p className="text-4xl font-bold text-emerald-600">{quiz.score}%</p>
        </div>
        <div className="flex flex-wrap gap-3 mt-5 text-sm font-semibold">
          <span className="bg-slate-100 text-slate-700 rounded-lg px-3 py-2">{results.length} câu</span>
          <span className="bg-emerald-50 text-emerald-700 rounded-lg px-3 py-2">{correct} đúng</span>
          <span className="bg-rose-50 text-rose-700 rounded-lg px-3 py-2">{wrong} sai / bỏ trống</span>
        </div>
        <p className="text-sm text-slate-600 mt-4">{wrong ? "Cùng xem lại các câu chưa đúng. Chọn “Hỏi chatbot” ở mỗi câu để được giải thích." : "Bạn đã trả lời đúng tất cả! Chatbot có thể giúp bạn hiểu sâu hơn các lựa chọn."}</p>
      </div>

      <div className="grid xl:grid-cols-[minmax(0,1fr)_380px] gap-6 items-start">
        <div ref={reviewRef} className="min-w-0 space-y-5 scroll-mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900">Xem lại đáp án</h2>
            <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={onlyWrong} onChange={(event) => setOnlyWrong(event.target.checked)} className="accent-emerald-600" />Chỉ câu sai / bỏ trống ({wrong})</label>
          </div>
          {onlyWrong && !wrong && <p className="text-slate-500">Không có câu sai hoặc bỏ trống.</p>}
          {results.filter((q) => !onlyWrong || !q.isCorrect).map((result) => (
            <article id={`review-question-${result.questionIndex}`} key={result.questionIndex} className={`scroll-mt-6 rounded-2xl bg-white border-2 p-5 ${selectedIndex === result.questionIndex ? "border-emerald-400" : "border-slate-200"}`}>
              <div className="flex justify-between items-center mb-3 text-sm font-semibold">
                <span className="text-slate-500">Câu {result.questionIndex + 1}</span>
                <span className={`flex items-center gap-1 ${result.isCorrect ? "text-emerald-700" : "text-rose-600"}`}>{result.isCorrect ? <CheckCircle2 size={18} /> : <XCircle size={18} />}{result.isCorrect ? "Đúng" : result.selectedAnswer ? "Sai" : "Bỏ trống"}</span>
              </div>
              <h3 className="font-semibold text-slate-900 mb-4">{result.question}</h3>
              <div className="space-y-2">
                {result.options.map((option, index) => {
                  const isCorrect = index === result.correctAnswerIndex;
                  const isSelected = index === result.selectedAnswerIndex;
                  return <div key={index} className={`rounded-xl border px-3 py-3 text-sm ${isCorrect ? "bg-emerald-50 border-emerald-400 text-emerald-900" : isSelected ? "bg-rose-50 border-rose-300 text-rose-900" : "bg-slate-50 border-slate-200 text-slate-700"}`}>
                    <p><strong className="mr-2">{String.fromCharCode(65 + index)}.</strong>{option}</p>
                    {(isCorrect || isSelected) && <p className="mt-1 text-xs font-semibold">{[isCorrect && "Đáp án đúng", isSelected && "Bạn đã chọn"].filter(Boolean).join(" · ")}</p>}
                  </div>;
                })}
              </div>
              {result.explanation && <p className="text-sm text-slate-600 mt-4 whitespace-pre-wrap">{result.explanation}</p>}
              <button type="button" aria-label={`Hỏi chatbot về câu ${result.questionIndex + 1}`} onClick={() => chooseQuestion(result.questionIndex)} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl px-4 py-2"><MessageSquare size={16} />Hỏi chatbot</button>
            </article>
          ))}
        </div>
        <aside ref={tutorRef} className="xl:sticky xl:top-6 min-w-0 scroll-mt-6">
          <button type="button" className="xl:hidden mb-3 text-sm font-semibold text-emerald-700" onClick={() => (document.getElementById(`review-question-${selectedIndex}`) || reviewRef.current)?.scrollIntoView({ behavior: "smooth", block: "start" })}>← Quay lại đáp án</button>
          {selected && <QuizTutor key={`${quizId}:${selectedIndex}`} quizId={quizId} result={selected} />}
        </aside>
      </div>
    </div>
  );
}
