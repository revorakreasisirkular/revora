# Revora Bottle Save

Bank Sampah Botol Plastik — sistem end-to-end untuk mengumpulkan botol plastik lewat mesin/box, dapat poin, tukar voucher yang bisa dipakai di merchant partner.

## Arsitektur

```
┌───────────────────────────────────────────────────────────────┐
│                     GITHUB REPO (monorepo)                     │
│                                                                │
│  apps/                                                         │
│  ├─ user/       → PWA user       (revorabottlesave.vercel.app) │
│  ├─ merchant/   → PWA merchant   (revora-merchant.vercel.app)  │
│  └─ api/        → Vercel proxy   (revora-api.vercel.app)       │
│                                                                │
│  gas/Code.gs    → Google Apps Script (deployed manually)       │
│  raspberry_pi/  → Script Python untuk device fisik             │
└───────────────────────────────────────────────────────────────┘

Alur data:

  PWA user/merchant      Raspberry Pi
         │                    │
         ▼                    ▼
    fetch /api/rpc      POST /api/rpc (or GAS direct)
         │                    │
         ▼                    ▼
  ┌──────────────────────────────┐
  │ Vercel Serverless (api)      │  ← inject shared secret
  │ apps/api/api/rpc.js          │
  └──────────┬───────────────────┘
             ▼
       POST GAS_URL
             ▼
  ┌──────────────────────────────┐
  │ Google Apps Script (doPost)  │  ← verifikasi secret
  │ gas/Code.gs                  │
  └──────────┬───────────────────┘
             ▼
  ┌──────────────────────────────┐
  │ Google Spreadsheet (DB)      │
  └──────────────────────────────┘
```

## Panduan lengkap

Ikuti `docs/DEPLOY.md` untuk setup dari 0 sampai berjalan.

Ringkasnya:

1. **Google Spreadsheet + Apps Script** — bikin sheet, deploy `Code.gs` sebagai Web App, catat URL `/exec`, generate `APP_SHARED_SECRET`.
2. **Vercel project "api"** — deploy `apps/api`, set 3 env: `GAS_URL`, `APP_SECRET`, `CORS_ORIGINS`.
3. **Vercel project "user"** — deploy `apps/user`, ubah project name jadi `revorabottlesave`.
4. **Vercel project "merchant"** — deploy `apps/merchant`, ubah project name jadi `revora-merchant`.
5. **(Opsional) Raspberry Pi** — flash `raspberry_pi/input_device.py` dengan `DEVICE_ID` + `DEVICE_SECRET` dari sheet Devices.

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
│   └── DEPLOY.md                ← panduan setup detail
├── gas/
│   └── Code.gs                  ← paste ke Apps Script editor
├── apps/
│   ├── user/                    ← Vercel project #1
│   │   ├── public/
│   │   │   ├── index.html
│   │   │   ├── manifest.webmanifest
│   │   │   ├── sw.js
│   │   │   ├── icons/           ← isi PNG icon di sini
│   │   │   └── js/
│   │   │       ├── api.js
│   │   │       └── config.js
│   │   ├── vercel.json
│   │   ├── package.json
│   │   └── README.md
│   ├── merchant/                ← Vercel project #2
│   │   └── (struktur mirip user/)
│   └── api/                     ← Vercel project #3
│       ├── api/
│       │   └── rpc.js           ← serverless function
│       ├── vercel.json
│       ├── package.json
│       └── README.md
└── raspberry_pi/                ← untuk device fisik
    ├── input_device.py
    └── read_card_uid.py
```
