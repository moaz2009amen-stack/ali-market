// ============================================================
// Service Worker - نسخة محسنة تمنع صفحة الديناصور
// public/sw.js
// ============================================================

const CACHE_VERSION = 'v5'
const CACHE_NAME    = `abuali-${CACHE_VERSION}`

// الصفحات والملفات اللي لازم تتحفظ للـ offline
const PRECACHE_URLS = [
  '/',
  '/dashboard',
  '/dashboard/invoices',
  '/dashboard/customers',
  '/dashboard/products',
  '/dashboard/payments',
  '/manifest.json',
]

// ============================================================
// Install — حفظ الصفحات الأساسية في الـ cache
// ============================================================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // حفظ كل صفحة واحدة واحدة — لو فيه error في صفحة ما يوقفش الباقي
      for (const url of PRECACHE_URLS) {
        try {
          await cache.add(url)
        } catch (e) {
          console.log('[SW] Could not cache:', url, e.message)
        }
      }
    })
  )
  self.skipWaiting()
})

// ============================================================
// Activate — امسح الـ cache القديم
// ============================================================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter(k => k.startsWith('abuali-') && k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  )
})

// ============================================================
// Fetch — الاستراتيجية الصح لكل نوع request
// ============================================================
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // تجاهل non-GET و chrome-extension وغيرها
  if (request.method !== 'GET') return
  if (!url.protocol.startsWith('http')) return

  // ── Supabase: دايماً Network، لو فشل رجع JSON error ──
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(
          JSON.stringify({ error: 'offline', message: 'No internet connection' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        )
      )
    )
    return
  }

  // ── ملفات _next/static: Cache First (بيتغيروش) ──
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached
        return fetch(request).then(response => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then(c => c.put(request, clone))
          }
          return response
        })
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
            const clone = response.clone()
            caches.open(CACHE_NAME).then(c => c.put(request, clone))
          }
          return response
        })
        .catch(() => caches.match(request))
    )
    return
  }

  // ── صفحات HTML: Network First مع Cache Fallback ──
  // ده اللي بيمنع صفحة الديناصور
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then(c => c.put(request, clone))
          }
          return response
        })
        .catch(async () => {
          // جرب الصفحة نفسها أولاً
          const cached = await caches.match(request)
          if (cached) return cached

          // جرب /dashboard كـ fallback لأي صفحة dashboard
          if (url.pathname.startsWith('/dashboard')) {
            const dashCached = await caches.match('/dashboard')
            if (dashCached) return dashCached
          }

          // آخر حل — الصفحة الرئيسية
          const rootCached = await caches.match('/')
          if (rootCached) return rootCached

          // لو مفيش أي cache خالص — offline page
          return new Response(getOfflinePage(), {
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
          })
        })
    )
    return
  }

  // ── أي request تاني: Network First ──
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  )
})

// ============================================================
// صفحة الـ Offline المدمجة (بدلاً من صفحة الديناصور)
// ============================================================
function getOfflinePage() {
  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>جملة أبو علي</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#eff6ff;direction:rtl;padding:1rem}
    .card{background:#fff;border-radius:20px;padding:2rem;text-align:center;max-width:360px;width:100%;box-shadow:0 10px 40px rgba(0,0,0,.1)}
    .logo{width:64px;height:64px;background:#2563eb;border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 1rem;font-size:1.8rem}
    h1{font-size:1.4rem;color:#1e3a8a;margin-bottom:.25rem;font-weight:700}
    .sub{color:#64748b;font-size:.8rem;margin-bottom:1.5rem}
    .msg{background:#fef9c3;border:1px solid #fde68a;border-radius:12px;padding:.875rem;margin-bottom:1.5rem;color:#854d0e;font-size:.85rem;line-height:1.6}
    .btn{display:flex;align-items:center;justify-content:center;gap:.5rem;width:100%;background:#2563eb;color:#fff;border:none;padding:.875rem;border-radius:12px;font-size:.95rem;font-weight:600;cursor:pointer;font-family:inherit;margin-bottom:.75rem}
    .btn:hover{background:#1d4ed8}
    .btn2{background:#f1f5f9;color:#334155}
    .btn2:hover{background:#e2e8f0}
    .status{display:flex;align-items:center;justify-content:center;gap:.5rem;margin-top:1rem;font-size:.75rem;color:#94a3b8}
    .dot{width:8px;height:8px;background:#ef4444;border-radius:50%;animation:p 1.5s infinite}
    @keyframes p{0%,100%{opacity:1}50%{opacity:.3}}
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">🛒</div>
    <h1>جملة أبو علي</h1>
    <p class="sub">نظام إدارة المخزن</p>
    <div class="msg">📡 لا يوجد اتصال بالإنترنت<br>التطبيق يعمل بالبيانات المحفوظة</div>
    <button class="btn" onclick="location.href='/dashboard'">📱 فتح الداشبورد</button>
    <button class="btn btn2" onclick="location.reload()">🔄 إعادة المحاولة</button>
    <div class="status"><div class="dot"></div><span id="st">غير متصل</span></div>
  </div>
  <script>
    // لما يرجع النت يفتح الداشبورد تلقائي
    window.addEventListener('online', () => { location.href = '/dashboard' })
    setInterval(() => { if(navigator.onLine) location.href = '/dashboard' }, 3000)
  </script>
</body>
</html>`
}
