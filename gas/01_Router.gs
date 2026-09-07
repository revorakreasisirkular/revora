// ============================================================
//  01_Router.gs — ENTRY POINTS (doGet & doPost)
// ============================================================
//  Semua request HTTP dari luar masuk ke sini:
//  - doGet   : sekadar info service (tidak lagi serve HTML)
//  - doPost  : verifikasi shared secret + dispatch ke handler
//
//  Handler-nya sendiri tersebar di file-file lain:
//    03_Auth.gs      → register, login, loginMerchant, updateProfile
//    04_Botol.gs     → inputBotol
//    05_Voucher.gs   → redeem, scanVoucher, confirmVoucher, getMyVouchers
//    06_Kartu.gs     → registerCard, identifyCard
//    07_Profil.gs    → getProfile, getHistory
// ============================================================

/** GET tidak lagi menyajikan HTML — arahkan ke domain PWA. */
function doGet(e) {
  const info = {
    ok      : true,
    service : 'Revora Bottle Save API',
    version : '6.0',
    note    : 'Backend ini hanya JSON API. Buka aplikasi di:',
    apps    : {
      user    : 'https://revorabottlesave.vercel.app',
      merchant: 'https://revora-merchant.vercel.app',
    },
  };
  return ContentService
    .createTextOutput(JSON.stringify(info, null, 2))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Semua request dari PWA (via proxy Vercel) dan Raspberry Pi masuk sini.
 *  Format body JSON:
 *    { "action":"login", "_secret":"...", ...params }
 */
function doPost(e) {
  let result;
  try {
    const data   = JSON.parse(e.postData.contents);
    const secret = data._secret || '';
    const action = data.action;

    // 1. Verifikasi shared secret DULU, sebelum eksekusi apapun.
    if (secret !== APP_SHARED_SECRET) {
      result = { ok: false, msg: 'Unauthorized' };
    } else {
      const handlers = {
        register       : registerUser,          // 03_Auth.gs
        login          : loginUser,             // 03_Auth.gs
        update_profile : updateProfile,         // 03_Auth.gs
        login_merchant : loginMerchant,         // 03_Auth.gs

        input_botol    : inputBotol,            // 04_Botol.gs

        redeem         : redeemVoucher,         // 05_Voucher.gs
        get_my_vouchers: getMyVouchers,         // 05_Voucher.gs
        scan_voucher   : scanVoucher,           // 05_Voucher.gs
        confirm_voucher: confirmVoucherUsage,   // 05_Voucher.gs

        register_card  : registerCard,          // 06_Kartu.gs
        identify_card  : identifyCard,          // 06_Kartu.gs

        get_profile    : getProfile,            // 07_Profil.gs
        get_history    : getHistory,            // 07_Profil.gs
      };
      result = handlers[action]
        ? handlers[action](data)
        : { ok: false, msg: 'Action tidak dikenal: ' + action };
    }
  } catch (err) {
    result = { ok: false, msg: 'Server error: ' + err.message };
  }
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}
