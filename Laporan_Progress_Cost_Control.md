# Laporan Progress Pengembangan Aplikasi Cost Control

**Tanggal:** 24 Februari 2026

---

## 1. Ringkasan Modul yang Telah Diselesaikan

Berikut adalah deskripsi fungsionalitas aplikasi yang telah dibangun dan diintegrasikan:

### A. Modul Otentikasi & Single Sign-On (SSO)
Sistem *login* terpusat yang dirancang untuk dapat digunakan lintas aplikasi internal perusahaan.
*   **Fungsi:** Aplikasi **Procurement, Cost Control, dan Invoice Out** akan menggunakan basis otentikasi yang ditarik dari modul ini.
*   **Implementasi:** 
    *   Mendukung masuk (*login*) menggunakan email dan kata sandi, serta integrasi via akun Google (OAuth2).
    *   Manajemen *session* tersentralisasi berbasis Token JWT dan memori Redis.
    *   Sistem pembatasan *login* gagal (*account lockout*) untuk keamanan dari serangan *brute force*.

### B. Modul Integrasi Master Data (Procurement)
Pondasi sistem Cost Control untuk membaca referensi harga dan material.
*   **Fungsi:** Menyediakan referensi data yang bersumber dari **Sistem Procurement** (seperti *Daftar Material*, *Klien*, dan *Vendor*).
*   **Implementasi:** Pembuatan struktur *Mock Adapter* pada *Backend*. Saat ini sistem diuji menggunakan draf data standar, dan dapat langsung ditukar (*switch*) untuk membaca API dari aplikasi Procurement setelah tersedia di kemudian hari.

### C. Modul Registri Proyek
Modul pendaftaran dan penyimpanan identitas awal proyek.
*   **Fungsi:** Perekaman informasi nilai kontrak, klien, linimasa waktu pengerjaan, dan *Addendum* (jika ada nilai penambahan/pengurangan).
*   **Implementasi:** Penyelesaian struktur *database* di *Backend* (CRUD) dan formulir interaktif di sisi *Frontend*.

### D. Modul Transaksi & Pencatatan Realisasi Biaya
Modul utama untuk membandingkan Rencana Anggaran (RAP) terhadap Pengeluaran (Realisasi).
*   **Fungsi:** Melacak rincian pengeluaran per Proyek berdasarkan Kode Item Material/Jasa, serta memantau estimasi *Cost To Go* (Sisa Biaya).
*   **Implementasi:** Pembuatan logika hitung otomatis (*auto calculation trigger*). Saat pengguna mencatat pengeluaran di dalam *Tab* Realisasi, sistem *Backend* akan langsung mengalkulasi ulang persentase "Progress (%)" dan "Sisa Anggaran" di profil agregat proyek tersebut.

---

## 2. Pemanfaatan Teknologi (Tech Stack)

Aplikasi dibangun menggunakan teknologi berikut:
*   **Frontend (Antarmuka Pengguna):** React JS (Next.js Framework), Tailwind CSS, TypeScript.
*   **Backend (Infrastruktur API):** Golang (Go Fiber Framework).
*   **Database & Penyimpanan Sesi:** PostgreSQL dan Redis.

---

## 3. Rencana Implementasi Selanjutnya

Langkah lanjutan yang akan dikembangkan:
1.  **Dashboard Utama:** Tampilan metrik *Overview* (seperti total proyek aktif, analisis kesehatan anggaran global proyek berjalan).
2.  **Pelaporan & Ekspor Format:** Fitur mengonversi atau mengunduh rangkuman data RAB dan Transaksi ke dalam bentuk format _Spreadsheet_ Excel (.xlsx) maupun PDF.
