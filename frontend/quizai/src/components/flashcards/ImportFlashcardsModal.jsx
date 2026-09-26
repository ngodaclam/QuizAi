import { useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import toast from "react-hot-toast";
import Modal from "../common/Modal";
import Button from "../common/Button";
import flashcardService from "../../services/flashcardService";
import documentService from "../../services/documentService";

export default function ImportFlashcardsModal({ onClose, onImported, mode = "flashcards", initialFile = null }) {
  const isDocument = mode === "document";
  const service = isDocument ? documentService : flashcardService;
  const fileInputId = isDocument ? "document-excel" : "flashcard-excel";
  const titleInputId = isDocument ? "document-excel-title" : "flashcard-title";
  const [file, setFile] = useState(initialFile);
  const [title, setTitle] = useState(initialFile?.name.replace(/\.xlsx$/i, "").replace(/_/g, " ").slice(0, 150) || "");
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const chooseFile = (event) => {
    const selected = event.target.files?.[0];
    setPreview(null);
    setError("");
    setFile(null);
    if (!selected) return;
    if (!/\.xlsx$/i.test(selected.name)) { setError("Vui lòng chọn file Excel .xlsx."); return; }
    if (selected.size > 5 * 1024 * 1024) { setError("File không được vượt quá 5 MB."); return; }
    setFile(selected);
    setTitle(selected.name.replace(/\.xlsx$/i, "").replace(/_/g, " ").slice(0, 150));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!file || busy) return;
    setBusy(true);
    setError("");
    try {
      if (!preview) {
        setPreview(await service.previewImport(file));
      } else if (preview.canImport && title.trim()) {
        const result = await service.importExcel(file, title.trim());
        toast.success(isDocument
          ? result.quizGeneration?.status === "needs_review"
            ? `Đã lưu đủ ${preview.count} câu hỏi. Trắc nghiệm chờ bổ sung lựa chọn gốc.`
            : `Đã import ${preview.count} câu hỏi. Đang tạo bài trắc nghiệm.`
          : `Đã import ${result.count} câu hỏi.`);
        onImported(result);
      }
    } catch (err) {
      setError(err.message || "Không thể import file. Vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen onClose={() => { if (!busy) onClose(); }} title={isDocument ? "Import Excel vào Documents" : "Import câu hỏi từ Excel"}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-slate-600">
          Chọn file có cột <strong>Câu hỏi</strong> và <strong>Đáp án</strong>.
          {isDocument
            ? " Giữ nguyên câu hỏi và đáp án đúng; AI tự tạo thêm 3 đáp án nhiễu cho mỗi câu để có bài trắc nghiệm 4 lựa chọn."
            : " Mỗi dòng sẽ trở thành một flashcard, giữ nguyên nội dung và thứ tự."}
        </p>
        {isDocument && <p className="text-xs text-slate-500">Có thể thêm các cột A, B, C, D để dùng 4 lựa chọn gốc. Các câu còn lại được AI tạo đáp án ở chế độ nền; bạn có thể xem tiến độ sau khi import.</p>}
        {isDocument && <p className="text-xs text-slate-500">Khi tạo bằng AI, câu hỏi và đáp án đúng được gửi tới Google Gemini.</p>}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-2">
          <label htmlFor={fileInputId} className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
            <FileSpreadsheet size={18} /> File Excel (.xlsx)
          </label>
          <input id={fileInputId} type="file" accept=".xlsx" disabled={busy} onChange={chooseFile}
            className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:text-emerald-700" />
          {file && <p className="text-sm text-emerald-800 break-all">Đã chọn: {file.name}</p>}
          <p className="text-xs text-slate-600">Tối đa 5 MB / 5.000 dòng. Có thể có dòng tiêu đề phía trên bảng.</p>
          {isDocument && <p className="text-xs text-slate-600">Tổng nội dung câu hỏi, đáp án và lựa chọn tối đa 1 MiB.</p>}
        </div>
        <div>
          <label htmlFor={titleInputId} className="block text-sm font-medium text-slate-700 mb-2">{isDocument ? "Tên tài liệu" : "Tên bộ câu hỏi"}</label>
          <input id={titleInputId} value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={150} disabled={busy}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        {error && <p role="alert" className="text-sm text-red-700 bg-red-50 p-3 rounded-lg">{error}</p>}
        {preview && (
          <div className="space-y-3" aria-live="polite">
            <div className="text-sm bg-slate-50 border border-slate-200 rounded-xl p-3">
              <p className="font-semibold text-slate-900">{preview.count} câu hỏi hợp lệ / {preview.totalRows} dòng</p>
              <p className="text-slate-600">{preview.duplicates} cặp trùng được bỏ qua · {preview.errors.length} dòng lỗi</p>
              <p className="text-xs text-slate-500 mt-1">Sheet: {preview.sheets.join(", ")}</p>
              {preview.ignoredSheets.length > 0 && <p className="text-amber-700 mt-2">Sheet không có cột phù hợp, không import: {preview.ignoredSheets.join(", ")}</p>}
            </div>
            {isDocument && preview.needsReview?.length > 0 && (
              <details className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900" open>
                <summary className="cursor-pointer font-semibold">Vẫn import được đủ {preview.count} câu · {preview.needsReview.length} câu cần bổ sung để tạo trắc nghiệm</summary>
                <p className="mt-2">Bấm Import để lưu đầy đủ câu hỏi và đáp án vào Documents. Chưa tạo trắc nghiệm và chưa gửi tới Gemini. Sau đó, bổ sung các cột A, B, C, D cho những câu dưới đây trong file Excel. Các dòng còn lại có thể để trống 4 cột này để AI tự tạo đáp án nhiễu.</p>
                <ul className="mt-2 max-h-40 overflow-y-auto space-y-2">{preview.needsReview.map((item) => <li key={item.index}><p className="font-medium">{item.row ? `${item.sheet}, dòng ${item.row}` : `Câu ${item.index + 1}`}: {item.question}</p><p>{item.reason}</p></li>)}</ul>
              </details>
            )}
            {preview.errors.length > 0 && (
              <div role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                <p className="font-semibold">Hãy sửa các dòng lỗi rồi chọn lại file. Chưa lưu dữ liệu.</p>
                <ul className="list-disc pl-5 mt-2 max-h-32 overflow-auto">
                  {preview.errors.map((item, index) => <li key={index}>{item.sheet}, dòng {item.row}: {item.message}</li>)}
                </ul>
              </div>
            )}
            <div className="max-h-52 overflow-y-auto space-y-3 border border-slate-200 rounded-xl p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">Xem trước {preview.preview.length} câu đầu</p>
              {preview.preview.map((card, index) => (
                <div key={index} className="text-sm border-b border-slate-100 last:border-0 pb-2">
                  <p className="font-medium text-slate-900 whitespace-pre-wrap">{index + 1}. {card.question}</p>
                  <p className="text-emerald-700 mt-1 whitespace-pre-wrap">{card.answer}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={busy}>Hủy</Button>
          <Button type="submit" disabled={busy || !file || !title.trim() || (preview && !preview.canImport)}>
            {busy ? "Đang xử lý..." : preview ? isDocument && !preview.needsReview?.length ? "Import & tạo trắc nghiệm" : `Import ${preview.count} câu hỏi` : "Xem trước"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
