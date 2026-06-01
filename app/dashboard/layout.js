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

const AUTH_KEY = 'abuali_auth'

function saveAuth(user) {
  try {
    localStorage.setItem(AUTH_KEY, JSON.stringify({
      id: user.id, email: user.email,
      cached_at: Date.now()
    }))
  } catch (e) {}
}

function loadAuth() {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    if (!raw) return null
    const d = JSON.parse(raw)
    // صالح 7 أيام
    if (Date.now() - d.cached_at > 7 * 24 * 60 * 60 * 1000) {
      localStorage.removeItem(AUTH_KEY)
      return null
    }
    return d
  } catch (e) { return null }
}

function clearAuth() {
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
  const [pendingSync, setPendingSync] = useState(0)
  const syncingRef  = useRef(false)
  const checkedRef  = useRef(false)

  useEffect(() => {
    if (checkedRef.current) return
    checkedRef.current = true

    checkAuth()
    setIsOffline(!navigator.onLine)
    updatePendingCount()

    const onOnline = async () => {
      setIsOffline(false)
      await runSync()
    }
    const onOffline = () => setIsOffline(true)

    window.addEventListener('online',  onOnline)
    window.addEventListener('offline', onOffline)

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') { clearAuth(); router.push('/login') }
    })

    return () => {
      window.removeEventListener('online',  onOnline)
      window.removeEventListener('offline', onOffline)
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => { setSidebarOpen(false) }, [pathname])

  async function checkAuth() {
    try {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (u) { saveAuth(u); setUser(u); setLoading(false); return }
      clearAuth(); router.push('/login')
    } catch (e) {
      // offline — جرب الـ cache
      const cached = loadAuth()
      if (cached) { setUser(cached); setIsOffline(true); setLoading(false) }
      else router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  async function updatePendingCount() {
    const count = await getPendingCount()
    setPendingSync(count)
  }

  // ✅ المزامنة التلقائية لما النت يرجع
  async function runSync() {
    if (syncingRef.current) return
    syncingRef.current = true

    const count = await getPendingCount()
    if (count === 0) { syncingRef.current = false; return }

    const toastId = toast.loading(`جاري رفع ${count} عملية محفوظة...`)
    try {
      const { synced, failed } = await syncQueue(supabase)
      await updatePendingCount()

      if (synced > 0 && failed === 0) {
        toast.success(`تم رفع ${synced} عملية بنجاح ✓`, { id: toastId })
      } else if (failed > 0) {
        toast.error(`تم ${synced} ، فشل ${failed} — تحقق من البيانات`, { id: toastId })
      } else {
        toast.dismiss(toastId)
      }
    } catch (e) {
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
          <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse flex-shrink-0" />
              <span className="text-yellow-800 text-sm font-medium">
                وضع بدون إنترنت — التغييرات محفوظة محلياً
              </span>
            </div>
            {pendingSync > 0 && (
              <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full font-medium">
                {pendingSync} عملية منتظرة
              </span>
            )}
          </div>
        )}

        {/* شريط المزامنة لما يرجع النت وفيه عمليات */}
        {!isOffline && pendingSync > 0 && (
          <div className="bg-primary-50 border-b border-primary-200 px-4 py-2 flex items-center justify-between">
            <span className="text-primary-800 text-sm font-medium">
              يوجد {pendingSync} عملية لم تُرفع بعد
            </span>
            <button
              onClick={runSync}
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
