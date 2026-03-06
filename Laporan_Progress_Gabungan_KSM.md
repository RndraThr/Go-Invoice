# Update Progress Sistem KSM (Invoice Out & Cost Control)
**Tanggal:** 25 Februari 2026

Halo Bapak/Ibu, berikut ringkasan laporan buat update progres aplikasi internal KSM sejauh ini. Kita jalan barengan di dua sistem utama nih, yaitu sistem **Invoice Out** (buat ngurusin penagihan) dan **Cost Control** (buat mantau budget vs realisasi).

---

## 🛠️ BAGIAN A: SISTEM INVOICE OUT (PIC: Rendra)
*Fokusnya bikin proses penagihan ke klien jadi lebih rapi, otomatis, dan terdata dengan baik.*

### 1. Apa aja yang udah jalan?
* **Alur Invoice Udah Full Cycle**: Siklus invoice dari awal dibikin (Draft) -> minta approval (In Review) -> di-approve -> dikirim ke klien (Sent) -> sampai akhirnya lunas (Paid) udah jalan semua. Nomor invoice sama alamat/nama klien juga udah bisa diset kepisah biar rapi.
* **Integrasi Login (SSO)**: Dulu kan login-nya misah, sekarang udah digabungin jadi satu pintu (Single Sign-On). Jadi akun dan *Role* (hak akses) dari Cost Control udah otomatis nyambung ke sini.
* **Upload Lampiran Bukti**: Sekarang tiap invoice udah bisa dilampirin dokumen pendukung (kayak BAST, Timesheet, dll). Bisa di-upload dan dihapus juga kalau salah.
* **Jejak Aktivitas (Audit Trail)**: Semua perubahan status invoice udah kerekam jelas. Jadi ketahuan siapa yang ngerubah statusnya dan kapan.
* **Fitur Export & Print**: Daftar tagihan udah bisa diexport ke **Excel**. Terus, kalau butuh cetakan resmi, sistem udah bisa nge-generate PDF invoice lengkap sama kop surat dan logo KSM. Peringatan buat invoice yang telat bayar (Overdue) juga udah aktif.

### 2. Update Terbaru: Modul Kwitansi
Fitur Kwitansi baru aja dirombak biar secara bisnis lebih masuk akal:
* **Nyambung Langsung ke Invoice**: Kwitansi sekarang wajib nge-link ke invoice induknya. Jadi datanya lebih valid.
* **Halaman Sendiri & Auto-fill**: Kwitansi punya menu sendiri sekarang. Pas mau bikin, tinggal pilih nomor Invoice-nya, terus data alamat, nama klien, dan nominal tagihan bakal *auto-fill* ngikutin invoice. Ada alur approval-nya sendiri juga loh!
* **Cetak PDF KWITANSI Mandiri**: Udah bisa cetak PDF khusus buat Kwitansi, dan kerennya, nominal angkanya bakal otomatis kerubah jadi tulisan "Terbilang" (misal: "Satu Juta Rupiah") sesuai standar kwitansi fisik.

### 3. Next Step (Yang mau dikerjain selanjutnya)
* **Approval Berdasarkan Tipe PO**: Lagi nyiapin logic biar kalau PO-nya tipe "PROJECT", yang approve itu tim **Procon**. Tapi kalau "RETAIL", bakal dilempar ke **Marketing**.
* **Notif via WhatsApp**: Biar nggak ketinggalan info, nanti tiap ganti status (misal dari Draft ke In Review) bakal ada notif otomatis yang masuk ke WA tim terkait.

---

## 🛠️ BAGIAN B: SISTEM COST CONTROL (PIC: Andre)
*Fokusnya di budgeting dan mantau pengeluaran aktual dari tiap proyek.*

### 1. Apa aja yang udah jalan?
* **Sistem Login Sentral (Otentikasi & SSO)**: Nah, ini pondasi utamanya. Udah beres dibikin pakai JWT dan Redis. Login-nya lancar, bisa jembatanin Procurement, Cost Control, sampe Invoice Out. Kalo mau praktis, login pakai akun Google (OAuth2) juga udah aktif.
* **Persiapan Tarik Data Master**: Udah nyiapin "Mock Adapter" buat ngambil data dari sistem Procurement. Sekarang masih pakai data dummy buat ngetest, tapi jalurnya udah siap 100% buat langsung nembak ke API standar (kayak narik katalog harga item, klien, dan vendor).
* **Pendaftaran Proyek (Base Anggaran)**: UI dan backend buat masukin identitas proyek udah kelar. Jadi udah bisa nyatet nilai kontrak, data klien, kapan proyek mulai/selesai, sampe kalau ada Addendum perubahan nilai proyek.
* **Pencatatan Transaksi & Realisasi Biaya**: Ini modul krusialnya. User udah bisa masukin pengeluaran per item. Sistem udah otomatis ngitung secara cerdas. Jadi tiap ada *cost* yang masuk, *Sisa Anggaran (Cost To Go)* sama *Persentase Progress* proyek bakal langsung nge-update nominalnya detik itu juga.

### 2. Tech Stack yang Dipakai
Teknologi yang kita pakai barengan udah modern banget biar performanya kencang:
* **Frontend**: Next.js (React), Tailwind CSS, TypeScript.
* **Backend**: Golang (Go Fiber).
* **Database**: PostgreSQL/MySQL (buat simpan data intinya) & Redis (buat nyimpen session yang butuh akses super cepat).

### 3. Next Step (Yang mau dikerjain selanjutnya)
* **Dashboard Metrik**: Mau bikin halaman visual buat ngeliat "kesehatan" budget dari total semua proyek yang lagi jalan, biar enak diliat progress globalnya.
* **Export PDF & Excel**: Mau bikin fitur biar rincian anggaran (RAB) dan laporan realisasi pengeluarannya bisa di-download nyaman ke format PDF atau Excel buat report ke manajemen.
