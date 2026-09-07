# Revora API Proxy

Vercel serverless function yang meneruskan request dari PWA ke Google Apps Script.

## Setup di Vercel

1. Login ke https://vercel.com
2. **Add New → Project → Import** dari repo GitHub
3. Konfigurasi:
   - **Root Directory**: `apps/api`
   - **Framework Preset**: Other
   - **Build Command**: (kosongkan)
   - **Output Directory**: (kosongkan)
4. **Environment Variables** — set 3 ini:
   - `GAS_URL` = Web App URL dari Apps Script (yang berakhir `/exec`)
   - `APP_SECRET` = string acak panjang minimal 32 karakter (harus SAMA persis dengan `APP_SHARED_SECRET` di Code.gs)
   - `CORS_ORIGINS` = `https://revorabottlesave.vercel.app,https://revora-merchant.vercel.app`
5. **Deploy**
6. Setelah deploy, project name di Vercel harus `revora-api` supaya domain jadi `revora-api.vercel.app`. Kalau tidak, ubah lewat Settings → General → Project Name.

## Endpoint

Hanya satu endpoint:

```
POST https://revora-api.vercel.app/api/rpc
Content-Type: application/json

{ "action": "login", "email": "user@contoh.com", "pin": "123456" }
```

Response passthrough dari Apps Script (JSON).

## Test lokal

```bash
npm i -g vercel
cd apps/api
vercel dev
# Kunjungi http://localhost:3000/api/rpc dengan POST
```

Untuk test lokal, kamu bisa buat file `.env.local` (jangan di-commit):

```
GAS_URL=https://script.google.com/macros/s/xxxxx/exec
APP_SECRET=isi-secret-testing
CORS_ORIGINS=http://localhost:3000
```
