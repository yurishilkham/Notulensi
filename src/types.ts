export type PaperSize = "A4" | "F4";

export type DokumentasiFoto = {
  id: string;
  dataUrl: string;
  caption: string;
};

export type Notulensi = {
  id: string;
  createdAt: number;
  updatedAt: number;
  paperSize: PaperSize;
  namaKegiatan: string;
  tanggalKegiatan: string;
  waktu: string;
  tempat: string;
  jumlahHadir: string;
  unsurPeserta: string[];
  pokokPembahasan: string;
  tindakLanjut: string;
  dokumentasi: DokumentasiFoto[];
  kota: string;
  tanggalTandaTangan: string;
  namaNotulis: string;
  nip: string;
};

export type SaveState = "idle" | "saved" | "error";

export type ToastTone = "success" | "error" | "info";

export type ToastData = {
  id: number;
  message: string;
  tone: ToastTone;
  actionLabel?: string;
  onAction?: () => void;
  persistent?: boolean;
  duration?: number;
};
