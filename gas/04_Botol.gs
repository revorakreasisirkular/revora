// ============================================================
//  04_Botol.gs — INPUT BOTOL (dari Raspberry Pi)
// ============================================================
//  Dipanggil oleh device fisik saja (bukan dari UI).
//  Autentikasi 2 lapis:
//    1. _secret di 01_Router.gs (APP_SHARED_SECRET)
//    2. device_id + secret dari sheet Devices (di sini)
// ============================================================

function inputBotol(data) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    return { ok: false, msg: 'Server sedang sibuk (banyak device mengirim bersamaan), coba lagi sebentar' };
  }

  try {
    const email    = (data.email || '').trim().toLowerCase();
    const userId   = (data.user_id || '').trim().toUpperCase();
    const jumlah   = parseInt(data.jumlah, 10);
    const secret   = data.secret || '';
    const deviceId = (data.device_id || '').trim().toUpperCase();

    // Validasi device
    if (!deviceId) return { ok: false, msg: 'device_id wajib diisi' };
    const dev = _findDevice(deviceId);
    if (!dev) return { ok: false, msg: 'Device tidak dikenal: ' + deviceId };
    if (dev[4] !== 'aktif') return { ok: false, msg: 'Device ini dinonaktifkan' };
    if (secret !== dev[1]) return { ok: false, msg: 'Token device tidak valid' };

    // Validasi jumlah
    if (!jumlah || jumlah < 1)
      return { ok: false, msg: 'Parameter jumlah tidak valid' };

    // Cari user: email diprioritaskan, fallback ke user_id
    let userRow = null;
    if (email) userRow = _findUserByEmail(email);
    else if (userId) userRow = _findUser(userId);
    if (!userRow) return { ok: false, msg: 'User tidak ditemukan (email/user_id salah)' };

    // Tulis transaksi
    const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    const shTB  = ss.getSheetByName(SH.TRANSAKSI_BOTOL);
    const poin  = jumlah * POIN_PER_BOTOL;
    const trxID = _generateTrxID();

    // Kolom: TrxID | UserID | Email | Jumlah Botol | Poin | DeviceID | Timestamp
    shTB.appendRow([trxID, userRow[0], userRow[2], jumlah, poin, deviceId, new Date()]);

    // Hitung total baru (agregasi) untuk return ke device
    const totals = _hitungTotalUser(userRow[0]);

    return {
      ok          : true,
      msg         : `${jumlah} botol berhasil dicatat`,
      poin_dapat  : poin,
      total_poin  : totals.poin,
      total_botol : totals.botol,
    };
  } catch (err) {
    return { ok: false, msg: 'Gagal input botol: ' + err.message };
  } finally {
    lock.releaseLock();
  }
}
