# Notulensi Bawaslu Kota Pasuruan

Aplikasi web untuk menyusun notulensi kegiatan Bawaslu Kota Pasuruan. Isi formulir, periksa pratinjau A4 atau F4, lalu cetak atau simpan PDF. Data tersimpan otomatis di peramban, tanpa server dan tanpa akun.

## Fitur

- Formulir bagian A sampai F mengikuti template notulensi Bawaslu Kota Pasuruan, termasuk unggah foto dokumentasi kegiatan.
- Pratinjau kertas **A4** dan **F4** yang berubah saat formulir diisi.
- Cetak atau simpan PDF lewat dialog cetak peramban dengan kop surat, logo, daftar isian, dan blok tanda tangan.
- Daftar beberapa notulensi, ganti dokumen aktif, hapus, dan urungkan hapus.
- Penyimpanan otomatis ke `localStorage` setiap ada perubahan, dengan status simpan di header.
- Tata letak desktop dan ponsel, termasuk tab Formulir/Pratinjau dan bilah aksi bawah.
- Hasil build berupa satu file `dist/index.html` yang bisa dibuka langsung tanpa server.

## Prasyarat

- Node.js 20 atau lebih baru dan npm.
- Browser modern: Chrome, Edge, Firefox, atau Safari.
- Microsoft Edge jika ingin menjalankan `npm run verify`. Path Edge diatur di `scripts/verify.mjs`.

## Menjalankan

```bash
npm install
npm run dev
```

Buka alamat yang ditampilkan Vite, biasanya `http://localhost:5173`.

Build produksi:

```bash
npm run build
npm run preview
```

`npm run build` menghasilkan `dist/index.html` sebagai satu file. Semua CSS, JavaScript, font, dan logo sudah tertanam di dalamnya. File itu bisa dibuka langsung dengan klik dua kali, tanpa server.

## Cara memakai

1. Klik **Notulensi baru** di sidebar, atau tombol **+** di ponsel.
2. Isi bagian A (agenda), B (peserta), C (pokok pembahasan), D (tindak lanjut), E (dokumentasi kegiatan / foto), dan F (tanda tangan).
3. Perubahan tersimpan otomatis di peramban ini dan langsung masuk ke daftar **Dokumen tersimpan**.
4. Periksa hasilnya di panel **Pratinjau dokumen** dan pilih ukuran kertas **A4** atau **F4**. Di ponsel, buka tab **Pratinjau**.
5. Klik **Cetak / PDF** untuk membuka dialog cetak peramban, lalu pilih **Save as PDF** atau **Microsoft Print to PDF**.
6. Untuk arsip, simpan file PDF. Data di peramban bisa terhapus jika data situs dibersihkan.

Catatan pengisian:

- Hari pada **Hari/Tanggal** dihitung otomatis dari tanggal yang dipilih.
- Satu baris pada **Pembahasan rapat** dan **Keputusan dan tindak lanjut** menjadi satu baris dokumen. Baris yang diawali angka atau tanda hubung dirapikan sebagai daftar.
- Baris peserta yang kosong tidak ditampilkan. Jika semua kosong, dokumen menampilkan tiga baris titik-titik.
- Kolom yang kosong tetap tampil sebagai titik-titik di dokumen, sehingga formulir cetak masih bisa diisi manual.
- Tanggal dan blok tanda tangan dijaga agar tetap berada di halaman yang sama. Jika halaman pertama sudah penuh, keduanya pindah ke halaman berikutnya.

## Penyimpanan data

