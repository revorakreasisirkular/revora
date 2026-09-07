# Revora User PWA

Aplikasi user (dashboard, voucher, riwayat, profil). Installable sebagai PWA.

## Setup di Vercel

1. Login ke https://vercel.com
2. **Add New → Project → Import** dari repo GitHub yang sama
3. Konfigurasi:
   - **Root Directory**: `apps/user`
   - **Framework Preset**: Other
   - **Build Command**: (kosongkan)
   - **Output Directory**: `public`
4. **Deploy**
5. Setelah deploy pertama, ubah project name jadi `revorabottlesave` (Settings → General → Project Name) supaya domain jadi `revorabottlesave.vercel.app`.

## Konfigurasi URL API

Edit `public/js/config.js` — pastikan `REVORA_API_URL` menunjuk ke domain proxy API kamu:

```js
window.REVORA_API_URL = 'https://revora-api.vercel.app/api/rpc';
```

Kalau kamu ubah nama project API, update baris ini lalu commit + redeploy.

## Icon PWA

File icon PWA belum disertakan di repo — kamu harus buat sendiri:
- `public/icons/icon-192.png` (192×192 px)
- `public/icons/icon-512.png` (512×512 px)
- `public/icons/icon-maskable-512.png` (512×512 px, safe zone di tengah 80%)

Cara paling cepat generate: gunakan https://realfavicongenerator.net atau
https://www.pwabuilder.com/imageGenerator dari logo brand kamu.

Sebelum icon ada, PWA masih jalan tapi install prompt akan menampilkan icon default browser.

## Test lokal

```bash
npm i -g vercel
cd apps/user
vercel dev
```

Buka http://localhost:3000
