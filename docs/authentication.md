# Autentikasi terpusat

Login berada di `/`. Server baru merender dashboard setelah memeriksa sesi Neon
Auth dan izin akun. LPP memakai sesi yang sama; menu **Keluar** ada di dropdown
profil pada header aplikasi. Sesi diperiksa kembali saat jendela aktif dan setiap
60 detik. Respons 401 menutup workspace. Pergantian identitas memuat ulang
halaman agar state akun sebelumnya tidak digunakan kembali. Setiap API tetap
memeriksa izin secara mandiri.

## Identitas dan izin

- `NEON_AUTH_BASE_URL`: endpoint Managed Better Auth pada cabang yang dipilih.
- `NEON_AUTH_COOKIE_SECRET`: rahasia acak minimal 32 karakter, hanya di server.
- `APP_ALLOWED_EMAILS`: daftar alamat lengkap dipisahkan koma. Jika variabel
  tidak ada, memakai `LPP_ALLOWED_EMAILS` untuk kompatibilitas. Nilai kosong menolak semua.
- Email harus terverifikasi. Pengecualian manual hanya melalui
  `APP_MANUALLY_APPROVED_ACCOUNTS`, JSON email → ID akun provider yang telah disetujui
  administrator. Jika variabel tidak ada, memakai `LPP_MANUALLY_APPROVED_ACCOUNTS`.
  Pengecualian tidak memverifikasi email dan tetap membutuhkan daftar izin.
- Semua akun internal yang disetujui saat ini memiliki izin menu yang sama.
  Pembagian Admin/Staff belum dibuat. LPP menambahkan pemeriksaan daftar izinnya
  sendiri, lalu membatasi draf dan foto berdasarkan ID pengguna dari sesi server.

Gateway aplikasi hanya meneruskan login email/password dan logout. Pendaftaran,
administrasi provider, dan pemulihan kata sandi tidak diekspos melalui proxy ini.
Pendaftaran akun baru dilakukan administrator di Neon. Pembatasan proxy tidak
mengubah konfigurasi endpoint provider; akun yang dibuat langsung di provider
tetap tidak dapat mengakses aplikasi tanpa izin internal.

Cookie ditangani SDK Neon dengan HttpOnly, Secure, dan SameSite=Lax. Tidak ada
token di localStorage. Body login dan endpoint sesi hanya mengembalikan profil
minimum; token provider tidak dikirim sebagai JSON. Pemeriksaan server menggunakan
`disableCookieCache` agar sesi yang telah dicabut tidak diterima dari cache cookie.
SDK masih memakai cookie data sesi berumur satu detik, tetapi keputusan izin
server selalu meminta sesi provider yang berlaku.

## Gateway dan rate limiter

`lib/auth/access.ts` menggabungkan pemeriksaan Origin, batas permintaan, sesi,
dan izin. Semua handler di `app/api` memakainya, termasuk Event, CCTV, fasilitas,
dan seluruh endpoint LPP. Query bisnis memakai parameter driver resmi Neon;
kesalahan internal database tidak dikirim ke browser. Respons privat memakai
`Cache-Control: private, no-store`.

Counter berada di PostgreSQL, bukan memori proses, sehingga instance Vercel
menggunakan hitungan yang sama. Kunci counter berupa HMAC, tanpa email/IP mentah.
Fungsi transaksi menangani permintaan bersamaan, menghapus counter kedaluwarsa,
dan membatasi tabel maksimal 10.000 counter. Penyimpanan tidak tersedia berarti
permintaan ditolak dengan 503, tanpa fallback yang melewati keamanan.

| Lingkup | Batas |
| --- | --- |
| Permintaan API per IP | 600 / menit |
| Permintaan API per akun | 300 / menit |
| Login per IP | 20 / 10 menit |
| Login per email | 5 / 10 menit |
| Ekspor per akun | 10 / 5 menit |
| Unggah foto per akun | 30 / 5 menit |
| Penulisan lainnya per akun | 60 / menit |

Login berhasil juga dihitung. Pelanggaran menghasilkan 429 dan `Retry-After`;
cooldown meningkat pada pelanggaran berikutnya, maksimal 15 menit. Permintaan
selama blokir tidak memperpanjang blokir. Kebijakan dibatasi juga oleh sisa
jendela hitungan. Ini proteksi aplikasi untuk trafik internal, bukan layanan
penahan DDoS atau jaminan bebas kerentanan.