- Kunci utama: `notulensi-bawaslu-v1`.
- Kunci cadangan: `notulensi-bawaslu-v1-cadangan`.
- Notulensi baru masuk daftar setelah perubahan pertama, lalu setiap perubahan berikutnya disimpan otomatis sekitar 450 ms setelah mengetik.
- Perubahan juga disimpan saat berpindah dokumen, mencetak, menutup halaman, atau menyembunyikan tab.
- Status di header menunjukkan **Menyimpan...**, **Tersimpan**, **Belum tersimpan**, atau **Gagal menyimpan**.
- Mengubah ukuran kertas pada draft baru yang belum punya isian tidak membuat draft kosong. Perubahan kertas ikut tersimpan setelah ada isian lain atau saat draft sudah tersimpan.
- Data terikat pada browser dan alamat tempat aplikasi dibuka. Membuka `dist/index.html` dari lokasi file yang berbeda dapat memakai penyimpanan yang berbeda. Untuk pemakaian rutin, gunakan alamat dev atau preview yang tetap.
- Jika data tersimpan rusak, aplikasi menampilkan pemberitahuan, mematikan penyimpanan agar data lama tidak tertimpa, dan menyediakan tombol **Mulai penyimpanan baru**. Data lama disalin ke kunci cadangan sebelum kunci utama dibersihkan. Jika pencadangan gagal, reset dibatalkan dan data lama tetap utuh.
- Mode privat atau pengaturan browser yang memblokir penyimpanan dapat membuat penyimpanan tidak tersedia. Dokumen tetap bisa diisi, diunduh, dan dicetak.

## Cetak dan PDF

Klik **Cetak / PDF**, lalu pilih **Save as PDF** atau **Microsoft Print to PDF**. Ukuran kertas mengikuti pilihan **A4** (210 × 297 mm) atau **F4** (215 × 330 mm) di toolbar pratinjau dengan margin 25,4 mm. Matikan header/footer browser agar hanya dokumen yang tercetak, tanpa tombol dan panel aplikasi.

Template asli berukuran Letter. Aplikasi menyediakan A4 dan F4 karena ukuran itu yang dipakai untuk arsip dinas di Indonesia. Teks, urutan bagian, dan blok tanda tangan tetap mengikuti template.

## Verifikasi

```bash
npm run verify
```

Perintah ini membangun aplikasi, menjalankan server pratinjau sementara, lalu menguji `dist/index.html` di Microsoft Edge headless. Pemeriksaan mencakup autosave, muat ulang, ganti dokumen, hapus dan urungkan, Escape pada dialog, urutan Tab dan fokus keyboard, PDF A4 dan F4 dengan tanda tangan utuh, tombol cetak, pengujian ponsel 390 px tanpa overflow, tab dan drawer ponsel, data rusak, serta kegagalan tulis penyimpanan. Tangkapan layar dan PDF hasil uji ditulis ke folder `shots/`.

Jika Edge tidak ada di `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`, ubah konstanta `EDGE` di bagian atas `scripts/verify.mjs`.

## Struktur proyek

```text
src/
  App.tsx                      keadaan aplikasi, autosave, cetak PDF
  types.ts                     definisi tipe dokumen, ukuran kertas, status
  components/
    AppHeader.tsx              header, status simpan, tombol Cetak / PDF
    NotulensiForm.tsx          formulir bagian A sampai F dan unggah foto
    NotulensiDocument.tsx      markup dokumen untuk pratinjau dan cetak
    PreviewPane.tsx            panel pratinjau, pilih A4/F4, dan skala
    DraftList.tsx              daftar dokumen di sidebar
    DraftDrawer.tsx            daftar dokumen di ponsel
    ConfirmDialog.tsx          dialog konfirmasi hapus
    Toast.tsx                  pemberitahuan dan urungkan
    WorkspaceTabs.tsx          tab Formulir/Pratinjau
    Icons.tsx                  ikon SVG untuk aksi
  lib/
    image.ts                   kompresi foto dokumentasi di peramban
    paper.ts                   definisi ukuran kertas A4 dan F4
    storage.ts                 baca/tulis localStorage dan pemulihan
    date.ts                    format tanggal Indonesia
  styles.css                   tampilan aplikasi, dokumen, cetak, responsif
scripts/
  verify.mjs                   uji end-to-end
  pdf-shots.mjs                render halaman PDF ke PNG
  pdf-text.mjs                 ekstraksi teks dan posisi dari PDF
```

## Catatan teknis

- React 19, TypeScript, dan Vite.
- `vite-plugin-singlefile` untuk build satu file.
- Font UI: Public Sans dan Source Serif 4. Dokumen memakai Arial agar sama dengan template.
- Tidak ada backend, analitik, atau permintaan jaringan saat aplikasi dipakai.
