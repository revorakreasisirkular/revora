# Revora Bottle Save

Bank Sampah Botol Plastik — sistem untuk mengumpulkan botol plastik lewat alat/box, dapat poin, tukar voucher yang bisa dipakai di merchant partner.

## Arsitektur

```
┌───────────────────────────────────────────────────────────────┐
│                     GITHUB REPO (monorepo)                    │
│                                                               │
│  apps/                                                        │
│  ├─ user/       → PWA user       (revorabottlesave.vercel.app)│
│  ├─ merchant/   → PWA merchant   (revora-merchant.vercel.app) │
│  └─ api/        → Vercel proxy   (revora-api.vercel.app)      │
│                                                               │
│  gas/           → Google Apps Script (deployed manually)      │
│  docs/API_ESP32.md → dokumentasi API untuk developer ESP32    │
└───────────────────────────────────────────────────────────────┘

Alur data:

  PWA user/merchant      Alat ESP32 (di lokasi bank sampah)
         │                    │
         ▼                    ▼
    fetch /api/rpc      POST /api/rpc
         │                    │
         └──────┬─────────────┘
                ▼
  ┌──────────────────────────────┐
  │ Vercel Serverless (api)      │  ← inject shared secret
  │ apps/api/api/rpc.js          │
  └──────────┬───────────────────┘
             ▼
       POST GAS_URL
             ▼
  ┌──────────────────────────────┐
  │ Google Apps Script (doPost)  │  ← verifikasi secret
  │ gas/*.gs                     │
  └──────────┬───────────────────┘
             ▼
  ┌──────────────────────────────┐
  │ Google Spreadsheet (DB)      │
  └──────────────────────────────┘
```

## Alur singkat pengguna

1. **User** daftar akun di PWA `revorabottlesave.vercel.app` (nomor HP + PIN + email cadangan)
2. User datang ke lokasi bank sampah → alat ESP32 → ketik HP + PIN → masukkan botol → tekan Selesai
3. Poin masuk ke akun user (bisa dilihat di PWA)
4. User cukup poin → redeem voucher Rp 10.000 → dapat kode ECO-XXXXXXXX + QR
5. User bawa QR ke merchant → merchant scan pakai PWA `revora-merchant.vercel.app` → voucher hangus, user dapat barang

## Setup deploy (ringkas)

Ikuti `docs/DEPLOY.md` untuk setup dari 0 sampai berjalan.

Ringkasnya:

1. **Google Spreadsheet + Apps Script** — bikin sheet, paste 8 file `.gs`, isi `SPREADSHEET_ID` + `APP_SHARED_SECRET`, jalankan `initSpreadsheet()`, deploy sebagai Web App.
2. **Vercel project "api"** — deploy `apps/api`, set 3 env: `GAS_URL`, `APP_SECRET`, `CORS_ORIGINS`.
3. **Vercel project "user"** — deploy `apps/user`, ubah project name jadi `revorabottlesave`.
4. **Vercel project "merchant"** — deploy `apps/merchant`, ubah project name jadi `revora-merchant`.
5. **Alat ESP32** — dikerjakan tim hardware. Kasih mereka `docs/API_ESP32.md` sebagai spesifikasi endpoint.

## Domain final

- User PWA: https://revorabottlesave.vercel.app
- Merchant PWA: https://revora-merchant.vercel.app
- API proxy: https://revora-api.vercel.app/api/rpc
- Backend/DB: Google Apps Script + Spreadsheet

## Akun demo

Setelah `initSpreadsheet()` dijalankan:
- **Merchant demo**: `merchant@demo.com` / PIN `123456` (segera ganti)
- User: daftar sendiri lewat PWA user

## Struktur folder

```
revora/
├── README.md                    ← ini
├── .gitignore
├── docs/
│   ├── DEPLOY.md                ← panduan setup detail
│   └── API_ESP32.md             ← spec API untuk developer ESP32
├── gas/
│   ├── 00_Config.gs             ← konstanta (secret, sheet name)
│   ├── 01_Router.gs             ← doGet/doPost + dispatcher
│   ├── 02_Init.gs               ← initSpreadsheet()
│   ├── 03_Auth.gs               ← register/login (HP+PIN), merchant login
│   ├── 04_Botol.gs              ← input dari alat ESP32
│   ├── 05_Voucher.gs            ← redeem/scan/konfirmasi voucher
│   ├── 07_Profil.gs             ← get profil & riwayat
│   ├── 99_Helpers.gs            ← private helpers (normalizer, hash, dll)
│   └── README.md
└── apps/
    ├── user/                    ← Vercel project #1
    ├── merchant/                ← Vercel project #2
    └── api/                     ← Vercel project #3 (proxy)
```
