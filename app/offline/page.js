'use client'
import { useEffect, useState } from 'react'
import { ShoppingBag, WifiOff, RefreshCw } from 'lucide-react'

export default function OfflinePage() {
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    // لما يرجع الإنترنت ارجع للداشبورد تلقائياً
    const handleOnline = () => {
      window.location.href = '/dashboard'
    }
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [])

  const handleRetry = () => {
    setChecking(true)
    setTimeout(() => {
      if (navigator.onLine) {
        window.location.href = '/dashboard'
      } else {
        setChecking(false)
      }
    }, 1500)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 px-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center">
        
        {/* Logo */}
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
          <ShoppingBag className="text-white" size={32} />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-1">جملة أبو علي</h1>
        <p className="text-gray-500 text-sm mb-6">نظام إدارة المخزن والمبيعات</p>

        {/* أيقونة عدم الاتصال */}
        <div className="inline-flex items-center justify-center w-20 h-20 bg-red-50 rounded-full mb-4">
          <WifiOff className="text-red-500" size={36} />
        </div>

        <h2 className="text-lg font-bold text-gray-800 mb-2">لا يوجد اتصال بالإنترنت</h2>
        <p className="text-gray-500 text-sm mb-6 leading-relaxed">
          يحتاج التطبيق لاتصال بالإنترنت للوصول للبيانات.
          تحقق من اتصالك وحاول مرة أخرى.
        </p>

        {/* زر المحاولة */}
        <button
          onClick={handleRetry}
          disabled={checking}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-60"
        >
          <RefreshCw size={18} className={checking ? 'animate-spin' : ''} />
          {checking ? 'جاري التحقق...' : 'إعادة المحاولة'}
        </button>

        {/* مؤشر الحالة */}
        <div className="flex items-center justify-center gap-2 mt-4">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-xs text-gray-400">غير متصل بالإنترنت</span>
        </div>
      </div>
    </div>
  )
}
