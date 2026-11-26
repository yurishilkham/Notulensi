import { useEffect, useId, useRef } from "react";

type Props = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  confirmVariant?: "danger" | "primary";
  autoFocus?: "confirm" | "cancel";
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  onConfirm,
  onClose,
  secondaryLabel,
  onSecondary,
  confirmVariant = "danger",
  autoFocus = "cancel",
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      const target =
        autoFocus === "confirm" ? confirmRef.current : cancelRef.current;
      target?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open, autoFocus]);

  return (
    <dialog
      ref={dialogRef}
      className="confirm-dialog"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="confirm-panel">
        <h2 className="confirm-title" id={titleId}>
          {title}
        </h2>
        <p className="confirm-description" id={descriptionId}>
          {description}
        </p>
        <div
          className={`confirm-actions${secondaryLabel ? " confirm-actions--three" : ""}`}
        >
          <button
            ref={cancelRef}
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
          >
            Batal
          </button>
          {secondaryLabel && onSecondary && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onSecondary}
            >
              {secondaryLabel}
            </button>
          )}
          <button
            ref={confirmRef}
            type="button"
            className={`btn ${confirmVariant === "primary" ? "btn-primary" : "btn-danger"}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