Pada Vercel, alamat klien dibaca dari header platform `x-vercel-forwarded-for`.
Di luar Vercel, `APP_TRUSTED_IP_HEADER` hanya boleh menunjuk header yang ditimpa
reverse proxy tepercaya. Tanpa IP tepercaya, seluruh klien memakai satu bucket
bersama; `X-Forwarded-For` kiriman pengguna tidak langsung dipercaya.

## Menyiapkan database

Implementasi lokal menggunakan cabang pengembangan Neon yang sudah ada.
Tidak ada perubahan tabel bisnis, tabel akun provider, atau database produksi.

1. Pada cabang tujuan, buat role `app_security_runtime` dengan akses non-admin,
   dibatasi ke schema `app_security` (jangan gunakan default admin Neon CLI).
   Untuk cabang baru, administrator dapat lebih dahulu membuat schema kosong:
   `CREATE SCHEMA IF NOT EXISTS app_security;`.
2. Isi `.env.local`: `SECURITY_MIGRATION_DATABASE_URL` dengan koneksi **direct**
   owner cabang tujuan dan `SECURITY_DATABASE_URL` dengan koneksi role runtime.
3. Jalankan `pnpm security:setup`. Script memasang
   `migrations/001-app-security.sql` secara transaksional. Hak runtime hanya
   USAGE schema, DML counter, dan EXECUTE fungsi limiter. PUBLIC tidak diberi akses.
4. Simpan hanya `SECURITY_DATABASE_URL` pada runtime Vercel. Kredensial migrasi
   tidak boleh dipasang di sana atau menggunakan awalan `NEXT_PUBLIC_`.

Role limiter terpisah dari akun owner dan tidak dapat membaca tabel bisnis/auth.
Kredensial `DATABASE_URL` untuk API bisnis yang sudah ada dikelola terpisah;
gunakan role baca saja untuk tabel bisnis yang dibutuhkan pada deployment akhir.

## Operasional

- `APP_ORIGIN` harus sama persis dengan origin aplikasi HTTPS produksi dan
  terdaftar sebagai trusted origin di Neon. Mutasi tanpa Origin yang cocok ditolak.
- `APP_ACCESS_DISABLED=true` menutup akses aplikasi. `APP_SESSIONS_VALID_AFTER`
  berisi waktu ISO UTC untuk menolak semua sesi yang dibuat sebelum waktu tersebut.
  Kedua pengaturan berlaku setelah restart/redeploy, bukan tombol darurat instan.
  Pencabutan satu sesi pada provider berlaku pada pemeriksaan server berikutnya.
- Log terstruktur mencatat login dan pembatasan tanpa password, token, email,
  IP mentah, atau isi laporan. Retensi mengikuti hosting. Tidak ada pengiriman
  email/Telegram, canary token, deteksi perangkat, ataupun rotasi kunci otomatis.
- Perubahan ini tidak melakukan deployment atau mengunggah folder `private/`.
  Vercel tetap membutuhkan penyimpanan objek **privat** untuk workbook, foto,
  dan draf; lihat [panduan LPP](lpp.md). Disk lokal bukan penyimpanan persisten Vercel.

## Biaya dan batasan hosting

Implementasi menggunakan Next.js, SDK Neon, dan PostgreSQL yang sudah tersedia,
tanpa menambahkan Redis atau layanan berbayar. [Neon Free](https://neon.com/pricing)
memiliki kuota; biaya nol bergantung pada paket akun, kuota pemakaian, penyimpanan
privat, dan penyedia email yang dipilih. Tidak ada perubahan paket/tagihan dilakukan.

[Vercel Hobby](https://vercel.com/pricing) ditujukan untuk penggunaan pribadi
nonkomersial. Aplikasi internal perusahaan perlu memastikan kelayakan penggunaan;
Hobby tidak dapat diasumsikan sesuai hanya karena aplikasinya privat; lihat juga
[ketentuan paket Hobby](https://vercel.com/legal/terms). Kode ini
kompatibel dengan runtime Vercel, tetapi deployment produksi belum dilakukan.

## Verifikasi

`pnpm test:auth` memeriksa izin akun, enrollment manual, batas JSON/Origin,
header IP tepercaya, error privat, profil minimum, dan cakupan penjagaan API.
CI juga menjalankan `pnpm test:lpp`, lint, typecheck, build, dan pemeriksaan bahwa
data privat tidak masuk artefak publik. Pengujian integrasi lokal memeriksa
counter bersamaan, login/logout dan penolakan replay cookie, akses API anonim,
serta simpan/unggah/ekspor LPP. Data pengujian dan hasil ekspor tetap di `private/`.
