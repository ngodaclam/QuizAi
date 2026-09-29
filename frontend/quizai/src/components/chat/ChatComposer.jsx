import { Send } from "lucide-react";

export default function ChatComposer({ id, value, onChange, onSubmit, disabled, sending, placeholder, maxLength, inputRef }) {
  const handleKeyDown = (event) => {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing || event.keyCode === 229) return;
    event.preventDefault();
    if (!disabled && !sending && value.trim()) event.currentTarget.form.requestSubmit();
  };

  return (
    <div className="shrink-0 border-t border-slate-200/60 bg-white p-3 sm:p-4">
      <form onSubmit={onSubmit} className="flex items-end gap-2">
        <label htmlFor={id} className="sr-only">Câu hỏi cho chatbot</label>
        <textarea
          ref={inputRef}
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          maxLength={maxLength}
          readOnly={disabled || sending}
          aria-describedby={`${id}-hint`}
          placeholder={placeholder}
          className="block min-w-0 flex-1 resize-none rounded-xl border border-slate-300 bg-slate-50/50 px-3 py-2.5 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm"
        />
        <button
          type="submit"
          disabled={disabled || sending || !value.trim()}
          aria-label={sending ? "Đang gửi câu hỏi" : "Gửi câu hỏi"}
          title="Gửi câu hỏi (Enter)"
          className="flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send size={18} />
          <span className="hidden sm:inline">Gửi</span>
        </button>
      </form>
      <p id={`${id}-hint`} className="mt-2 text-xs text-slate-500">Enter để gửi · Shift+Enter để xuống dòng</p>
    </div>
  );
}
