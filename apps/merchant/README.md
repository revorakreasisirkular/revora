# Revora Merchant PWA

Aplikasi merchant untuk scan & konfirmasi voucher pelanggan. Installable sebagai PWA.

## Setup di Vercel

1. **Add New → Project → Import** dari repo GitHub yang sama
2. Konfigurasi:
   - **Root Directory**: `apps/merchant`
   - **Framework Preset**: Other
   - **Build Command**: (kosongkan)
   - **Output Directory**: `public`
3. **Deploy**
4. Ubah project name jadi `revora-merchant` (Settings → General → Project Name) supaya domain jadi `revora-merchant.vercel.app`.

## Konfigurasi URL API

Edit `public/js/config.js` supaya menunjuk ke domain proxy API kamu:

```js
window.REVORA_API_URL = 'https://revora-api.vercel.app/api/rpc';
```

## Icon PWA

Lihat catatan yang sama di `apps/user/README.md`. Kamu bisa pakai variasi warna/logo yang berbeda untuk membedakan icon merchant vs user di layar HP kasir.

## Akun demo

Otomatis dibuat saat `initSpreadsheet()` dijalankan:
- Email: `merchant@demo.com`
- PIN: `123456`

**Segera ganti PIN** dengan mengedit kolom PIN di sheet `Merchants` (hash pakai `_hashSimple('pin_baru')` di GAS console).

## Test lokal

```bash
cd apps/merchant
vercel dev
```
