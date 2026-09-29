import { useEffect, useRef, useState } from "react";
import { MessageSquare } from "lucide-react";
import quizService from "../../services/quizService";
import MarkdownRenderer from "../common/MarkdownRenderer";
import ChatComposer from "../chat/ChatComposer";

export default function QuizTutor({ quizId, result }) {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const logRef = useRef(null);
  const inputRef = useRef(null);
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
  }, [messages, sending, error]);

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
    <section aria-label="Chatbot giải thích đáp án" className="flex h-[calc(100dvh-10rem)] max-h-[48rem] min-h-0 flex-col bg-white border border-emerald-200 rounded-2xl overflow-hidden shadow-sm lg:h-[calc(100dvh-7rem)]">
      <div className="shrink-0 p-3 bg-emerald-50 border-b border-emerald-100">
        <h2 className="font-bold text-emerald-900 flex gap-2 items-center"><MessageSquare size={20} />Hỏi về đáp án</h2>
        <p className="mt-1 text-xs text-slate-600">Đang trao đổi về <strong>Câu {result.questionIndex + 1}</strong></p>
      </div>
      <div ref={logRef} role="log" aria-label="Hội thoại về câu hỏi" aria-live="polite" className="min-h-0 flex-1 overflow-y-auto p-3 space-y-4 overscroll-contain break-words [overflow-wrap:anywhere]">
        <details className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
          <summary className="cursor-pointer font-medium">Xem câu hỏi và đáp án đã chọn</summary>
          <p className="mt-2 font-medium">{result.question}</p>
          <p className="mt-2 text-xs">Bạn chọn: {result.selectedAnswer || "Chưa trả lời"}</p>
        </details>
        {loading ? <p className="text-sm text-slate-500">Đang tải hội thoại…</p> : messages.length === 0 && <p className="text-sm text-slate-500">Hỏi vì sao đáp án sai, so sánh các lựa chọn hoặc nhờ lấy ví dụ. Chatbot sẽ dùng đúng câu đang chọn.</p>}
        {messages.map((item, index) => (
          <div key={index} className={`text-sm rounded-xl px-4 py-3 break-words ${item.role === "user" ? "bg-emerald-50 text-emerald-950 ml-6" : "bg-slate-50 text-slate-800"}`}>
            <p className="text-xs font-semibold mb-2">{item.role === "user" ? "Bạn" : "Gia sư AI"}</p>
            {item.role === "user" ? <p className="whitespace-pre-wrap">{item.content}</p> : <MarkdownRenderer content={item.content} />}
          </div>
        ))}
        {sending && <p className="text-sm text-emerald-700" role="status">Đang phân tích câu hỏi…</p>}
        <div className="flex flex-wrap gap-2">
          {[result.isCorrect ? "Vì sao các đáp án còn lại sai?" : result.selectedAnswer ? "Vì sao đáp án mình chọn sai?" : "Giải thích cách chọn đáp án đúng.", "Cho mình một ví dụ dễ hiểu."].map((text) => (
            <button key={text} type="button" disabled={sending || loading} onClick={() => { setMessage(text); inputRef.current?.focus({ preventScroll: true }); }} className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 text-left disabled:opacity-50">{text}</button>
          ))}
        </div>
        {error && <div className="mb-3 text-sm text-rose-700" role="alert">{error} <button type="button" disabled={sending || loading} onClick={() => setReload((n) => n + 1)} className="underline">Tải lại hội thoại</button></div>}
      </div>
      <ChatComposer id="tutor-message" inputRef={inputRef} value={message} onChange={setMessage} onSubmit={send}
        disabled={loading} sending={sending} maxLength={2000} placeholder="Ví dụ: Vì sao lựa chọn B không đúng?" />
    </section>
  );
}
