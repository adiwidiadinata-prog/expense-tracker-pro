# 📘 Dokumentasi Lengkap Expense Tracker PWA

> **Versi:** Pro Ultimate Edition  
> **Tanggal:** 2 Agustus 2026  
> **Status:** Production Ready

---

## 📑 Daftar Isi

1. [Ringkasan Proyek](#1-ringkasan-proyek)
2. [Riset & Analisis Kebutuhan](#2-riset--analisis-kebutuhan)
3. [Wireframe & Flow](#3-wireframe--flow)
4. [Database & Arsitektur](#4-database--arsitektur)
5. [Struktur Folder](#5-struktur-folder)
6. [Cloud Function](#6-cloud-function)
7. [Aplikasi Lengkap](#7-aplikasi-lengkap)
8. [Fitur PRO](#8-fitur-pro)
9. [Panduan Deploy](#9-panduan-deploy)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Ringkasan Proyek

### Masalah
Menyusun laporan pengeluaran operasional manual dan lama.

### Solusi
Aplikasi PWA (Progressive Web App) berbasis web gratis untuk:
- **Karyawan:** Input pengeluaran via foto struk
- **Owner:** Approval, dashboard, laporan terintegrasi

### Target Pengguna
- Owner/Manager
- Karyawan (input reimburse)

### Platform
- iOS (Safari)
- Android (Chrome)
- Desktop (Browser)

### Tech Stack
| Layer | Teknologi |
|-------|-----------|
| Frontend | HTML5 + Tailwind CSS (CDN) + Vanilla JS |
| Backend | Firebase (Serverless) |
| Database | Firestore (NoSQL realtime) |
| Storage | Firebase Storage (foto struk) |
| Auth | Firebase Auth (Email/Google + WebAuthn Biometric) |
| OCR | Tesseract.js (baca nominal struk) |
| Charts | Chart.js (visualisasi data) |
| PDF | jsPDF + AutoTable (export laporan) |
| Notif | Firebase Cloud Messaging |

---

## 2. Riset & Analisis Kebutuhan

### Aplikasi Serupa (Gratis)
| Aplikasi | Web+Mobile | Gratis | Catatan |
|----------|-----------|--------|---------|
| Google Sheets + Form | ✅ | ✅ | Manual |
| Notion | ✅ | ✅ (Free tier) | Butuh setup |
| Airtable | ✅ | ✅ (Free tier) | Limit baris |
| Baserow | ✅ | ✅ | Open source |
| Wave Accounting | ✅ | ✅ | Khusus keuangan |
| Zoho Expense | ✅ | ✅ (Free tier) | Limit user |

### Keputusan Tech Stack
| Komponen | Pilihan | Kenapa |
|----------|---------|--------|
| Frontend | PWA | Satu kode, semua platform |
| Framework | Vanilla JS | Ringan, cepat |
| Backend | Firebase | Gratis, realtime, no server |
| OCR | Tesseract.js | Gratis, client-side |
| Hosting | Firebase Hosting | Gratis, HTTPS |

---

## 3. Wireframe & Flow

### Flow Karyawan
```
Login → Foto Struk → Input Nominal (Auto OCR) 
→ Foto Tersimpan → Masuk Laporan Reimburse 
→ Akumulasi per Bulan
```

### Flow Owner
```
Login → Dashboard → Foto Struk (juga bisa input)
→ Input Nominal → Approval Reimburse Karyawan
→ Laporan Total Terintegrasi (Owner + Reimburse)
→ Akumulasi per Bulan
```

### Perbedaan Kunci
| Aspek | Karyawan | Owner |
|-------|----------|-------|
| Input pengeluaran | ✅ Bisa | ✅ Bisa |
| Approval | Butuh approve owner | Auto-approved |
| Lihat data | Hanya data sendiri | Semua data |
| Laporan total | Hanya reimburse pribadi | Owner + Reimburse |

---

## 4. Database & Arsitektur

### Struktur Firestore

#### Collection: `users`
```javascript
{
  uid: "budi_123",           // Firebase Auth ID
  name: "Budi Santoso",
  email: "budi@email.com",
  role: "karyawan",          // 'karyawan' | 'owner'
  createdAt: Timestamp,
  photoURL: "https://..."    // opsional
}
```

#### Collection: `expenses`
```javascript
{
  expenseId: "exp_001",
  userId: "budi_123",        // Ref ke users/
  amount: 50000,             // Nominal Rupiah
  category: "Makan & Minum",
  note: "Makan siang meeting",
  photoURL: "gs://.../receipts/budi_123/exp_001.jpg",
  type: "reimburse",         // 'owner' | 'reimburse'
  status: "pending",         // 'pending' | 'approved' | 'rejected'
  approvedBy: null,          // userId owner yang approve
  createdAt: Timestamp,
  month: "2026-08",          // untuk query bulanan
  year: 2026,
  businessId: "biz_1"        // untuk multi-bisnis
}
```

#### Collection: `monthly_summaries`
```javascript
{
  monthId: "2026-08",
  year: 2026,
  month: 8,
  ownerTotal: 1200000,       // Total pengeluaran owner
  reimburseTotal: 800000,    // Total reimburse approved
  grandTotal: 2000000,       // ownerTotal + reimburseTotal
  totalItems: 15,
  updatedAt: Timestamp
}
```

#### Collection: `businesses` (Multi-Bisnis)
```javascript
{
  businessId: "biz_1",
  name: "Kantor Pusat",
  address: "Jl. Sudirman No. 1",
  ownerId: "owner_001",
  createdAt: Timestamp
}
```

### Arsitektur Sistem
```
📱 PWA Client (iOS/Android/Desktop)
    ↓ HTTPS
🔥 Firebase Platform
    ├─ 🔐 Auth (Email/Google/Biometric)
    ├─ 🗄️ Firestore (Database realtime)
    ├─ ☁️ Storage (Foto struk)
    ├─ 🌐 Hosting (Deploy PWA)
    ├─ ⚡ Cloud Functions (Hitung akumulasi)
    └─ 🔔 Cloud Messaging (Push notif)
    ↓ Realtime Sync
📊 Dashboard update otomatis
```

---

## 5. Struktur Folder

```
expense-tracker-pwa/
├── index.html                  # Entry point PWA
├── manifest.json               # PWA config
├── sw.js                       # Service Worker
├── firebase-config.js          # API keys & init
│
├── css/
│   └── style.css               # Tailwind CDN + custom
│
├── js/
│   ├── auth.js                 # Login/logout, cek role
│   ├── camera.js               # Akses kamera, capture
│   ├── ocr.js                  # Tesseract.js scan struk
│   ├── expense.js              # CRUD pengeluaran
│   ├── dashboard.js            # Dashboard owner
│   ├── chart.js                # Chart.js visualisasi
│   ├── export.js               # Export CSV/PDF
│   └── utils.js                # Format rupiah, tanggal
│
├── pages/
│   ├── login.html              # Halaman login
│   ├── karyawan.html           # Input + riwayat
│   └── owner.html              # Dashboard + approval
│
├── assets/
│   ├── icon-192.png            # Icon PWA
│   └── icon-512.png            # Icon PWA besar
│
└── functions/                  # Cloud Functions
    ├── index.js                # Entry point
    ├── calculateMonthly.js     # Trigger akumulasi
    └── package.json            # Dependencies
```

### Tech Stack (CDN-based, no build)
| Library | CDN | Fungsi |
|---------|-----|--------|
| Tailwind CSS | CDN | Styling UI |
| Firebase SDK | CDN | Auth + Firestore + Storage |
| Tesseract.js | CDN | OCR baca struk |
| Chart.js | CDN | Visualisasi grafik |
| jsPDF | CDN | Export PDF |

---

## 6. Cloud Function

### Trigger: `onExpenseChange`
**File:** `functions/index.js`

```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

exports.onExpenseChange = functions.firestore
  .document('expenses/{expenseId}')
  .onWrite(async (change, context) => {
    const expense = change.after.data();
    if (!expense) return null;

    const monthId = expense.month; // "2026-08"

    // Query semua expense bulan ini (approved)
    const snapshot = await db.collection('expenses')
      .where('month', '==', monthId)
      .where('status', '==', 'approved')
      .get();

    // Hitung total
    let ownerTotal = 0;
    let reimburseTotal = 0;
    let totalItems = 0;

    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.type === 'owner') ownerTotal += data.amount;
      else if (data.type === 'reimburse') reimburseTotal += data.amount;
      totalItems++;
    });

    // Simpan ke monthly_summaries
    const [year, month] = monthId.split('-');
    await db.collection('monthly_summaries').doc(monthId).set({
      monthId,
      year: parseInt(year),
      month: parseInt(month),
      ownerTotal,
      reimburseTotal,
      grandTotal: ownerTotal + reimburseTotal,
      totalItems,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    console.log(`✅ ${monthId}: Owner=${ownerTotal}, Reimburse=${reimburseTotal}`);
    return null;
  });
```

### Alur Trigger
```
Karyawan kirim expense (status: pending)
    ↓
Owner klik Approve (status: approved)
    ↓
Cloud Function TRIGGERED (onWrite)
    ↓
Query semua expense approved bulan ini
    ↓
Hitung: ownerTotal + reimburseTotal = grandTotal
    ↓
Simpan ke: monthly_summaries/{monthId}
    ↓
Dashboard update otomatis (realtime listener)
```

---

## 7. Aplikasi Lengkap

### Fitur Dasar
| Fitur | Karyawan | Owner |
|-------|----------|-------|
| Login (Email/Google) | ✅ | ✅ |
| Foto struk via kamera | ✅ | ✅ |
| OCR auto-detect nominal | ✅ | ✅ |
| Input kategori & catatan | ✅ | ✅ |
| Kirim pengeluaran | ✅ (pending) | ✅ (auto-approved) |
| Riwayat pengeluaran | ✅ (sendiri) | ✅ (semua) |
| Approval reimburse | — | ✅ (Approve/Reject) |
| Dashboard total | — | ✅ |
| Filter per bulan | — | ✅ |
| Export CSV | — | ✅ |

### Data Demo (10 Transaksi)
| ID | Nama | Nominal | Kategori | Bulan | Status |
|----|------|---------|----------|-------|--------|
| exp_001 | Budi | Rp 50.000 | Makan & Minum | Agustus | ⏳ Pending |
| exp_002 | Ani | Rp 30.000 | Transportasi | Agustus | ✅ Approved |
| exp_003 | Budi | Rp 20.000 | Operasional | Juli | ❌ Rejected |
| exp_004 | Pak Owner | Rp 1.200.000 | Operasional | Agustus | ✅ Approved |
| exp_005 | Pak Owner | Rp 150.000 | Pembelian Barang | Agustus | ✅ Approved |
| exp_006 | Pak Owner | Rp 800.000 | Operasional | Agustus | ✅ Approved (Cabang 2) |
| exp_007 | Budi | Rp 45.000 | Makan & Minum | Juli | ✅ Approved |
| exp_008 | Ani | Rp 25.000 | Transportasi | Juli | ✅ Approved |
| exp_009 | Pak Owner | Rp 500.000 | Operasional | Juli | ✅ Approved |
| exp_010 | Pak Owner | Rp 300.000 | Pembelian Barang | Juni | ✅ Approved |

---

## 8. Fitur PRO

### 1. 📊 Grafik & Chart (Chart.js)
**3 jenis grafik:**
- **Doughnut:** Pengeluaran per kategori
- **Line:** Trend bulanan
- **Bar:** Perbandingan Owner vs Reimburse

### 2. 🔔 Push Notification (FCM)
- Owner dapat notifikasi saat karyawan kirim expense baru
- Setup: Firebase Console → Cloud Messaging → Web Push

### 3. 🏢 Multi-Bisnis / Cabang
- Selector bisnis/cabang di dashboard
- Laporan terpisah per cabang
- Tambah cabang baru langsung dari app

### 4. 🔍 OCR Lanjutan (Tesseract.js)
Auto-detect dari foto struk:
- **Nama toko** (baris pertama teks)
- **Tanggal** (format apapun: DD/MM/YYYY, YYYY-MM-DD, dll)
- **Nominal** (angka terbesar = total)
- **Item** (baris yang mengandung harga)

### 5. 🔐 Biometric Login (WebAuthn)
- Face ID / Fingerprint
- Tanpa password di device yang sama
- Support: iOS Face ID, Android Fingerprint

### 7. ⏰ Pengingat Bulanan
- Muncul otomatis tanggal 25-31 setiap bulan
- Pesan: "Segera ajukan reimburse!"
- Dismissable (besok muncul lagi)

### 10. 📄 Export PDF (jsPDF)
- Preview modal sebelum download
- Format: Header, summary, tabel detail
- AutoTable dengan styling rapi

---

## 9. Panduan Deploy

### Langkah 1: Buat Project Firebase
1. Buka https://console.firebase.google.com
2. Klik **"Add project"** → nama: `expense-tracker-pro`
3. Disable Analytics → **Create project**

### Langkah 2: Daftarkan Web App
1. Klik icon **</>** (Web)
2. Nickname: `expense-tracker-web`
3. Copy config → paste ke aplikasi

### Langkah 3: Aktifkan Layanan
```
Authentication: Email/Password + Google
Firestore Database: Start in test mode
Storage: Start in test mode
Cloud Messaging: Enable Web Push
```

### Langkah 4: Security Rules
**Firestore Rules:**
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null && (request.auth.uid == userId || request.auth.token.role == 'owner');
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    match /expenses/{expenseId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null && (request.auth.uid == resource.data.userId || request.auth.token.role == 'owner');
      allow delete: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    match /monthly_summaries/{monthId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.token.role == 'owner';
    }
    match /businesses/{bizId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.token.role == 'owner';
    }
  }
}
```

**Storage Rules:**
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /receipts/{userId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### Langkah 5: Deploy
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

**URL:** `https://expense-tracker-pro.web.app`

---

## 10. Troubleshooting

| Masalah | Penyebab | Solusi |
|---------|----------|--------|
| OCR lambat | Download model pertama kali (~4MB) | Tunggu, akan lebih cepat selanjutnya |
| Chart kosong | Tidak ada data approved | Pastikan ada transaksi approved |
| PDF tidak jalan | jsPDF belum load | Refresh halaman |
| Biometrik tidak muncul | Device tidak support WebAuthn | Gunakan login email/password |
| Push notif tidak masuk | FCM token belum di-set | Cek permission browser |
| Data tidak realtime | Firestore offline | Cek koneksi internet |
| Config Firebase invalid | apiKey/projectId salah | Cek ulang dari Firebase Console |
| Permission denied | Security Rules belum publish | Klik "Publish" di Rules |

---

## 📊 Biaya Firebase (Free Tier)

| Layanan | Free Tier | Estimasi 10 Karyawan |
|---------|-----------|---------------------|
| Firestore | 50K read, 20K write/hari | Cukup |
| Storage | 5GB, 1GB download/hari | Cukup |
| Hosting | 1GB, 10GB transfer/bulan | Cukup |
| Auth | 50K user, 10K login/hari | Cukup |
| Functions | 125K invocations/bulan | Cukup |
| FCM | 1 juta notif/bulan | Cukup |
| **Total** | **$0** | **Skala kecil-menengah** |

---

## 🎮 Mode Demo

Klik **"🎮 Mode Demo"** di halaman login untuk:
- Coba SEMUA fitur tanpa setup Firebase
- Data tersimpan di browser (localStorage)
- OCR tetap jalan (Tesseract.js)
- Export CSV & PDF tetap bisa
- 10 data demo sudah tersedia

---

## 📱 Install ke Home Screen (PWA)

### iOS (Safari)
1. Buka web app di Safari
2. Tap **Share** → **"Add to Home Screen"**
3. Icon muncul di home screen

### Android (Chrome)
1. Buka web app di Chrome
2. Tap menu **⋮** → **"Add to Home Screen"**
3. Atau tunggu popup "Install" otomatis

---

**Dibuat dengan ❤️ menggunakan Firebase + Tesseract.js + Chart.js + jsPDF**

**Selamat menggunakan Expense Tracker PRO! 🚀**
