// ============================================================
//  02_Init.gs — INISIALISASI SPREADSHEET (jalankan 1x)
// ============================================================
//  CARA PAKAI:
//  1. Pastikan SPREADSHEET_ID di 00_Config.gs sudah diisi
//  2. Di editor Apps Script, pilih dropdown fungsi → initSpreadsheet
//  3. Klik ▶ Run → Allow permissions
//  4. Cek spreadsheet — 8 sheet akan otomatis dibuat
// ============================================================

function initSpreadsheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // Users: TIDAK ada lagi kolom Total Poin/Botol — nilainya dihitung agregat
  // dari sheet TransaksiBotol & VoucherRedeemed. Ini mencegah desinkronisasi
  // antara "poin yang tersimpan" vs "sum sebenarnya dari transaksi".
  _ensureSheet(ss, SH.USERS,
    ['UserID', 'Nama', 'Email', 'No HP', 'Alamat', 'PIN', 'Tgl Daftar']);

  // TransaksiBotol: source of truth jumlah botol. Diisi oleh device
  // (Raspberry Pi) via HTTP POST. Poin user dihitung dari SUM kolom Poin
  // di sheet ini, dikurangi total redeem di VoucherRedeemed.
  _ensureSheet(ss, SH.TRANSAKSI_BOTOL,
    ['TrxID', 'UserID', 'Email', 'Jumlah Botol', 'Poin', 'DeviceID', 'Timestamp']);

  // TransaksiVoucher: riwayat redeem voucher & pemakaian di merchant
  _ensureSheet(ss, SH.TRANSAKSI_VOUCHER,
    ['TrxID', 'UserID', 'Email', 'Tipe', 'Poin', 'Keterangan', 'Timestamp']);

  // Ledger voucher yang sudah ditukar oleh user
  _ensureSheet(ss, SH.VOUCHER_REDEEMED,
    ['KodeVoucher', 'UserID', 'Email', 'NilaiRupiah', 'Status',
     'Tgl Terbit', 'Tgl Dipakai', 'Dipakai Oleh Merchant']);

  const shC = _ensureSheet(ss, SH.CONFIG, ['Key', 'Value']);
  if (shC.getLastRow() <= 1) {
    shC.getRange(2, 1, 1, 2).setValues([['ESP32_SECRET', ESP32_SECRET_DEF]]);
  }

  const shD = _ensureSheet(ss, SH.DEVICES,
    ['DeviceID', 'Secret', 'Label', 'Lokasi', 'Status']);
  if (shD.getLastRow() <= 1) {
    shD.getRange(2, 1, 1, 5).setValues([
      ['BIN-001', Utilities.getUuid().replace(/-/g, '').substr(0, 20).toUpperCase(),
       'Box Utama', 'Kantor Depan', 'aktif'],
    ]);
  }

  _ensureSheet(ss, SH.KARTU, ['CardUID', 'UserID', 'Email', 'Tgl Daftar']);

  const shM = _ensureSheet(ss, SH.MERCHANTS,
    ['MerchantID', 'Nama Toko', 'Email', 'PIN', 'Alamat', 'Status', 'Tgl Daftar']);
  if (shM.getLastRow() <= 1) {
    // Merchant demo — email: merchant@demo.com, PIN: 123456
    shM.getRange(2, 1, 1, 7).setValues([
      ['MRC-001', 'Toko Sembako Sejahtera', 'merchant@demo.com',
       _hashSimple('123456'), 'Jl. Pasar No.1', 'aktif', new Date()],
    ]);
  }

  Logger.log('Spreadsheet berhasil diinisialisasi.');
  Logger.log('Sheets dibuat: Users, TransaksiBotol, TransaksiVoucher, VoucherRedeemed, Config, Devices, Kartu, Merchants');
  Logger.log('Device pertama otomatis dibuat — cek sheet Devices untuk DeviceID & Secret-nya.');
  Logger.log('Merchant demo: merchant@demo.com / PIN 123456 — segera ganti PIN dari sheet Merchants.');
}

/** Bikin sheet dengan header kalau belum ada. Kalau sudah ada, biarkan. */
function _ensureSheet(ss, name, headers) {
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.getRange(1, 1, 1, headers.length)
      .setBackground('#1D9E75').setFontColor('#ffffff').setFontWeight('bold');
    sh.setFrozenRows(1);
    sh.autoResizeColumns(1, headers.length);
  }
  return sh;
}
