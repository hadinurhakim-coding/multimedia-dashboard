# PLN Icon Plus — Multimedia Studio & 3D Digital Twin Dashboard

Production-grade enterprise multimedia, event management, and 3D spatial IoT surveillance dashboard for **PT Indonesia Comnets Plus (PLN Icon Plus)**.

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-16.4.6-black.svg)
![React](https://img.shields.io/badge/React-19.3.0-blue.svg)
![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8.svg)
![Three.js](https://img.shields.io/badge/Three.js-WebGL-black.svg)

---

## ⚡ Fitur Utama

1. **Enterprise Dashboard Shell (Light Theme)**
   - Mengikuti standar resmi Shadcn Studio Shell 7 (*pure white canvas* `#ffffff`, no dark-mode slop, tipografi tajam Roboto).
   - Sidebar navigasi presisi dengan rasio logo petir PLN 1:1 (`aspect-square`) yang tetap simetris saat diminimalkan.
   - Menu: **Dashboard**, **Event**, dan **Aktivasi**.

2. **Peta Lokasi Spatial 3D (Digital Twin Substation GI Gandul)**
   - Visualisasi fasilitas gardu induk dan lokasi kamera CCTV secara 3D presisi tinggi menggunakan Three.js WebGL.
   - **Double-Click Cursor Lock Shield**: Peta terkunci secara default agar kursor dan scrolling mouse pada halaman tidak terganggu/terjebak (*no scroll-hijack*). Navigasi 3D aktif hanya jika area peta di-double click.
   - Mekanisme pelepasan kursor cepat: tombol *Kunci Peta*, tombol keyboard `Escape`, atau klik di luar canvas.
   - Kamera otomatis *fly-to lerp interpolation* saat memilih CCTV pada tabel.

3. **Manajemen Aktivasi CCTV & Layanan Multimedia**
   - Pencatatan serial number (SN) dengan tombol satu-klik salin (*copy to clipboard*).
   - Filter status kamera (Online, Perhatian/Kalibrasi, Offline).
   - Tanggal pembelian, tanggal aktivasi, sisa garansi real-time, dan kontak darurat mitra teknis.
   - Modal detail teknis: resolusi, IP address, RTSP streaming URL, dan koordinat spatial 3D.
   - Ekspor data inventaris berformat JSON.

4. **DevOps & Docker Readiness**
   - Konfigurasi `docker-compose.yml` untuk PostgreSQL 16 (`pln_multimedia_postgres`).
   - Script inisialisasi skema dan dummy data otomatis di `docker/init-db.sql`.
   - Mudah dipindahkan dan diinstalasi di server staging/production.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16.4.6 (Turbopack, App Router)
- **UI Library**: React 19.3.0, Lucide React, Shadcn UI / Base UI
- **Styling**: Tailwind CSS v4, Font Google Roboto
- **3D Engine**: Three.js (WebGL, OrbitControls, PCFSoftShadowMap)
- **Database**: PostgreSQL 16 (Dockerized)
- **Package Manager**: pnpm (dengan keamanan `ignore-scripts=true`)

---

## 🚀 Memulai (Local Development)

### 1. Prasyarat
- Node.js 20+
- pnpm (`corepack enable pnpm` atau `npm i -g pnpm`)
- Docker & Docker Compose (opsional, untuk database PostgreSQL lokal)

### 2. Instalasi Dependensi
```bash
pnpm install
```

### 3. Menjalankan Database PostgreSQL (Docker)
```bash
# Menjalankan kontainer database PostgreSQL
docker compose up -d

# Memeriksa status kontainer
docker compose ps
```

### 4. Menjalankan Server Development
```bash
pnpm dev
```
Buka [http://localhost:3000](http://localhost:3000) pada browser Anda.

### 5. Linting & Build Produksi
```bash
# Linting kode
pnpm run lint

# Kompilasi build produksi Next.js
pnpm run build
```

---

## 📄 Lisensi

Proyek ini dilisensikan di bawah lisensi **MIT License** — lihat file [LICENSE](LICENSE) untuk detail lengkap.

**Hak Cipta (c) 2026 Hadi Nurhakim**
