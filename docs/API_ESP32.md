# API Spesifikasi untuk Alat ESP32

Dokumen ini adalah **spesifikasi endpoint yang harus dipanggil ESP32** dari alat pengumpul botol Revora. Tidak ada kode ESP32 di sini — hanya spec HTTP.

## Setup awal (dari admin sistem)

Admin akan memberikan:

| Info | Contoh | Keterangan |
|---|---|---|
| **API_URL** | `https://revora-api.vercel.app/api/rpc` | Endpoint tunggal untuk semua request |
| **DEVICE_ID** | `BIN-001` | ID unik alat, hard-coded di firmware |
| **DEVICE_SECRET** | `A1B2C3D4E5F6...` | Rahasia alat, hard-coded di firmware, panjang 20 karakter |

⚠️ **DEVICE_SECRET jangan di-commit ke git repo publik.** Ini seperti password alat.

## Format umum request

Semua request:
- Method: **POST**
- URL: `API_URL`
- Content-Type: `application/json`
- Body: JSON dengan field `action` dan parameter sesuai

Semua response:
- JSON dengan minimal 2 field: `ok` (boolean) dan `msg` (string)
- HTTP status selalu 200 (error dicek dari `ok:false`)

Contoh cURL:
```bash
curl -X POST https://revora-api.vercel.app/api/rpc \
  -H "Content-Type: application/json" \
  -d '{"action":"login","hp":"081234567890","pin":"123456"}'
```

---

## Endpoint yang dipakai ESP32

Alat ESP32 hanya perlu 2 endpoint:

### 1. `login` — Validasi user

Dipanggil saat user selesai ketik HP + PIN di keypad.

**Request body:**
```json
{
  "action": "login",
  "hp": "081234567890",
  "pin": "123456"
}
```

Field `hp` boleh format bebas:
- `081234567890`
- `+6281234567890`
- `6281234567890`
- `+62 812-3456-7890`

Server akan normalize otomatis. ESP32 tidak perlu format ulang.

**Response sukses:**
```json
{
  "ok": true,
  "msg": "Login berhasil",
  "profile": {
    "user_id": "USR-000001",
    "nama": "Budi Santoso",
    "email": "budi@contoh.com",
    "hp": "6281234567890",
    "alamat": "Jl. Merdeka No.1",
    "total_poin": 350,
    "total_botol": 35,
    "tgl_daftar": "2024-01-15T10:30:00.000Z"
  }
}
```

**Response gagal (contoh):**
```json
{ "ok": false, "msg": "Nomor HP tidak terdaftar" }
{ "ok": false, "msg": "PIN salah" }
{ "ok": false, "msg": "PIN harus 6 digit angka" }
{ "ok": false, "msg": "Format nomor HP tidak valid" }
```

**Yang harus dilakukan ESP32:**
- Kalau `ok: true` → simpan `profile.user_id` di memori (buat request `input_botol` berikutnya), tampilkan `profile.nama` di layar, mulai sesi hitung botol
- Kalau `ok: false` → tampilkan `msg` di layar, minta user coba lagi

---

### 2. `input_botol` — Kirim jumlah botol setelah sesi selesai

Dipanggil saat user tekan tombol "Selesai" atau sesi timeout.

**Request body:**
```json
{
  "action": "input_botol",
  "device_id": "BIN-001",
  "secret": "A1B2C3D4E5F6...",
  "user_id": "USR-000001",
  "jumlah": 12
}
```

**Field wajib:**
- `device_id` — dari config ESP32
- `secret` — dari config ESP32 (validasi device)
- `user_id` — dari response `login` sebelumnya
- `jumlah` — total botol yang dihitung sensor selama sesi (integer, minimum 1)

**Alternatif:** kalau ESP32 belum simpan `user_id`, bisa pakai `hp` sebagai gantinya:
```json
{
  "action": "input_botol",
  "device_id": "BIN-001",
  "secret": "A1B2C3D4E5F6...",
  "hp": "6281234567890",
  "jumlah": 12
}
```
Server prioritas: `hp` > `user_id` > `email`.

**Response sukses:**
```json
{
  "ok": true,
  "msg": "12 botol berhasil dicatat",
  "poin_dapat": 120,
  "total_poin": 470,
  "total_botol": 47
}
```

- `poin_dapat` — poin dari transaksi INI saja (jumlah × 10)
- `total_poin` — total poin user setelah transaksi ini
- `total_botol` — total botol user seumur akun

**Response gagal (contoh):**
```json
{ "ok": false, "msg": "Device tidak dikenal: BIN-999" }
{ "ok": false, "msg": "Token device tidak valid" }
{ "ok": false, "msg": "Device ini dinonaktifkan" }
{ "ok": false, "msg": "User tidak ditemukan (hp/email/user_id salah)" }
{ "ok": false, "msg": "Parameter jumlah tidak valid" }
```

**Yang harus dilakukan ESP32:**
- Kalau `ok: true` → tampilkan konfirmasi: "+{poin_dapat} poin! Total {total_poin} poin" selama 3 detik
- Kalau `ok: false` → tampilkan `msg` di layar, jangan reset counter (data belum kekirim, biar admin bisa cek), beep error

---

## Error umum + solusi

| Error | Kemungkinan penyebab |
|---|---|
| `Unauthorized` | Salah proxy config di server — kontak admin |
| `Server misconfigured` | Env var `APP_SECRET` di Vercel belum di-set — kontak admin |
| `Backend response tidak valid` | Apps Script down / redeploy — kontak admin |
| Timeout / no response | ESP32 kehilangan WiFi, atau server down. Retry 3x dengan delay 2s. |
| `Device tidak dikenal` | `device_id` di firmware salah / belum ada di sheet Devices |
| `Token device tidak valid` | `secret` di firmware salah / sudah di-rotate admin |

---

## Alur end-to-end (ringkasan)

```
IDLE
  ↓ user ketik HP + PIN → tekan enter
POST {action:"login", hp, pin}
  ↓ ok:true → simpan user_id, mulai sesi
COUNTING (60 detik atau sampai tombol Selesai)
  ↓ tekan tombol Selesai / timeout
POST {action:"input_botol", device_id, secret, user_id, jumlah}
  ↓ ok:true → tampil "+{poin_dapat} poin"
IDLE
```

## Timing yang wajar

- `login` request: ~300-800ms (proxy Vercel + Apps Script)
- `input_botol` request: ~500-1500ms (Apps Script tulis ke Sheet dengan LockService)

Set HTTP timeout ESP32 ke **minimum 15 detik** untuk keamanan (Apps Script cold start bisa lambat).

## Testing

Sebelum alat live, tim ESP32 bisa test dengan:

```bash
# Test login (gunakan HP user yang sudah daftar via PWA)
curl -X POST https://revora-api.vercel.app/api/rpc \
  -H "Content-Type: application/json" \
  -d '{"action":"login","hp":"081234567890","pin":"123456"}'

# Test input botol (gunakan device_id + secret dari sheet Devices)
curl -X POST https://revora-api.vercel.app/api/rpc \
  -H "Content-Type: application/json" \
  -d '{"action":"input_botol","device_id":"BIN-001","secret":"XXX","user_id":"USR-000001","jumlah":5}'
```

Setelah test sukses, cek Spreadsheet:
- Sheet `TransaksiBotol` → ada baris baru dengan device_id `BIN-001`
- Sheet `Users` (via API `get_profile`) → total poin bertambah

---

## Kontak

Kalau ada pertanyaan tentang API atau butuh device baru, hubungi admin sistem Revora.
