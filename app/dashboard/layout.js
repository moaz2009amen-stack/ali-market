'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import MobileNav from '@/components/layout/MobileNav'
import Toast from '@/components/ui/Toast'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

export default function DashboardLayout({ children }) {
  const router = useRouter()
  const supabase = createClient()
  
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // التحقق من الجلسة المحفوظة
    checkUser()

    // الاستماع لتغييرات الـ Auth
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          router.push('/login')
        } else if (event === 'SIGNED_IN') {
          checkUser()
        }
      }
    )

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  async function checkUser() {
    try {
      // جلب الجلسة الحالية
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push('/login')
        return
      }

      const user = session.user
      setUser(user)

      // جلب role المستخدم
      const { data: userData, error } = await supabase
        .from('users')
        .select('role, username')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Error fetching user role:', error)
        setUserRole('employee')
      } else {
        setUserRole(userData?.role || 'employee')
      }
    } catch (error) {
      console.error('Auth error:', error)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Toast />
      
      <Sidebar 
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userRole={userRole}
      />

      <div className="flex-1 flex flex-col">
        <Header 
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        />
        
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 pb-20 lg:pb-6">
          {children}
        </main>
      </div>

      <MobileNav />
    </div>
  )
}
