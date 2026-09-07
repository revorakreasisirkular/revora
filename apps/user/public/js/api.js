// ============================================================
//  Revora — API Client (User PWA)
// ============================================================
//  Wrapper untuk semua panggilan ke backend. Endpoint API-nya
//  ada di window.REVORA_API_URL, di-set dari config.js.
//  Kalau gagal jaringan/parse, mengembalikan {ok:false, msg:...}
//  supaya UI selalu bisa handle seragam.
// ============================================================

(function (global) {
  async function callAPI(action, params) {
    const url = global.REVORA_API_URL;
    if (!url) {
      return { ok: false, msg: 'API URL belum di-set (window.REVORA_API_URL kosong)' };
    }
    try {
      const res = await fetch(url, {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify(Object.assign({ action: action }, params || {})),
      });
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch (e) {
        return { ok: false, msg: 'Response tidak valid: ' + text.slice(0, 200) };
      }
    } catch (err) {
      return { ok: false, msg: 'Gagal koneksi: ' + (err && err.message ? err.message : err) };
    }
  }

  // Expose one function per action (mirip google.script.run gaya lama,
  // supaya port dari kode lama gampang):
  global.API = {
    loginUser          : (p) => callAPI('login',           p),
    registerUser       : (p) => callAPI('register',        p),
    getProfile         : (p) => callAPI('get_profile',     p),
    getHistory         : (p) => callAPI('get_history',     p),
    getMyVouchers      : (p) => callAPI('get_my_vouchers', p),
    redeemVoucher      : (p) => callAPI('redeem',          p),
    updateProfile      : (p) => callAPI('update_profile',  p),
    loginMerchant      : (p) => callAPI('login_merchant',  p),
    scanVoucher        : (p) => callAPI('scan_voucher',    p),
    confirmVoucherUsage: (p) => callAPI('confirm_voucher', p),
  };
})(window);
