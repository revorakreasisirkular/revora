# Panduan Deploy Revora Bottle Save

Setup dari 0 sampai berjalan. Ikuti berurutan.

**Waktu setup:** ~30–45 menit

---

## Yang kamu butuhkan

- Akun Google (untuk Spreadsheet + Apps Script)
- Akun GitHub
- Akun Vercel (bisa login pakai GitHub, gratis)

---

## Langkah 1 — Push kode ke GitHub

```bash
cd revora
git init
git add .
git commit -m "Initial revora monorepo"
gh repo create revora --public --source=. --push
# atau kalau tidak pakai gh CLI, buat repo manual di github.com dan:
# git remote add origin git@github.com:<username>/revora.git
# git branch -M main
# git push -u origin main
```

---

## Langkah 2 — Setup Google Spreadsheet + Apps Script (backend/database)

### 2.1. Buat spreadsheet
1. Buka https://sheets.google.com → **+ Blank**
2. Beri nama: **Revora Database**
3. Salin Spreadsheet ID dari URL (bagian antara `/d/` dan `/edit`)

### 2.2. Buat Apps Script project
1. Buka https://script.google.com → **New project**
2. Beri nama project: **Revora Backend**
3. Ganti isi `Code.gs` default dengan seluruh isi file `gas/Code.gs` dari repo ini
4. **PENTING** — di baris atas file, ganti 2 konstanta:
   ```js
   const SPREADSHEET_ID    = 'ID_dari_langkah_2.1';
   const APP_SHARED_SECRET = 'string_acak_min_32_karakter_generated';
   ```
   Untuk `APP_SHARED_SECRET`, generate string acak di https://it-tools.tech/token-generator (panjang 40+ karakter, alfanumerik).
   
   **JANGAN commit file dengan secret ini terisi ke GitHub** — biarkan tetap placeholder di repo, hanya edit di editor Apps Script.

### 2.3. Inisialisasi database
1. Di editor Apps Script, dropdown fungsi (atas) → pilih **`initSpreadsheet`**
2. Klik **▶ Run** → Allow permissions saat diminta
3. Cek log → 8 sheet dibuat otomatis. Buka Spreadsheet-nya untuk verifikasi.
4. Cek sheet `Devices` — device pertama (`BIN-001`) sudah ada dengan Secret acak. Catat Secret ini — nanti dipakai untuk konfigurasi alat ESP32.

### 2.4. Deploy sebagai Web App
1. **Deploy → New deployment**
2. Klik ⚙️ → **Web app**
3. Isi:
   - Description: `Revora API v1`
   - Execute as: **Me**
   - Who has access: **Anyone**  *(wajib — proxy Vercel yang akan panggil, autentikasi via shared secret)*
4. **Deploy** → Allow
5. **Salin Web App URL** (berakhir dengan `/exec`) — kamu butuh ini di langkah 3

### 2.5. Test
Buka URL `/exec` langsung di browser. Harus muncul JSON:
```json
{ "ok": true, "service": "Revora Bottle Save API", "version": "6.0", ... }
```

---

## Langkah 3 — Deploy API Proxy ke Vercel

### 3.1. Import project
1. Login ke https://vercel.com
2. **Add New → Project**
3. Pilih repo GitHub `revora`
4. Konfigurasi:
   - **Root Directory**: klik "Edit" → pilih `apps/api`
   - **Framework Preset**: Other (biasanya auto-detect)
   - **Build Command**: kosongkan
   - **Output Directory**: kosongkan
5. **JANGAN klik Deploy dulu** — set env dulu di bawah

### 3.2. Set environment variables
Di halaman import (sebelum deploy), expand **Environment Variables**, tambah 3 variable:

| Name | Value | Contoh |
|---|---|---|
| `GAS_URL` | Web App URL dari langkah 2.4 | `https://script.google.com/macros/s/AKfyc.../exec` |
| `APP_SECRET` | **PERSIS SAMA** dengan `APP_SHARED_SECRET` di Code.gs | (string 40+ karakter yang sama) |
| `CORS_ORIGINS` | Comma-separated domain PWA | `https://revorabottlesave.vercel.app,https://revora-merchant.vercel.app` |

### 3.3. Deploy & ubah nama
1. Klik **Deploy** → tunggu selesai
2. Buka project → **Settings → General → Project Name** → ubah jadi `revora-api`
3. Vercel akan otomatis update domain jadi `revora-api.vercel.app`

### 3.4. Test
Buka https://revora-api.vercel.app/api/rpc dengan curl:
```bash
curl -X POST https://revora-api.vercel.app/api/rpc \
  -H "Content-Type: application/json" \
  -d '{"action":"login","email":"tidak-ada@test.com","pin":"000000"}'
```
Harus dapat response JSON `{"ok":false,"msg":"Email tidak terdaftar"}` — artinya proxy jalan & sampai ke GAS.

Kalau dapat `{"ok":false,"msg":"Unauthorized"}` → `APP_SECRET` di Vercel tidak cocok dengan `APP_SHARED_SECRET` di GAS.

---

## Langkah 4 — Deploy User PWA

