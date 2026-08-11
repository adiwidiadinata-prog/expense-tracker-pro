# 📋 Disaster Recovery Runbook
**Expense Tracker Pro — Data Recovery Procedures**  
**Last Updated:** August 11, 2026  
**Version:** 1.0

---

## 🗓️ Backup Schedule

| Type | Frequency | Retention | Method |
|------|-----------|-----------|--------|
| Manual Export | Mingguan (Senin 02:00 WIB) | 30 hari | gcloud CLI |
| GitHub Code | Auto (setiap push) | Selamanya | GitHub |
| Firestore Rules | Auto (setiap push) | Selamanya | GitHub |

> **Catatan:** Automated Firestore backup memerlukan Blaze plan.  
> Saat ini menggunakan manual export via gcloud CLI.

---

## 📦 Backup Procedure (Manual)

### Langkah 1: Ekspor Firestore ke GCS

```bash
# 1. Login ke gcloud
gcloud auth login

# 2. Set project
gcloud config set project expense-tracker-pro-99692

# 3. Buat GCS bucket (sekali saja)
gsutil mb -l asia-southeast2 gs://expense-tracker-backup-adi/

# 4. Ekspor semua collections
gcloud firestore export gs://expense-tracker-backup-adi/backup-$(date +%Y%m%d) \
  --collection-ids=expenses,users,businesses,inviteCodes,auditLogs

# 5. Verifikasi
gsutil ls gs://expense-tracker-backup-adi/

# Expected: backup-YYYYMMDD/ folder listed
```

### Langkah 2: Verifikasi Backup

```bash
# Cek isi backup
gsutil ls gs://expense-tracker-backup-adi/backup-$(date +%Y%m%d)/

# Expected:
# gs://expense-tracker-backup-adi/backup-YYYYMMDD/all_namespaces/
# gs://expense-tracker-backup-adi/backup-YYYYMMDD/firebase-export-metadata.json
```

---

## 🚨 Skenario Disaster Recovery

### Skenario 1: Data Terhapus Tidak Sengaja
**Estimasi Recovery Time:** ~30 menit  
**Severity:** Medium

**Langkah-langkah:**
1. Identifikasi kapan data terhapus (cek Firestore `auditLogs` collection)
2. Pilih backup terakhir sebelum penghapusan:
   ```bash
   gsutil ls gs://expense-tracker-backup-adi/ | sort
   ```
3. Restore dari backup:
   ```bash
   gcloud firestore import gs://expense-tracker-backup-adi/backup-YYYYMMDD/ \
     --collection-ids=expenses
   ```
4. Verifikasi data restored di Firebase Console
5. Notifikasi user yang terdampak

---

### Skenario 2: Firebase Account Compromise
**Estimasi Recovery Time:** ~2 jam  
**Severity:** CRITICAL

**Langkah-langkah:**
1. **Segera** — Revoke semua API keys di Google Cloud Console
2. **Segera** — Disable Authentication users yang mencurigakan
3. Ubah Firebase App password dan semua credentials
4. Review audit logs untuk mengetahui data yang terekspos
5. Identifikasi backup terakhir yang bersih
6. Buat Firebase project baru jika perlu
7. Restore dari backup terakhir yang bersih
8. Update konfigurasi di Vercel dengan credentials baru
9. Notifikasi semua user tentang insiden keamanan

---

### Skenario 3: Vercel Deploy Gagal / Site Down
**Estimasi Recovery Time:** ~15 menit  
**Severity:** High

**Langkah-langkah:**
1. Cek Vercel dashboard: https://vercel.com/dashboard
2. Lihat deployment logs untuk error
3. Jika deploy terbaru bermasalah:
   ```
   Vercel Dashboard → Project → Deployments
   → Klik deployment sebelumnya → "Promote to Production"
   ```
4. Atau rollback via git:
   ```bash
   git revert HEAD
   git push origin main
   ```
5. Monitor: https://expense-tracker-pro-h4ru.vercel.app

---

### Skenario 4: Database Corruption
**Estimasi Recovery Time:** ~2-3 jam  
**Severity:** CRITICAL

**Langkah-langkah:**
1. Aktifkan mode read-only (update Firestore Rules sementara):
   ```
   // Sementara set semua ke read-only
   allow read: if isAuthenticated();
   allow write: if false;
   ```
2. Deploy rules restrictive tersebut segera
3. Verifikasi backup integrity:
   ```bash
   gsutil cat gs://expense-tracker-backup-adi/backup-YYYYMMDD/firebase-export-metadata.json
   ```
4. Restore dari backup terbaru yang valid
5. Jalankan data validation tests
6. Aktifkan kembali write access secara bertahap
7. Monitor selama 24 jam setelah restore

---

## ✅ Post-Recovery Checklist

Setelah restore dari backup, verifikasi:

- [ ] Collections `users`, `expenses`, `businesses`, `inviteCodes` ada
- [ ] Security rules masih aktif dan benar
- [ ] App Check masih aktif (reCAPTCHA)
- [ ] Semua user bisa login
- [ ] Owner bisa melihat semua expenses
- [ ] Karyawan hanya bisa melihat expenses sendiri
- [ ] Fungsi approve/reject expense bekerja
- [ ] Invite code flow bekerja
- [ ] Error tracking berjalan (cek Firestore `errors` collection)
- [ ] Vercel deployment green ✅

---

## 📞 Kontak Emergency

| Role | Kontak |
|------|--------|
| Project Owner | adiwidiadinata@gmail.com |
| Firebase Support | https://firebase.google.com/support |
| Vercel Support | https://vercel.com/support |
| Google Cloud | https://cloud.google.com/support |

---

## 🔗 Link Penting

| Resource | URL |
|----------|-----|
| Firebase Console | https://console.firebase.google.com/project/expense-tracker-pro-99692 |
| Vercel Dashboard | https://vercel.com/dashboard |
| GitHub Repo | https://github.com/adiwidiadinata-prog/expense-tracker-pro |
| Live App | https://expense-tracker-pro-h4ru.vercel.app |
| GCS Backup Bucket | gs://expense-tracker-backup-adi/ |

---

## 📅 Recovery Testing Schedule

| Bulan | Test Type | Hasil |
|-------|-----------|-------|
| Agustus 2026 | Tabletop Exercise | ⏳ |
| September 2026 | Manual Restore Test | ⏳ |
| Oktober 2026 | Full DR Drill | ⏳ |

> **Rekomendasi:** Lakukan restore test setiap 3 bulan ke test database untuk memastikan prosedur tetap valid.
