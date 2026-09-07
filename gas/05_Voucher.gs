// ============================================================
//  05_Voucher.gs — VOUCHER (redeem, list, scan, konfirmasi)
// ============================================================
//  Alur voucher:
//   1. User redeem  → redeemVoucher()      : buat voucher aktif
//   2. User lihat   → getMyVouchers()      : list voucher miliknya
//   3. Merchant scan → scanVoucher()       : cek status voucher
//   4. Merchant OK  → confirmVoucherUsage(): tandai hangus
// ============================================================

/** User tukar 100 poin → 1 voucher Rp 10.000 aktif. */
function redeemVoucher(data) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    return { ok: false, msg: 'Server sedang sibuk, coba lagi sebentar' };
  }

  try {
    const userRow = _resolveUser(data);
    if (!userRow) return { ok: false, msg: 'User tidak ditemukan (hp atau email salah)' };

    const totals = _hitungTotalUser(userRow[0]);
    if (totals.poin < VOUCHER_POIN)
      return { ok: false, msg: `Poin tidak cukup. Perlu ${VOUCHER_POIN}, poin kamu ${totals.poin}` };

    const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    const shRed = ss.getSheetByName(SH.VOUCHER_REDEEMED);
    const shTV  = ss.getSheetByName(SH.TRANSAKSI_VOUCHER);
    const now   = new Date();

    // Buat kode voucher unik + catat ke ledger sebagai "aktif"
    const kodeVoucher = _generateKodeVoucher(shRed);
    // Kolom: KodeVoucher | UserID | Email | NilaiRupiah | Status | Tgl Terbit | Tgl Dipakai | Merchant
    shRed.appendRow([kodeVoucher, userRow[0], userRow[2], VOUCHER_NILAI, 'aktif', now, '', '']);

    // Catat di TransaksiVoucher (pengurangan poin dari agregasi)
    const trxID = _generateTrxID();
    shTV.appendRow([trxID, userRow[0], userRow[2], 'REDEEM', -VOUCHER_POIN,
      `Redeem Voucher Rp ${VOUCHER_NILAI.toLocaleString('id-ID')} | Kode: ${kodeVoucher}`, now]);

    const newTotals = _hitungTotalUser(userRow[0]);

    return {
      ok          : true,
      msg         : 'Redeem berhasil!',
      kode_voucher: kodeVoucher,
      nilai       : VOUCHER_NILAI,
      sisa_poin   : newTotals.poin,
    };
  } catch (err) {
    return { ok: false, msg: 'Gagal redeem: ' + err.message };
  } finally {
    lock.releaseLock();
  }
}

/** Generate kode voucher unik (retry max 10x kalau kolisi UUID). */
function _generateKodeVoucher(shRed) {
  const rows = shRed.getDataRange().getValues();
  const used = new Set();
  for (let i = 1; i < rows.length; i++) used.add(String(rows[i][0]));

  for (let attempt = 0; attempt < 10; attempt++) {
    const kode = 'ECO-' + Utilities.getUuid().replace(/-/g, '').substr(0, 8).toUpperCase();
    if (!used.has(kode)) return kode;
  }
  return 'ECO-' + Date.now().toString(36).toUpperCase();
}

/** List semua voucher milik user (aktif & hangus). */
function getMyVouchers(data) {
  try {
    const userRow = _resolveUser(data);
    if (!userRow) return { ok: false, msg: 'User tidak ditemukan', vouchers: [] };
    const userIdMe = String(userRow[0]).toUpperCase();

    const ss   = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sh   = ss.getSheetByName(SH.VOUCHER_REDEEMED);
    const rows = sh.getDataRange().getValues();

    const vouchers = [];
    // Iterate reverse supaya yang terbaru muncul dulu
    for (let i = rows.length - 1; i >= 1; i--) {
      // Kolom: KodeVoucher[0] | UserID[1] | Email[2] | ...
      // Match by UserID (lebih stabil daripada email)
      if (String(rows[i][1]).toUpperCase() === userIdMe) {
        vouchers.push({
          kode         : rows[i][0],
          nilai_rupiah : rows[i][3],
          status       : rows[i][4],
          tgl_terbit   : rows[i][5] instanceof Date ? rows[i][5].toISOString() : rows[i][5],
          tgl_dipakai  : rows[i][6] instanceof Date ? rows[i][6].toISOString() : rows[i][6],
          merchant     : rows[i][7] || '',
        });
      }
    }
    return { ok: true, vouchers: vouchers };
  } catch (err) {
    return { ok: false, msg: 'Gagal ambil voucher: ' + err.message, vouchers: [] };
  }
}

