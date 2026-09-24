"use client";
import { useUI } from "./ui-context";

export default function Toasts() {
  const { toasts, dismissToast } = useUI();
  if (!toasts || !toasts.length) return null;
  return (
    <div className="toast-wrap" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={"toast toast-" + t.type} role="status" onClick={() => dismissToast(t.id)} title="Dismiss">
          <span className="toast-ic">{t.type === "error" ? "!" : t.type === "info" ? "i" : "✓"}</span>
          {t.message}
        </div>
      ))}
    </div>
  );
}
