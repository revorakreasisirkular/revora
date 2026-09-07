// ============================================================
//  Revora — API Client (Merchant PWA)
// ============================================================

(function (global) {
  async function callAPI(action, params) {
    const url = global.REVORA_API_URL;
    if (!url) return { ok: false, msg: 'API URL belum di-set' };
    try {
      const res = await fetch(url, {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify(Object.assign({ action: action }, params || {})),
      });
      const text = await res.text();
      try { return JSON.parse(text); }
      catch (e) { return { ok: false, msg: 'Response tidak valid: ' + text.slice(0, 200) }; }
    } catch (err) {
      return { ok: false, msg: 'Gagal koneksi: ' + (err && err.message ? err.message : err) };
    }
  }

  global.API = {
    loginMerchant      : (p) => callAPI('login_merchant',  p),
    scanVoucher        : (p) => callAPI('scan_voucher',    p),
    confirmVoucherUsage: (p) => callAPI('confirm_voucher', p),
  };
})(window);