/** Merchant scan QR → cek detail voucher tanpa hanguskan. */
function scanVoucher(data) {
  try {
    const merchantEmail = (data.merchant_email || '').trim().toLowerCase();
    const kode          = (data.kode_voucher || '').trim().toUpperCase();
    if (!kode) return { ok: false, msg: 'Kode voucher kosong' };

    const merchantRow = _findMerchantByEmail(merchantEmail);
    if (!merchantRow) return { ok: false, msg: 'Sesi merchant tidak valid' };
    if (merchantRow[5] !== 'aktif') return { ok: false, msg: 'Akun merchant dinonaktifkan' };

    const vcr = _findVoucherByKode(kode);
    if (!vcr) return { ok: false, msg: 'Voucher tidak ditemukan / kode salah' };

    return {
      ok: true,
      voucher: {
        kode            : vcr.data[0],
        user_id         : vcr.data[1],
        user_email      : vcr.data[2],
        nilai_rupiah    : vcr.data[3],
        status          : vcr.data[4],
        tgl_terbit      : vcr.data[5] instanceof Date ? vcr.data[5].toISOString() : vcr.data[5],
        tgl_dipakai     : vcr.data[6] instanceof Date ? vcr.data[6].toISOString() : vcr.data[6],
        merchant_pemakai: vcr.data[7] || '',
      },
    };
  } catch (err) {
    return { ok: false, msg: 'Gagal scan voucher: ' + err.message };
  }
}

/** Merchant konfirmasi pemakaian → voucher jadi "hangus". */
function confirmVoucherUsage(data) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    return { ok: false, msg: 'Server sedang sibuk, coba lagi sebentar' };
  }

  try {
    const merchantEmail = (data.merchant_email || '').trim().toLowerCase();
    const kode          = (data.kode_voucher || '').trim().toUpperCase();
    if (!merchantEmail || !kode) return { ok: false, msg: 'Parameter tidak lengkap' };

    const merchantRow = _findMerchantByEmail(merchantEmail);
    if (!merchantRow) return { ok: false, msg: 'Sesi merchant tidak valid' };
    if (merchantRow[5] !== 'aktif') return { ok: false, msg: 'Akun merchant dinonaktifkan' };

    // Baca ulang voucher DI DALAM lock (untuk cegah race condition)
    const vcr = _findVoucherByKode(kode);
    if (!vcr) return { ok: false, msg: 'Voucher tidak ditemukan' };

    const status = vcr.data[4];
    if (status === 'hangus') {
      const pemakai = vcr.data[7] || '(tidak diketahui)';
      const tglPakai = vcr.data[6];
      return {
        ok: false,
        msg: `Voucher SUDAH DIPAKAI oleh ${pemakai}${tglPakai ? ' pada ' + new Date(tglPakai).toLocaleString('id-ID') : ''}`,
      };
    }
    if (status !== 'aktif') {
      return { ok: false, msg: `Voucher berstatus "${status}" — tidak bisa dipakai` };
    }

    // Tandai hangus
    const ss  = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sh  = ss.getSheetByName(SH.VOUCHER_REDEEMED);
    const now = new Date();
    // Kolom 5=Status, 7=TglDipakai, 8=Merchant
    sh.getRange(vcr.rowIndex, 5).setValue('hangus');
    sh.getRange(vcr.rowIndex, 7).setValue(now);
    sh.getRange(vcr.rowIndex, 8).setValue(`${merchantRow[0]} (${merchantRow[1]})`);

    // Catat di TransaksiVoucher user
    const shTV  = ss.getSheetByName(SH.TRANSAKSI_VOUCHER);
    const trxID = _generateTrxID();
    shTV.appendRow([trxID, vcr.data[1], vcr.data[2], 'USED', 0,
      `Voucher ${kode} dipakai di ${merchantRow[1]}`, now]);

    return {
      ok: true,
      msg: 'Voucher berhasil dikonfirmasi & dihanguskan',
      voucher: {
        kode         : kode,
        user_email   : vcr.data[2],
        nilai_rupiah : vcr.data[3],
        tgl_dipakai  : now.toISOString(),
      },
    };
  } catch (err) {
    return { ok: false, msg: 'Gagal konfirmasi voucher: ' + err.message };
  } finally {
    lock.releaseLock();
  }
}
