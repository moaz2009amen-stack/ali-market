'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { User, Lock, ShoppingBag } from 'lucide-react'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [formData, setFormData] = useState({
    email: 'owner@alimarket.com',  // قيمة افتراضية للتجربة
    password: '123456'
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    console.log('🔐 محاولة تسجيل الدخول...')
    console.log('📧 Email:', formData.email)
    
    try {
      // تسجيل الدخول المباشر
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })

      console.log('📊 Response Data:', data)
      console.log('❌ Error:', error)

      if (error) {
        console.error('🚫 خطأ في تسجيل الدخول:', error.message)
        toast.error(`خطأ: ${error.message}`)
        setLoading(false)
        return
      }

      if (data.user) {
        console.log('✅ تم تسجيل الدخول بنجاح!')
        console.log('👤 User:', data.user)
        
        toast.success('تم تسجيل الدخول بنجاح')
        
        // الانتقال للـ Dashboard
        setTimeout(() => {
          router.push('/dashboard')
          router.refresh()
        }, 500)
      }
    } catch (error) {
      console.error('💥 Exception:', error)
      toast.error('حدث خطأ غير متوقع')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-4">
      <div className="w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4">
            <ShoppingBag className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Ali Market</h1>
          <p className="text-gray-600">نظام إدارة المخزن والمبيعات</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            تسجيل الدخول
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="البريد الإلكتروني"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="owner@alimarket.com"
              icon={<User size={20} />}
              required
            />

            <Input
              label="كلمة المرور"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              icon={<Lock size={20} />}
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={loading}
            >
              {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
            </Button>
          </form>

          {/* بيانات الدخول التجريبية */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800 text-center">
              <strong>بيانات الدخول:</strong><br />
              owner@alimarket.com / 123456
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-600 text-sm mt-6">
          © 2024 Ali Market. جميع الحقوق محفوظة
        </p>
      </div>
    </div>
  )
}
