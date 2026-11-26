import { LOGO_DATA_URL } from "../assets/logo-data";
import { formatTanggalDokumen, formatTanggalLengkap } from "../lib/date";
import type { Notulensi } from "../types";

type Props = {
  draft: Notulensi;
  variant?: "preview" | "print";
};

function Dots({ className = "" }: { className?: string }) {
  return <span className={`doc-dots ${className}`.trim()} />;
}

function DocField({
  label,
  value,
  suffix,
  bare,
}: {
  label: string;
  value?: string;
  suffix?: string;
  bare?: boolean;
}) {
  const display = (value ?? "").trim();
  return (
    <div className={`doc-field${bare ? " doc-field--bare" : ""}`}>
      <span className="doc-field-label">{label}</span>
      <span className="doc-field-colon">:</span>
      {!bare && (
        <span className="doc-field-value">
          {display ? (
            <span>
              {display}
              {suffix}
            </span>
          ) : (
            <Dots />
          )}
        </span>
      )}
    </div>
  );
}

function bodyLines(value: string) {
  const lines = value.replace(/\r\n/g, "\n").split("\n");
  while (lines.length > 0 && lines[0].trim() === "") lines.shift();
  while (lines.length > 0 && lines[lines.length - 1].trim() === "") lines.pop();
  return lines;
}

function Body({ value }: { value: string }) {
  const lines = bodyLines(value);
  if (lines.length === 0) {
    return (
      <div className="doc-body">
        <p className="doc-body-line">
          <Dots />
        </p>
        <p className="doc-body-line">
          <Dots />
        </p>
      </div>
    );
  }

  return (
    <div className="doc-body">
      {lines.map((line, index) => {
        if (line.trim() === "") {
          return (
            <p
              className="doc-body-line doc-body-line--blank"
              key={`blank-${index}`}
            />
          );
        }
        const isList = /^\s*(\d+[.)]|[-*•])\s+/.test(line);
        return (
          <p
            className={`doc-body-line${isList ? " doc-body-line--list" : ""}`}
            key={`line-${index}`}
          >
            {line}
          </p>
        );
      })}
    </div>
  );
}

export function NotulensiDocument({ draft, variant = "preview" }: Props) {
  const entries = draft.unsurPeserta
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  const jumlah = draft.jumlahHadir.trim();
  const tanggalKegiatan = formatTanggalLengkap(draft.tanggalKegiatan);
  const tanggalTandaTangan = formatTanggalDokumen(
    draft.tanggalTandaTangan,
  );
  const nama = draft.namaNotulis.trim();
  const nip = draft.nip.trim();

  return (
    <article
      className={`doc doc--${draft.paperSize.toLowerCase()}${
        variant === "print" ? " doc--print" : ""
      }`}
      data-paper={draft.paperSize}
      aria-label="Pratinjau notulensi"
    >
      <header className="doc-letterhead">
        <img
          className="doc-logo"
          src={LOGO_DATA_URL}
          alt="Bawaslu Kota Pasuruan"
        />
        <div className="doc-address">
          <p>Jl. Untung Suropati No. 23 Kota Pasuruan</p>
          <div className="doc-address-row">
            <span className="doc-address-label">Telepon</span>
            <span className="doc-address-colon">:</span>
            <span>(0343) 6008063</span>
          </div>
          <div className="doc-address-row">
            <span className="doc-address-label">Surel</span>
            <span className="doc-address-colon">:</span>
            <span className="doc-address-link">
              set.pasuruankota@bawaslu.go.id
            </span>
          </div>
          <div className="doc-address-row">
            <span className="doc-address-label">Laman</span>
            <span className="doc-address-colon">:</span>
            <span className="doc-address-link">
              http://pasuruankota.bawaslu.go.id
            </span>
          </div>
        </div>
      </header>

      <h1 className="doc-title">
        <span>NOTULENSI KEGIATAN</span>
        <span>BAWASLU KOTA PASURUAN</span>
      </h1>

      <section className="doc-section">
        <h2 className="doc-heading">A. AGENDA KEGIATAN</h2>
        <div className="doc-fields">
          <DocField label="Nama Kegiatan" value={draft.namaKegiatan} />
          <DocField label="Hari/Tanggal" value={tanggalKegiatan} />
          <DocField label="Waktu" value={draft.waktu} />
          <DocField label="Tempat" value={draft.tempat} />
        </div>
      </section>

      <section className="doc-section">
        <h2 className="doc-heading">B. PESERTA KEGIATAN</h2>
        <div className="doc-fields">
          <DocField label="Jumlah Hadir" value={jumlah} suffix=" orang" />
          <DocField label="Unsur Peserta" bare />
        </div>
        <ol className="doc-list">
          {entries.length > 0 ? (
            entries.map((entry, index) => (
              <li key={`${entry}-${index}`}>{entry}</li>
            ))
          ) : (
            <>
              <li>
                <Dots />
              </li>
              <li>
                <Dots />
              </li>
              <li>
                <Dots />
              </li>
            </>
          )}
        </ol>
      </section>

      <section className="doc-section">
        <h2 className="doc-heading">C. POKOK PEMBAHASAN</h2>
        <Body value={draft.pokokPembahasan} />
      </section>

      <section className="doc-section">
        <h2 className="doc-heading">D. TINDAK LANJUT</h2>
        <Body value={draft.tindakLanjut} />
      </section>

      <section className="doc-section">
        <h2 className="doc-heading">E. DOKUMENTASI KEGIATAN</h2>
        {draft.dokumentasi.length > 0 ? (
          <div
            className={`doc-photos${
              draft.dokumentasi.length === 1 ? " doc-photos--single" : ""
            }`}
          >
            {draft.dokumentasi.map((photo, index) => (
              <figure className="doc-photo" key={photo.id}>
                <div className="doc-photo-frame">
                  <img
                    className="doc-photo-img"
                    src={photo.dataUrl}
                    alt={
                      photo.caption.trim() ||
                      `Dokumentasi kegiatan ${index + 1}`
                    }
                  />
                </div>
                {photo.caption.trim() && (
                  <figcaption className="doc-photo-caption">
                    {photo.caption.trim()}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        ) : (
          <div className="doc-photo-empty" aria-hidden="true" />
        )}
      </section>

      <div className="doc-signature">
        <div className="doc-signature-block">
          <p className="doc-date">
            {draft.kota.trim() || <Dots className="doc-dots--city" />},{" "}
            {tanggalTandaTangan || <Dots className="doc-dots--date" />}
          </p>
          <p className="doc-signature-role">Notulis</p>
          <div className="doc-signature-space" aria-hidden="true" />
          <p className="doc-signature-name">
            {nama || <Dots className="doc-dots--name" />}
          </p>
          <p className="doc-signature-nip">
            (NIP/NPP: {nip || <Dots className="doc-dots--nip" />})
          </p>
        </div>
      </div>
    </article>
  );
}
