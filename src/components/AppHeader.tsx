import { LOGO_DATA_URL } from "../assets/logo-data";
import { formatJam } from "../lib/date";
import type { SaveState } from "../types";
import { PlusIcon, PrinterIcon, SaveIcon } from "./Icons";

type Props = {
  saveState: SaveState;
  lastSavedAt: number | null;
  storageDisabled: boolean;
  draftCount: number;
  canSave: boolean;
  onSave: () => void;
  onPrint: () => void;
  onOpenDrafts: () => void;
  onNew: () => void;
};

function statusText(
  saveState: SaveState,
  lastSavedAt: number | null,
  storageDisabled: boolean,
): string {
  if (storageDisabled) return "Penyimpanan nonaktif";
  if (saveState === "error") return "Gagal menyimpan";
  if (saveState === "saved" && lastSavedAt) {
    return `Tersimpan ${formatJam(lastSavedAt)}`;
  }
  return "Belum tersimpan";
}

function compactStatusText(
  saveState: SaveState,
  storageDisabled: boolean,
): string {
  if (storageDisabled) return "Nonaktif";
  if (saveState === "error") return "Gagal menyimpan";
  if (saveState === "saved") return "Tersimpan";
  return "Belum tersimpan";
}

export function AppHeader({
  saveState,
  lastSavedAt,
  storageDisabled,
  draftCount,
  canSave,
  onSave,
  onPrint,
  onOpenDrafts,
  onNew,
}: Props) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="brand">
          <img className="brand-logo" src={LOGO_DATA_URL} alt="" />
          <span className="brand-divider" aria-hidden="true" />
          <div className="brand-text">
            <span className="brand-name">Notulensi</span>
            <span className="brand-sub">Bawaslu Kota Pasuruan</span>
          </div>
        </div>

        <div className="topbar-actions">
          <span
            className={`save-status save-status--${storageDisabled ? "error" : saveState}`}
            role="status"
            aria-live="polite"
          >
            <span className="save-status-full">
              {statusText(saveState, lastSavedAt, storageDisabled)}
            </span>
            <span className="save-status-compact">
              {compactStatusText(saveState, storageDisabled)}
            </span>
          </span>

          <div className="topbar-buttons topbar-buttons--desktop">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onSave}
              disabled={!canSave}
              title="Simpan notulensi ke daftar dokumen tersimpan"
            >
              <SaveIcon />
              Simpan
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={onPrint}
            >
              <PrinterIcon />
              Cetak / PDF
            </button>
          </div>

          <div className="topbar-buttons topbar-buttons--mobile">
            <button
              type="button"
              className="btn btn-secondary topbar-drafts"
              onClick={onOpenDrafts}
            >
              Daftar{draftCount > 0 ? ` (${draftCount})` : ""}
            </button>
            <button
              type="button"
              className="btn btn-quiet topbar-new"
              onClick={onNew}
              aria-label="Buat notulensi baru"
              title="Notulensi baru"
            >
              <PlusIcon />
              <span className="topbar-new-label">Baru</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
