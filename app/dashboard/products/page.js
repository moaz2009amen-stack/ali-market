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
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { Plus, Edit2, Trash2, Package, AlertTriangle } from 'lucide-react'
import { formatCurrency, formatNumber } from '@/lib/utils/format'
import toast from 'react-hot-toast'

export default function ProductsPage() {
  const supabase = createClient()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [currentProduct, setCurrentProduct] = useState(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [formData, setFormData] = useState({
    name: '', category: '', cost_price: '',
    selling_price: '', quantity: '', min_stock: '10',
    unit: 'قطعة', barcode: ''
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
    { value: 'علبة', label: 'علبة' },
    { value: 'شكارة', label: 'شكارة' },
  ]

  useEffect(() => { fetchProducts() }, [])

  async function fetchProducts() {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)  // ✅ فلتر المنتجات الفعالة فقط
        .order('name')
      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error('fetchProducts error:', error)
      toast.error('حدث خطأ في تحميل المنتجات')
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
    if (!formData.name.trim()) newErrors.name = 'اسم المنتج مطلوب'
    if (formData.cost_price === '' || parseFloat(formData.cost_price) < 0) newErrors.cost_price = 'سعر الشراء غير صحيح'
    if (!formData.selling_price || parseFloat(formData.selling_price) <= 0) newErrors.selling_price = 'سعر البيع مطلوب'
    if (formData.quantity === '' || parseInt(formData.quantity) < 0) newErrors.quantity = 'الكمية غير صحيحة'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const productData = {
        name: formData.name.trim(),
        category: formData.category || null,
        cost_price: parseFloat(formData.cost_price) || 0,
        selling_price: parseFloat(formData.selling_price) || 0,
        quantity: parseInt(formData.quantity) || 0,
        min_stock: parseInt(formData.min_stock) || 10,
        unit: formData.unit || 'قطعة',
        barcode: formData.barcode?.trim() || null,
        is_active: true
      }

      if (editMode && currentProduct) {
        const { error } = await supabase.from('products').update(productData).eq('id', currentProduct.id)
        if (error) throw error
        toast.success('تم تحديث المنتج بنجاح')
        setProducts(prev => prev.map(p => p.id === currentProduct.id ? { ...p, ...productData } : p))
      } else {
        const { data, error } = await supabase.from('products').insert([{ ...productData, created_by: user.id }]).select().single()
        if (error) throw error
        toast.success('تم إضافة المنتج بنجاح')
        setProducts(prev => [...prev, data])
      }
      closeModal()
    } catch (error) {
      console.error('Save product error:', error)
      toast.error('حدث خطأ في حفظ المنتج')
    }
  }

  const handleEdit = (product) => {
    setCurrentProduct(product)
    setFormData({
      name: product.name || '',
      category: product.category || '',
      cost_price: product.cost_price?.toString() || '',
      selling_price: product.selling_price?.toString() || '',
      quantity: product.quantity?.toString() || '',
      min_stock: product.min_stock?.toString() || '10',
      unit: product.unit || 'قطعة',
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
    if (!productToDelete || deleting) return
    setDeleting(true)

    try {
      // ✅ محاولة الحذف الفعلي أولاً
      const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .eq('id', productToDelete.id)

      if (!deleteError) {
        // ✅ نجح الحذف الفعلي
        setProducts(prev => prev.filter(p => p.id !== productToDelete.id))
        toast.success('تم حذف المنتج بنجاح')
        setDeleteConfirmOpen(false)
        setProductToDelete(null)
        return
      }

      // لو فشل بسبب foreign key (مرتبط بفواتير)
      if (deleteError.message?.includes('foreign key') || deleteError.message?.includes('violates')) {
        // ✅ Soft delete - إخفاء المنتج بدلاً من حذفه
        const { error: softError } = await supabase
          .from('products')
          .update({ is_active: false })
          .eq('id', productToDelete.id)

        if (softError) throw softError

        setProducts(prev => prev.filter(p => p.id !== productToDelete.id))
        toast.success('تم حذف المنتج بنجاح')
        setDeleteConfirmOpen(false)
        setProductToDelete(null)
        return
      }

      throw deleteError
    } catch (error) {
      console.error('Delete product error:', error)
      toast.error('حدث خطأ في حذف المنتج')
    } finally {
      setDeleting(false)
    }
  }

  const openModal = () => {
    setEditMode(false)
    setCurrentProduct(null)
    setFormData({ name: '', category: '', cost_price: '', selling_price: '', quantity: '', min_stock: '10', unit: 'قطعة', barcode: '' })
    setErrors({})
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditMode(false)
    setCurrentProduct(null)
    setErrors({})
  }

  const columns = [
    {
      header: 'المنتج',
      accessor: 'name',
      render: (row) => (
        <div>
          <p className="font-semibold text-gray-900">{row.name}</p>
          {row.category && <p className="text-xs text-gray-500">{row.category}</p>}
        </div>
      )
    },
    {
      header: 'سعر الشراء',
      accessor: 'cost_price',
      render: (row) => <span className="text-sm">{formatCurrency(row.cost_price)}</span>
    },
    {
      header: 'سعر البيع',
      accessor: 'selling_price',
      render: (row) => <span className="font-semibold">{formatCurrency(row.selling_price)}</span>
    },
    {
      header: 'الكمية',
      accessor: 'quantity',
      render: (row) => (
        <div className="flex items-center gap-1">
          {row.quantity <= (row.min_stock || 10) && <AlertTriangle size={14} className="text-danger-500" />}
          <span className={`font-semibold ${row.quantity <= (row.min_stock || 10) ? 'text-danger-600' : ''}`}>
            {formatNumber(row.quantity)} {row.unit}
          </span>
        </div>
      )
    },
    {
      header: 'الحالة',
      accessor: 'status',
      render: (row) => (
        <Badge variant={row.quantity > (row.min_stock || 10) ? 'success' : 'danger'}>
          {row.quantity > (row.min_stock || 10) ? 'متوفر' : 'منخفض'}
        </Badge>
      )
    },
    {
      header: 'إجراءات',
      accessor: 'actions',
      render: (row) => (
        <div className="flex items-center gap-1">
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
    total: products.length,
    lowStock: products.filter(p => p.quantity <= (p.min_stock || 10)).length,
    totalValue: products.reduce((sum, p) => sum + ((p.quantity || 0) * (p.cost_price || 0)), 0)
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
              <p className="text-xs sm:text-sm text-gray-600">إجمالي المنتجات</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <Package className="text-primary-600" size={20} />
            </div>
          </div>
        </Card>
        <Card padding={false} className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">منتجات منخفضة</p>
              <p className="text-xl sm:text-2xl font-bold text-danger-600">{stats.lowStock}</p>
            </div>
            <div className="w-10 h-10 bg-danger-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="text-danger-600" size={20} />
            </div>
          </div>
        </Card>
        <Card padding={false} className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">قيمة المخزون</p>
              <p className="text-base sm:text-xl font-bold text-success-600">{formatCurrency(stats.totalValue)}</p>
            </div>
            <div className="w-10 h-10 bg-success-100 rounded-lg flex items-center justify-center">
              <Package className="text-success-600" size={20} />
            </div>
          </div>
        </Card>
      </div>

      {/* جدول المنتجات */}
      <Card
        title="المنتجات"
        action={
          <Button onClick={openModal} size="sm">
            <Plus size={18} />
            <span className="hidden sm:inline">إضافة منتج</span>
          </Button>
        }
      >
        {/* Desktop */}
        <div className="hidden md:block">
          <Table columns={columns} data={products} loading={loading} emptyMessage="لا توجد منتجات" />
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-3">
          {products.length === 0 ? (
            <div className="text-center py-8 text-gray-500">لا توجد منتجات</div>
          ) : (
            products.map((product) => (
              <div key={product.id} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-900">{product.name}</p>
                    {product.category && <p className="text-xs text-gray-500">{product.category}</p>}
                  </div>
                  <Badge variant={product.quantity > (product.min_stock || 10) ? 'success' : 'danger'}>
                    {product.quantity > (product.min_stock || 10) ? 'متوفر' : 'منخفض'}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center mb-3">
                  <div className="bg-white rounded p-2">
                    <p className="text-xs text-gray-500">الشراء</p>
                    <p className="font-semibold text-xs">{formatCurrency(product.cost_price)}</p>
                  </div>
                  <div className="bg-white rounded p-2">
                    <p className="text-xs text-gray-500">البيع</p>
                    <p className="font-semibold text-xs">{formatCurrency(product.selling_price)}</p>
                  </div>
                  <div className="bg-white rounded p-2">
                    <p className="text-xs text-gray-500">الكمية</p>
                    <p className={`font-semibold text-xs ${product.quantity <= (product.min_stock || 10) ? 'text-danger-600' : ''}`}>
                      {formatNumber(product.quantity)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(product)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg text-sm transition-colors">
                    <Edit2 size={15} />تعديل
                  </button>
                  <button onClick={() => handleDelete(product)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-danger-600 bg-danger-50 hover:bg-danger-100 rounded-lg text-sm transition-colors">
                    <Trash2 size={15} />حذف
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Modal إضافة/تعديل */}
      <Modal isOpen={modalOpen} onClose={closeModal} title={editMode ? 'تعديل منتج' : 'إضافة منتج جديد'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="اسم المنتج" name="name" value={formData.name} onChange={handleChange}
              placeholder="مثال: شيبسي ليز كبير" required error={errors.name} />
            <Select label="الفئة" name="category" value={formData.category} onChange={handleChange}
              options={categories} placeholder="اختر الفئة" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="سعر الشراء (جنيه)" type="number" name="cost_price" value={formData.cost_price}
              onChange={handleChange} placeholder="0.00" step="0.01" required error={errors.cost_price} />
            <Input label="سعر البيع (جنيه)" type="number" name="selling_price" value={formData.selling_price}
              onChange={handleChange} placeholder="0.00" step="0.01" required error={errors.selling_price} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Input label="الكمية" type="number" name="quantity" value={formData.quantity}
              onChange={handleChange} placeholder="0" required error={errors.quantity} />
            <Input label="الحد الأدنى" type="number" name="min_stock" value={formData.min_stock}
              onChange={handleChange} placeholder="10" />
            <Select label="الوحدة" name="unit" value={formData.unit} onChange={handleChange} options={units} />
          </div>
          <Input label="الباركود (اختياري)" name="barcode" value={formData.barcode}
            onChange={handleChange} placeholder="الباركود" />
          <div className="flex gap-3 pt-2">
            <Button type="submit" variant="primary" fullWidth>
              {editMode ? 'تحديث المنتج' : 'إضافة المنتج'}
            </Button>
            <Button type="button" variant="secondary" fullWidth onClick={closeModal}>إلغاء</Button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => { if (!deleting) { setDeleteConfirmOpen(false); setProductToDelete(null) } }}
        onConfirm={confirmDelete}
        title="حذف المنتج"
        message={`هل أنت متأكد من حذف المنتج "${productToDelete?.name}"؟`}
        confirmText={deleting ? 'جاري الحذف...' : 'حذف المنتج'}
      />
    </div>
  )
}
