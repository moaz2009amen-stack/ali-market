const CACHE_VERSION = 'v3'
const CACHE_NAME = `jamlat-abu-ali-${CACHE_VERSION}`

self.addEventListener('install', (event) => {
  console.log('[SW] Installing version', CACHE_VERSION)
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(['/manifest.json']).catch(err => {
        console.log('[SW] Install cache error (non-fatal):', err)
      })
    })
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter(name => name.startsWith('jamlat-abu-ali-') && name !== CACHE_NAME)
          .map(name => caches.delete(name))
      )
    }).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (request.method !== 'GET') return
  if (!url.protocol.startsWith('http')) return

  // Supabase: Network Only
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(
      fetch(request).catch(() => new Response(
        JSON.stringify({ error: 'offline' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      ))
    )
    return
  }

  // ملفات ثابتة: Cache First
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|css)$/)
  ) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached
        return fetch(request).then(response => {
          if (response.ok) {
            caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()))
          }
          return response
        }).catch(() => new Response('', { status: 404 }))
      })
    )
    return
  }

  // ملفات _next الأخرى: Stale While Revalidate
  if (url.pathname.startsWith('/_next/')) {
    event.respondWith(
      caches.match(request).then(cached => {
        const fetchPromise = fetch(request).then(response => {
          if (response.ok) {
            caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()))
          }
          return response
        }).catch(() => cached)
        return cached || fetchPromise
      })
    )
    return
  }

  // الصفحات: Network First مع Cache Fallback
  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok && response.type !== 'opaque') {
          caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()))
        }
        return response
      })
      .catch(() => {
        return caches.match(request).then(cached => {
          if (cached) return cached
          if (request.mode === 'navigate') {
            return caches.match('/').then(root => root || new Response(getOfflinePage(), {
              headers: { 'Content-Type': 'text/html; charset=utf-8' }
            }))
          }
          return new Response('', { status: 503 })
        })
      })
  )
})

function getOfflinePage() {
  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>جملة أبو علي - غير متصل</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#eff6ff,#dbeafe);direction:rtl;padding:1rem}
    .card{background:#fff;border-radius:1.5rem;padding:2.5rem 2rem;text-align:center;max-width:380px;width:100%;box-shadow:0 10px 40px rgba(0,0,0,.1)}
    .logo{width:72px;height:72px;background:#2563eb;border-radius:1rem;display:flex;align-items:center;justify-content:center;margin:0 auto 1.5rem;font-size:2rem}
    h1{font-size:1.5rem;color:#1e3a8a;margin-bottom:.5rem;font-weight:700}
    .sub{color:#64748b;font-size:.85rem;margin-bottom:1.5rem}
    .alert{background:#fef3c7;border:1px solid #fde68a;border-radius:.75rem;padding:1rem;margin-bottom:1.5rem}
    .alert p{color:#92400e;font-size:.9rem;line-height:1.6}
    .btn{display:block;width:100%;background:#2563eb;color:#fff;border:none;padding:.875rem;border-radius:.75rem;font-size:1rem;font-weight:600;cursor:pointer;margin-bottom:.75rem;font-family:inherit;transition:background .2s}
    .btn:hover{background:#1d4ed8}
    .btn2{background:transparent;color:#2563eb;border:2px solid #2563eb}
    .btn2:hover{background:#eff6ff}
    .status{display:flex;align-items:center;justify-content:center;gap:.5rem;margin-top:1.5rem;font-size:.8rem;color:#94a3b8}
    .dot{width:8px;height:8px;background:#ef4444;border-radius:50%;animation:pulse 1.5s infinite}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">🛒</div>
    <h1>جملة أبو علي</h1>
    <p class="sub">نظام إدارة المخزن والمبيعات</p>
    <div class="alert">
      <p>📡 لا يوجد اتصال بالإنترنت حالياً</p>
      <p>تحقق من الاتصال وحاول مرة أخرى</p>
    </div>
    <button class="btn" onclick="location.reload()">🔄 إعادة المحاولة</button>
    <button class="btn btn2" onclick="location.href='/dashboard'">📱 فتح الصفحة المحفوظة</button>
    <div class="status"><div class="dot"></div><span>غير متصل</span></div>
  </div>
  <script>
    window.addEventListener('online', () => location.reload())
    setInterval(() => { if(navigator.onLine) location.reload() }, 5000)
  </script>
</body>
</html>`
}
