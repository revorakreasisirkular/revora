// ============================================================
//  06_Kartu.gs — KARTU RFID
// ============================================================
//  Alur:
//   - User buka aplikasi → daftarkan UID kartu ke akunnya (registerCard)
//   - Device baca kartu  → identifyCard() balikin profil user pemilik
// ============================================================

/** User tautkan kartu RFID ke akunnya (dipanggil dari PWA). */
function registerCard(data) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    return { ok: false, msg: 'Server sedang sibuk, coba lagi sebentar' };
  }

  try {
    const email   = (data.email || '').trim().toLowerCase();
    const cardUid = (data.card_uid || '').trim().toUpperCase();
    if (!email || !cardUid) return { ok: false, msg: 'Parameter tidak lengkap' };

    const userRow = _findUserByEmail(email);
    if (!userRow) return { ok: false, msg: 'User tidak ditemukan' };

    const ss   = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sh   = ss.getSheetByName(SH.KARTU);
    const rows = sh.getDataRange().getValues();

    // Cek kartu belum dipakai
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]).toUpperCase() === cardUid) {
        if (String(rows[i][1]).toUpperCase() === userRow[0])
          return { ok: false, msg: 'Kartu ini sudah terdaftar ke akunmu' };
        return { ok: false, msg: 'Kartu ini sudah dipakai akun lain' };
      }
    }

    // Kolom: CardUID | UserID | Email | Tgl Daftar
    sh.appendRow([cardUid, userRow[0], userRow[2], new Date()]);
    return { ok: true, msg: 'Kartu berhasil ditautkan ke akunmu' };
  } catch (err) {
    return { ok: false, msg: 'Gagal mendaftarkan kartu: ' + err.message };
  } finally {
    lock.releaseLock();
  }
}

/** Device baca kartu, tanya siapa pemiliknya (dipanggil dari Raspberry Pi). */
function identifyCard(data) {
  try {
    const cardUid  = (data.card_uid || '').trim().toUpperCase();
    const deviceId = (data.device_id || '').trim().toUpperCase();
    const secret   = data.secret || '';
    if (!cardUid) return { ok: false, msg: 'UID kartu kosong' };

    if (!deviceId) return { ok: false, msg: 'device_id wajib' };
    const dev = _findDevice(deviceId);
    if (!dev) return { ok: false, msg: 'Device tidak dikenal' };
    if (dev[4] !== 'aktif') return { ok: false, msg: 'Device ini dinonaktifkan' };
    if (secret !== dev[1]) return { ok: false, msg: 'Token device tidak valid' };

    const ss   = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sh   = ss.getSheetByName(SH.KARTU);
    const rows = sh.getDataRange().getValues();

    let userId = null;
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]).toUpperCase() === cardUid) { userId = rows[i][1]; break; }
    }
    if (!userId) return { ok: false, msg: 'Kartu belum terdaftar. Daftarkan dulu lewat aplikasi.' };

    const row = _findUser(userId);
    if (!row) return { ok: false, msg: 'Akun pemilik kartu tidak ditemukan' };

    return { ok: true, profile: _buildProfile(row) };
  } catch (err) {
    return { ok: false, msg: 'Gagal identifikasi kartu: ' + err.message };
  }
}
