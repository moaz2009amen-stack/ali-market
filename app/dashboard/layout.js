'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { syncQueue, getPendingCount } from '@/lib/offline/offlineDb'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import MobileNav from '@/components/layout/MobileNav'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast'

const AUTH_KEY = 'abuali_auth_v2'

function saveAuthCache(user) {
  try {
    localStorage.setItem(AUTH_KEY, JSON.stringify({
      id: user.id, email: user.email, cached_at: Date.now()
    }))
  } catch (e) {}
}

function loadAuthCache() {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    if (!raw) return null
    const d = JSON.parse(raw)
    // صالح 30 يوم
    if (Date.now() - d.cached_at > 30 * 24 * 60 * 60 * 1000) {
      localStorage.removeItem(AUTH_KEY)
      return null
    }
    return d
  } catch { return null }
}

function clearAuthCache() {
  try { localStorage.removeItem(AUTH_KEY) } catch (e) {}
}

export default function DashboardLayout({ children }) {
  const router   = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser]               = useState(null)
  const [loading, setLoading]         = useState(true)
  const [isOffline, setIsOffline]     = useState(false)
  const [pendingCount, setPendingCount] = useState(0)

  const checkedRef = useRef(false)
  const syncingRef = useRef(false)

  useEffect(() => {
    if (checkedRef.current) return
    checkedRef.current = true

    initAuth()

    const onOnline  = () => { setIsOffline(false); triggerSync() }
    const onOffline = () => setIsOffline(true)
    window.addEventListener('online',  onOnline)
    window.addEventListener('offline', onOffline)
    setIsOffline(!navigator.onLine)

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') { clearAuthCache(); router.push('/login') }
    })

    return () => {
      window.removeEventListener('online',  onOnline)
      window.removeEventListener('offline', onOffline)
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => { setSidebarOpen(false) }, [pathname])

  // تحديث عداد الـ pending كل مرة يتفتح فيها صفحة
  useEffect(() => { refreshPendingCount() }, [pathname])

  async function initAuth() {
    try {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (u) {
        saveAuthCache(u)
        setUser(u)
        setLoading(false)
        await refreshPendingCount()
        return
      }
      // مفيش session نشط
      clearAuthCache()
      router.push('/login')
    } catch {
      // offline أو network error — جرب الـ cache
      const cached = loadAuthCache()
      if (cached) {
        setUser(cached)
        setIsOffline(true)
        setLoading(false)
        await refreshPendingCount()
      } else {
        // مفيش cache — محتاج login
        router.push('/login')
      }
    } finally {
      setLoading(false)
    }
  }

  async function refreshPendingCount() {
    const count = await getPendingCount()
    setPendingCount(count)
  }

  async function triggerSync() {
    if (syncingRef.current) return
    const count = await getPendingCount()
    if (count === 0) { await refreshPendingCount(); return }

    syncingRef.current = true
    const toastId = toast.loading(`جاري رفع ${count} عملية...`)
    try {
      const { synced, failed } = await syncQueue(supabase)
      await refreshPendingCount()
      if (synced > 0 && failed === 0) {
        toast.success(`✓ تم رفع ${synced} عملية بنجاح`, { id: toastId })
      } else if (synced > 0 && failed > 0) {
        toast.error(`تم ${synced} ، فشل ${failed}`, { id: toastId })
      } else if (failed > 0) {
        toast.error(`فشل رفع ${failed} عملية`, { id: toastId })
      } else {
        toast.dismiss(toastId)
      }
    } catch {
      toast.error('حدث خطأ أثناء المزامنة', { id: toastId })
    } finally {
      syncingRef.current = false
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <LoadingSpinner size="lg" />
    </div>
  )
  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50 flex" dir="rtl">
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: { background: '#fff', color: '#111', fontFamily: 'Cairo, sans-serif' },
          success: { iconTheme: { primary: '#16a34a', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#dc2626', secondary: '#fff' } },
        }}
      />

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} userRole="owner" />

      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">

        {/* شريط الـ Offline */}
        {isOffline && (
          <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse flex-shrink-0" />
              <span className="text-yellow-800 text-sm font-medium">
                بدون إنترنت — التغييرات محفوظة على الجهاز
              </span>
            </div>
            {pendingCount > 0 && (
              <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                {pendingCount} عملية
              </span>
            )}
          </div>
        )}

        {/* شريط المزامنة لما يرجع النت */}
        {!isOffline && pendingCount > 0 && (
          <div className="bg-primary-50 border-b border-primary-200 px-4 py-2 flex items-center justify-between gap-2">
            <span className="text-primary-800 text-sm font-medium">
              {pendingCount} عملية لم تُرفع بعد
            </span>
            <button
              onClick={triggerSync}
              className="text-xs bg-primary-600 text-white px-3 py-1 rounded-full font-medium hover:bg-primary-700 transition-colors"
            >
              رفع الآن
            </button>
          </div>
        )}

        <Header onMenuClick={() => setSidebarOpen(p => !p)} />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-20 lg:pb-8">
          {children}
        </main>

        <MobileNav userRole="owner" />
      </div>
    </div>
  )
}
