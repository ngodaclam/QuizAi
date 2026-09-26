import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, LoaderCircle, AlertCircle, RotateCcw, Play } from "lucide-react";
import Button from "../common/Button";

export function ExcelQuizStatus({ document, onRetry, retrying, retryError }) {
  const generation = document.quizGeneration || {};
  const total = generation.total || document.importedQuestions?.length || 0;
  const completed = Math.min(generation.completed || 0, total);
  const ready = generation.status === "ready" && generation.quizId;
  const failed = generation.status === "failed";
  const percent = total ? Math.round((completed / total) * 100) : 0;

  if (generation.status === "not_started") {
    const supplied = document.importedQuestions?.filter((item) => item.options?.length === 4).length || 0;
    return (
      <section className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5" aria-live="polite">
        <h2 className="font-semibold text-slate-900">Đã bổ sung lựa chọn · Sẵn sàng tạo trắc nghiệm</h2>
        <p className="mt-2 text-sm text-slate-700">{supplied} câu đã có đủ 4 lựa chọn. Gemini sẽ tạo thêm đáp án cho {total - supplied} câu còn lại.</p>
        <p className="mt-2 text-sm text-slate-600">Bấm nút bên dưới sẽ gửi câu hỏi và đáp án đúng của những câu chưa có lựa chọn tới Google Gemini.</p>
        <Button className="mt-4" onClick={onRetry} disabled={retrying}><Play size={16} />{retrying ? "Đang bắt đầu..." : "Tạo trắc nghiệm bằng Gemini"}</Button>
        {retryError && <p className="mt-3 text-sm text-red-700" role="alert">{retryError}</p>}
      </section>
    );
  }

  if (generation.status === "needs_review") {
    const items = generation.needsReview || [];
    return (
      <section className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5" aria-live="polite">
        <h2 className="flex items-center gap-2 font-semibold text-slate-900"><CheckCircle2 size={20} className="shrink-0 text-emerald-600" />Đã import đầy đủ {total} câu hỏi</h2>
        <p className="mt-2 text-sm text-slate-700">Nội dung đã được lưu trong Documents. Trắc nghiệm đang chờ bổ sung lựa chọn gốc cho {items.length} câu; chưa gọi Gemini.</p>
        <details className="mt-3 text-sm text-amber-900" open>
          <summary className="cursor-pointer font-semibold">Các câu cần bổ sung lựa chọn A, B, C, D</summary>
          <p className="mt-2">Điền đủ 4 lựa chọn gốc vào file Excel ở các dòng dưới đây, rồi import file đã bổ sung để tạo bài trắc nghiệm.</p>
          <ul className="mt-3 max-h-60 overflow-y-auto space-y-3">{items.map((item) => <li key={item.index}>
            <p className="font-medium">{item.row ? `${item.sheet}, dòng ${item.row}` : `Câu ${item.index + 1}`}: {document.importedQuestions?.[item.index]?.question}</p>
            <p>Đáp án: {document.importedQuestions?.[item.index]?.answer}</p>
          </li>)}</ul>
        </details>
      </section>
    );
  }

  return (
    <section className={`mb-6 rounded-2xl border p-5 ${failed ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`} aria-live="polite">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-2 font-semibold text-slate-900">
            {ready ? <CheckCircle2 size={20} className="shrink-0 text-emerald-600" /> : failed ? <AlertCircle size={20} className="shrink-0 text-amber-700" /> : <LoaderCircle size={20} className="shrink-0 animate-spin text-emerald-600" />}
            {ready ? `Trắc nghiệm đã sẵn sàng · ${total} câu` : failed ? "Chưa tạo xong đáp án trắc nghiệm" : "AI đang tạo đáp án trắc nghiệm"}
          </h2>
          <p className="mt-2 text-sm text-slate-700">
            Mỗi câu trắc nghiệm có 4 lựa chọn và đáp án đúng từ Excel. AI bổ sung 3 đáp án nhiễu cho các câu chưa có lựa chọn gốc. Nội dung gốc được giữ lại bên dưới.
          </p>
          {!ready && <p className="mt-2 text-sm font-medium text-slate-700">Đã xử lý {completed}/{total} câu.{!failed && " Bạn có thể rời trang và quay lại xem tiến độ."}</p>}
        </div>
        {ready && <Link to={`/quizzes/${generation.quizId}`} className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white hover:bg-emerald-700"><Play size={16} />Chọn số câu & làm bài</Link>}
        {failed && <Button onClick={onRetry} disabled={retrying}><RotateCcw size={16} />{retrying ? "Đang thử lại..." : "Tạo tiếp đáp án"}</Button>}
      </div>
      {!ready && <div className="mt-4 h-2 overflow-hidden rounded-full bg-white" role="progressbar" aria-label="Tiến độ tạo đáp án" aria-valuemin={0} aria-valuemax={total || 1} aria-valuenow={completed}><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${percent}%` }} /></div>}
      {failed && <p className="mt-3 text-sm text-amber-900 break-words" role="alert">{generation.error || "Quá trình tạo đáp án bị gián đoạn. Hãy thử lại để tiếp tục các câu còn thiếu."}</p>}
      {retryError && <p className="mt-3 text-sm text-red-700" role="alert">{retryError}</p>}
    </section>
  );
}

export default function ExcelDocumentContent({ document }) {
  const [page, setPage] = useState(0);
  const questions = document.importedQuestions || [];
  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(questions.length / pageSize));
  const currentPage = Math.min(page, totalPages - 1);
  const first = currentPage * pageSize;
  const visibleQuestions = questions.slice(first, first + pageSize);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 bg-slate-50 p-5">
        <h2 className="font-semibold text-slate-900">Câu hỏi và đáp án gốc</h2>
        <p className="mt-1 text-sm text-slate-600">{questions.length} câu từ {document.fileName || "file Excel"}. Nội dung giữ nguyên theo file đã import.</p>
        {questions.some((item) => item.optionsNote) && <p className="mt-2 text-sm text-slate-600">{questions.filter((item) => item.optionsNote).length} câu có lựa chọn mới do trợ lý biên soạn để luyện tập. Đáp án “Tất cả… trên” được đặt ở D, sau ba lựa chọn liên quan.</p>}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full table-fixed text-left text-sm">
          <thead className="border-b border-slate-200 text-slate-600"><tr><th className="w-14 p-4">STT</th><th className="w-1/2 p-4">Câu hỏi</th><th className="p-4">Đáp án đúng</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{visibleQuestions.map((item, index) => <tr key={first + index} className="align-top hover:bg-slate-50"><td className="p-4 text-slate-500">{first + index + 1}</td><td className="p-4 whitespace-pre-wrap break-words font-medium text-slate-900">{item.question}{item.options?.length === 4 && <ul className="mt-3 space-y-1 text-slate-600 font-normal">{item.options.map((option, optionIndex) => <li key={optionIndex}>{String.fromCharCode(65 + optionIndex)}. {option}</li>)}</ul>}</td><td className="p-4 whitespace-pre-wrap break-words text-emerald-800">{item.answer}</td></tr>)}</tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-4">
        <p className="text-sm text-slate-500">{questions.length ? first + 1 : 0}–{Math.min(first + pageSize, questions.length)} / {questions.length} câu · Trang {currentPage + 1}/{totalPages}</p>
        <div className="flex gap-2"><Button variant="secondary" size="sm" onClick={() => setPage(currentPage - 1)} disabled={currentPage === 0}>Trước</Button><Button variant="secondary" size="sm" onClick={() => setPage(currentPage + 1)} disabled={currentPage + 1 >= totalPages}>Sau</Button></div>
      </div>
    </section>
  );
}
