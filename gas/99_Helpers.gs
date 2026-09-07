// ============================================================
//  99_Helpers.gs — PRIVATE HELPERS
// ============================================================
//  Fungsi-fungsi utility yang dipakai oleh handler lain.
//  Nama diawali underscore untuk menandakan "internal".
// ============================================================

/** Generate UserID baru — pola: USR-000001, USR-000002, dst. */
function _generateUserID(sh) {
  const lastRow = sh.getLastRow();
  return 'USR-' + String(lastRow).padStart(6, '0');
}

/** Generate TransactionID pakai timestamp presisi milidetik. */
function _generateTrxID() {
  const ts = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyyMMddHHmmssSSS');
  return 'TRX-' + ts;
}

/** Hash string sederhana (untuk PIN — bukan kriptografis kuat, tapi cukup
 *  untuk mencegah PIN plaintext tersimpan di sheet). */
function _hashSimple(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return 'H' + Math.abs(hash).toString(16).toUpperCase();
}

/** Normalisasi nomor HP Indonesia ke format kanonik: 628xxxxxxxxx.
 *
 *  Contoh input → output:
 *    "081234567890"       → "6281234567890"
 *    "+6281234567890"     → "6281234567890"
 *    "6281234567890"      → "6281234567890"
 *    "+62 812-3456-7890"  → "6281234567890"
 *    "0812 3456 7890"     → "6281234567890"
 *
 *  Return null kalau format tidak valid (bukan HP Indonesia
 *  atau panjang di luar 10-13 digit setelah 62).
 */
function _normalizeHP(input) {
  if (!input) return null;
  // 1. Buang semua karakter non-digit (spasi, +, -, dst)
  let digits = String(input).replace(/\D/g, '');
  if (!digits) return null;

  // 2. Samakan awalan ke "62"
  if (digits.startsWith('0')) {
    // 08xxx → 628xxx
    digits = '62' + digits.substring(1);
  } else if (digits.startsWith('62')) {
    // sudah 62xxx, biarkan
  } else if (digits.startsWith('8')) {
    // 8xxx (input tanpa awalan) → 628xxx
    digits = '62' + digits;
  } else {
    // format tidak dikenal
    return null;
  }

  // 3. Validasi panjang: 62 + 8 + 8..11 digit sisa = 11..14 total digit
  //    (Sesuai spec: user mau 10-13 digit dari "081234567890" perspective,
  //    yang setara dengan 62 + 8xxxxxxxx = 11-13 digit total.)
  if (digits.length < 11 || digits.length > 14) return null;

  // 4. Pastikan awalan 628 (nomor HP Indonesia)
  if (!digits.startsWith('628')) return null;

  return digits;
}

/** Cari user berdasarkan HP (normalized). */
function _findUserByHP(hpNormalized) {
  if (!hpNormalized) return null;
  const ss   = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh   = ss.getSheetByName(SH.USERS);
  const rows = sh.getDataRange().getValues();
  // Kolom Users: UserID | Nama | Email | HP | Alamat | PIN | Tgl Daftar
  //             [0]      [1]    [2]     [3]  [4]      [5]   [6]
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][3]) === hpNormalized) return rows[i];
  }
  return null;
}

/** Resolver umum: cari user dari request `data`, prioritas hp > email > user_id.
 *  Return row Users, atau null kalau tidak ketemu.
 *
 *  Dipakai oleh semua handler yang butuh "siapa user-nya" — supaya frontend
 *  bisa kirim `hp` (utama) atau `email` (fallback) tanpa handler harus
 *  duplikasi logika lookup. */
function _resolveUser(data) {
  const hpRaw  = (data.hp || '').trim();
  const email  = (data.email || '').trim().toLowerCase();
  const userId = (data.user_id || '').trim().toUpperCase();

  if (hpRaw) {
    const hp = _normalizeHP(hpRaw);
    if (hp) {
      const row = _findUserByHP(hp);
      if (row) return row;
    }
  }
  if (email) {
    const row = _findUserByEmail(email);
    if (row) return row;
  }
  if (userId) {
    const row = _findUser(userId);
    if (row) return row;
  }
  return null;
}

