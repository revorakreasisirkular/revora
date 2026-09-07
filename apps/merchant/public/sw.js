// Revora Merchant — Service Worker (minimal, installable only)
const SW_VERSION = 'revora-merchant-v1';
self.addEventListener('install',  (e) => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',    (e) => { return; });
