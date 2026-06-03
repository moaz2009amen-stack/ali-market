'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { saveToCache, getFromCache, isOnline } from '@/lib/offline/offlineDb'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Table from '@/components/ui/Table'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Badge from '@/components/ui/Badge'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { Plus, Edit2, Trash2, Package, AlertTriangle, WifiOff } from 'lucide-react'
import { formatCurrency, formatNumber } from '@/lib/utils/format'
import toast from 'react-hot-toast'

export default function ProductsPage() {
  const supabase = createClient()
  const [products, setProducts]         = useState([])
  const [loading, setLoading]           = useState(true)
  const [offline, setOffline]           = useState(false)
  const [modalOpen, setModalOpen]       = useState(false)
  const [editMode, setEditMode]         = useState(false)
  const [currentProduct, setCurrentProduct] = useState(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [productToDelete, setProductToDelete]     = useState(null)
  const [deleting, setDeleting]         = useState(false)
  const [formData, setFormData] = useState({
    name: '', category: '', cost_price: '',
    selling_price: '', quantity: '', min_stock: '10',
    unit: 'قطعة', barcode: ''
  })
  const [errors, setErrors] = useState({})

  const categories = [
    { value: 'شيبسي',   label: 'شيبسي' },
    { value: 'مشروبات', label: 'مشروبات' },
    { value: 'حلويات',  label: 'حلويات' },
    { value: 'بسكويت',  label: 'بسكويت' },
    { value: 'ألبان',   label: 'ألبان' },
    { value: 'معلبات',  label: 'معلبات' },
    { value: 'أخرى',    label: 'أخرى' },
  ]

  const units = [
    { value: 'قطعة',    label: 'قطعة' },
    { value: 'كرتونة',  label: 'كرتونة' },
    { value: 'كيلو',    label: 'كيلو' },
    { value: 'لتر',     label: 'لتر' },
    { value: 'علبة',    label: 'علبة' },
    { value: 'شكارة',   label: 'شكارة' },
  ]

  useEffect(() => {
    fetchProducts()
    setOffline(!navigator.onLine)
    const onOnline  = () => { setOffline(false); fetchProducts() }
    const onOffline = () => setOffline(true)
    window.addEventListener('online',  onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online',  onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  async function fetchProducts() {
    if (!isOnline()) {
      setOffline(true)
      const cached = await getFromCache('products')
      setProducts(cached.filter(p => p.is_active !== false))
      setLoading(false)
      return
    }
    try {
      const { data, error } = await supabase
        .from('products').select('*').eq('is_active', true).order('name')
      if (error) throw error
      const result = data || []
      setProducts(result)
      await saveToCache('products', result)
    } catch (error) {
      console.error(error)
      const cached = await getFromCache('products')
      setProducts(cached.filter(p => p.is_active !== false))
      setOffline(true)
    } finally {
      setLoading(false)
    }
  }

  const validate = () => {
    const errs = {}
    if (!formData.name.trim())                                    errs.name          = 'اسم المنتج مطلوب'
    if (formData.cost_price === '' || parseFloat(formData.cost_price) < 0)  errs.cost_price    = 'سعر الشراء غير صحيح'
    if (!formData.selling_price || parseFloat(formData.selling_price) <= 0) errs.selling_price = 'سعر البيع مطلوب'
    if (formData.quantity === '' || parseInt(formData.quantity) < 0)        errs.quantity      = 'الكمية غير صحيحة'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    // ✅ بدون created_by — مش محتاجين auth
    const productData = {
      name:          formData.name.trim(),
      category:      formData.category || null,
      cost_price:    parseFloat(formData.cost_price)    || 0,
      selling_price: parseFloat(formData.selling_price) || 0,
      quantity:      parseInt(formData.quantity)        || 0,
      min_stock:     parseInt(formData.min_stock)       || 10,
      unit:          formData.unit || 'قطعة',
      barcode:       formData.barcode?.trim() || null,
      is_active:     true,
    }

    try {
      if (editMode && currentProduct) {
        const { error } = await supabase
          .from('products').update(productData).eq('id', currentProduct.id)
        if (error) throw error
        toast.success('تم تحديث المنتج بنجاح')
        const updated = products.map(p => p.id === currentProduct.id ? { ...p, ...productData } : p)
        setProducts(updated)
        await saveToCache('products', updated)
      } else {
        const { data, error } = await supabase
          .from('products').insert([productData]).select().single()
        if (error) throw error
        toast.success('تم إضافة المنتج بنجاح')
        const updated = [...products, data]
        setProducts(updated)
        await saveToCache('products', updated)
      }
      closeModal()
    } catch (error) {
      console.error('Save product error:', error)
      toast.error(`حدث خطأ: ${error.message}`)
    }
  }

  const confirmDelete = async () => {
    if (!productToDelete || deleting) return
    setDeleting(true)
    try {
      const { error } = await supabase.from('products').delete().eq('id', productToDelete.id)
      if (error) {
        // لو فيه foreign key — عمل soft delete
        if (error.message?.includes('foreign key') || error.code === '23503') {
          await supabase.from('products').update({ is_active: false }).eq('id', productToDelete.id)
        } else {
          throw error
        }
      }
      const updated = products.filter(p => p.id !== productToDelete.id)
      setProducts(updated)
      await saveToCache('products', updated)
      toast.success('تم حذف المنتج')
      setDeleteConfirmOpen(false)
      setProductToDelete(null)
    } catch (error) {
      console.error(error)
      toast.error(`حدث خطأ في الحذف: ${error.message}`)
    } finally {
      setDeleting(false)
    }
  }

  const openModal = () => {
    setEditMode(false); setCurrentProduct(null)
    setFormData({ name:'', category:'', cost_price:'', selling_price:'', quantity:'', min_stock:'10', unit:'قطعة', barcode:'' })
    setErrors({}); setModalOpen(true)
  }
  const openEdit = (p) => {
    setCurrentProduct(p)
    setFormData({
      name:          p.name          || '',
      category:      p.category      || '',
      cost_price:    p.cost_price?.toString()    || '',
      selling_price: p.selling_price?.toString() || '',
      quantity:      p.quantity?.toString()      || '',
      min_stock:     p.min_stock?.toString()     || '10',
      unit:          p.unit          || 'قطعة',
      barcode:       p.barcode       || '',
    })
    setEditMode(true); setErrors({}); setModalOpen(true)
  }
  const closeModal = () => { setModalOpen(false); setEditMode(false); setCurrentProduct(null); setErrors({}) }

  const columns = [
    { header: 'المنتج',    accessor: 'name',   render: r => <div><p className="font-semibold">{r.name}</p>{r.category && <p className="text-xs text-gray-500">{r.category}</p>}</div> },
    { header: 'سعر الشراء', accessor: 'cost_price',    render: r => <span className="text-sm">{formatCurrency(r.cost_price)}</span> },
    { header: 'سعر البيع', accessor: 'selling_price',  render: r => <span className="font-semibold">{formatCurrency(r.selling_price)}</span> },
    { header: 'الكمية',    accessor: 'quantity', render: r => (
      <div className="flex items-center gap-1">
        {r.quantity <= (r.min_stock || 10) && <AlertTriangle size={14} className="text-danger-500" />}
        <span className={`font-semibold ${r.quantity <= (r.min_stock || 10) ? 'text-danger-600' : ''}`}>
          {formatNumber(r.quantity)} {r.unit}
        </span>
      </div>
    )},
    { header: 'الحالة', accessor: 'status', render: r => (
      <Badge variant={r.quantity > (r.min_stock || 10) ? 'success' : 'danger'}>
        {r.quantity > (r.min_stock || 10) ? 'متوفر' : 'منخفض'}
      </Badge>
    )},
    { header: 'إجراءات', accessor: 'actions', render: r => (
      <div className="flex gap-1">
        <button onClick={() => openEdit(r)} className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg"><Edit2 size={16} /></button>
        <button onClick={() => { setProductToDelete(r); setDeleteConfirmOpen(true) }} className="p-2 text-danger-600 hover:bg-danger-50 rounded-lg"><Trash2 size={16} /></button>
      </div>
    )},
  ]

  const stats = {
    total:      products.length,
    lowStock:   products.filter(p => p.quantity <= (p.min_stock || 10)).length,
    totalValue: products.reduce((s, p) => s + ((p.quantity || 0) * (p.cost_price || 0)), 0),
  }

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><LoadingSpinner size="lg" /></div>

  return (
    <div className="space-y-4 sm:space-y-6">
      {offline && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center gap-2">
          <WifiOff size={16} className="text-yellow-600 flex-shrink-0" />
          <span className="text-yellow-800 text-sm">بدون إنترنت — عرض البيانات المحفوظة</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card padding={false} className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-gray-600">إجمالي المنتجات</p><p className="text-2xl font-bold text-gray-900">{stats.total}</p></div>
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center"><Package className="text-primary-600" size={20} /></div>
          </div>
        </Card>
        <Card padding={false} className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-gray-600">منتجات منخفضة</p><p className="text-2xl font-bold text-danger-600">{stats.lowStock}</p></div>
            <div className="w-10 h-10 bg-danger-100 rounded-lg flex items-center justify-center"><AlertTriangle className="text-danger-600" size={20} /></div>
          </div>
        </Card>
        <Card padding={false} className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-gray-600">قيمة المخزون</p><p className="text-xl font-bold text-success-600">{formatCurrency(stats.totalValue)}</p></div>
            <div className="w-10 h-10 bg-success-100 rounded-lg flex items-center justify-center"><Package className="text-success-600" size={20} /></div>
          </div>
        </Card>
      </div>

      <Card title="المنتجات" action={
        <Button onClick={openModal} size="sm"><Plus size={18} /><span className="hidden sm:inline">إضافة منتج</span></Button>
      }>
        <div className="hidden md:block">
          <Table columns={columns} data={products} emptyMessage="لا توجد منتجات" />
        </div>
        <div className="md:hidden space-y-3">
          {products.length === 0 ? <div className="text-center py-8 text-gray-400">لا توجد منتجات</div>
          : products.map(p => (
            <div key={p.id} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div><p className="font-semibold">{p.name}</p>{p.category && <p className="text-xs text-gray-500">{p.category}</p>}</div>
                <Badge variant={p.quantity > (p.min_stock || 10) ? 'success' : 'danger'}>
                  {p.quantity > (p.min_stock || 10) ? 'متوفر' : 'منخفض'}
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center mb-3">
                {[['الشراء', p.cost_price], ['البيع', p.selling_price]].map(([l, v]) => (
                  <div key={l} className="bg-white rounded p-2"><p className="text-xs text-gray-500">{l}</p><p className="font-semibold text-xs">{formatCurrency(v)}</p></div>
                ))}
                <div className="bg-white rounded p-2"><p className="text-xs text-gray-500">الكمية</p><p className={`font-semibold text-xs ${p.quantity <= (p.min_stock || 10) ? 'text-danger-600' : ''}`}>{formatNumber(p.quantity)}</p></div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(p)} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-primary-600 bg-primary-50 rounded-lg text-sm"><Edit2 size={15} /> تعديل</button>
                <button onClick={() => { setProductToDelete(p); setDeleteConfirmOpen(true) }} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-danger-600 bg-danger-50 rounded-lg text-sm"><Trash2 size={15} /> حذف</button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Modal isOpen={modalOpen} onClose={closeModal} title={editMode ? 'تعديل منتج' : 'إضافة منتج جديد'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="اسم المنتج" name="name" value={formData.name}
              onChange={e => setFormData(p => ({...p, name: e.target.value}))}
              placeholder="مثال: شيبسي ليز كبير" required error={errors.name} />
            <Select label="الفئة" name="category" value={formData.category}
              onChange={e => setFormData(p => ({...p, category: e.target.value}))}
              options={categories} placeholder="اختر الفئة" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="سعر الشراء (جنيه)" type="number" name="cost_price" value={formData.cost_price}
              onChange={e => setFormData(p => ({...p, cost_price: e.target.value}))}
              placeholder="0.00" step="0.01" required error={errors.cost_price} />
            <Input label="سعر البيع (جنيه)" type="number" name="selling_price" value={formData.selling_price}
              onChange={e => setFormData(p => ({...p, selling_price: e.target.value}))}
              placeholder="0.00" step="0.01" required error={errors.selling_price} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Input label="الكمية" type="number" name="quantity" value={formData.quantity}
              onChange={e => setFormData(p => ({...p, quantity: e.target.value}))}
              placeholder="0" required error={errors.quantity} />
            <Input label="الحد الأدنى" type="number" name="min_stock" value={formData.min_stock}
              onChange={e => setFormData(p => ({...p, min_stock: e.target.value}))} placeholder="10" />
            <Select label="الوحدة" name="unit" value={formData.unit}
              onChange={e => setFormData(p => ({...p, unit: e.target.value}))} options={units} />
          </div>
          <Input label="الباركود (اختياري)" name="barcode" value={formData.barcode}
            onChange={e => setFormData(p => ({...p, barcode: e.target.value}))} placeholder="الباركود" />
          <div className="flex gap-3 pt-2">
            <Button type="submit" variant="primary" fullWidth>{editMode ? 'تحديث المنتج' : 'إضافة المنتج'}</Button>
            <Button type="button" variant="secondary" fullWidth onClick={closeModal}>إلغاء</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => { if (!deleting) { setDeleteConfirmOpen(false); setProductToDelete(null) } }}
        onConfirm={confirmDelete}
        title="حذف المنتج"
        message={`هل أنت متأكد من حذف "${productToDelete?.name}"؟`}
        confirmText={deleting ? 'جاري الحذف...' : 'حذف'}
      />
    </div>
  )
}
