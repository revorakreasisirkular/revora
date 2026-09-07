// ============================================================
//  Revora API Proxy — Vercel Serverless Function
// ============================================================
//
//  Fungsi: menerima request dari PWA (user & merchant) lalu
//  meneruskannya ke Apps Script Web App dengan menyuntikkan
//  shared secret dari environment variable server.
//
//  Kenapa perlu proxy?
//  1. CORS — Apps Script tidak bisa dikontrol header CORS-nya
//     dengan bebas, browser akan blokir request dari domain
//     vercel.app langsung.
//  2. Keamanan — kalau frontend PWA panggil GAS langsung, URL
//     `/exec` bocor di DevTools dan siapapun bisa spam request.
//     Dengan proxy, URL GAS + shared secret tersimpan di server
//     Vercel dan tidak pernah dilihat browser.
//  3. Header — kita bisa tambah rate-limit, logging, CORS whitelist
//     hanya untuk domain PWA kita, dll.
//
//  ENVIRONMENT VARIABLES (set di Vercel Dashboard):
//    GAS_URL      = https://script.google.com/macros/s/xxxxx/exec
//    APP_SECRET   = string acak panjang (SAMA dengan APP_SHARED_SECRET
//                                        di Code.gs Apps Script)
//    CORS_ORIGINS = https://revorabottlesave.vercel.app,https://revora-merchant.vercel.app
// ============================================================

const GAS_URL      = process.env.GAS_URL;
const APP_SECRET   = process.env.APP_SECRET;
const CORS_ORIGINS = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);

function setCors(req, res) {
  const origin = req.headers.origin || '';
  // Kalau CORS_ORIGINS kosong (misal saat testing lokal), izinkan semua.
  // Di produksi wajib set env-nya supaya cuma domain PWA kita yang boleh.
  if (CORS_ORIGINS.length === 0 || CORS_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
}

module.exports = async function handler(req, res) {
  setCors(req, res);

  // Preflight CORS request dari browser
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, msg: 'Method not allowed' });
  }

  if (!GAS_URL || !APP_SECRET) {
    return res.status(500).json({
      ok: false,
      msg: 'Server misconfigured: GAS_URL / APP_SECRET env vars belum diisi',
    });
  }

  try {
    // Body sudah di-parse Vercel jadi object (kalau Content-Type JSON).
    // Kalau string (fallback), kita parse manual.
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) { body = {}; }
    }
    body = body || {};

    // Suntikkan shared secret — frontend TIDAK menyertakan ini,
    // dan tidak akan pernah tahu nilainya (env server-only).
    body._secret = APP_SECRET;

    // Forward ke Apps Script
    const gasRes = await fetch(GAS_URL, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify(body),
      // Follow redirect Google (Apps Script `/exec` sering redirect ke `/exec?...`)
      redirect: 'follow',
    });

    const text = await gasRes.text();

    // Apps Script balikin JSON string
    let json;
    try {
      json = JSON.parse(text);
    } catch (e) {
      // Kalau gagal parse (misal Apps Script balikin HTML error page),
      // wrap sebagai error yang bisa dibaca frontend.
      return res.status(502).json({
        ok  : false,
        msg : 'Backend response tidak valid (bukan JSON). Cek deployment Apps Script.',
        raw : text.slice(0, 500),
      });
    }

    return res.status(200).json(json);
  } catch (err) {
    return res.status(500).json({
      ok: false,
      msg: 'Proxy error: ' + (err && err.message ? err.message : String(err)),
    });
  }
};
