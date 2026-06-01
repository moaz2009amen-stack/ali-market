'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Card from '@/components/ui/Card'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { Bell, AlertTriangle, DollarSign, Package, CheckCircle } from 'lucide-react'
import { formatCurrency, formatDateTime } from '@/lib/utils/format'
import toast from 'react-hot-toast'

export default function NotificationsPage() {
  const supabase = createClient()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchNotifications()
    generateAutoNotifications()
  }, [])

  async function fetchNotifications() {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      setNotifications(data || [])
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  async function generateAutoNotifications() {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      // ✅ إصلاح: جيب المنتجات وفلتر في JavaScript بدل query خاطئ
      const { data: allProducts } = await supabase
        .from('products')
        .select('name, quantity, min_stock')
        .eq('is_active', true)

      const lowStockProducts = (allProducts || []).filter(
        p => p.quantity <= (p.min_stock || 5)
      ).slice(0, 5)

      // ✅ إصلاح: تحقق من وجود الإشعار قبل إضافته (منع التكرار)
      for (const product of lowStockProducts) {
        const today = new Date().toISOString().split('T')[0]

        const { data: existing } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', user.id)
          .eq('title', 'منتج منخفض')
          .ilike('message', `%${product.name}%`)
          .gte('created_at', today)
          .limit(1)

        if (!existing || existing.length === 0) {
          await supabase.from('notifications').insert({
            user_id: user.id,
            title: 'منتج منخفض',
            message: `المنتج "${product.name}" وصل لأقل كمية (${product.quantity} متبقي)`,
            type: 'warning'
          })
        }
      }

      // ✅ إصلاح: نفس المنطق للعملاء ذوي الديون العالية
      const { data: debtCustomers } = await supabase
        .from('customers')
        .select('name, total_debt')
        .gt('total_debt', 1000)
        .eq('is_active', true)
        .order('total_debt', { ascending: false })
        .limit(5)

      for (const customer of (debtCustomers || [])) {
        const today = new Date().toISOString().split('T')[0]

        const { data: existing } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', user.id)
          .eq('title', 'دين مرتفع')
          .ilike('message', `%${customer.name}%`)
          .gte('created_at', today)
          .limit(1)

        if (!existing || existing.length === 0) {
          await supabase.from('notifications').insert({
            user_id: user.id,
            title: 'دين مرتفع',
            message: `العميل "${customer.name}" عليه دين ${formatCurrency(customer.total_debt)}`,
            type: 'danger'
          })
        }
      }

      fetchNotifications()
    } catch (error) {
      console.error('Error generating notifications:', error)
    }
  }

  async function markAsRead(id) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id)

      if (error) throw error

      setNotifications(notifications.map(n =>
        n.id === id ? { ...n, is_read: true } : n
      ))
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  async function markAllAsRead() {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false)

      if (error) throw error

      setNotifications(notifications.map(n => ({ ...n, is_read: true })))
      toast.success('تم تحديد جميع الإشعارات كمقروءة')
    } catch (error) {
      console.error('Error marking all as read:', error)
      toast.error('حدث خطأ')
    }
  }

  const getIcon = (type) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="text-warning-600" size={20} />
      case 'danger':  return <DollarSign   className="text-danger-600"  size={20} />
      case 'success': return <CheckCircle  className="text-success-600" size={20} />
      default:        return <Bell         className="text-primary-600" size={20} />
    }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="text-primary-600" size={28} />
            <div>
              <h2 className="text-xl font-bold text-gray-900">الإشعارات</h2>
              <p className="text-sm text-gray-600">
                {unreadCount > 0 ? `${unreadCount} إشعار جديد` : 'لا توجد إشعارات جديدة'}
              </p>
            </div>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              تحديد الكل كمقروء
            </button>
          )}
        </div>
      </Card>

      <Card>
        <div className="space-y-3">
          {notifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">لا توجد إشعارات</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => !notification.is_read && markAsRead(notification.id)}
                className={`
                  p-4 rounded-lg border cursor-pointer transition-colors
                  ${notification.is_read
                    ? 'bg-white border-gray-200'
                    : 'bg-primary-50 border-primary-200'
                  }
                  hover:bg-gray-50
                `}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0 border border-gray-100">
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{notification.title}</h3>
                      {!notification.is_read && (
                        <span className="w-2 h-2 bg-primary-600 rounded-full flex-shrink-0 mt-1.5" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                    <p className="text-xs text-gray-500">{formatDateTime(notification.created_at)}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  )
}
