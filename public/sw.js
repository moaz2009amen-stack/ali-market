// ============================================================
// Service Worker - App Shell Pattern للـ Next.js على Vercel
// public/sw.js
// ============================================================

const CACHE_NAME = 'abuali-v6'

// ملفات ثابتة فقط — مش صفحات HTML (لأن Next.js SSR مش قابل للـ precache)
const STATIC_ASSETS = [
  '/manifest.json',
]

// ============================================================
// Install
// ============================================================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(() => {})
    })
  )
  self.skipWaiting()
})

// ============================================================
// Activate — امسح الـ cache القديم
// ============================================================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  )
})

// ============================================================
// Fetch
// ============================================================
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // تجاهل أي حاجة مش HTTP
  if (!url.protocol.startsWith('http')) return
  if (request.method !== 'GET') return

  // ── Supabase: Network Only دايماً ──
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(
          JSON.stringify({ error: 'offline' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        )
      )
    )
    return
  }

  // ── ملفات _next/static: Cache First (مش بتتغيرش) ──
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached
        return fetch(request).then(response => {
          if (response.ok) {
            caches.open(CACHE_NAME).then(c => c.put(request, response.clone()))
          }
          return response
        }).catch(() => new Response('', { status: 404 }))
      })
    )
    return
  }

  // ── باقي ملفات _next: Network First ──
  if (url.pathname.startsWith('/_next/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            caches.open(CACHE_NAME).then(c => c.put(request, response.clone()))
          }
          return response
        })
        .catch(() => caches.match(request).then(c => c || new Response('', { status: 503 })))
    )
    return
  }

  // ── manifest.json: Cache First ──
  if (url.pathname === '/manifest.json') {
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request))
    )
    return
  }

  // ── صفحات HTML (dashboard, login, etc): Network First ──
  // ✅ الفرق المهم: لو offline مش بنعرض صفحة offline — بنسكت ونخلي
  // الـ dashboard_layout يتحكم (هو عنده الـ auth cache)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // احفظ الصفحة في الـ cache لو نجح
          if (response.ok) {
            caches.open(CACHE_NAME).then(c => c.put(request, response.clone()))
          }
          return response
        })
        .catch(async () => {
          // جرب الـ cache أولاً
          const cached = await caches.match(request)
          if (cached) return cached

          // جرب أي صفحة dashboard محفوظة
          const keys   = await caches.keys()
          const cache  = await caches.open(keys[0] || CACHE_NAME)
          const allKeys = await cache.keys()

          // دور على أي صفحة dashboard متحفظة
          for (const key of allKeys) {
            if (key.url.includes('/dashboard')) {
              const r = await cache.match(key)
              if (r) return r
            }
          }

          // آخر حل: صفحة بسيطة تعمل redirect للـ JS
          return new Response(
            `<!DOCTYPE html>
<html dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>جملة أبو علي</title>
  <style>
    body{margin:0;font-family:Arial,sans-serif;background:#eff6ff;display:flex;align-items:center;justify-content:center;min-height:100vh;direction:rtl}
    .box{background:#fff;border-radius:16px;padding:2rem;text-align:center;max-width:320px;width:90%;box-shadow:0 4px 20px rgba(0,0,0,.1)}
    h1{color:#1e3a8a;font-size:1.3rem;margin-bottom:.5rem}
    p{color:#64748b;font-size:.85rem;margin-bottom:1.5rem}
    button{background:#2563eb;color:#fff;border:none;padding:.75rem 1.5rem;border-radius:10px;font-size:1rem;cursor:pointer;width:100%;font-family:inherit}
  </style>
</head>
<body>
  <div class="box">
    <h1>🛒 جملة أبو علي</h1>
    <p>التطبيق يعمل بالبيانات المحفوظة</p>
    <button onclick="window.location.replace('/dashboard')">فتح الداشبورد</button>
  </div>
  <script>
    if(navigator.onLine) window.location.replace('/dashboard')
    window.addEventListener('online', () => window.location.replace('/dashboard'))
  </script>
</body>
</html>`,
            { status: 200, headers: { 'Content-Type': 'text/html;charset=utf-8' } }
          )
        })
    )
    return
  }

  // أي request تاني: Network First
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  )
})
