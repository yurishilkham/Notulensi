import type { DokumentasiFoto, Notulensi } from "../types";
import { todayISO } from "./date";

const STORAGE_KEY = "notulensi-bawaslu-v1";
const BACKUP_KEY = "notulensi-bawaslu-v1-cadangan";

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `notulensi-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createBlankNotulensi(): Notulensi {
  const now = Date.now();
  const today = todayISO();
  return {
    id: createId(),
    createdAt: now,
    updatedAt: now,
    paperSize: "A4",
    namaKegiatan: "",
    tanggalKegiatan: today,
    waktu: "",
    tempat: "",
    jumlahHadir: "",
    unsurPeserta: ["", "", ""],
    pokokPembahasan: "",
    tindakLanjut: "",
    dokumentasi: [],
    kota: "Pasuruan",
    tanggalTandaTangan: today,
    namaNotulis: "",
    nip: "",
  };
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function normalizeFoto(raw: unknown): DokumentasiFoto | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  if (
    typeof item.dataUrl !== "string" ||
    !item.dataUrl.startsWith("data:image/")
  ) {
    return null;
  }
  return {
    id: typeof item.id === "string" && item.id ? item.id : createId(),
    dataUrl: item.dataUrl,
    caption: asString(item.caption),
  };
}

function normalizeDraft(raw: unknown): Notulensi | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  if (typeof item.id !== "string" || !item.id) return null;

  const unsurPeserta = Array.isArray(item.unsurPeserta)
    ? item.unsurPeserta.map((entry) => asString(entry))
    : ["", "", ""];
  const dokumentasi = Array.isArray(item.dokumentasi)
    ? item.dokumentasi
        .map(normalizeFoto)
        .filter((entry): entry is DokumentasiFoto => entry !== null)
    : [];

  const now = Date.now();
  return {
    id: item.id,
    createdAt:
      typeof item.createdAt === "number" && Number.isFinite(item.createdAt)
        ? item.createdAt
        : now,
    updatedAt:
      typeof item.updatedAt === "number" && Number.isFinite(item.updatedAt)
        ? item.updatedAt
        : now,
    paperSize: item.paperSize === "F4" ? "F4" : "A4",
    namaKegiatan: asString(item.namaKegiatan),
    tanggalKegiatan: asString(item.tanggalKegiatan),
    waktu: asString(item.waktu),
    tempat: asString(item.tempat),
    jumlahHadir: asString(item.jumlahHadir),
    unsurPeserta,
    pokokPembahasan: asString(item.pokokPembahasan),
    tindakLanjut: asString(item.tindakLanjut),
    dokumentasi,
    kota: asString(item.kota, "Pasuruan"),
    tanggalTandaTangan: asString(item.tanggalTandaTangan),
    namaNotulis: asString(item.namaNotulis),
    nip: asString(item.nip),
  };
}

export type LoadResult = {
  drafts: Notulensi[];
  error: boolean;
};

export function loadDrafts(): LoadResult {
  if (typeof localStorage === "undefined") {
    return { drafts: [], error: true };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { drafts: [], error: false };
    const parsed: unknown = JSON.parse(raw);
    let list: unknown[];

    if (Array.isArray(parsed)) {
      list = parsed;
    } else if (parsed && typeof parsed === "object") {
      const record = parsed as Record<string, unknown>;
      if (!Array.isArray(record.drafts)) return { drafts: [], error: true };
      list = record.drafts;
    } else {
      return { drafts: [], error: true };
    }

    const drafts = list.map(normalizeDraft);
    if (drafts.some((draft) => draft === null)) {
      return { drafts: [], error: true };
    }

    return {
      drafts: (drafts as Notulensi[]).sort((a, b) => b.updatedAt - a.updatedAt),
      error: false,
    };
  } catch {
    return { drafts: [], error: true };
  }
}

export function saveDrafts(drafts: Notulensi[]): void {
  const payload = JSON.stringify({ version: 1, drafts });
  localStorage.setItem(STORAGE_KEY, payload);
}

export function backupCorruptData(): void {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) localStorage.setItem(BACKUP_KEY, raw);
}

export function startFreshStorage(): void {
  backupCorruptData();
  localStorage.removeItem(STORAGE_KEY);
}

export function upsertDraft(
  drafts: Notulensi[],
  draft: Notulensi,
): Notulensi[] {
  const next = drafts.filter((item) => item.id !== draft.id);
  next.push(draft);
  return next.sort((a, b) => b.updatedAt - a.updatedAt);
}

export function sortDrafts(drafts: Notulensi[]): Notulensi[] {
  return [...drafts].sort((a, b) => b.updatedAt - a.updatedAt);
}
