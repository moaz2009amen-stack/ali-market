'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Table from '@/components/ui/Table'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { Plus, Edit2, Trash2, Users, DollarSign, Phone } from 'lucide-react'
import { formatCurrency, formatPhone } from '@/lib/utils/format'
import toast from 'react-hot-toast'

export default function CustomersPage() {
  const supabase = createClient()
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [currentCustomer, setCurrentCustomer] = useState(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [customerToDelete, setCustomerToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [formData, setFormData] = useState({
    name: '', phone: '', address: '', area: ''
  })
  const [errors, setErrors] = useState({})

  useEffect(() => { fetchCustomers() }, [])

  async function fetchCustomers() {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('is_active', true)   // ✅ فلتر العملاء الدائمين فقط
        .order('name')
      if (error) throw error
      setCustomers(data || [])
    } catch (error) {
      console.error('fetchCustomers error:', error)
      toast.error('حدث خطأ في تحميل العملاء')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const validate = () => {
    const newErrors = {}
    if (!formData.name.trim()) newErrors.name = 'اسم العميل مطلوب'
    if (!formData.phone.trim()) newErrors.phone = 'رقم الهاتف مطلوب'
    else if (!/^01[0-9]{9}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'رقم الهاتف غير صحيح'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const customerData = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        address: formData.address || null,
        area: formData.area || null,
        is_active: true
      }
      if (editMode && currentCustomer) {
        const { error } = await supabase.from('customers').update(customerData).eq('id', currentCustomer.id)
        if (error) throw error
        toast.success('تم تحديث العميل بنجاح')
        setCustomers(prev => prev.map(c => c.id === currentCustomer.id ? { ...c, ...customerData } : c))
      } else {
        const { data, error } = await supabase.from('customers').insert([{ ...customerData, created_by: user.id }]).select().single()
        if (error) throw error
        toast.success('تم إضافة العميل بنجاح')
        setCustomers(prev => [data, ...prev])
      }
      closeModal()
    } catch (error) {
      console.error('Save customer error:', error)
      toast.error('حدث خطأ في حفظ العميل')
    }
  }

  const handleEdit = (customer) => {
    setCurrentCustomer(customer)
    setFormData({
      name: customer.name || '',
      phone: customer.phone || '',
      address: customer.address || '',
      area: customer.area || ''
    })
    setEditMode(true)
    setModalOpen(true)
  }

  const handleDelete = (customer) => {
    setCustomerToDelete(customer)
    setDeleteConfirmOpen(true)
  }

  const confirmDelete = async () => {
    if (!customerToDelete || deleting) return
    setDeleting(true)

    try {
      // ✅ الخطوة 1: حذف المدفوعات المرتبطة بالعميل
      const { error: paymentsError } = await supabase
        .from('payments')
        .delete()
        .eq('customer_id', customerToDelete.id)

      if (paymentsError) {
        console.warn('Payments delete warning:', paymentsError.message)
        // مش مشكلة لو ما فيش payments
      }

      // ✅ الخطوة 2: حذف invoice_items المرتبطة بفواتير العميل
      const { data: customerInvoices } = await supabase
        .from('invoices')
        .select('id')
        .eq('customer_id', customerToDelete.id)

      if (customerInvoices && customerInvoices.length > 0) {
        const invoiceIds = customerInvoices.map(inv => inv.id)
        await supabase
          .from('invoice_items')
          .delete()
          .in('invoice_id', invoiceIds)

        // ✅ الخطوة 3: حذف الفواتير المرتبطة
        await supabase
          .from('invoices')
          .delete()
          .eq('customer_id', customerToDelete.id)
      }

      // ✅ الخطوة 4: حذف العميل فعلياً من DB
      const { error: customerError } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerToDelete.id)

      if (customerError) {
        console.error('Customer delete error:', customerError)
        throw customerError
      }

      // ✅ تحديث الـ state فوراً
      setCustomers(prev => prev.filter(c => c.id !== customerToDelete.id))
      toast.success('تم حذف العميل بنجاح')
      setDeleteConfirmOpen(false)
      setCustomerToDelete(null)

    } catch (error) {
      console.error('Delete error:', error)
      if (error.message?.includes('violates foreign key')) {
        toast.error('لا يمكن الحذف - يوجد بيانات مرتبطة')
      } else {
        toast.error('حدث خطأ في الحذف: ' + error.message)
      }
    } finally {
      setDeleting(false)
    }
  }

  const openModal = () => {
    setEditMode(false)
    setCurrentCustomer(null)
    setFormData({ name: '', phone: '', address: '', area: '' })
    setErrors({})
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditMode(false)
    setCurrentCustomer(null)
    setErrors({})
  }

  const columns = [
    {
      header: 'العميل',
      accessor: 'name',
      render: (row) => (
        <div>
          <p className="font-semibold text-gray-900">{row.name}</p>
          {row.area && <p className="text-xs text-gray-500">{row.area}</p>}
        </div>
      )
    },
    {
      header: 'رقم الهاتف',
      accessor: 'phone',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Phone size={14} className="text-gray-400" />
          <span className="font-mono text-sm">{formatPhone(row.phone)}</span>
        </div>
      )
    },
    {
      header: 'الديون',
      accessor: 'total_debt',
      render: (row) => (
        <span className={`font-semibold ${(row.total_debt || 0) > 0 ? 'text-danger-600' : 'text-success-600'}`}>
          {formatCurrency(row.total_debt || 0)}
        </span>
      )
    },
    {
      header: 'إجراءات',
      accessor: 'actions',
      render: (row) => (
        <div className="flex items-center gap-2">
          <button onClick={() => handleEdit(row)} className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
            <Edit2 size={16} />
          </button>
          <button onClick={() => handleDelete(row)} className="p-2 text-danger-600 hover:bg-danger-50 rounded-lg transition-colors">
            <Trash2 size={16} />
          </button>
        </div>
      )
    },
  ]

  const stats = {
    total: customers.length,
    withDebt: customers.filter(c => (c.total_debt || 0) > 0).length,
    totalDebt: customers.reduce((sum, c) => sum + (c.total_debt || 0), 0)
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><LoadingSpinner size="lg" /></div>
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* إحصائيات */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card padding={false} className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">إجمالي العملاء</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <Users className="text-primary-600" size={20} />
            </div>
          </div>
        </Card>
        <Card padding={false} className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">عملاء بديون</p>
              <p className="text-xl sm:text-2xl font-bold text-warning-600">{stats.withDebt}</p>
            </div>
            <div className="w-10 h-10 bg-warning-100 rounded-lg flex items-center justify-center">
              <Users className="text-warning-600" size={20} />
            </div>
          </div>
        </Card>
        <Card padding={false} className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">إجمالي الديون</p>
              <p className="text-base sm:text-xl font-bold text-danger-600">{formatCurrency(stats.totalDebt)}</p>
            </div>
            <div className="w-10 h-10 bg-danger-100 rounded-lg flex items-center justify-center">
              <DollarSign className="text-danger-600" size={20} />
            </div>
          </div>
        </Card>
      </div>

      {/* جدول العملاء */}
      <Card
        title="العملاء"
        action={
          <Button onClick={openModal} size="sm">
            <Plus size={18} />
            <span className="hidden sm:inline">إضافة عميل</span>
          </Button>
        }
      >
        <div className="hidden md:block">
          <Table columns={columns} data={customers} loading={loading} emptyMessage="لا يوجد عملاء" />
        </div>
        <div className="md:hidden space-y-3">
          {customers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">لا يوجد عملاء</div>
          ) : (
            customers.map((customer) => (
              <div key={customer.id} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-900">{customer.name}</p>
                    {customer.area && <p className="text-xs text-gray-500">{customer.area}</p>}
                  </div>
                  <span className={`text-sm font-bold ${(customer.total_debt || 0) > 0 ? 'text-danger-600' : 'text-success-600'}`}>
                    {formatCurrency(customer.total_debt || 0)}
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <Phone size={14} className="text-gray-400" />
                  <span className="text-sm font-mono">{formatPhone(customer.phone)}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(customer)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg text-sm transition-colors">
                    <Edit2 size={15} /><span>تعديل</span>
                  </button>
                  <button onClick={() => handleDelete(customer)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-danger-600 bg-danger-50 hover:bg-danger-100 rounded-lg text-sm transition-colors">
                    <Trash2 size={15} /><span>حذف</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <Modal isOpen={modalOpen} onClose={closeModal} title={editMode ? 'تعديل عميل' : 'إضافة عميل جديد'} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="اسم العميل" name="name" value={formData.name} onChange={handleChange} placeholder="اسم العميل" required error={errors.name} />
          <Input label="رقم الهاتف" type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="01001234567" required error={errors.phone} />
          <Input label="المنطقة (اختياري)" name="area" value={formData.area} onChange={handleChange} placeholder="المنطقة أو الحي" />
          <Input label="العنوان (اختياري)" name="address" value={formData.address} onChange={handleChange} placeholder="العنوان التفصيلي" />
          <div className="flex gap-3 pt-2">
            <Button type="submit" variant="primary" fullWidth>{editMode ? 'تحديث العميل' : 'إضافة العميل'}</Button>
            <Button type="button" variant="secondary" fullWidth onClick={closeModal}>إلغاء</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => { if (!deleting) { setDeleteConfirmOpen(false); setCustomerToDelete(null) } }}
        onConfirm={confirmDelete}
        title="حذف العميل"
        message={`هل أنت متأكد من حذف العميل "${customerToDelete?.name}"؟ سيتم حذف جميع فواتيره أيضاً.`}
        confirmText={deleting ? 'جاري الحذف...' : 'حذف العميل'}
      />
    </div>
  )
}
