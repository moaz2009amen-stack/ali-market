'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Table from '@/components/ui/Table'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { Plus, DollarSign, TrendingUp, Calendar } from 'lucide-react'
import { formatCurrency, formatDateTime } from '@/lib/utils/format'
import toast from 'react-hot-toast'

export default function PaymentsPage() {
  const supabase = createClient()
  const [payments, setPayments] = useState([])
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    customer_id: '',
    amount: '',
    payment_method: 'نقدي',
    notes: ''
  })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          *,
          customers (name),
          users (full_name, username)
        `)
        .order('created_at', { ascending: false })

      if (paymentsError) throw paymentsError

      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('id, name, total_debt')
        .gt('total_debt', 0)
        .eq('is_active', true)
        .order('name')

      if (customersError) throw customersError

      setPayments(paymentsData?.map(p => ({
        ...p,
        customer_name: p.customers?.name || 'غير معروف',
        collected_by_name: p.users?.full_name || p.users?.username || 'غير معروف'
      })) || [])
      
      setCustomers(customersData || [])
    } catch (error) {
      console.error('Error fetching payments:', error)
      toast.error('حدث خطأ في تحميل التحصيلات')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validate = () => {
    const newErrors = {}
    
    if (!formData.customer_id) newErrors.customer_id = 'يرجى اختيار العميل'
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'المبلغ غير صحيح'
    }
    
    const customer = customers.find(c => c.id === formData.customer_id)
    if (customer && parseFloat(formData.amount) > customer.total_debt) {
      newErrors.amount = `المبلغ أكبر من الدين المستحق (${formatCurrency(customer.total_debt)})`
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validate()) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      const { error } = await supabase
        .from('payments')
        .insert([{
          customer_id: formData.customer_id,
          amount: parseFloat(formData.amount),
          payment_method: formData.payment_method,
          notes: formData.notes,
          collected_by: user.id
        }])

      if (error) throw error
      
      toast.success('تم تسجيل التحصيل بنجاح')
      fetchData()
      closeModal()
    } catch (error) {
      console.error('Error saving payment:', error)
      toast.error('حدث خطأ في حفظ التحصيل')
    }
  }

  const openModal = () => {
    setFormData({
      customer_id: '',
      amount: '',
      payment_method: 'نقدي',
      notes: ''
    })
    setErrors({})
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setErrors({})
  }

  const columns = [
    { 
      header: 'التاريخ', 
      accessor: 'created_at',
      render: (row) => formatDateTime(row.created_at)
    },
    { header: 'العميل', accessor: 'customer_name' },
    { 
      header: 'المبلغ', 
      accessor: 'amount',
      render: (row) => (
        <span className="font-semibold text-success-600">
          {formatCurrency(row.amount)}
        </span>
      )
    },
    { header: 'طريقة الدفع', accessor: 'payment_method' },
    { header: 'المحصّل', accessor: 'collected_by_name' },
    { 
      header: 'ملاحظات', 
      accessor: 'notes',
      render: (row) => row.notes || '-'
    },
  ]

  const today = new Date().toISOString().split('T')[0]
  const stats = {
    totalPayments: payments.length,
    todayPayments: payments.filter(p => p.created_at?.startsWith(today)).length,
    totalAmount: payments.reduce((sum, p) => sum + (p.amount || 0), 0),
    todayAmount: payments
      .filter(p => p.created_at?.startsWith(today))
      .reduce((sum, p) => sum + (p.amount || 0), 0)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* إحصائيات */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card padding={false} className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">إجمالي التحصيلات</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.totalPayments}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary-100 rounded-lg flex items-center justify-center">
              <DollarSign className="text-primary-600" size={20} />
            </div>
          </div>
        </Card>

        <Card padding={false} className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">تحصيلات اليوم</p>
              <p className="text-xl sm:text-2xl font-bold text-success-600">{stats.todayPayments}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-success-100 rounded-lg flex items-center justify-center">
              <Calendar className="text-success-600" size={20} />
            </div>
          </div>
        </Card>

        <Card padding={false} className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">إجمالي المبالغ</p>
              <p className="text-base sm:text-xl font-bold text-primary-600">{formatCurrency(stats.totalAmount)}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="text-primary-600" size={20} />
            </div>
          </div>
        </Card>

        <Card padding={false} className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">مبالغ اليوم</p>
              <p className="text-base sm:text-xl font-bold text-success-600">{formatCurrency(stats.todayAmount)}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-success-100 rounded-lg flex items-center justify-center">
              <DollarSign className="text-success-600" size={20} />
            </div>
          </div>
        </Card>
      </div>

      {/* جدول التحصيلات */}
      <Card 
        title="التحصيلات"
        action={
          <Button onClick={openModal} size="sm">
            <Plus size={18} />
            <span className="hidden sm:inline">تسجيل تحصيل</span>
          </Button>
        }
      >
        {/* Desktop */}
        <div className="hidden md:block">
          <Table
            columns={columns}
            data={payments}
            loading={loading}
            emptyMessage="لا توجد تحصيلات"
          />
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-3">
          {payments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">لا توجد تحصيلات</div>
          ) : (
            payments.map((payment) => (
              <div key={payment.id} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{payment.customer_name}</p>
                    <p className="text-xs text-gray-500">{formatDateTime(payment.created_at)}</p>
                  </div>
                  <p className="font-bold text-success-600 mr-2">{formatCurrency(payment.amount)}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">الطريقة: </span>
                    <span className="font-medium">{payment.payment_method}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">المحصّل: </span>
                    <span className="font-medium">{payment.collected_by_name}</span>
                  </div>
                </div>
                {payment.notes && (
                  <p className="text-sm text-gray-600 mt-2 pt-2 border-t border-gray-200">
                    {payment.notes}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Modal */}
      <Modal isOpen={modalOpen} onClose={closeModal} title="تسجيل تحصيل جديد" size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="العميل"
            name="customer_id"
            value={formData.customer_id}
            onChange={handleChange}
            options={customers.map(c => ({
              value: c.id,
              label: `${c.name} - الدين: ${formatCurrency(c.total_debt)}`
            }))}
            placeholder="اختر العميل"
            required
            error={errors.customer_id}
          />

          <Input
            label="المبلغ المدفوع"
            type="number"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            placeholder="0.00"
            step="0.01"
            required
            error={errors.amount}
          />

          <Select
            label="طريقة الدفع"
            name="payment_method"
            value={formData.payment_method}
            onChange={handleChange}
            options={[
              { value: 'نقدي', label: 'نقدي' },
              { value: 'فيزا', label: 'فيزا' },
              { value: 'تحويل', label: 'تحويل بنكي' },  // ✅ القيمة "تحويل" متوافقة مع DB
              { value: 'شيك', label: 'شيك' },
            ]}
          />

          <Input
            label="ملاحظات (اختياري)"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="أي ملاحظات..."
          />

          <div className="flex gap-3 pt-2">
            <Button type="submit" variant="primary" fullWidth>
              تسجيل التحصيل
            </Button>
            <Button type="button" variant="secondary" fullWidth onClick={closeModal}>
              إلغاء
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
