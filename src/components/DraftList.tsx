import { formatTanggalDokumen } from "../lib/date";
import type { Notulensi } from "../types";
import { TrashIcon } from "./Icons";

type Props = {
  drafts: Notulensi[];
  activeId: string | null;
  onSelect: (draft: Notulensi) => void;
  onDelete: (draft: Notulensi) => void;
};

export function DraftList({ drafts, activeId, onSelect, onDelete }: Props) {
  if (drafts.length === 0) {
    return (
      <div className="draft-empty">
        <p className="draft-empty-title">Belum ada notulensi tersimpan.</p>
        <p className="draft-empty-copy">
          Isi formulir, lalu klik Simpan untuk menambahkan notulensi ke daftar
          di peramban ini.
        </p>
      </div>
    );
  }

  return (
    <ul className="draft-list">
      {drafts.map((draft) => {
        const title = draft.namaKegiatan.trim() || "Notulensi tanpa judul";
        const date =
          formatTanggalDokumen(draft.tanggalKegiatan) || "Tanggal belum diisi";
        const active = draft.id === activeId;

        return (
          <li
            className={`draft-item${active ? " is-active" : ""}`}
            key={draft.id}
          >
            <button
              type="button"
              className="draft-select"
              onClick={() => onSelect(draft)}
              aria-current={active ? "true" : undefined}
            >
              <span className="draft-title">{title}</span>
              <span className="draft-meta">{date}</span>
            </button>
            <button
              type="button"
              className="draft-delete"
              onClick={() => onDelete(draft)}
              aria-label={`Hapus ${title}`}
              title="Hapus notulensi"
            >
              <TrashIcon size={17} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
