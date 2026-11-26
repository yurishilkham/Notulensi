# DESIGN.md

## Design Read

Reading this as: alat notulensi untuk staf Bawaslu Kota Pasuruan, dengan bahasa visual dokumen resmi yang tenang, dial ENERGY 1 / RHYTHM 2 / MOTION 1.

## Arah

Aplikasi ini adalah meja kerja dokumen, bukan halaman pemasaran. Pengguna datang untuk mengisi formulir, memeriksa hasil, lalu mencetak atau menyimpan PDF. Karena itu dokumen A4/F4 menjadi titik fokus, sementara kontrol aplikasi dibuat tenang dan tidak bersaing dengan isi dokumen.

## Identitas

- Merah Bawaslu `#C41024` menjadi satu-satunya warna aksi utama: tombol Cetak / PDF, huruf bagian, garis aktif, dan penanda fokus. Warna ini diambil dari logo dan kop surat.
- Emas `#D7AA57` muncul sedikit pada garis kop dan detail logo. Perannya sebagai pengikat identitas, bukan hiasan.
- Krem `#F4F0E7` menjadi warna meja kerja, dengan kertas putih di atasnya. Kontras kertas dan meja membuat dokumen terasa seperti lembar fisik.
- Tinta `#211715` dipakai untuk teks utama. Abu hangat dipakai untuk keterangan sekunder.
- Palet inti: merah, emas, krem, ditambah netral tinta dan putih. Tidak ada gradien, glow, atau warna dekoratif lain.

## Tipografi

- Public Sans untuk antarmuka. Bentuknya netral dan tetap jelas pada ukuran kecil, cocok untuk label formulir dan status simpan.
- Source Serif 4 untuk judul bagian dan judul formulir. Serif memberi kesan dokumen resmi tanpa meniru tampilan kantor yang kaku.
- Arial untuk isi dokumen. Ini font yang sama dengan template Word, sehingga pratinjau dan hasil ekspor tidak berubah bentuk.

## Susunan

- Desktop memakai tiga kolom: daftar dokumen, formulir, dan pratinjau A4/F4. Urutan ini mengikuti alur kerja dari memilih dokumen, mengisi, lalu memeriksa.
- Ponsel memakai tab Formulir dan Pratinjau, dengan bilah aksi tetap di bawah. Formulir tidak dipaksa menjadi dua kolom sempit.
- Bagian formulir diberi huruf A sampai E yang sama dengan dokumen. Pengguna bisa mencocokkan isian dengan hasil cetak tanpa menghafal urutan.
- Pratinjau memakai skala otomatis agar lebar halaman pas di panel. Di layar kecil, skala berhenti di 50 persen agar teks dokumen tetap terbaca.

## Kedalaman dan gerak

- Hanya kertas pratinjau yang mendapat bayangan, untuk memisahkan lembar dari meja. Panel aplikasi memakai garis tipis, bukan bayangan.
- Gerak dibatasi pada hover, fokus, dan buka/tutup drawer dengan durasi pendek. Tidak ada animasi saat menggulir karena tidak membantu tugas mengetik.
- Sudut 4 px dipakai konsisten. Tidak ada tombol atau kartu berbentuk pil.

## Ikon

Ikon dibuat sendiri dengan garis 1,8 px: plus, tempat sampah, printer, unduh, tutup, dan centang. Semuanya menunjukkan aksi yang benar-benar ada. Tidak ada ikon hiasan, sparkle, atau ilustrasi.

## Keadaan

- Kosong: dokumen menampilkan titik-titik pada kolom yang belum diisi, dan daftar dokumen menjelaskan bahwa belum ada arsip.
- Belum tersimpan: header menampilkan **Belum tersimpan**. Draft baru belum masuk daftar sampai ada perubahan pertama.
- Menyimpan: header menampilkan **Menyimpan...** selama jeda autosave.
- Tersimpan: setelah autosave selesai, header menampilkan **Tersimpan** dengan jam.
- Gagal: header menampilkan **Gagal menyimpan** atau **Penyimpanan nonaktif**, dengan pemberitahuan dan pilihan memulai penyimpanan baru.
- Hapus: dialog konfirmasi bisa ditutup dengan Escape, dan penghapusan bisa diurungkan lewat pemberitahuan.

## Aksesibilitas

- Rasio kontras teks utama di atas 5:1 pada latar krem dan putih.
- Semua kontrol bisa dicapai dengan Tab. Fokus memakai outline 3 px, bukan outline yang dihapus.
- Target sentuh di ponsel minimal 44 px.
- Dialog dan drawer bisa ditutup dengan Escape.
- Preferensi `prefers-reduced-motion` mematikan transisi.

## Alasan dial

- ENERGY 1: aplikasi ini dipakai berulang untuk pekerjaan administratif. Ketenangan lebih penting daripada kesan spektakuler.
- RHYTHM 2: susunan tiga kolom konsisten, dengan satu perubahan nyata di ponsel berupa tab dan bilah aksi bawah.
- MOTION 1: hanya umpan balik hover, fokus, dan drawer. Tidak ada animasi masuk yang memperlambat pengisian.

## Yang sengaja tidak dipakai

- Tidak ada hero, kartu fitur, testimoni, statistik, atau ajakan pemasaran karena produk ini adalah alat kerja.
- Tidak ada mode gelap. Dokumen resmi selalu putih, dan identitas kop surat bergantung pada kertas putih serta merah Bawaslu.
- Tidak ada latar grid, pola titik, glassmorphism, atau gradien karena tidak membantu membaca dokumen.
