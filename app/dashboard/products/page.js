'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Table from '@/components/ui/Table'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Badge from '@/components/ui/Badge'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { Plus, Edit2, Trash2, Package, AlertTriangle } from 'lucide-react'
import { formatCurrency, formatNumber } from '@/lib/utils/format'
import toast from 'react-hot-toast'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

export default function ProductsPage() {
  const supabase = createClient()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [currentProduct, setCurrentProduct] = useState(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    cost_price: '',
    selling_price: '',
    quantity: '',
    min_stock: '10',
    unit: 'قطعة',
    barcode: ''
  })
  const [errors, setErrors] = useState({})

  const categories = [
    { value: 'شيبسي', label: 'شيبسي' },
    { value: 'مشروبات', label: 'مشروبات' },
    { value: 'حلويات', label: 'حلويات' },
    { value: 'بسكويت', label: 'بسكويت' },
    { value: 'ألبان', label: 'ألبان' },
    { value: 'معلبات', label: 'معلبات' },
    { value: 'أخرى', label: 'أخرى' },
  ]

  const units = [
    { value: 'قطعة', label: 'قطعة' },
    { value: 'كرتونة', label: 'كرتونة' },
    { value: 'كيلو', label: 'كيلو' },
    { value: 'لتر', label: 'لتر' },
  ]

  useEffect(() => {
    fetchProducts()
  }, [])

  async function fetchProducts() {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error('Error fetching products:', error)
      toast.error('حدث خطأ في تحميل المنتجات')
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
    
    if (!formData.name.trim()) newErrors.name = 'اسم المنتج مطلوب'
    if (!formData.category) newErrors.category = 'الفئة مطلوبة'
    if (!formData.cost_price || formData.cost_price <= 0) newErrors.cost_price = 'سعر الشراء غير صحيح'
    if (!formData.selling_price || formData.selling_price <= 0) newErrors.selling_price = 'سعر البيع غير صحيح'
    if (parseFloat(formData.selling_price) < parseFloat(formData.cost_price)) {
      newErrors.selling_price = 'سعر البيع يجب أن يكون أكبر من سعر الشراء'
    }
    if (!formData.quantity || formData.quantity < 0) newErrors.quantity = 'الكمية غير صحيحة'
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validate()) return

    try {
      const productData = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        cost_price: parseFloat(formData.cost_price),
        selling_price: parseFloat(formData.selling_price),
        quantity: parseInt(formData.quantity),
        min_stock: parseInt(formData.min_stock),
        unit: formData.unit,
        barcode: formData.barcode || null
      }

      if (editMode && currentProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', currentProduct.id)

        if (error) throw error
        toast.success('تم تحديث المنتج بنجاح')
      } else {
        const { data: { user } } = await supabase.auth.getUser()
        
        const { error } = await supabase
          .from('products')
          .insert([{ ...productData, created_by: user.id }])

        if (error) throw error
        toast.success('تم إضافة المنتج بنجاح')
      }

      fetchProducts()
      closeModal()
    } catch (error) {
      console.error('Error saving product:', error)
      toast.error('حدث خطأ في حفظ المنتج')
    }
  }

  const handleEdit = (product) => {
    setCurrentProduct(product)
    setFormData({
      name: product.name,
      description: product.description || '',
      category: product.category,
      cost_price: product.cost_price,
      selling_price: product.selling_price,
      quantity: product.quantity,
      min_stock: product.min_stock,
      unit: product.unit,
      barcode: product.barcode || ''
    })
    setEditMode(true)
    setModalOpen(true)
  }

  const handleDelete = (product) => {
    setProductToDelete(product)
    setDeleteConfirmOpen(true)
  }

  const confirmDelete = async () => {
    if (!productToDelete) return

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productToDelete.id)

      if (error) throw error
      
      toast.success('تم حذف المنتج بنجاح')
      setDeleteConfirmOpen(false)
      setProductToDelete(null)
      fetchProducts()
    } catch (error) {
      console.error('Error deleting product:', error)
      toast.error('حدث خطأ في حذف المنتج')
    }
  }

  const openModal = () => {
    setEditMode(false)
    setCurrentProduct(null)
    setFormData({
      name: '',
      description: '',
      category: '',
      cost_price: '',
      selling_price: '',
      quantity: '',
      min_stock: '10',
      unit: 'قطعة',
      barcode: ''
    })
    setErrors({})
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditMode(false)
    setCurrentProduct(null)
    setFormData({
      name: '',
      description: '',
      category: '',
      cost_price: '',
      selling_price: '',
      quantity: '',
      min_stock: '10',
      unit: 'قطعة',
      barcode: ''
    })
    setErrors({})
  }

  const columns = [
    { 
      header: 'المنتج', 
      accessor: 'name',
      render: (row) => (
        <div>
          <p className="font-semibold text-gray-900">{row.name}</p>
          <p className="text-sm text-gray-500">{row.category}</p>
        </div>
      )
    },
    { 
      header: 'سعر الشراء', 
      accessor: 'cost_price',
      render: (row) => formatCurrency(row.cost_price)
    },
    { 
      header: 'سعر البيع', 
      accessor: 'selling_price',
      render: (row) => formatCurrency(row.selling_price)
    },
    { 
      header: 'الكمية', 
      accessor: 'quantity',
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className={row.quantity <= row.min_stock ? 'text-danger-600 font-semibold' : ''}>
            {formatNumber(row.quantity)} {row.unit}
          </span>
          {row.quantity <= row.min_stock && (
            <AlertTriangle size={16} className="text-danger-500" />
          )}
        </div>
      )
    },
    { 
      header: 'الحالة', 
      accessor: 'is_active',
      render: (row) => (
        <Badge variant={row.quantity > row.min_stock ? 'success' : 'danger'}>
          {row.quantity > row.min_stock ? 'متوفر' : 'منخفض'}
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
    total: products.length,
    lowStock: products.filter(p => p.quantity <= p.min_stock).length,
    totalValue: products.reduce((sum, p) => sum + (p.quantity * p.cost_price), 0)
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
              <p className="text-sm text-gray-600">إجمالي المنتجات</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
              <Package className="text-primary-600" size={24} />
            </div>
          </div>
        </Card>

        <Card padding={false} className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">منتجات منخفضة</p>
              <p className="text-2xl font-bold text-danger-600">{stats.lowStock}</p>
            </div>
            <div className="w-12 h-12 bg-danger-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="text-danger-600" size={24} />
            </div>
          </div>
        </Card>

        <Card padding={false} className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">قيمة المخزن</p>
              <p className="text-2xl font-bold text-success-600">{formatCurrency(stats.totalValue)}</p>
            </div>
            <div className="w-12 h-12 bg-success-100 rounded-lg flex items-center justify-center">
              <Package className="text-success-600" size={24} />
            </div>
          </div>
        </Card>
      </div>

      {/* جدول المنتجات */}
      <Card 
        title="المنتجات"
        action={
          <Button onClick={openModal} size="md">
            <Plus size={20} />
            إضافة منتج
          </Button>
        }
      >
        <Table
          columns={columns}
          data={products}
          loading={loading}
          emptyMessage="لا توجد منتجات. ابدأ بإضافة منتج جديد!"
        />
      </Card>

      {/* Modal إضافة/تعديل منتج */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editMode ? 'تعديل منتج' : 'إضافة منتج جديد'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="اسم المنتج"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="مثال: شيبسي ليز كبير"
              required
              error={errors.name}
            />

            <Select
              label="الفئة"
              name="category"
              value={formData.category}
              onChange={handleChange}
              options={categories}
              required
              error={errors.category}
            />

            <Input
              label="سعر الشراء"
              type="number"
              name="cost_price"
              value={formData.cost_price}
              onChange={handleChange}
              placeholder="0.00"
              required
              error={errors.cost_price}
              step="0.01"
            />

            <Input
              label="سعر البيع"
              type="number"
              name="selling_price"
              value={formData.selling_price}
              onChange={handleChange}
              placeholder="0.00"
              required
              error={errors.selling_price}
              step="0.01"
            />

            <Input
              label="الكمية"
              type="number"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              placeholder="0"
              required
              error={errors.quantity}
            />

            <Input
              label="أقل كمية تنبيه"
              type="number"
              name="min_stock"
              value={formData.min_stock}
              onChange={handleChange}
              placeholder="10"
              required
            />

            <Select
              label="الوحدة"
              name="unit"
              value={formData.unit}
              onChange={handleChange}
              options={units}
              required
            />

            <Input
              label="الباركود (اختياري)"
              name="barcode"
              value={formData.barcode}
              onChange={handleChange}
              placeholder="1234567890"
            />
          </div>

          <Input
            label="الوصف (اختياري)"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="وصف المنتج..."
          />

          <div className="flex gap-3 pt-4">
            <Button type="submit" variant="primary" fullWidth>
              {editMode ? 'تحديث المنتج' : 'إضافة المنتج'}
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
          setProductToDelete(null)
        }}
        onConfirm={confirmDelete}
        title="حذف المنتج"
        message={`هل أنت متأكد من حذف المنتج "${productToDelete?.name}"؟`}
        confirmText="حذف المنتج"
      />
    </div>
  )
}
