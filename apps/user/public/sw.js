// ============================================================
//  Revora — Service Worker (User PWA)
// ============================================================
//  Sengaja MINIMAL — hanya untuk memenuhi syarat "installable PWA".
//  TIDAK melakukan offline caching (per pilihan setup: online-only).
//  Semua request tetap ke jaringan sepenuhnya.
// ============================================================

const SW_VERSION = 'revora-user-v1';

self.addEventListener('install', (event) => {
  // Aktifkan versi baru langsung tanpa nunggu tab lama ditutup.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Ambil kontrol semua client (tab) segera setelah aktivasi.
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Passthrough — biarkan browser handle jaringan normal.
  // Tidak ada cache-first / stale-while-revalidate.
  return;
});
