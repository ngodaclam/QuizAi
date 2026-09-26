import { useEffect, useRef, useState } from "react";
import { MessageSquare, Send } from "lucide-react";
import quizService from "../../services/quizService";
import MarkdownRenderer from "../common/MarkdownRenderer";

export default function QuizTutor({ quizId, result }) {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const logRef = useRef(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    quizService.getChat(quizId, result.questionIndex)
      .then((data) => { if (active) setMessages(data); })
      .catch((err) => { if (active) setError(err.error || err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [quizId, result.questionIndex, reload]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages, sending]);

  const send = async (event) => {
    event.preventDefault();
    const text = message.trim();
    if (!text || sending || loading) return;
    setSending(true);
    setError("");
    try {
      const response = await quizService.chat(quizId, result.questionIndex, text);
      if (!mounted.current) return;
      setMessages((previous) => [...previous, ...response.messages]);
      setMessage("");
    } catch (err) {
      if (mounted.current) setError(err.error || err.message || "Không gửi được câu hỏi.");
    } finally {
      if (mounted.current) setSending(false);
    }
  };

  return (
    <section aria-label="Chatbot giải thích đáp án" className="bg-white border border-emerald-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="p-5 bg-emerald-50 border-b border-emerald-100">
        <h2 className="font-bold text-emerald-900 flex gap-2 items-center"><MessageSquare size={20} />Hỏi về đáp án</h2>
        <p className="mt-2 text-sm text-slate-600">Đang trao đổi về <strong>Câu {result.questionIndex + 1}</strong></p>
        <p className="mt-2 text-sm font-medium text-slate-800 line-clamp-3" title={result.question}>{result.question}</p>
        <p className="mt-2 text-xs text-slate-600">Bạn chọn: {result.selectedAnswer || "Chưa trả lời"}</p>
      </div>
      <div ref={logRef} role="log" aria-label="Hội thoại về câu hỏi" aria-live="polite" className="h-72 xl:h-80 overflow-y-auto p-4 space-y-4 overscroll-contain">
        {loading ? <p className="text-sm text-slate-500">Đang tải hội thoại…</p> : messages.length === 0 && <p className="text-sm text-slate-500">Hỏi vì sao đáp án sai, so sánh các lựa chọn hoặc nhờ lấy ví dụ. Chatbot sẽ dùng đúng câu đang chọn.</p>}
        {messages.map((item, index) => (
          <div key={index} className={`text-sm rounded-xl px-4 py-3 break-words ${item.role === "user" ? "bg-emerald-50 text-emerald-950 ml-6" : "bg-slate-50 text-slate-800"}`}>
            <p className="text-xs font-semibold mb-2">{item.role === "user" ? "Bạn" : "Gia sư AI"}</p>
            {item.role === "user" ? <p className="whitespace-pre-wrap">{item.content}</p> : <MarkdownRenderer content={item.content} />}
          </div>
        ))}
        {sending && <p className="text-sm text-emerald-700" role="status">Đang phân tích câu hỏi…</p>}
      </div>
      <div className="p-4 border-t border-slate-100">
        <div className="flex flex-wrap gap-2 mb-3">
          {[result.isCorrect ? "Vì sao các đáp án còn lại sai?" : result.selectedAnswer ? "Vì sao đáp án mình chọn sai?" : "Giải thích cách chọn đáp án đúng.", "Cho mình một ví dụ dễ hiểu."].map((text) => (
            <button key={text} type="button" disabled={sending || loading} onClick={() => setMessage(text)} className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 text-left disabled:opacity-50">{text}</button>
          ))}
        </div>
        {error && <div className="mb-3 text-sm text-rose-700" role="alert">{error} <button type="button" disabled={sending || loading} onClick={() => setReload((n) => n + 1)} className="underline">Tải lại hội thoại</button></div>}
        <form onSubmit={send} className="space-y-2">
          <label htmlFor="tutor-message" className="sr-only">Câu hỏi cho chatbot</label>
          <textarea id="tutor-message" value={message} maxLength={2000} rows={3} disabled={sending || loading}
            onChange={(event) => setMessage(event.target.value)} placeholder="Ví dụ: Vì sao lựa chọn B không đúng?"
            className="block w-full resize-y border border-slate-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          <button type="submit" disabled={sending || loading || !message.trim()} className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm py-3 disabled:opacity-50"><Send size={16} />{sending ? "Đang gửi…" : "Gửi câu hỏi"}</button>
        </form>
        <p className="text-xs text-slate-500 mt-3">Khi gửi, câu đang chọn và hội thoại liên quan được gửi tới Gemini để giải thích.</p>
      </div>
    </section>
  );
}
