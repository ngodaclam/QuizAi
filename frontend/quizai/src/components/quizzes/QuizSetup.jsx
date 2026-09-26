import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shuffle, MessageSquare, Play } from "lucide-react";
import toast from "react-hot-toast";
import quizService from "../../services/quizService";
import Button from "../common/Button";

export default function QuizSetup({ quiz }) {
  const navigate = useNavigate();
  const available = quiz.questions.length;
  const [count, setCount] = useState(String(Math.min(30, available)));
  const [starting, setStarting] = useState(false);
  const number = Number(count);
  const valid = count.trim() !== "" && Number.isInteger(number) && number >= 1 && number <= available;

  const start = async (event) => {
    event.preventDefault();
    if (!valid || starting) return;
    setStarting(true);
    try {
      const attempt = await quizService.createAttempt(quiz._id, number);
      navigate(`/quizzes/${attempt._id}`);
    } catch (error) {
      toast.error(error.error || error.message || "Không tạo được bài test.");
      setStarting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link to={`/documents/${quiz.documentId}`} className="text-sm text-emerald-700 hover:underline">← Về tài liệu</Link>
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Tạo bài test</h1>
        <p className="mt-2 text-slate-600 break-words">{quiz.title}</p>
        <p className="mt-4 text-sm text-slate-600">Bộ câu hỏi có <strong>{available} câu</strong>. Chọn số câu bạn muốn làm trong lần này.</p>
        <form onSubmit={start} className="mt-6 space-y-5">
          <div>
            <label htmlFor="question-count" className="block font-semibold text-sm text-slate-800 mb-2">Số câu trong bài test</label>
            <input id="question-count" type="number" min="1" max={available} step="1" required value={count}
              onChange={(event) => setCount(event.target.value)} disabled={starting} aria-describedby="count-help"
              className="w-full border border-slate-300 rounded-xl px-4 h-12 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            <p id="count-help" className={`text-sm mt-2 ${valid ? "text-slate-500" : "text-rose-600"}`}>Nhập số nguyên từ 1 đến {available}.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[10, 20, 30, 50].filter((n) => n <= available).map((n) => (
              <button key={n} type="button" disabled={starting} onClick={() => setCount(String(n))}
                className={`px-4 py-2 rounded-lg text-sm border ${number === n ? "bg-emerald-50 border-emerald-500 text-emerald-800" : "border-slate-200 text-slate-600"}`}>{n} câu</button>
            ))}
            <button type="button" disabled={starting} onClick={() => setCount(String(available))} className="px-4 py-2 rounded-lg text-sm border border-slate-200 text-slate-600">Tất cả</button>
          </div>
          <div className="rounded-xl bg-slate-50 p-4 space-y-3 text-sm text-slate-600">
            <p className="flex gap-2"><Shuffle size={18} className="shrink-0 text-emerald-600" />Các câu được lấy ngẫu nhiên, không lặp trong một bài. Mỗi lần làm được lưu kết quả riêng.</p>
            <p className="flex gap-2"><MessageSquare size={18} className="shrink-0 text-emerald-600" />Sau khi nộp bài, hỏi chatbot bên cạnh từng câu để hiểu đáp án sai.</p>
          </div>
          <Button type="submit" disabled={!valid || starting} className="w-full"><Play size={16} />{starting ? "Đang tạo bài…" : `Bắt đầu${valid ? ` ${number} câu` : ""}`}</Button>
          {quiz.completedAt && <Link to={`/quizzes/${quiz._id}/results`} className="block text-center text-sm text-emerald-700 hover:underline">Xem kết quả lần trước</Link>}
        </form>
      </div>
    </div>
  );
}
