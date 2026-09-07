// ============================================================
//  03_Auth.gs — AUTENTIKASI & PROFIL
// ============================================================
//  IDENTIFIER LOGIN v6.1:
//    - User    : login pakai NOMOR HP (normalized ke 628xxx) + PIN 6 digit
//    - Merchant: login pakai EMAIL + PIN 6 digit (merchant lebih formal,
//                biasanya punya email toko)
//
//  Email di user tetap WAJIB diisi saat register (backup identifier,
//  untuk kontak notifikasi nanti), tapi bukan untuk login.
//
//  PIN disimpan sebagai hash sederhana (_hashSimple di 99_Helpers.gs).
// ============================================================

/** Register user baru (dari PWA). HP dinormalisasi ke 628xxx sebelum simpan. */
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
    const hpRaw  = (data.hp || '').trim();
    const alamat = (data.alamat || '').trim();
    const pin    = String(data.pin || '').trim();

    if (!nama || !email || !hpRaw || !pin)
      return { ok: false, msg: 'Nama, email, HP, dan PIN wajib diisi' };
    if (!/^\S+@\S+\.\S+$/.test(email))
      return { ok: false, msg: 'Format email tidak valid' };
    if (!/^\d{6}$/.test(pin))
      return { ok: false, msg: 'PIN harus 6 digit angka' };

    // Normalisasi HP ke format kanonik (628xxx)
    const hp = _normalizeHP(hpRaw);
    if (!hp)
      return { ok: false, msg: 'Format nomor HP tidak valid (gunakan 08xx, 62xx, atau +62xx dengan 10-13 digit)' };

    const ss   = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sh   = ss.getSheetByName(SH.USERS);
    const rows = sh.getDataRange().getValues();

    // Cek HP belum terpakai (identifier utama)
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][3]) === hp)
        return { ok: false, msg: 'Nomor HP sudah terdaftar. Silakan login.' };
      // Email juga harus unik (backup identifier)
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

/** Login user (HP + PIN). HP di-normalize dulu sebelum dicocokkan. */
function loginUser(data) {
  try {
    const hpRaw = (data.hp || '').trim();
    const pin   = String(data.pin || '').trim();
    if (!hpRaw || !pin) return { ok: false, msg: 'Nomor HP dan PIN wajib diisi' };
    if (!/^\d{6}$/.test(pin))
      return { ok: false, msg: 'PIN harus 6 digit angka' };

    const hp = _normalizeHP(hpRaw);
    if (!hp)
      return { ok: false, msg: 'Format nomor HP tidak valid' };

    const row = _findUserByHP(hp);
    if (!row) return { ok: false, msg: 'Nomor HP tidak terdaftar' };
    if (row[5] !== _hashSimple(pin))
      return { ok: false, msg: 'PIN salah' };

    return { ok: true, msg: 'Login berhasil', profile: _buildProfile(row) };
  } catch (err) {
    return { ok: false, msg: 'Gagal login: ' + err.message };
  }
}

/** Update profil user. HP TIDAK bisa diubah lewat sini (jadi identitas login).
 *  Email juga tidak (backup identifier — nanti bisa ditambah proses verifikasi). */
function updateProfile(data) {
  try {
    const hpRaw = (data.hp || '').trim();
    if (!hpRaw) return { ok: false, msg: 'HP kosong' };
    const hp = _normalizeHP(hpRaw);
    if (!hp) return { ok: false, msg: 'Format HP tidak valid' };

    const row = _findUserByHP(hp);
    if (!row) return { ok: false, msg: 'User tidak ditemukan' };

    const ss  = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sh  = ss.getSheetByName(SH.USERS);
    const idx = _findUserRowIndex(sh, row[0]);

    const nama   = (data.nama   || row[1]).toString().trim();
    const alamat = (data.alamat != null ? data.alamat : row[4]).toString().trim();

    // Kolom 2=Nama, 5=Alamat (skip 3=Email dan 4=HP — keduanya identifier)
    sh.getRange(idx, 2).setValue(nama);
    sh.getRange(idx, 5).setValue(alamat);

    const updatedRow = _findUser(row[0]);
    return { ok: true, msg: 'Profil berhasil diperbarui', profile: _buildProfile(updatedRow) };
  } catch (err) {
    return { ok: false, msg: 'Gagal update profil: ' + err.message };
  }
}

/** Login merchant (email + PIN) — MERCHANT tetap pakai email. */
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
