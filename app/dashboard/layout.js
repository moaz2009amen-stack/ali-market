'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import MobileNav from '@/components/layout/MobileNav'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { Toaster } from 'react-hot-toast'

// ✅ Cache بسيط للـ auth state — بيحل مشكلة "لا يعمل بدون نت"
const AUTH_CACHE_KEY = 'auth_user_cache'

function saveAuthCache(userData) {
  try {
    localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify({
      ...userData,
      cached_at: Date.now()
    }))
  } catch (e) {}
}

function getAuthCache() {
  try {
    const raw = localStorage.getItem(AUTH_CACHE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    // الـ cache صالح لـ 7 أيام
    if (Date.now() - data.cached_at > 7 * 24 * 60 * 60 * 1000) {
      localStorage.removeItem(AUTH_CACHE_KEY)
      return null
    }
    return data
  } catch (e) { return null }
}

function clearAuthCache() {
  try { localStorage.removeItem(AUTH_CACHE_KEY) } catch (e) {}
}

export default function DashboardLayout({ children }) {
  const router   = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser]               = useState(null)
  const [loading, setLoading]         = useState(true)
  const [isOffline, setIsOffline]     = useState(false)
  const checkedRef = useRef(false)

  useEffect(() => {
    if (checkedRef.current) return
    checkedRef.current = true
    checkAuth()

    // مراقبة حالة الاتصال
    const onOnline  = () => { setIsOffline(false); checkAuth() }
    const onOffline = () => setIsOffline(true)
    window.addEventListener('online',  onOnline)
    window.addEventListener('offline', onOffline)
    setIsOffline(!navigator.onLine)

    // مراقبة تسجيل الخروج
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        clearAuthCache()
        router.push('/login')
      }
    })

    return () => {
      window.removeEventListener('online',  onOnline)
      window.removeEventListener('offline', onOffline)
      subscription.unsubscribe()
    }
  }, [])

  // أغلق الـ sidebar لما الصفحة تتغير على الموبايل
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  async function checkAuth() {
    try {
      // ✅ جرب الـ Supabase الأول
      const { data: { user: supaUser } } = await supabase.auth.getUser()

      if (supaUser) {
        // ✅ احفظ في الـ cache عشان الـ offline
        const userData = { id: supaUser.id, email: supaUser.email }
        saveAuthCache(userData)
        setUser(userData)
        setLoading(false)
        return
      }

      // مفيش session — روح للـ login
      clearAuthCache()
      router.push('/login')
    } catch (error) {
      // ✅ لو فيه error (offline أو network issue) — جرب الـ cache
      const cached = getAuthCache()
      if (cached) {
        setUser(cached)
        setIsOffline(true)
        setLoading(false)
        return
      }

      // مفيش cache — محتاج login
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50 flex" dir="rtl">
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#fff',
            color: '#111',
            fontFamily: 'Cairo, sans-serif',
          },
          success: { iconTheme: { primary: '#16a34a', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#dc2626', secondary: '#fff' } },
        }}
      />

      {/* ✅ مررنا userRole كـ 'owner' ثابت — مستخدم واحد بس */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userRole="owner"
      />

      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {isOffline && (
          <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 flex items-center gap-2">
            <span className="w-2 h-2 bg-yellow-500 rounded-full flex-shrink-0 animate-pulse" />
            <span className="text-yellow-800 text-sm font-medium">
              وضع بدون إنترنت — تعمل بالبيانات المحفوظة على الجهاز
            </span>
          </div>
        )}

        <Header onMenuClick={() => setSidebarOpen(prev => !prev)} />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-20 lg:pb-8">
          {children}
        </main>

        <MobileNav userRole="owner" />
      </div>
    </div>
  )
}
