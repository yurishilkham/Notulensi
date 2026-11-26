import { useEffect, useRef } from "react";
import type { Notulensi } from "../types";
import { DraftList } from "./DraftList";
import { CloseIcon, PlusIcon } from "./Icons";

type Props = {
  open: boolean;
  drafts: Notulensi[];
  activeId: string | null;
  storageError: boolean;
  onClose: () => void;
  onSelect: (draft: Notulensi) => void;
  onDelete: (draft: Notulensi) => void;
  onNew: () => void;
};

export function DraftDrawer({
  open,
  drafts,
  activeId,
  storageError,
  onClose,
  onSelect,
  onDelete,
  onNew,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="draft-drawer"
      aria-labelledby="draft-drawer-title"
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="drawer-panel">
        <div className="drawer-head">
          <div>
            <h2 className="drawer-title" id="draft-drawer-title">
              Dokumen tersimpan
            </h2>
            <p className="drawer-count">
              {drafts.length > 0
                ? `${drafts.length} notulensi di peramban ini`
                : "Belum ada dokumen"}
            </p>
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label="Tutup daftar notulensi"
          >
            <CloseIcon />
          </button>
        </div>

        <button
          type="button"
          className="btn btn-secondary drawer-new"
          onClick={() => {
            onNew();
            onClose();
          }}
        >
          <PlusIcon />
          Notulensi baru
        </button>

        <div className="drawer-list">
          {storageError ? (
            <div className="draft-empty">
              <p className="draft-empty-title">Daftar tidak tersedia.</p>
              <p className="draft-empty-copy">
                Penyimpanan peramban tidak dapat dibaca. Muat ulang halaman atau
                mulai penyimpanan baru dari pemberitahuan di atas.
              </p>
            </div>
          ) : (
            <DraftList
              drafts={drafts}
              activeId={activeId}
              onSelect={(draft) => {
                onSelect(draft);
                onClose();
              }}
              onDelete={(draft) => {
                onClose();
                onDelete(draft);
              }}
            />
          )}
        </div>

        <p className="sidebar-note">
          Notulensi baru dan setiap perubahan masuk ke peramban setelah klik
          Simpan.
        </p>
      </div>
    </dialog>
  );
}
