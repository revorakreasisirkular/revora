// ============================================================
//  00_Config.gs — KONSTANTA GLOBAL
// ============================================================
//  File ini hanya berisi konfigurasi. Semua file .gs lain
//  membaca dari sini. Kalau butuh ganti nilai (misal secret),
//  cukup edit di sini.
// ============================================================

// --- WAJIB DI-SET SEBELUM initSpreadsheet() ---
const SPREADSHEET_ID    = 'PASTE_SPREADSHEET_ID_DISINI';
const APP_SHARED_SECRET = 'GANTI_DENGAN_SECRET_ACAK_PANJANG_MIN_32_KARAKTER';

// --- Nilai default (boleh tidak diubah) ---
const POIN_PER_BOTOL   = 10;                          // poin per 1 botol
const ESP32_SECRET_DEF = 'REVORA_DEVICE_SECRET_2024'; // fallback jika Config kosong

// --- Voucher fixed Rp 10.000 ---
const VOUCHER_NILAI = 10000;
const VOUCHER_POIN  = 100;

// --- Nama sheet ---
const SH = {
  USERS            : 'Users',
  TRANSAKSI_BOTOL  : 'TransaksiBotol',
  TRANSAKSI_VOUCHER: 'TransaksiVoucher',
  VOUCHER_REDEEMED : 'VoucherRedeemed',
  CONFIG           : 'Config',
  DEVICES          : 'Devices',
  KARTU            : 'Kartu',
  MERCHANTS        : 'Merchants',
};
