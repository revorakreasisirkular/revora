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

/** Bangun object profile dari row Users sheet + agregasi. */
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
