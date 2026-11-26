import { useCallback, useEffect, useRef, useState } from "react";
import { AppHeader } from "./components/AppHeader";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { DraftDrawer } from "./components/DraftDrawer";
import { DraftList } from "./components/DraftList";
import { PlusIcon, PrinterIcon } from "./components/Icons";
import { NotulensiDocument } from "./components/NotulensiDocument";
import { NotulensiForm } from "./components/NotulensiForm";
import { PreviewPane } from "./components/PreviewPane";
import { Toast } from "./components/Toast";
import { WorkspaceTabs } from "./components/WorkspaceTabs";
import { useMediaQuery } from "./hooks/useMediaQuery";
import { paperFor } from "./lib/paper";
import {
  createBlankNotulensi,
  loadDrafts,
  saveDrafts,
  startFreshStorage,
  upsertDraft,
} from "./lib/storage";
import type {
  Notulensi,
  PaperSize,
  SaveState,
  ToastData,
} from "./types";

type View = "form" | "preview";

export default function App() {
  const [boot] = useState(() => {
    const result = loadDrafts();
    return {
      drafts: result.drafts,
      error: result.error,
      active: result.drafts[0] ?? createBlankNotulensi(),
    };
  });

  const [drafts, setDrafts] = useState<Notulensi[]>(boot.drafts);
  const [draft, setDraft] = useState<Notulensi>(boot.active);
  const [activeId, setActiveId] = useState<string | null>(
    boot.drafts[0]?.id ?? null,
  );
  const [storageError, setStorageError] = useState(boot.error);
  const [saveState, setSaveState] = useState<SaveState>(
    boot.drafts[0] ? "saved" : "idle",
  );
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(
    boot.drafts[0]?.updatedAt ?? null,
  );
  const [toast, setToast] = useState<ToastData | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Notulensi | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [view, setView] = useState<View>("form");
  const isNarrow = useMediaQuery("(max-width: 1179px)");

  const draftsRef = useRef(drafts);
  const draftRef = useRef(draft);
  const storageErrorRef = useRef(storageError);
  const dirtyRef = useRef(false);
  const saveTimer = useRef<number | null>(null);
  const deletedRef = useRef<{
    draft: Notulensi;
    wasActive: boolean;
  } | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const toastId = useRef(0);

  useEffect(() => {
    draftsRef.current = drafts;
  }, [drafts]);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    storageErrorRef.current = storageError;
  }, [storageError]);

  const showToast = useCallback(
    (data: Omit<ToastData, "id">) => {
      toastId.current += 1;
      setToast({ ...data, id: toastId.current });
    },
    [],
  );

  const dismissToast = useCallback(() => setToast(null), []);

  const commit = useCallback(
    (nextDraft: Notulensi): boolean => {
      if (storageErrorRef.current) {
        setSaveState("error");
        return false;
      }
      try {
        const nextDrafts = upsertDraft(draftsRef.current, nextDraft);
        saveDrafts(nextDrafts);
        draftsRef.current = nextDrafts;
        setDrafts(nextDrafts);
        setLastSavedAt(nextDraft.updatedAt);
        setSaveState("saved");
        dirtyRef.current = false;
        return true;
      } catch {
        setSaveState("error");
        showToast({
          message:
            "Penyimpanan peramban penuh atau tidak tersedia. Unduh dokumen penting lalu hapus notulensi lama.",
          tone: "error",
          persistent: true,
        });
        return false;
      }
    },
    [showToast],
  );

  const scheduleSave = useCallback(() => {
    if (storageErrorRef.current) {
      setSaveState("error");
      return;
    }
    setSaveState("saving");
    if (saveTimer.current !== null) {
      window.clearTimeout(saveTimer.current);
    }
    saveTimer.current = window.setTimeout(() => {
      saveTimer.current = null;
      commit(draftRef.current);
    }, 450);
  }, [commit]);

  const handleChange = useCallback(
    (patch: Partial<Notulensi>) => {
      const next = { ...draftRef.current, ...patch, updatedAt: Date.now() };
      draftRef.current = next;
      setDraft(next);
      setActiveId(next.id);
      dirtyRef.current = true;
      scheduleSave();
    },
    [scheduleSave],
  );

  const flush = useCallback(() => {
    if (saveTimer.current !== null) {
      window.clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    if (dirtyRef.current) {
      commit(draftRef.current);
    }
  }, [commit]);

  const loadDraft = useCallback((next: Notulensi) => {
    const fresh = draftsRef.current.find((item) => item.id === next.id) ?? next;
    draftRef.current = fresh;
    setDraft(fresh);
    setActiveId(fresh.id);
    setLastSavedAt(fresh.updatedAt);
    setSaveState("saved");
    dirtyRef.current = false;
    setView("form");
  }, []);

  const requestSelect = useCallback(
    (next: Notulensi) => {
      if (next.id === draftRef.current.id) {
        setView("form");
        return;
      }
      flush();
      loadDraft(next);
    },
    [flush, loadDraft],
  );

  const startNew = useCallback(() => {
    const blank = createBlankNotulensi();
    draftRef.current = blank;
    setDraft(blank);
    setActiveId(null);
    setLastSavedAt(null);
    setSaveState("idle");
    dirtyRef.current = false;
    setView("form");
    window.scrollTo({ top: 0 });
    window.setTimeout(() => nameInputRef.current?.focus(), 60);
  }, []);

  const requestNew = useCallback(() => {
    flush();
    startNew();
  }, [flush, startNew]);

  const undoDelete = useCallback(() => {
    const deleted = deletedRef.current;
    if (!deleted) return;

    const restoredDrafts = upsertDraft(draftsRef.current, deleted.draft);
    try {
      saveDrafts(restoredDrafts);
    } catch {
      showToast({
        message:
          "Notulensi tidak dapat dikembalikan karena penyimpanan peramban tidak tersedia.",
        tone: "error",
        persistent: true,
      });
      return;
    }

    draftsRef.current = restoredDrafts;
    setDrafts(restoredDrafts);

    if (deleted.wasActive) {
      draftRef.current = deleted.draft;
      setDraft(deleted.draft);
      setActiveId(deleted.draft.id);
      setLastSavedAt(deleted.draft.updatedAt);
      setSaveState("saved");
      dirtyRef.current = false;
      setView("form");
    }

    deletedRef.current = null;
  }, [showToast]);

  const handleDelete = useCallback(
    (target: Notulensi) => {
      const wasActive = target.id === draftRef.current.id;
      if (wasActive && saveTimer.current !== null) {
        window.clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
      const remaining = draftsRef.current.filter(
        (item) => item.id !== target.id,
      );

      try {
        saveDrafts(remaining);
      } catch {
        showToast({
          message:
            "Notulensi gagal dihapus karena penyimpanan peramban tidak dapat diakses.",
          tone: "error",
          persistent: true,
        });
        return;
      }

      draftsRef.current = remaining;
      setDrafts(remaining);
      deletedRef.current = { draft: target, wasActive };

      if (wasActive) {
        const next = remaining[0] ?? createBlankNotulensi();
        draftRef.current = next;
        setDraft(next);
        setActiveId(remaining[0] ? next.id : null);
        setLastSavedAt(remaining[0] ? next.updatedAt : null);
        setSaveState(remaining[0] ? "saved" : "idle");
        dirtyRef.current = false;
        setView("form");
      }

      setPendingDelete(null);
      showToast({
        message: "Notulensi dihapus.",
        tone: "info",
        actionLabel: "Urungkan",
        duration: 8000,
        onAction: undoDelete,
      });
    },
    [showToast, undoDelete],
  );

  const handlePrint = useCallback(() => {
    flush();
    window.print();
  }, [flush]);

  const handlePaperSizeChange = useCallback(
    (paperSize: PaperSize) => {
      if (draftRef.current.paperSize === paperSize) return;
      const next = { ...draftRef.current, paperSize, updatedAt: Date.now() };
      draftRef.current = next;
      setDraft(next);
      if (draftsRef.current.some((item) => item.id === next.id)) {
        dirtyRef.current = true;
        scheduleSave();
      }
    },
    [scheduleSave],
  );

  const handleStartFresh = useCallback(() => {
    if (saveTimer.current !== null) {
      window.clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    try {
      startFreshStorage();
      const blank = createBlankNotulensi();
      draftsRef.current = [];
      draftRef.current = blank;
      setDrafts([]);
      setDraft(blank);
      setActiveId(null);
      setLastSavedAt(null);
      setSaveState("idle");
      setStorageError(false);
      storageErrorRef.current = false;
      dirtyRef.current = false;
      setPendingDelete(null);
      setView("form");
      showToast({
        message: "Penyimpanan baru siap. Data lama dicadangkan di peramban.",
        tone: "success",
      });
    } catch {
      showToast({
        message: "Penyimpanan peramban tidak dapat diakses.",
        tone: "error",
        persistent: true,
      });
    }
  }, [showToast]);

  const changeView = useCallback((next: View) => {
    setView(next);
    window.scrollTo({ top: 0 });
  }, []);

  useEffect(() => {
    const title = draft.namaKegiatan.trim();
    document.title = title
      ? `Notulensi - ${title}`
      : "Notulensi Bawaslu Kota Pasuruan";
  }, [draft.namaKegiatan]);

  useEffect(() => {
    const onBeforeUnload = () => flush();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [flush]);

  const deleteTitle =
    pendingDelete?.namaKegiatan.trim() || "Notulensi tanpa judul";
  const paper = paperFor(draft.paperSize);

  return (
    <>
      <style>{`@media print { @page { size: ${paper.cssSize}; margin: 25.4mm; } }`}</style>
      <div className="app-shell">
        <AppHeader
          saveState={saveState}
          lastSavedAt={lastSavedAt}
          storageDisabled={storageError}
          draftCount={drafts.length}
          onPrint={handlePrint}
          onOpenDrafts={() => setDrawerOpen(true)}
          onNew={requestNew}
        />

        {storageError && (
          <div className="storage-banner" role="alert">
            <div className="storage-banner-inner">
              <div className="storage-banner-copy">
                <p className="storage-banner-title">
                  Data notulensi tersimpan tidak dapat dibaca.
                </p>
                <p>
                  Penyimpanan dimatikan agar data lama tidak tertimpa. Anda
                  masih bisa mengisi, mencetak, dan mengunduh dokumen.
                </p>
              </div>
              <div className="storage-banner-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => window.location.reload()}
                >
                  Muat ulang
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleStartFresh}
                >
                  Mulai penyimpanan baru
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="app-body">
          <aside className="sidebar" aria-label="Dokumen tersimpan">
            <div className="sidebar-head">
              <h2 className="sidebar-title">Dokumen tersimpan</h2>
              <p className="sidebar-count">
                {storageError
                  ? "Penyimpanan tidak tersedia"
                  : drafts.length === 0
                    ? "Belum ada dokumen"
                    : `${drafts.length} notulensi`}
              </p>
            </div>

            <button
              type="button"
              className="btn btn-secondary sidebar-new"
              onClick={requestNew}
            >
              <PlusIcon />
              Notulensi baru
            </button>

            {storageError ? (
              <div className="draft-empty">
                <p className="draft-empty-title">Daftar tidak tersedia.</p>
                <p className="draft-empty-copy">
                  Penyimpanan peramban tidak dapat dibaca. Lihat pemberitahuan
                  di atas.
                </p>
              </div>
            ) : (
              <DraftList
                drafts={drafts}
                activeId={activeId}
                onSelect={requestSelect}
                onDelete={setPendingDelete}
              />
            )}

            <p className="sidebar-note">
              {storageError
                ? "Penyimpanan tidak tersedia. Cetak atau simpan PDF untuk menyimpan hasil."
                : "Data tersimpan di peramban ini, bukan di server. Cetak atau simpan PDF untuk arsip."}
            </p>
          </aside>

          <div className="workspace">
            <WorkspaceTabs view={view} onChange={changeView} />

            <main
              className="form-pane"
              id="panel-form"
              role={isNarrow ? "tabpanel" : undefined}
              aria-labelledby={isNarrow ? "tab-form" : undefined}
              hidden={isNarrow && view !== "form"}
            >
              <NotulensiForm
                draft={draft}
                onChange={handleChange}
                onError={(message) => showToast({ message, tone: "error" })}
                nameInputRef={nameInputRef}
              />
            </main>

            <PreviewPane
              draft={draft}
              id={isNarrow ? "panel-preview" : undefined}
              labelledBy={isNarrow ? "tab-preview" : undefined}
              hidden={isNarrow && view !== "preview"}
              onPaperSizeChange={handlePaperSizeChange}
            />
          </div>
        </div>

        <div
          className="mobile-actionbar"
          role="toolbar"
          aria-label="Aksi dokumen"
        >
          <button
            type="button"
            className="btn btn-primary"
            onClick={handlePrint}
          >
            <PrinterIcon />
            Cetak / PDF
          </button>
        </div>

        <Toast toast={toast} onClose={dismissToast} />
      </div>

      <div className="print-root">
        <NotulensiDocument draft={draft} variant="print" />
      </div>

      <DraftDrawer
        open={drawerOpen}
        drafts={drafts}
        activeId={activeId}
        storageError={storageError}
        onClose={() => setDrawerOpen(false)}
        onSelect={requestSelect}
        onDelete={setPendingDelete}
        onNew={requestNew}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Hapus notulensi ini?"
        description={`"${deleteTitle}" akan dihapus dari daftar di peramban ini. Anda bisa mengurungkannya lewat pemberitahuan setelah dihapus.`}
        confirmLabel="Hapus notulensi"
        onConfirm={() => {
          if (pendingDelete) handleDelete(pendingDelete);
        }}
        onClose={() => setPendingDelete(null)}
      />
    </>
  );
}
