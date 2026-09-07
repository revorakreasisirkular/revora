// ============================================================
//  07_Profil.gs — GET PROFIL & RIWAYAT
// ============================================================
//  Handler read-only. Aman dipanggil sesering apapun.
// ============================================================

/** Ambil profil user (dengan total poin & botol yang di-hitung agregat).
 *  Terima parameter `hp` (utama) atau `email` (fallback). */
function getProfile(data) {
  try {
    const row = _resolveUser(data);
    if (!row) return { ok: false, msg: 'User tidak ditemukan' };
    return { ok: true, profile: _buildProfile(row) };
  } catch (err) {
    return { ok: false, msg: 'Gagal ambil profil: ' + err.message };
  }
}

/** Riwayat gabungan dari TransaksiBotol + TransaksiVoucher,
 *  diurutkan descending berdasarkan timestamp.
 *  Terima parameter `hp` (utama) atau `email` (fallback). */
function getHistory(data) {
  try {
    const limit = data.limit || 100;

    const userRow = _resolveUser(data);
    if (!userRow) return { ok: false, msg: 'User tidak ditemukan', history: [] };
    const userIdMe = String(userRow[0]).toUpperCase();

    const ss   = SpreadsheetApp.openById(SPREADSHEET_ID);
    const shTB = ss.getSheetByName(SH.TRANSAKSI_BOTOL);
    const shTV = ss.getSheetByName(SH.TRANSAKSI_VOUCHER);

    const history = [];

    // Baca TransaksiBotol — filter by UserID (lebih stabil dari email)
    const tbRows = shTB.getDataRange().getValues();
    for (let i = 1; i < tbRows.length; i++) {
      if (String(tbRows[i][1]).toUpperCase() === userIdMe) {
        history.push({
          trx_id    : tbRows[i][0],
          tipe      : 'INPUT',
          botol     : tbRows[i][3],
          poin      : tbRows[i][4],
          keterangan: `Input ${tbRows[i][3]} botol [${tbRows[i][5]}]`,
          timestamp : tbRows[i][6] instanceof Date ? tbRows[i][6].toISOString() : tbRows[i][6],
        });
      }
    }

    // Baca TransaksiVoucher (REDEEM & USED) — filter by UserID
    const tvRows = shTV.getDataRange().getValues();
    for (let i = 1; i < tvRows.length; i++) {
      if (String(tvRows[i][1]).toUpperCase() === userIdMe) {
        history.push({
          trx_id    : tvRows[i][0],
          tipe      : tvRows[i][3], // REDEEM atau USED
          botol     : 0,
          poin      : tvRows[i][4],
          keterangan: tvRows[i][5],
          timestamp : tvRows[i][6] instanceof Date ? tvRows[i][6].toISOString() : tvRows[i][6],
        });
      }
    }

    // Sort desc by timestamp
    history.sort(function(a, b) { return new Date(b.timestamp) - new Date(a.timestamp); });
    return { ok: true, history: history.slice(0, limit) };
  } catch (err) {
    return { ok: false, msg: 'Gagal ambil riwayat: ' + err.message, history: [] };
  }
}
