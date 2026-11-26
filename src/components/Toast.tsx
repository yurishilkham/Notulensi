import { useEffect } from "react";
import type { ToastData } from "../types";
import { CloseIcon } from "./Icons";

type Props = {
  toast: ToastData | null;
  onClose: () => void;
};

export function Toast({ toast, onClose }: Props) {
  useEffect(() => {
    if (!toast || toast.persistent) return;
    const timer = window.setTimeout(onClose, toast.duration ?? 5000);
    return () => window.clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  return (
    <div
      className={`toast toast--${toast.tone}`}
      role={toast.tone === "error" ? "alert" : "status"}
    >
      <p className="toast-message">{toast.message}</p>
      <div className="toast-actions">
        {toast.actionLabel && toast.onAction && (
          <button
            type="button"
            className="toast-action"
            onClick={() => {
              toast.onAction?.();
              onClose();
            }}
          >
            {toast.actionLabel}
          </button>
        )}
        <button
          type="button"
          className="toast-close"
          onClick={onClose}
          aria-label="Tutup pemberitahuan"
        >
          <CloseIcon size={16} />
        </button>
      </div>
    </div>
  );
}