### 4.1. Import project
1. Vercel → **Add New → Project** → pilih repo `revora` yang sama
2. Konfigurasi:
   - **Root Directory**: `apps/user`
   - **Framework Preset**: Other
   - **Build Command**: kosongkan
   - **Output Directory**: `public`
3. **Deploy**

### 4.2. Ubah nama project
Settings → General → Project Name → `revorabottlesave` → Save.
Domain otomatis jadi `revorabottlesave.vercel.app`.

### 4.3. Verifikasi config
Buka `apps/user/public/js/config.js` di repo — pastikan:
```js
window.REVORA_API_URL = 'https://revora-api.vercel.app/api/rpc';
```
Kalau salah, edit lokal, commit push → Vercel otomatis redeploy.

### 4.4. Test
Buka https://revorabottlesave.vercel.app → login page muncul. Coba daftar akun baru → cek sheet `Users` di spreadsheet, harus ada row baru.

---

## Langkah 5 — Deploy Merchant PWA

Ulangi langkah 4 dengan konfigurasi berbeda:
- **Root Directory**: `apps/merchant`
- **Output Directory**: `public`
- Project name: `revora-merchant`

Test dengan login `merchant@demo.com` / PIN `123456`.

---

## Langkah 6 — Icon PWA (opsional tapi disarankan)

Sebelum icons ada, install prompt PWA tetap muncul tapi pakai icon default browser.

Cara cepat:
1. Buka https://www.pwabuilder.com/imageGenerator
2. Upload logo brand (min 512×512)
3. Download bundle → ekstrak file:
   - `icon-192.png` → `apps/user/public/icons/` dan `apps/merchant/public/icons/`
   - `icon-512.png` → sama
   - `icon-maskable-512.png` → sama (buat versi maskable dengan safe zone 80%)
4. Commit → push → Vercel auto-redeploy

Untuk merchant, kamu bisa pakai variasi warna berbeda (misal oranye) supaya beda dari icon user.

---

## Langkah 7 — Alat ESP32 (dikerjakan tim hardware)

Alat pengumpul botol berbasis ESP32 dikerjakan tim hardware terpisah. Kasih mereka:

1. Dokumentasi API endpoint: `docs/API_ESP32.md`
2. `DEVICE_ID` + `Secret` dari sheet `Devices` (baris `BIN-001` yang dibuat otomatis saat init)
3. URL API proxy: `https://revora-api.vercel.app/api/rpc`

Kalau butuh device tambahan (untuk lokasi berbeda), tambah baris manual di sheet `Devices` dengan `DeviceID` baru (misal `BIN-002`) dan Secret acak.

Sambil menunggu alat siap, data botol tetap bisa dimasukkan manual ke sheet `TransaksiBotol` untuk testing.

---

## Update aplikasi setelah live

- **Edit HTML/CSS/JS di apps/user atau apps/merchant** → commit → push → Vercel auto-redeploy
- **Edit file `.gs`** → paste ulang ke Apps Script editor → **Deploy → Manage deployments → ✏️ → Version: New version → Deploy**
  - PENTING: setiap perubahan file `.gs` WAJIB "New version", kalau tidak endpoint lama yang tetap dipakai
  - URL `/exec` tidak berubah, jadi tidak perlu update env Vercel
- **Rotasi shared secret** (kalau curiga bocor):
  1. Generate secret baru
  2. Update `APP_SHARED_SECRET` di `gas/00_Config.gs` → Deploy new version
  3. Update `APP_SECRET` di Vercel project `revora-api` → Redeploy
  4. ESP32 tidak terpengaruh (device tidak simpan `APP_SHARED_SECRET` — cuma proxy Vercel yang tahu)

---

## Troubleshooting

### PWA tidak bisa di-install
- Cek DevTools → Application → Manifest — apakah manifest ke-load dengan benar?
- Cek DevTools → Application → Service Workers — apakah sw.js aktif?
- Icon 192 & 512 wajib ada (bisa bohongan asal file PNG valid) supaya Chrome mau tampilkan install prompt.

### Error "Unauthorized" saat panggil API
- `APP_SECRET` di Vercel harus PERSIS SAMA (case-sensitive) dengan `APP_SHARED_SECRET` di Code.gs.
- Kalau baru edit Code.gs, jangan lupa **Deploy → New version**.

### Error "Backend response tidak valid (bukan JSON)"
- Apps Script deployment mati atau URL salah. Coba buka URL `/exec` langsung di browser — harus JSON, bukan HTML login Google.
- Kalau muncul login Google, artinya deployment set "Who has access: Only myself" — ubah ke "Anyone" dan deploy new version.

### Kamera merchant tidak jalan
- Wajib HTTPS — domain `.vercel.app` sudah otomatis HTTPS jadi tidak masalah.
- Cek pengaturan browser → izin kamera untuk situs ini → Allow.
- Di iPhone: hanya Safari yang bisa akses kamera; Chrome iOS tidak bisa.

### CORS error di browser DevTools
- Domain PWA belum masuk `CORS_ORIGINS` di env Vercel API.
- Cek: DevTools → Network → klik request yang gagal → Headers → cek response header `Access-Control-Allow-Origin`.
