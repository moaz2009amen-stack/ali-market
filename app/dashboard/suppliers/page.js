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
import { Plus, Edit2, Trash2, Truck, DollarSign, Phone } from 'lucide-react'
import { formatCurrency, formatPhone } from '@/lib/utils/format'
import toast from 'react-hot-toast'

export default function SuppliersPage() {
  const supabase = createClient()
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [currentSupplier, setCurrentSupplier] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    company_name: '',
    phone: '',
    email: '',
    address: '',
    products_supplied: '',
    payment_terms: ''
  })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    fetchSuppliers()
  }, [])

  async function fetchSuppliers() {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setSuppliers(data || [])
    } catch (error) {
      console.error('Error fetching suppliers:', error)
      toast.error('حدث خطأ في تحميل الموردين')
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
    
    if (!formData.name.trim()) newErrors.name = 'اسم المورد مطلوب'
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
      const supplierData = {
        name: formData.name,
        company_name: formData.company_name,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        products_supplied: formData.products_supplied,
        payment_terms: formData.payment_terms
      }

      if (editMode && currentSupplier) {
        const { error } = await supabase
          .from('suppliers')
          .update(supplierData)
          .eq('id', currentSupplier.id)

        if (error) throw error
        toast.success('تم تحديث المورد بنجاح')
      } else {
        const { data: { user } } = await supabase.auth.getUser()
        
        const { error } = await supabase
          .from('suppliers')
          .insert([{ ...supplierData, created_by: user.id }])

        if (error) throw error
        toast.success('تم إضافة المورد بنجاح')
      }

      fetchSuppliers()
      closeModal()
    } catch (error) {
      console.error('Error saving supplier:', error)
      toast.error('حدث خطأ في حفظ المورد')
    }
  }

  const handleEdit = (supplier) => {
    setCurrentSupplier(supplier)
    setFormData({
      name: supplier.name,
      company_name: supplier.company_name || '',
      phone: supplier.phone,
      email: supplier.email || '',
      address: supplier.address || '',
      products_supplied: supplier.products_supplied || '',
      payment_terms: supplier.payment_terms || ''
    })
    setEditMode(true)
    setModalOpen(true)
  }

  const handleDelete = async (supplier) => {
    if (!confirm(`هل أنت متأكد من حذف المورد "${supplier.name}"؟`)) return

    try {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', supplier.id)

      if (error) throw error
      
      toast.success('تم حذف المورد بنجاح')
      fetchSuppliers()
    } catch (error) {
      console.error('Error deleting supplier:', error)
      toast.error('حدث خطأ في حذف المورد')
    }
  }

  const openModal = () => {
    setEditMode(false)
    setCurrentSupplier(null)
    setFormData({
      name: '',
      company_name: '',
      phone: '',
      email: '',
      address: '',
      products_supplied: '',
      payment_terms: ''
    })
    setErrors({})
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditMode(false)
    setCurrentSupplier(null)
    setErrors({})
  }

  const columns = [
    { 
      header: 'المورد', 
      accessor: 'name',
      render: (row) => (
        <div>
          <p className="font-semibold text-gray-900">{row.name}</p>
          {row.company_name && <p className="text-sm text-gray-500">{row.company_name}</p>}
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
      header: 'المنتجات', 
      accessor: 'products_supplied',
      render: (row) => row.products_supplied || '-'
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

  const stats = {
    total: suppliers.length,
    active: suppliers.filter(s => s.is_active).length,
    totalDebt: suppliers.reduce((sum, s) => sum + (s.total_debt || 0), 0)
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
      {/* إحصائيات */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card padding={false} className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">إجمالي الموردين</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
              <Truck className="text-primary-600" size={24} />
            </div>
          </div>
        </Card>

        <Card padding={false} className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">موردين نشطين</p>
              <p className="text-2xl font-bold text-success-600">{stats.active}</p>
            </div>
            <div className="w-12 h-12 bg-success-100 rounded-lg flex items-center justify-center">
              <Truck className="text-success-600" size={24} />
            </div>
          </div>
        </Card>

        <Card padding={false} className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">ديون للموردين</p>
              <p className="text-2xl font-bold text-danger-600">{formatCurrency(stats.totalDebt)}</p>
            </div>
            <div className="w-12 h-12 bg-danger-100 rounded-lg flex items-center justify-center">
              <DollarSign className="text-danger-600" size={24} />
            </div>
          </div>
        </Card>
      </div>

      {/* جدول الموردين */}
      <Card 
        title="الموردين"
        action={
          <Button onClick={openModal} size="md">
            <Plus size={20} />
            إضافة مورد
          </Button>
        }
      >
        <Table
          columns={columns}
          data={suppliers}
          loading={loading}
          emptyMessage="لا يوجد موردين. ابدأ بإضافة مورد جديد!"
        />
      </Card>

      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editMode ? 'تعديل مورد' : 'إضافة مورد جديد'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="اسم المورد"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="أحمد محمود"
              required
              error={errors.name}
            />

            <Input
              label="اسم الشركة (اختياري)"
              name="company_name"
              value={formData.company_name}
              onChange={handleChange}
              placeholder="شركة التوزيع الحديثة"
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
              label="البريد الإلكتروني (اختياري)"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="supplier@example.com"
            />
          </div>

          <Input
            label="العنوان (اختياري)"
            name="address"
            value={formData.address}
            onChange={handleChange}
            placeholder="القاهرة، مصر"
          />

          <Input
            label="المنتجات المورّدة (اختياري)"
            name="products_supplied"
            value={formData.products_supplied}
            onChange={handleChange}
            placeholder="شيبسي، مشروبات غازية، حلويات"
          />

          <Input
            label="شروط الدفع (اختياري)"
            name="payment_terms"
            value={formData.payment_terms}
            onChange={handleChange}
            placeholder="الدفع خلال 30 يوم"
          />

          <div className="flex gap-3 pt-4">
            <Button type="submit" variant="primary" fullWidth>
              {editMode ? 'تحديث المورد' : 'إضافة المورد'}
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
