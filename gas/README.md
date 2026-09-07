# Google Apps Script (Backend Database)

Backend logic untuk Revora Bottle Save. Dipecah jadi 9 file supaya
tiap file pendek dan mudah dibaca/diedit.

## Struktur file

| File | Isi | Baris |
|---|---|---|
| `00_Config.gs` | Konstanta global (SPREADSHEET_ID, secret, dll) | 31 |
| `01_Router.gs` | `doGet` + `doPost` + dispatcher | 77 |
| `02_Init.gs` | `initSpreadsheet()` (jalankan 1x saat setup) | 79 |
| `03_Auth.gs` | Register user, login user & merchant, update profil | 133 |
| `04_Botol.gs` | Terima input dari Raspberry Pi | 66 |
| `05_Voucher.gs` | Redeem, list, scan, konfirmasi voucher | 202 |
| `06_Kartu.gs` | Tautkan & identifikasi kartu RFID | 80 |
| `07_Profil.gs` | Get profil & riwayat (read-only) | 70 |
| `99_Helpers.gs` | Semua fungsi bantu (`_findX`, `_hashSimple`, dll) | 156 |

**Prefix angka** (00, 01, ..., 99) supaya file terurut di sidebar Apps Script editor —
Config di paling atas, Helpers di paling bawah, sisanya di tengah.

## Kenapa dipecah?

Di Apps Script, semua file `.gs` dalam 1 project **berbagi satu global scope**.
Artinya:
- Fungsi di `03_Auth.gs` bisa langsung panggil `_findUserByEmail` (yang ada di `99_Helpers.gs`) tanpa import
- Konstanta `SPREADSHEET_ID` di `00_Config.gs` otomatis tersedia di semua file lain

Ini membuat pemecahan file **murni untuk kerapian**, tanpa perlu ubah cara panggil fungsi antar file.

## Cara pasang ke Apps Script editor

1. Buka https://script.google.com → **New project**
2. Editor default punya 1 file `Code.gs` — **hapus** dulu (klik ⋮ → Delete)
3. Untuk tiap file di folder `gas/` ini:
   - Klik ➕ di panel kiri → **Script**
   - Beri nama **PERSIS SAMA** dengan file di sini, tapi tanpa `.gs`
     (contoh: nama file `00_Config.gs` → di editor tulis `00_Config`)
   - Paste isi filenya
4. **Wajib pertama:** buka `00_Config.gs` → ganti `SPREADSHEET_ID` dan `APP_SHARED_SECRET`
5. Jalankan `initSpreadsheet()` sekali (di `02_Init.gs`)
6. Deploy sebagai Web App

## Update kode nanti

Paste ulang **hanya file yang berubah** ke Apps Script editor, lalu:
**Deploy → Manage deployments → ✏️ → Version: New version → Deploy**

Karena file dipecah 9, saat ada perubahan (misal fix bug di voucher), kamu cukup buka `05_Voucher.gs` di editor Apps Script, paste versi baru, deploy. Tidak perlu paste seluruh 894 baris.
