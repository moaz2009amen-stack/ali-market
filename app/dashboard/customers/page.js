'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { saveToCache, getFromCache, isOnline } from '@/lib/offline/offlineDb'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Table from '@/components/ui/Table'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { Plus, Edit2, Trash2, Users, DollarSign, Phone, WifiOff } from 'lucide-react'
import { formatCurrency, formatPhone } from '@/lib/utils/format'
import toast from 'react-hot-toast'

export default function CustomersPage() {
  const supabase = createClient()
  const [customers, setCustomers]             = useState([])
  const [loading, setLoading]                 = useState(true)
  const [offline, setOffline]                 = useState(false)
  const [modalOpen, setModalOpen]             = useState(false)
  const [editMode, setEditMode]               = useState(false)
  const [currentCustomer, setCurrentCustomer] = useState(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [customerToDelete, setCustomerToDelete]   = useState(null)
  const [deleting, setDeleting]               = useState(false)
  const [formData, setFormData] = useState({ name: '', phone: '', address: '', area: '' })
  const [errors, setErrors]     = useState({})

  useEffect(() => {
    fetchCustomers()
    setOffline(!navigator.onLine)
    const onOnline  = () => { setOffline(false); fetchCustomers() }
    const onOffline = () => setOffline(true)
    window.addEventListener('online',  onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online',  onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  async function fetchCustomers() {
    if (!isOnline()) {
      setOffline(true)
      const cached = await getFromCache('customers')
      setCustomers(cached.filter(c => c.is_active !== false))
      setLoading(false)
      return
    }
    try {
      const { data, error } = await supabase
        .from('customers').select('*').eq('is_active', true).order('name')
      if (error) throw error
      const result = data || []
      setCustomers(result)
      await saveToCache('customers', result)
    } catch (error) {
      console.error(error)
      const cached = await getFromCache('customers')
      setCustomers(cached.filter(c => c.is_active !== false))
      setOffline(true)
    } finally {
      setLoading(false)
    }
  }

  const validate = () => {
    const errs = {}
    if (!formData.name.trim())  errs.name  = 'اسم العميل مطلوب'
    if (!formData.phone.trim()) errs.phone = 'رقم الهاتف مطلوب'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    // ✅ بدون created_by — مش محتاجين auth
    const customerData = {
      name:      formData.name.trim(),
      phone:     formData.phone.trim(),
      address:   formData.address || null,
      area:      formData.area    || null,
      is_active: true,
    }

    try {
      if (editMode && currentCustomer) {
        const { error } = await supabase
          .from('customers').update(customerData).eq('id', currentCustomer.id)
        if (error) throw error
        toast.success('تم تحديث العميل بنجاح')
        const updated = customers.map(c => c.id === currentCustomer.id ? { ...c, ...customerData } : c)
        setCustomers(updated)
        await saveToCache('customers', updated)
      } else {
        const { data, error } = await supabase
          .from('customers').insert([customerData]).select().single()
        if (error) throw error
        toast.success('تم إضافة العميل بنجاح')
        const updated = [...customers, data]
        setCustomers(updated)
        await saveToCache('customers', updated)
      }
      closeModal()
    } catch (error) {
      console.error('Save customer error:', error)
      toast.error(`حدث خطأ: ${error.message}`)
    }
  }

  const confirmDelete = async () => {
    if (!customerToDelete || deleting) return
    setDeleting(true)
    try {
      await supabase.from('payments').delete().eq('customer_id', customerToDelete.id)
      const { data: invs } = await supabase.from('invoices').select('id').eq('customer_id', customerToDelete.id)
      if (invs?.length) {
        await supabase.from('invoice_items').delete().in('invoice_id', invs.map(i => i.id))
        await supabase.from('invoices').delete().eq('customer_id', customerToDelete.id)
      }
      const { error } = await supabase.from('customers').delete().eq('id', customerToDelete.id)
      if (error) throw error
      const updated = customers.filter(c => c.id !== customerToDelete.id)
      setCustomers(updated)
      await saveToCache('customers', updated)
      toast.success('تم حذف العميل')
      setDeleteConfirmOpen(false)
      setCustomerToDelete(null)
    } catch (error) {
      console.error(error)
      toast.error(`حدث خطأ في الحذف: ${error.message}`)
    } finally {
      setDeleting(false)
    }
  }

  const openModal = () => {
    setEditMode(false); setCurrentCustomer(null)
    setFormData({ name: '', phone: '', address: '', area: '' })
    setErrors({}); setModalOpen(true)
  }
  const openEdit = (c) => {
    setCurrentCustomer(c)
    setFormData({ name: c.name || '', phone: c.phone || '', address: c.address || '', area: c.area || '' })
    setEditMode(true); setErrors({}); setModalOpen(true)
  }
  const closeModal = () => { setModalOpen(false); setEditMode(false); setCurrentCustomer(null); setErrors({}) }

  const columns = [
    { header: 'العميل',  accessor: 'name', render: r => <div><p className="font-semibold">{r.name}</p>{r.area && <p className="text-xs text-gray-500">{r.area}</p>}</div> },
    { header: 'الهاتف',  accessor: 'phone', render: r => <div className="flex items-center gap-2"><Phone size={14} className="text-gray-400" /><span className="font-mono text-sm">{formatPhone(r.phone)}</span></div> },
    { header: 'الديون',  accessor: 'total_debt', render: r => <span className={`font-semibold ${(r.total_debt||0) > 0 ? 'text-danger-600' : 'text-success-600'}`}>{formatCurrency(r.total_debt||0)}</span> },
    { header: 'إجراءات', accessor: 'actions', render: r => (
      <div className="flex gap-1">
        <button onClick={() => openEdit(r)} className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg"><Edit2 size={16} /></button>
        <button onClick={() => { setCustomerToDelete(r); setDeleteConfirmOpen(true) }} className="p-2 text-danger-600 hover:bg-danger-50 rounded-lg"><Trash2 size={16} /></button>
      </div>
    )},
  ]

  const stats = {
    total:     customers.length,
    withDebt:  customers.filter(c => (c.total_debt||0) > 0).length,
    totalDebt: customers.reduce((s, c) => s + (c.total_debt||0), 0),
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card padding={false} className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-gray-600">إجمالي العملاء</p><p className="text-2xl font-bold">{stats.total}</p></div>
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center"><Users className="text-primary-600" size={20} /></div>
          </div>
        </Card>
        <Card padding={false} className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-gray-600">عملاء بديون</p><p className="text-2xl font-bold text-warning-600">{stats.withDebt}</p></div>
            <div className="w-10 h-10 bg-warning-100 rounded-lg flex items-center justify-center"><Users className="text-warning-600" size={20} /></div>
          </div>
        </Card>
        <Card padding={false} className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-gray-600">إجمالي الديون</p><p className="text-xl font-bold text-danger-600">{formatCurrency(stats.totalDebt)}</p></div>
            <div className="w-10 h-10 bg-danger-100 rounded-lg flex items-center justify-center"><DollarSign className="text-danger-600" size={20} /></div>
          </div>
        </Card>
      </div>

      <Card title="العملاء" action={
        <Button onClick={openModal} size="sm"><Plus size={18} /><span className="hidden sm:inline">إضافة عميل</span></Button>
      }>
        <div className="hidden md:block">
          <Table columns={columns} data={customers} emptyMessage="لا يوجد عملاء" />
        </div>
        <div className="md:hidden space-y-3">
          {customers.length === 0 ? <div className="text-center py-8 text-gray-400">لا يوجد عملاء</div>
          : customers.map(c => (
            <div key={c.id} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div><p className="font-semibold">{c.name}</p>{c.area && <p className="text-xs text-gray-500">{c.area}</p>}</div>
                <span className={`text-sm font-bold ${(c.total_debt||0) > 0 ? 'text-danger-600' : 'text-success-600'}`}>{formatCurrency(c.total_debt||0)}</span>
              </div>
              <div className="flex items-center gap-2 mb-3"><Phone size={14} className="text-gray-400" /><span className="text-sm font-mono">{formatPhone(c.phone)}</span></div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(c)} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-primary-600 bg-primary-50 rounded-lg text-sm"><Edit2 size={15} /> تعديل</button>
                <button onClick={() => { setCustomerToDelete(c); setDeleteConfirmOpen(true) }} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-danger-600 bg-danger-50 rounded-lg text-sm"><Trash2 size={15} /> حذف</button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Modal isOpen={modalOpen} onClose={closeModal} title={editMode ? 'تعديل عميل' : 'إضافة عميل جديد'} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="اسم العميل" name="name" value={formData.name}
            onChange={e => setFormData(p => ({...p, name: e.target.value}))} required error={errors.name} />
          <Input label="رقم الهاتف" type="tel" name="phone" value={formData.phone}
            onChange={e => setFormData(p => ({...p, phone: e.target.value}))} placeholder="01001234567" required error={errors.phone} />
          <Input label="المنطقة (اختياري)" name="area" value={formData.area}
            onChange={e => setFormData(p => ({...p, area: e.target.value}))} />
          <Input label="العنوان (اختياري)" name="address" value={formData.address}
            onChange={e => setFormData(p => ({...p, address: e.target.value}))} />
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
        message={`هل أنت متأكد من حذف "${customerToDelete?.name}"؟ سيتم حذف جميع فواتيره.`}
        confirmText={deleting ? 'جاري الحذف...' : 'حذف'}
      />
    </div>
  )
}
