// ============================================================
//  03_Auth.gs — AUTENTIKASI & PROFIL
// ============================================================
//  Semua auth pakai email + PIN 6 digit (baik user maupun merchant).
//  PIN disimpan sebagai hash sederhana (_hashSimple di 99_Helpers.gs).
// ============================================================

/** Register user baru (dari PWA). */
function registerUser(data) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    return { ok: false, msg: 'Server sedang sibuk, coba lagi sebentar' };
  }

  try {
    const nama   = (data.nama || '').trim();
    const email  = (data.email || '').trim().toLowerCase();
    const hp     = (data.hp || '').trim();
    const alamat = (data.alamat || '').trim();
    const pin    = String(data.pin || '').trim();

    if (!nama || !email || !hp || !pin)
      return { ok: false, msg: 'Nama, email, HP, dan PIN wajib diisi' };
    if (!/^\S+@\S+\.\S+$/.test(email))
      return { ok: false, msg: 'Format email tidak valid' };
    if (!/^\d{6}$/.test(pin))
      return { ok: false, msg: 'PIN harus 6 digit angka' };

    const ss   = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sh   = ss.getSheetByName(SH.USERS);
    const rows = sh.getDataRange().getValues();

    // Cek email belum terpakai
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][2]).toLowerCase() === email)
        return { ok: false, msg: 'Email sudah terdaftar' };
    }

    const userID = _generateUserID(sh);
    const now    = new Date();
    // Kolom: UserID | Nama | Email | HP | Alamat | PIN(hash) | Tgl Daftar
    sh.appendRow([userID, nama, email, hp, alamat, _hashSimple(pin), now]);

    return { ok: true, msg: 'Registrasi berhasil', user_id: userID };
  } catch (err) {
    return { ok: false, msg: 'Gagal mendaftar: ' + err.message };
  } finally {
    lock.releaseLock();
  }
}

/** Login user (email + PIN). Return profile lengkap. */
function loginUser(data) {
  try {
    const email = (data.email || '').trim().toLowerCase();
    const pin   = String(data.pin || '').trim();
    if (!email || !pin) return { ok: false, msg: 'Email dan PIN wajib diisi' };
    if (!/^\S+@\S+\.\S+$/.test(email))
      return { ok: false, msg: 'Format email tidak valid' };
    if (!/^\d{6}$/.test(pin))
      return { ok: false, msg: 'PIN harus 6 digit angka' };

    const row = _findUserByEmail(email);
    if (!row) return { ok: false, msg: 'Email tidak terdaftar' };
    if (row[5] !== _hashSimple(pin))
      return { ok: false, msg: 'PIN salah' };

    return { ok: true, msg: 'Login berhasil', profile: _buildProfile(row) };
  } catch (err) {
    return { ok: false, msg: 'Gagal login: ' + err.message };
  }
}

/** Update profil user. Email TIDAK bisa diubah lewat sini (jadi identitas login). */
function updateProfile(data) {
  try {
    const email = (data.email || '').trim().toLowerCase();
    if (!email) return { ok: false, msg: 'Email kosong' };

    const row = _findUserByEmail(email);
    if (!row) return { ok: false, msg: 'User tidak ditemukan' };

    const ss  = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sh  = ss.getSheetByName(SH.USERS);
    const idx = _findUserRowIndex(sh, row[0]);

    const nama   = (data.nama   || row[1]).toString().trim();
    const hp     = (data.hp     || row[3]).toString().trim();
    const alamat = (data.alamat != null ? data.alamat : row[4]).toString().trim();

    // Kolom 2=Nama, 4=HP, 5=Alamat (skip 3=Email)
    sh.getRange(idx, 2).setValue(nama);
    sh.getRange(idx, 4).setValue(hp);
    sh.getRange(idx, 5).setValue(alamat);

    const updatedRow = _findUser(row[0]);
    return { ok: true, msg: 'Profil berhasil diperbarui', profile: _buildProfile(updatedRow) };
  } catch (err) {
    return { ok: false, msg: 'Gagal update profil: ' + err.message };
  }
}

/** Login merchant (email + PIN). */
function loginMerchant(data) {
  try {
    const email = (data.email || '').trim().toLowerCase();
    const pin   = String(data.pin || '').trim();
    if (!email || !pin) return { ok: false, msg: 'Email dan PIN wajib diisi' };
    if (!/^\d{6}$/.test(pin)) return { ok: false, msg: 'PIN harus 6 digit angka' };

    const row = _findMerchantByEmail(email);
    if (!row) return { ok: false, msg: 'Email merchant tidak terdaftar' };
    if (row[5] !== 'aktif') return { ok: false, msg: 'Akun merchant dinonaktifkan' };
    if (row[3] !== _hashSimple(pin))
      return { ok: false, msg: 'PIN salah' };

    // Kolom: MerchantID | Nama | Email | PIN | Alamat | Status | Tgl Daftar
    return {
      ok      : true,
      msg     : 'Login berhasil',
      merchant: {
        merchant_id: row[0],
        nama       : row[1],
        email      : row[2],
        alamat     : row[4],
      },
    };
  } catch (err) {
    return { ok: false, msg: 'Gagal login merchant: ' + err.message };
  }
}
