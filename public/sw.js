const CACHE_NAME = 'jamlat-abu-ali-v2'
const STATIC_CACHE = 'static-v2'
const DATA_CACHE = 'data-v2'

// الملفات الأساسية للـ Offline
const STATIC_FILES = [
  '/',
  '/login',
  '/dashboard',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/favicon.ico',
]

// ===== Install =====
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...')
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching static files')
      return cache.addAll(STATIC_FILES).catch(err => {
        console.log('[SW] Cache addAll error (non-fatal):', err)
      })
    })
  )
  self.skipWaiting()
})

// ===== Activate =====
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter(name => name !== STATIC_CACHE && name !== DATA_CACHE)
          .map(name => {
            console.log('[SW] Deleting old cache:', name)
            return caches.delete(name)
          })
      )
    })
  )
  self.clients.claim()
})

// ===== Fetch =====
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // تجاهل طلبات غير GET
  if (request.method !== 'GET') return

  // تجاهل طلبات Supabase - دايماً من الإنترنت
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({ error: 'offline', message: 'لا يوجد اتصال بالإنترنت' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        )
      })
    )
    return
  }

  // تجاهل ملفات Next.js الداخلية
  if (url.pathname.startsWith('/_next/')) {
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(response => {
        const clone = response.clone()
        caches.open(STATIC_CACHE).then(cache => cache.put(request, clone))
        return response
      }).catch(() => cached))
    )
    return
  }

  // الصفحات - Network First مع Fallback للـ Cache
  event.respondWith(
    fetch(request)
      .then(response => {
        // حفظ نسخة في الـ cache
        if (response.ok) {
          const clone = response.clone()
          caches.open(STATIC_CACHE).then(cache => cache.put(request, clone))
        }
        return response
      })
      .catch(() => {
        // لو مفيش إنترنت، رجّع من الـ cache
        return caches.match(request).then(cached => {
          if (cached) return cached
          // لو مش موجود في الـ cache، رجّع صفحة offline
          if (request.mode === 'navigate') {
            return caches.match('/').then(home => home || new Response(
              getOfflinePage(),
              { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
            ))
          }
          return new Response('Offline', { status: 503 })
        })
      })
  )
})

// ===== صفحة Offline =====
function getOfflinePage() {
  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>جملة أبو علي - غير متصل</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Arial, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f8fafc;
      direction: rtl;
    }
    .container {
      text-align: center;
      padding: 2rem;
      max-width: 400px;
    }
    .icon {
      width: 80px; height: 80px;
      background: #dbeafe;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 1.5rem;
      font-size: 2rem;
    }
    h1 { font-size: 1.5rem; color: #1e40af; margin-bottom: 0.5rem; }
    p { color: #64748b; margin-bottom: 1.5rem; line-height: 1.6; }
    button {
      background: #2563eb; color: white;
      border: none; padding: 0.75rem 2rem;
      border-radius: 0.5rem; font-size: 1rem;
      cursor: pointer; width: 100%;
    }
    button:hover { background: #1d4ed8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">📡</div>
    <h1>جملة أبو علي</h1>
    <p>لا يوجد اتصال بالإنترنت حالياً.<br>تحقق من اتصالك وحاول مرة أخرى.</p>
    <button onclick="location.reload()">إعادة المحاولة</button>
  </div>
</body>
</html>`
}
