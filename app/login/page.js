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
    username: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.username || !formData.password) {
      toast.error('يرجى إدخال اسم المستخدم وكلمة المرور')
      return
    }
    
    setLoading(true)
    
    try {
      // البحث عن المستخدم
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('email, role')
        .eq('username', formData.username)
        .single()

      if (!user) {
        toast.error('اسم المستخدم أو كلمة المرور غير صحيحة')
        setLoading(false)
        return
      }

      // تسجيل الدخول
      const { data, error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: formData.password,
      })

      if (error) {
        toast.error('كلمة المرور غير صحيحة')
        setLoading(false)
        return
      }

      toast.success('تم تسجيل الدخول بنجاح')
      router.push('/dashboard')
      router.refresh()
      
    } catch (error) {
      console.error('Login error:', error)
      toast.error('حدث خطأ غير متوقع')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4">
            <ShoppingBag className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Ayman Market</h1>
          <p className="text-gray-600">نظام إدارة المخزن والمبيعات</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            تسجيل الدخول
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="اسم المستخدم"
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="اسم المستخدم"
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
        </div>

        <p className="text-center text-gray-600 text-sm mt-6">
          © 2024 Ayman Market. جميع الحقوق محفوظة
        </p>
      </div>
    </div>
  )
}
