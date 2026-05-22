'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Table from '@/components/ui/Table'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Badge from '@/components/ui/Badge'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { Plus, Edit2, Trash2, Users, DollarSign, Phone } from 'lucide-react'
import { formatCurrency, formatPhone } from '@/lib/utils/format'
import toast from 'react-hot-toast'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

export default function CustomersPage() {
  const supabase = createClient()
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [currentCustomer, setCurrentCustomer] = useState(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [customerToDelete, setCustomerToDelete] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    shop_name: '',
    phone: '',
    address: '',
    area: '',
    notes: ''
  })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    fetchCustomers()
  }, [])

  async function fetchCustomers() {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setCustomers(data || [])
    } catch (error) {
      console.error('Error fetching customers:', error)
      toast.error('حدث خطأ في تحميل العملاء')
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
      const customerData = {
        name: formData.name,
        shop_name: formData.shop_name,
        phone: formData.phone,
        address: formData.address,
        area: formData.area,
        notes: formData.notes
      }

      if (editMode && currentCustomer) {
        const { error } = await supabase
          .from('customers')
          .update(customerData)
          .eq('id', currentCustomer.id)

        if (error) throw error
        toast.success('تم تحديث العميل بنجاح')
      } else {
        const { data: { user } } = await supabase.auth.getUser()
        
        const { error } = await supabase
          .from('customers')
          .insert([{ ...customerData, created_by: user.id }])

        if (error) throw error
        toast.success('تم إضافة العميل بنجاح')
      }

      fetchCustomers()
      closeModal()
    } catch (error) {
      console.error('Error saving customer:', error)
      toast.error('حدث خطأ في حفظ العميل')
    }
  }

  const handleEdit = (customer) => {
    setCurrentCustomer(customer)
    setFormData({
      name: customer.name,
      shop_name: customer.shop_name || '',
      phone: customer.phone,
      address: customer.address || '',
      area: customer.area || '',
      notes: customer.notes || ''
    })
    setEditMode(true)
    setModalOpen(true)
  }

  const handleDelete = (customer) => {
    setCustomerToDelete(customer)
    setDeleteConfirmOpen(true)
  }

  const confirmDelete = async () => {
    if (!customerToDelete) return

    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerToDelete.id)

      if (error) throw error
      
      toast.success('تم حذف العميل بنجاح')
      setDeleteConfirmOpen(false)
      setCustomerToDelete(null)
      fetchCustomers()
    } catch (error) {
      console.error('Error deleting customer:', error)
      toast.error('حدث خطأ في حذف العميل')
    }
  }

  const openModal = () => {
    setEditMode(false)
    setCurrentCustomer(null)
    setFormData({
      name: '',
      shop_name: '',
      phone: '',
      address: '',
      area: '',
      notes: ''
    })
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
          {row.shop_name && <p className="text-sm text-gray-500">{row.shop_name}</p>}
        </div>
      )
    },
    { 
      header: 'رقم الهاتف', 
      accessor: 'phone',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Phone size={16} className="text-gray-400" />
          <span className="font-mono">{formatPhone(row.phone)}</span>
        </div>
      )
    },
    { 
      header: 'المنطقة', 
      accessor: 'area',
      render: (row) => row.area || '-'
    },
    { 
      header: 'الديون', 
      accessor: 'total_debt',
      render: (row) => (
        <span className={row.total_debt > 0 ? 'text-danger-600 font-semibold' : 'text-gray-900'}>
          {formatCurrency(row.total_debt || 0)}
        </span>
      )
    },
    { 
      header: 'الحالة', 
      accessor: 'is_active',
      render: (row) => (
        <Badge variant={row.is_active ? 'success' : 'default'}>
          {row.is_active ? 'نشط' : 'موقوف'}
        </Badge>
      )
    },
    { 
      header: 'الإجراءات', 
      accessor: 'actions',
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleEdit(row)}
            className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
          >
            <Edit2 size={18} />
          </button>
          <button
            onClick={() => handleDelete(row)}
            className="p-2 text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
          >
            <Trash2 size={18} />
          </button>
        </div>
      )
    },
  ]

  // حساب الإحصائيات
  const stats = {
    total: customers.length,
    active: customers.filter(c => c.is_active).length,
    totalDebt: customers.reduce((sum, c) => sum + (c.total_debt || 0), 0)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card padding={false} className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">إجمالي العملاء</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
              <Users className="text-primary-600" size={24} />
            </div>
          </div>
        </Card>

        <Card padding={false} className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">عملاء نشطين</p>
              <p className="text-2xl font-bold text-success-600">{stats.active}</p>
            </div>
            <div className="w-12 h-12 bg-success-100 rounded-lg flex items-center justify-center">
              <Users className="text-success-600" size={24} />
            </div>
          </div>
        </Card>

        <Card padding={false} className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">إجمالي الديون</p>
              <p className="text-2xl font-bold text-danger-600">{formatCurrency(stats.totalDebt)}</p>
            </div>
            <div className="w-12 h-12 bg-danger-100 rounded-lg flex items-center justify-center">
              <DollarSign className="text-danger-600" size={24} />
            </div>
          </div>
        </Card>
      </div>

      {/* جدول العملاء */}
      <Card 
        title="العملاء"
        action={
          <Button onClick={openModal} size="md">
            <Plus size={20} />
            إضافة عميل
          </Button>
        }
      >
        <Table
          columns={columns}
          data={customers}
          loading={loading}
          emptyMessage="لا يوجد عملاء. ابدأ بإضافة عميل جديد!"
        />
      </Card>

      {/* Modal إضافة/تعديل عميل */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editMode ? 'تعديل عميل' : 'إضافة عميل جديد'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="اسم العميل"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="محمد أحمد"
              required
              error={errors.name}
            />

            <Input
              label="اسم المحل (اختياري)"
              name="shop_name"
              value={formData.shop_name}
              onChange={handleChange}
              placeholder="سوبر ماركت النور"
            />

            <Input
              label="رقم الهاتف"
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="01001234567"
              required
              error={errors.phone}
            />

            <Input
              label="المنطقة (اختياري)"
              name="area"
              value={formData.area}
              onChange={handleChange}
              placeholder="المنصورة"
            />
          </div>

          <Input
            label="العنوان (اختياري)"
            name="address"
            value={formData.address}
            onChange={handleChange}
            placeholder="شارع الجمهورية"
          />

          <Input
            label="ملاحظات (اختياري)"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="أي ملاحظات إضافية..."
          />

          <div className="flex gap-3 pt-4">
            <Button type="submit" variant="primary" fullWidth>
              {editMode ? 'تحديث العميل' : 'إضافة العميل'}
            </Button>
            <Button type="button" variant="secondary" fullWidth onClick={closeModal}>
              إلغاء
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false)
          setCustomerToDelete(null)
        }}
        onConfirm={confirmDelete}
        title="حذف العميل"
        message={`هل أنت متأكد من حذف العميل "${customerToDelete?.name}"؟`}
        confirmText="حذف العميل"
      />
    </div>
  )
}
