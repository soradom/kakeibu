const CACHE_NAME = 'kakeibu-shell-v2';
const APP_SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Apps Script API 요청은 항상 최신 데이터가 필요하므로 캐시하지 않고 네트워크로만 처리
  if (url.hostname.includes('script.google.com') || e.request.method !== 'GET') return;

  // HTML(앱 셸)은 코드가 자주 바뀌므로 네트워크 우선, 오프라인일 때만 캐시로 폴백
  // (예전엔 캐시 우선이라 배포해도 새 코드가 한 번에 안 보이는 문제가 있었음)
  if (e.request.mode === 'navigate' || url.pathname.endsWith('.html')) {
    e.respondWith(
      fetch(e.request).then(res => {
        if (res.ok) caches.open(CACHE_NAME).then(cache => cache.put(e.request, res.clone()));
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // 아이콘/manifest 등 정적 리소스는 캐시 우선 + 백그라운드 갱신
  e.respondWith(
    caches.match(e.request).then(cached => {
      const fetchPromise = fetch(e.request).then(res => {
        if (res.ok) caches.open(CACHE_NAME).then(cache => cache.put(e.request, res.clone()));
        return res;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
