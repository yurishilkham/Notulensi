import { useRef, useState, type ChangeEvent, type ReactNode, type RefObject } from "react";
import { compressImageFile } from "../lib/image";
import type { DokumentasiFoto, Notulensi } from "../types";
import { ImageIcon, PlusIcon, TrashIcon } from "./Icons";

type Props = {
  draft: Notulensi;
  onChange: (patch: Partial<Notulensi>) => void;
  onError?: (message: string) => void;
  nameInputRef: RefObject<HTMLInputElement | null>;
};

function Section({
  letter,
  title,
  children,
}: {
  letter: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="form-section">
      <div className="section-head">
        <span className="section-letter" aria-hidden="true">
          {letter}.
        </span>
        <h2 className="section-title">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export function NotulensiForm({
  draft,
  onChange,
  onError,
  nameInputRef,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const latestPhotosRef = useRef(draft.dokumentasi);
  latestPhotosRef.current = draft.dokumentasi;
  const [isProcessingPhotos, setIsProcessingPhotos] = useState(false);

  const updateUnsur = (index: number, value: string) => {
    const next = [...draft.unsurPeserta];
    next[index] = value;
    onChange({ unsurPeserta: next });
  };

  const addUnsur = () => {
    onChange({ unsurPeserta: [...draft.unsurPeserta, ""] });
  };

  const removeUnsur = (index: number) => {
    onChange({
      unsurPeserta: draft.unsurPeserta.filter(
        (_, itemIndex) => itemIndex !== index,
      ),
    });
  };

  const handlePhotoFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    setIsProcessingPhotos(true);
    try {
      const added: DokumentasiFoto[] = [];
      const failed: string[] = [];

      for (const file of files) {
        try {
          added.push(await compressImageFile(file));
        } catch (error) {
          failed.push(
            error instanceof Error ? error.message : `"${file.name}" gagal dimuat.`,
          );
        }
      }

      if (added.length > 0) {
        onChange({
          dokumentasi: [...latestPhotosRef.current, ...added],
        });
      }
      if (failed.length > 0) {
        onError?.(failed[0]);
      }
    } finally {
      setIsProcessingPhotos(false);
    }
  };

  const updatePhotoCaption = (id: string, caption: string) => {
    onChange({
      dokumentasi: draft.dokumentasi.map((photo) =>
        photo.id === id ? { ...photo, caption } : photo,
      ),
    });
  };

  const removePhoto = (id: string) => {
    onChange({
      dokumentasi: draft.dokumentasi.filter((photo) => photo.id !== id),
    });
  };

  return (
    <div className="form-inner">
      <div className="form-intro">
        <h1 className="form-title">Notulensi kegiatan</h1>
        <p className="form-lead">
          Isi agenda, peserta, pembahasan, dan tindak lanjut. Pratinjau
          mengikuti isian Anda.
        </p>
      </div>

      <Section letter="A" title="Agenda kegiatan">
        <div className="field-grid">
          <div className="field field--full">
            <label className="field-label" htmlFor="nama-kegiatan">
              Nama kegiatan
            </label>
            <input
              ref={nameInputRef}
              className="input"
              id="nama-kegiatan"
              type="text"
              value={draft.namaKegiatan}
              onChange={(event) =>
                onChange({ namaKegiatan: event.target.value })
              }
              placeholder="Contoh: Rapat koordinasi pengawasan tahapan kampanye"
            />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="tanggal-kegiatan">
              Hari/Tanggal
            </label>
            <input
              className="input"
              id="tanggal-kegiatan"
              type="date"
              value={draft.tanggalKegiatan}
              onChange={(event) =>
                onChange({ tanggalKegiatan: event.target.value })
              }
              aria-describedby="tanggal-kegiatan-help"
            />
            <p className="field-help" id="tanggal-kegiatan-help">
              Nama hari diisi otomatis dari tanggal.
            </p>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="waktu-kegiatan">
              Waktu
            </label>
            <input
              className="input"
              id="waktu-kegiatan"
              type="text"
              value={draft.waktu}
              onChange={(event) => onChange({ waktu: event.target.value })}
              placeholder="09.00 - 12.00 WIB"
            />
          </div>

          <div className="field field--full">
            <label className="field-label" htmlFor="tempat-kegiatan">
              Tempat
            </label>
            <input
              className="input"
              id="tempat-kegiatan"
              type="text"
              value={draft.tempat}
              onChange={(event) => onChange({ tempat: event.target.value })}
              placeholder="Contoh: Kantor Bawaslu Kota Pasuruan"
            />
          </div>
        </div>
      </Section>

      <Section letter="B" title="Peserta kegiatan">
        <div className="field-grid">
          <div className="field">
            <label className="field-label" htmlFor="jumlah-hadir">
              Jumlah hadir
            </label>
            <div className="input-with-suffix">
              <input
                className="input"
                id="jumlah-hadir"
                type="number"
                min="0"
                inputMode="numeric"
                value={draft.jumlahHadir}
                onChange={(event) =>
                  onChange({ jumlahHadir: event.target.value })
                }
                placeholder="0"
              />
              <span className="input-suffix">orang</span>
            </div>
          </div>
        </div>

        <div className="unsur-block">
          <div className="unsur-head">
            <span className="field-label" id="unsur-label">
              Unsur peserta
            </span>
            <span className="field-help">
              Tulis satu unsur atau instansi per baris.
            </span>
          </div>

          <div className="unsur-list" role="group" aria-labelledby="unsur-label">
            {draft.unsurPeserta.map((entry, index) => (
              <div className="unsur-row" key={index}>
                <span className="unsur-number" aria-hidden="true">
                  {index + 1}.
                </span>
                <input
                  className="input"
                  type="text"
                  value={entry}
                  onChange={(event) => updateUnsur(index, event.target.value)}
                  placeholder={
                    index === 0
                      ? "Contoh: Pimpinan Bawaslu Kota Pasuruan"
                      : "Unsur peserta"
                  }
                  aria-label={`Unsur peserta ${index + 1}`}
                />
                <button
                  type="button"
                  className="icon-btn unsur-remove"
                  onClick={() => removeUnsur(index)}
                  aria-label={`Hapus unsur peserta ${index + 1}`}
                  title="Hapus baris"
                >
                  <TrashIcon size={17} />
                </button>
              </div>
            ))}
          </div>

          <button type="button" className="add-row" onClick={addUnsur}>
            <PlusIcon size={17} />
            Tambah unsur
          </button>
        </div>
      </Section>

      <Section letter="C" title="Pokok pembahasan">
        <div className="field">
          <label className="field-label" htmlFor="pokok-pembahasan">
            Pembahasan rapat
          </label>
          <textarea
            className="textarea"
            id="pokok-pembahasan"
            rows={6}
            value={draft.pokokPembahasan}
            onChange={(event) =>
              onChange({ pokokPembahasan: event.target.value })
            }
            placeholder="Tulis poin pembahasan. Satu baris untuk satu poin."
            aria-describedby="pokok-pembahasan-help"
          />
          <p className="field-help" id="pokok-pembahasan-help">
            Baris yang diawali angka atau tanda hubung akan dirapikan sebagai
            daftar.
          </p>
        </div>
      </Section>

      <Section letter="D" title="Tindak lanjut">
        <div className="field">
          <label className="field-label" htmlFor="tindak-lanjut">
            Keputusan dan tindak lanjut
          </label>
          <textarea
            className="textarea textarea--short"
            id="tindak-lanjut"
            rows={4}
            value={draft.tindakLanjut}
            onChange={(event) =>
              onChange({ tindakLanjut: event.target.value })
            }
            placeholder="Tulis keputusan atau tindak lanjut rapat."
          />
        </div>
      </Section>

      <Section letter="E" title="Dokumentasi kegiatan">
        <div className="photo-block">
          <div className="photo-controls">
            <input
              ref={fileInputRef}
              id="foto-dokumentasi"
              className="sr-only"
              type="file"
              accept="image/*"
              multiple
              aria-label="Pilih foto dokumentasi"
              onChange={handlePhotoFiles}
            />
            <button
              type="button"
              className="btn btn-secondary photo-add"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessingPhotos}
              aria-busy={isProcessingPhotos}
            >
              <ImageIcon size={17} />
              {isProcessingPhotos ? "Memproses foto..." : "Tambah foto"}
            </button>
            <p className="field-help photo-help">
              Bisa pilih lebih dari satu foto. Gambar diperkecil otomatis agar
              muat disimpan di peramban.
            </p>
          </div>

          {draft.dokumentasi.length > 0 && (
            <div
              className="photo-list"
              role="list"
              aria-label="Daftar foto dokumentasi"
            >
              {draft.dokumentasi.map((photo, index) => (
                <div className="photo-card" role="listitem" key={photo.id}>
                  <img
                    className="photo-thumb"
                    src={photo.dataUrl}
                    alt={
                      photo.caption.trim() ||
                      `Foto dokumentasi ${index + 1}`
                    }
                  />
                  <div className="photo-meta">
                    <label
                      className="field-label"
                      htmlFor={`foto-caption-${photo.id}`}
                    >
                      Keterangan foto {index + 1}
                    </label>
                    <input
                      id={`foto-caption-${photo.id}`}
                      className="input"
                      type="text"
                      value={photo.caption}
                      onChange={(event) =>
                        updatePhotoCaption(photo.id, event.target.value)
                      }
                      placeholder="Keterangan foto (opsional)"
                    />
                  </div>
                  <button
                    type="button"
                    className="icon-btn photo-remove"
                    onClick={() => removePhoto(photo.id)}
                    aria-label={`Hapus foto ${index + 1}`}
                    title="Hapus foto"
                  >
                    <TrashIcon size={17} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Section>

      <Section letter="F" title="Tanda tangan">
        <div className="field-grid">
          <div className="field">
            <label className="field-label" htmlFor="kota">
              Kota
            </label>
            <input
              className="input"
              id="kota"
              type="text"
              value={draft.kota}
              onChange={(event) => onChange({ kota: event.target.value })}
              placeholder="Pasuruan"
            />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="tanggal-tanda-tangan">
              Tanggal tanda tangan
            </label>
            <input
              className="input"
              id="tanggal-tanda-tangan"
              type="date"
              value={draft.tanggalTandaTangan}
              onChange={(event) =>
                onChange({ tanggalTandaTangan: event.target.value })
              }
            />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="nama-notulis">
              Nama notulis
            </label>
            <input
              className="input"
              id="nama-notulis"
              type="text"
              value={draft.namaNotulis}
              onChange={(event) =>
                onChange({ namaNotulis: event.target.value })
              }
              placeholder="Nama lengkap"
            />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="nip">
              NIP/NPP
            </label>
            <input
              className="input"
              id="nip"
              type="text"
              inputMode="numeric"
              value={draft.nip}
              onChange={(event) => onChange({ nip: event.target.value })}
              placeholder="Nomor induk pegawai"
              aria-describedby="nip-help"
            />
            <p className="field-help" id="nip-help">
              Boleh dikosongkan jika belum ada.
            </p>
          </div>
        </div>
      </Section>

      <p className="form-note">
        Perubahan tersimpan otomatis di peramban ini. Untuk arsip, cetak atau
        simpan sebagai PDF.
      </p>
    </div>
  );
}