// ============================================================
//  FINDER — cari row di sheet berdasarkan kunci
// ============================================================

function _findUser(userId) {
  const ss   = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh   = ss.getSheetByName(SH.USERS);
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).toUpperCase() === userId) return rows[i];
  }
  return null;
}

function _findUserByEmail(email) {
  const ss   = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh   = ss.getSheetByName(SH.USERS);
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][2]).toLowerCase() === email) return rows[i];
  }
  return null;
}

function _findUserRowIndex(sh, userId) {
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).toUpperCase() === userId) return i + 1;
  }
  return -1;
}

function _findDevice(deviceId) {
  const ss   = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh   = ss.getSheetByName(SH.DEVICES);
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).toUpperCase() === deviceId) return rows[i];
  }
  return null;
}

function _findMerchantByEmail(email) {
  const ss   = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh   = ss.getSheetByName(SH.MERCHANTS);
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][2]).toLowerCase() === email) return rows[i];
  }
  return null;
}

function _findVoucherByKode(kode) {
  const ss   = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh   = ss.getSheetByName(SH.VOUCHER_REDEEMED);
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).toUpperCase() === kode)
      return { data: rows[i], rowIndex: i + 1 };
  }
  return null;
}

// ============================================================
//  AGGREGASI — hitung total poin/botol dari transaksi mentah
// ============================================================

/** Hitung total poin & total botol untuk 1 user dengan agregasi:
 *  total_botol = SUM(TransaksiBotol.Jumlah Botol untuk userId)
 *  total_poin  = SUM(TransaksiBotol.Poin untuk userId)
 *              + SUM(TransaksiVoucher.Poin untuk userId)    ← REDEEM sudah negatif
 *
 *  Menghitung ini setiap kali dibutuhkan mencegah desinkronisasi
 *  antara "poin tersimpan" vs "poin sebenarnya dari transaksi". */
function _hitungTotalUser(userId) {
  const ss   = SpreadsheetApp.openById(SPREADSHEET_ID);
  const shTB = ss.getSheetByName(SH.TRANSAKSI_BOTOL);
  const shTV = ss.getSheetByName(SH.TRANSAKSI_VOUCHER);

  let totalBotol = 0;
  let totalPoin  = 0;

  const tbRows = shTB.getDataRange().getValues();
  for (let i = 1; i < tbRows.length; i++) {
    if (String(tbRows[i][1]).toUpperCase() === userId) {
      totalBotol += Number(tbRows[i][3]) || 0;
      totalPoin  += Number(tbRows[i][4]) || 0;
    }
  }

  const tvRows = shTV.getDataRange().getValues();
  for (let i = 1; i < tvRows.length; i++) {
    if (String(tvRows[i][1]).toUpperCase() === userId) {
      totalPoin += Number(tvRows[i][4]) || 0; // sudah negatif untuk REDEEM
    }
  }

  return { poin: totalPoin, botol: totalBotol };
}

/** Bangun object profile dari row Users sheet + agregasi.
 *  Field `hp` adalah nomor kanonik (628xxx) — identifier utama.
 *  Field `email` tetap ada sebagai backup identifier. */
function _buildProfile(row) {
  // Kolom Users: UserID | Nama | Email | HP | Alamat | PIN | Tgl Daftar
  const totals = _hitungTotalUser(row[0]);
  return {
    user_id    : row[0],
    nama       : row[1],
    email      : row[2],
    hp         : row[3],
    alamat     : row[4],
    total_poin : totals.poin,
    total_botol: totals.botol,
    tgl_daftar : row[6] instanceof Date ? row[6].toISOString() : row[6],
  };
}

/** Baca semua key-value dari sheet Config jadi object. */
function _getConfig() {
  const ss   = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh   = ss.getSheetByName(SH.CONFIG);
  const rows = sh.getDataRange().getValues();
  const cfg  = {};
  for (let i = 1; i < rows.length; i++) cfg[rows[i][0]] = rows[i][1];
  if (!cfg.ESP32_SECRET) cfg.ESP32_SECRET = ESP32_SECRET_DEF;
  return cfg;
}
