'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { saveToCache, getFromCache, isOnline, addToQueue } from '@/lib/offline/offlineDb'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { Plus, DollarSign, TrendingUp, Calendar, WifiOff } from 'lucide-react'
import { formatCurrency, formatDateTime } from '@/lib/utils/format'
import toast from 'react-hot-toast'

function localUUID() {
  return 'local_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9)
}

export default function PaymentsPage() {
  const supabase = createClient()

  const [payments, setPayments]   = useState([])
  const [customers, setCustomers] = useState([])
  const [loading, setLoading]     = useState(true)
  const [offline, setOffline]     = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving]       = useState(false)
  const [formData, setFormData]   = useState({
    customer_id: '', amount: '', payment_method: 'نقدي', notes: ''
  })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    fetchData()
    setOffline(!navigator.onLine)
    const onOnline  = () => { setOffline(false); fetchData() }
    const onOffline = () => setOffline(true)
    window.addEventListener('online',  onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online',  onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  async function fetchData() {
    if (!isOnline()) {
      setOffline(true)
      const [cachedPayments, cachedCustomers] = await Promise.all([
        getFromCache('payments'),
        getFromCache('customers')
      ])
      setPayments(cachedPayments.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)))
      setCustomers(cachedCustomers.filter(c => c.is_active && (c.total_debt || 0) > 0))
      setLoading(false)
      return
    }

    try {
      const [{ data: paymentsData }, { data: customersData }] = await Promise.all([
        supabase.from('payments')
          .select('*, customers(name), users(full_name, username)')
          .order('created_at', { ascending: false }),
        supabase.from('customers')
          .select('id, name, total_debt')
          .gt('total_debt', 0)
          .eq('is_active', true)
          .order('name')
      ])

      const p = (paymentsData || []).map(p => ({
        ...p,
        customer_name:    p.customers?.name || 'غير معروف',
        collected_by_name: p.users?.full_name || p.users?.username || 'صاحب المحل'
      }))
      const c = customersData || []

      setPayments(p)
      setCustomers(c)
      await saveToCache('payments',  p)
      await saveToCache('customers', c)
    } catch (error) {
      const [cp, cc] = await Promise.all([getFromCache('payments'), getFromCache('customers')])
      setPayments(cp.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)))
      setCustomers(cc.filter(c => c.is_active && (c.total_debt || 0) > 0))
      setOffline(true)
    } finally {
      setLoading(false)
    }
  }

  const validate = () => {
    const errs = {}
    if (!formData.customer_id) errs.customer_id = 'يرجى اختيار العميل'
    if (!formData.amount || parseFloat(formData.amount) <= 0) errs.amount = 'المبلغ غير صحيح'
    const customer = customers.find(c => c.id === formData.customer_id)
    if (customer && parseFloat(formData.amount) > customer.total_debt) {
      errs.amount = `المبلغ أكبر من الدين (${formatCurrency(customer.total_debt)})`
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)

    const amount      = parseFloat(formData.amount)
    const customer    = customers.find(c => c.id === formData.customer_id)
    const now         = new Date().toISOString()
    const paymentData = {
      id:             localUUID(),
      customer_id:    formData.customer_id,
      invoice_id:     null,
      amount,
      payment_method: formData.payment_method,
      notes:          formData.notes,
      created_at:     now,
      customer_name:  customer?.name || '',
      collected_by_name: 'صاحب المحل',
    }

    if (!isOnline()) {
      // ✅ حفظ offline
      try {
        // حدّث الـ cache المحلي للعميل
        const cachedCustomers = await getFromCache('customers')
        const updatedCustomers = cachedCustomers.map(c => {
          if (c.id !== formData.customer_id) return c
          return { ...c, total_debt: Math.max(0, (c.total_debt || 0) - amount) }
        })
        await saveToCache('customers', updatedCustomers)

        // أضف التحصيل للـ cache
        const cachedPayments = await getFromCache('payments')
        await saveToCache('payments', [paymentData, ...cachedPayments])

        // أضف للـ queue
        await addToQueue('payments', 'insert', paymentData)

        setPayments(prev => [paymentData, ...prev])
        setCustomers(prev => prev.map(c =>
          c.id === formData.customer_id
            ? { ...c, total_debt: Math.max(0, (c.total_debt || 0) - amount) }
            : c
        ).filter(c => c.total_debt > 0))

        toast.success('✓ تم حفظ التحصيل — سيُرفع عند عودة الإنترنت')
        closeModal()
      } catch (err) {
        toast.error('حدث خطأ في الحفظ')
      } finally {
        setSaving(false)
      }
      return
    }

    // ✅ online
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('payments').insert([{
        customer_id:    formData.customer_id,
        amount,
        payment_method: formData.payment_method,
        notes:          formData.notes,
        collected_by:   user.id
      }])
      if (error) throw error

      toast.success('تم تسجيل التحصيل بنجاح')
      await fetchData()
      closeModal()
    } catch (error) {
      toast.error('حدث خطأ في حفظ التحصيل')
    } finally {
      setSaving(false)
    }
  }

  const openModal = () => {
    setFormData({ customer_id: '', amount: '', payment_method: 'نقدي', notes: '' })
    setErrors({})
    setModalOpen(true)
  }
  const closeModal = () => { setModalOpen(false); setErrors({}) }

  const today = new Date().toISOString().split('T')[0]
  const stats = {
    total:       payments.length,
    todayCount:  payments.filter(p => p.created_at?.startsWith(today)).length,
    totalAmount: payments.reduce((s, p) => s + (p.amount || 0), 0),
    todayAmount: payments.filter(p => p.created_at?.startsWith(today))
                         .reduce((s, p) => s + (p.amount || 0), 0),
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]"><LoadingSpinner size="lg" /></div>
  )

  return (
    <div className="space-y-4 sm:space-y-6">
      {offline && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center gap-2">
          <WifiOff size={16} className="text-yellow-600 flex-shrink-0" />
          <span className="text-yellow-800 text-sm font-medium">
            بدون إنترنت — التحصيلات ستُرفع عند عودة الاتصال
          </span>
        </div>
      )}

      {/* إحصائيات */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: 'إجمالي التحصيلات', val: stats.total,       icon: DollarSign,  bg: 'bg-primary-100', color: 'text-primary-600', fmt: false },
          { label: 'تحصيلات اليوم',   val: stats.todayCount,  icon: Calendar,    bg: 'bg-success-100', color: 'text-success-600', fmt: false },
          { label: 'إجمالي المبالغ',  val: stats.totalAmount, icon: TrendingUp,  bg: 'bg-primary-100', color: 'text-primary-600', fmt: true  },
          { label: 'مبالغ اليوم',     val: stats.todayAmount, icon: DollarSign,  bg: 'bg-success-100', color: 'text-success-600', fmt: true  },
        ].map(({ label, val, icon: Icon, bg, color, fmt }) => (
          <Card key={label} padding={false} className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">{label}</p>
                <p className={`text-base sm:text-xl font-bold ${color}`}>
                  {fmt ? formatCurrency(val) : val}
                </p>
              </div>
              <div className={`w-10 h-10 ${bg} rounded-lg flex items-center justify-center`}>
                <Icon className={color} size={20} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card title="التحصيلات"
        action={
          <Button onClick={openModal} size="sm">
            <Plus size={18} />
            <span className="hidden sm:inline">تسجيل تحصيل</span>
          </Button>
        }
      >
        {/* Desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                {['التاريخ','العميل','المبلغ','طريقة الدفع','ملاحظات'].map(h => (
                  <th key={h} className="px-4 py-3 text-right text-sm font-semibold text-gray-700">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payments.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-gray-500">لا توجد تحصيلات</td></tr>
              ) : payments.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-500">{formatDateTime(p.created_at)}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{p.customer_name}</td>
                  <td className="px-4 py-3 font-bold text-success-600">{formatCurrency(p.amount)}</td>
                  <td className="px-4 py-3 text-gray-700">{p.payment_method}</td>
                  <td className="px-4 py-3 text-gray-500 text-sm">{p.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile */}
        <div className="md:hidden space-y-3">
          {payments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">لا توجد تحصيلات</div>
          ) : payments.map(p => (
            <div key={p.id} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-gray-900">{p.customer_name}</p>
                  <p className="text-xs text-gray-500">{formatDateTime(p.created_at)}</p>
                </div>
                <p className="font-bold text-success-600">{formatCurrency(p.amount)}</p>
              </div>
              <div className="text-sm text-gray-600">
                <span className="font-medium">{p.payment_method}</span>
                {p.notes && <span className="mr-2 text-gray-400">— {p.notes}</span>}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Modal isOpen={modalOpen} onClose={closeModal} title="تسجيل تحصيل جديد" size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="العميل"
            name="customer_id"
            value={formData.customer_id}
            onChange={e => setFormData(p => ({ ...p, customer_id: e.target.value }))}
            options={customers.map(c => ({
              value: c.id,
              label: `${c.name} — دين: ${formatCurrency(c.total_debt)}`
            }))}
            placeholder="اختر العميل"
            required
            error={errors.customer_id}
          />
          <Input
            label="المبلغ المحصّل"
            type="number"
            name="amount"
            value={formData.amount}
            onChange={e => setFormData(p => ({ ...p, amount: e.target.value }))}
            placeholder="0.00"
            step="0.01"
            required
            error={errors.amount}
          />
          <Select
            label="طريقة الدفع"
            name="payment_method"
            value={formData.payment_method}
            onChange={e => setFormData(p => ({ ...p, payment_method: e.target.value }))}
            options={[
              { value: 'نقدي',   label: 'نقدي' },
              { value: 'فيزا',   label: 'فيزا' },
              { value: 'تحويل', label: 'تحويل بنكي' },
              { value: 'شيك',   label: 'شيك' },
            ]}
          />
          <Input
            label="ملاحظات (اختياري)"
            name="notes"
            value={formData.notes}
            onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
            placeholder="أي ملاحظات..."
          />
          <div className="flex gap-3 pt-2">
            <Button type="submit" variant="primary" fullWidth disabled={saving}>
              {saving ? 'جاري الحفظ...' : offline ? '✓ حفظ محلياً' : 'تسجيل التحصيل'}
            </Button>
            <Button type="button" variant="secondary" fullWidth onClick={closeModal}>إلغاء</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
