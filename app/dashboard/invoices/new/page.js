'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { Plus, Trash2, Save, Printer, ArrowRight } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format'
import { printThermalInvoice } from '@/lib/utils/exports'
import toast from 'react-hot-toast'

export default function NewInvoicePage() {
  const router   = useRouter()
  const supabase = createClient()

  const [loading, setLoading]           = useState(true)
  const [saving, setSaving]             = useState(false)
  const [customers, setCustomers]       = useState([])
  const [products, setProducts]         = useState([])
  const [customerType, setCustomerType] = useState('existing')
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [tempCustomerName, setTempCustomerName] = useState('')
  const [invoiceItems, setInvoiceItems] = useState([])
  const [paidAmount, setPaidAmount]     = useState('')
  const [notes, setNotes]               = useState('')
  const [draftSaved, setDraftSaved]     = useState(false)

  const stateRef = useRef({})
  useEffect(() => {
    stateRef.current = { customerType, selectedCustomer, tempCustomerName, invoiceItems, paidAmount, notes }
  })

  useEffect(() => { fetchInitialData() }, [])

  // تحميل المسودة
  useEffect(() => {
    if (loading) return
    try {
      const saved = localStorage.getItem('invoice_draft')
      if (!saved) return
      const draft = JSON.parse(saved)
      toast(
        (t) => (
          <span style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span>مسودة محفوظة</span>
            <button style={{ fontWeight:600, textDecoration:'underline', background:'none', border:'none', cursor:'pointer' }}
              onClick={() => {
                setCustomerType(draft.customerType || 'existing')
                setSelectedCustomer(draft.customer_id || '')
                setTempCustomerName(draft.temp_name || '')
                setInvoiceItems(draft.items || [])
                setPaidAmount(draft.paid_amount || '')
                setNotes(draft.notes || '')
                toast.dismiss(t.id)
              }}>استكمال</button>
            <button style={{ color:'#888', background:'none', border:'none', cursor:'pointer' }}
              onClick={() => { localStorage.removeItem('invoice_draft'); toast.dismiss(t.id) }}>تجاهل</button>
          </span>
        ),
        { duration: 8000 }
      )
    } catch (e) { localStorage.removeItem('invoice_draft') }
  }, [loading])

  // auto-save كل 30 ثانية
  useEffect(() => {
    const interval = setInterval(() => {
      const s = stateRef.current
      if (s.invoiceItems?.length > 0 && (s.selectedCustomer || s.tempCustomerName)) {
        localStorage.setItem('invoice_draft', JSON.stringify({
          customerType: s.customerType, customer_id: s.selectedCustomer,
          temp_name: s.tempCustomerName, items: s.invoiceItems,
          paid_amount: s.paidAmount, notes: s.notes,
        }))
        setDraftSaved(true)
        setTimeout(() => setDraftSaved(false), 2000)
      }
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  async function fetchInitialData() {
    try {
      const [{ data: cc }, { data: cp }] = await Promise.all([
        supabase.from('customers').select('id, name').eq('is_active', true).order('name'),
        supabase.from('products').select('*').eq('is_active', true).gt('quantity', 0).order('name'),
      ])
      setCustomers(cc || [])
      setProducts(cp || [])
    } catch (error) {
      toast.error(`حدث خطأ في تحميل البيانات: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const addItem = () => setInvoiceItems(p => [...p, {
    id: Date.now(), product_id: '', product_name: '',
    quantity: 1, cost_price: 0, selling_price: 0, available_quantity: 0
  }])

  const updateItem = (itemId, field, value) => {
    setInvoiceItems(p => p.map(item => {
      if (item.id !== itemId) return item
      let u = { ...item, [field]: value }
      if (field === 'product_id' && value) {
        const p = products.find(x => x.id === value)
        if (p) u = { ...u, product_name: p.name, cost_price: p.cost_price, selling_price: p.selling_price, available_quantity: p.quantity }
      }
      return u
    }))
  }

  const getTotals = () => {
    const total     = invoiceItems.reduce((s, i) => s + (i.quantity * i.selling_price), 0)
    const paid      = parseFloat(paidAmount) || 0
    const remaining = Math.max(0, total - paid)
    return { total, paid, remaining }
  }

  const validate = () => {
    if (customerType === 'existing' && !selectedCustomer) { toast.error('يرجى اختيار العميل'); return false }
    if (customerType === 'temporary' && !tempCustomerName.trim()) { toast.error('يرجى إدخال اسم العميل'); return false }
    if (invoiceItems.length === 0) { toast.error('يرجى إضافة منتج واحد على الأقل'); return false }
    for (const item of invoiceItems) {
      if (!item.product_id) { toast.error('اختر المنتج لكل سطر'); return false }
      if (item.quantity <= 0) { toast.error('الكمية يجب أن تكون أكبر من صفر'); return false }
      if (item.quantity > item.available_quantity) {
        toast.error(`الكمية المتاحة من ${item.product_name} هي ${item.available_quantity} فقط`)
        return false
      }
    }
    return true
  }

  const handleSave = async (printAfter = false) => {
    if (!validate()) return
    setSaving(true)
    try {
      const { total, paid, remaining } = getTotals()
      const { data: invoiceNumber }    = await supabase.rpc('generate_invoice_number')
      const paymentStatus = paid >= total ? 'paid' : paid > 0 ? 'partial' : 'unpaid'

      let finalCustomerId = selectedCustomer
      let customerName    = customers.find(c => c.id === selectedCustomer)?.name || ''

      // ✅ عميل مؤقت بدون created_by
      if (customerType === 'temporary') {
        const { data: newCust, error: custErr } = await supabase
          .from('customers')
          .insert([{ name: tempCustomerName.trim(), phone: 'مؤقت', is_active: false }])
          .select().single()
        if (custErr) throw custErr
        finalCustomerId = newCust.id
        customerName    = tempCustomerName.trim()
      }

      // ✅ حفظ الفاتورة بدون created_by
      const { data: invoice, error: invErr } = await supabase
        .from('invoices')
        .insert([{
          invoice_number:   invoiceNumber || `INV-${Date.now()}`,
          customer_id:      finalCustomerId,
          total_amount:     total,
          paid_amount:      paid,
          remaining_amount: remaining,
          payment_status:   paymentStatus,
          notes,
        }])
        .select().single()
      if (invErr) throw invErr

      // بنود الفاتورة
      const items = invoiceItems.map(item => ({
        invoice_id:    invoice.id,
        product_id:    item.product_id,
        product_name:  item.product_name,
        quantity:      item.quantity,
        cost_price:    parseFloat(item.cost_price   || 0),
        selling_price: parseFloat(item.selling_price || 0),
        total:         item.quantity * parseFloat(item.selling_price || 0),
        profit:        (parseFloat(item.selling_price || 0) - parseFloat(item.cost_price || 0)) * item.quantity,
      }))
      const { error: itemsErr } = await supabase.from('invoice_items').insert(items)
      if (itemsErr) throw itemsErr

      // ✅ تسجيل الدفعة بدون collected_by
      if (paid > 0) {
        await supabase.from('payments').insert([{
          customer_id:    finalCustomerId,
          invoice_id:     invoice.id,
          amount:         paid,
          payment_method: 'نقدي',
        }])
      }

      localStorage.removeItem('invoice_draft')
      toast.success('تم حفظ الفاتورة بنجاح')
      if (printAfter) printThermalInvoice({ ...invoice, customer_name: customerName, items })
      router.push('/dashboard/invoices')
      router.refresh()
    } catch (error) {
      console.error(error)
      toast.error(`حدث خطأ: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  const { total, paid, remaining } = getTotals()

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]"><LoadingSpinner size="lg" /></div>
  )

  return (
    <div className="space-y-4 sm:space-y-6 pb-safe">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowRight size={24} />
        </button>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">فاتورة جديدة</h1>
      </div>

      {/* العميل */}
      <Card title="بيانات العميل">
        <div className="space-y-4">
          <div className="flex gap-3 p-3 bg-gray-50 rounded-lg">
            {['existing','temporary'].map(t => (
              <button key={t} onClick={() => setCustomerType(t)}
                className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  customerType === t ? 'bg-primary-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}>
                {t === 'existing' ? 'عميل مسجل' : 'عميل مؤقت'}
              </button>
            ))}
          </div>
          {customerType === 'existing' ? (
            <Select label="اختر العميل" value={selectedCustomer}
              onChange={e => setSelectedCustomer(e.target.value)}
              options={customers.map(c => ({ value: c.id, label: c.name }))}
              placeholder="اختر العميل" required />
          ) : (
            <Input label="اسم العميل المؤقت" value={tempCustomerName}
              onChange={e => setTempCustomerName(e.target.value)}
              placeholder="مثال: أبو محمود" required />
          )}
        </div>
      </Card>

      {/* المنتجات */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">المنتجات</h3>
          <Button onClick={addItem} size="sm"><Plus size={18} /> إضافة</Button>
        </div>
        <div className="space-y-3">
          {invoiceItems.map(item => (
            <div key={item.id} className="bg-gray-50 p-3 sm:p-4 rounded-lg space-y-3">
              <Select label="المنتج" value={item.product_id}
                onChange={e => updateItem(item.id, 'product_id', e.target.value)}
                options={products.map(p => ({ value: p.id, label: `${p.name} (متوفر: ${p.quantity})` }))}
                placeholder="اختر المنتج" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Input label="الكمية" type="number" value={item.quantity}
                  onChange={e => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                  min="1" max={item.available_quantity} />
                <Input label="السعر" type="number" value={item.selling_price}
                  onChange={e => updateItem(item.id, 'selling_price', parseFloat(e.target.value) || 0)}
                  step="0.01" />
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">الإجمالي</label>
                  <div className="px-4 py-2.5 bg-white border border-gray-300 rounded-lg font-semibold text-sm">
                    {formatCurrency(item.quantity * item.selling_price)}
                  </div>
                </div>
              </div>
              <button onClick={() => setInvoiceItems(p => p.filter(i => i.id !== item.id))}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-danger-600 bg-danger-50 hover:bg-danger-100 rounded-lg text-sm transition-colors">
                <Trash2 size={16} /> حذف المنتج
              </button>
            </div>
          ))}
          {invoiceItems.length === 0 && (
            <p className="text-center py-8 text-gray-400 text-sm">لم تقم بإضافة أي منتجات بعد</p>
          )}
        </div>
      </Card>

      {/* ملاحظات */}
      <Card>
        <Input label="ملاحظات (اختياري)" value={notes}
          onChange={e => setNotes(e.target.value)} placeholder="أي ملاحظات على الفاتورة..." />
      </Card>

      {/* الإجماليات */}
      <Card>
        <div className="bg-primary-50 p-4 sm:p-6 rounded-lg space-y-3">
          <div className="flex justify-between text-base sm:text-lg">
            <span className="font-medium text-gray-700">الإجمالي:</span>
            <span className="font-bold">{formatCurrency(total)}</span>
          </div>
          <Input label="المبلغ المدفوع" type="number" value={paidAmount}
            onChange={e => setPaidAmount(e.target.value)} placeholder="0.00" step="0.01" />
          <div className="flex justify-between text-lg sm:text-xl pt-3 border-t border-primary-200">
            <span className="font-bold text-gray-700">المتبقي:</span>
            <span className={`font-bold ${remaining > 0 ? 'text-danger-600' : 'text-success-600'}`}>
              {formatCurrency(remaining)}
            </span>
          </div>
        </div>
      </Card>

      {/* أزرار */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-4">
        <Button onClick={() => handleSave(true)} variant="primary" fullWidth disabled={saving}>
          <Printer size={20} />
          {saving ? 'جاري الحفظ...' : 'حفظ وطباعة'}
        </Button>
        <Button onClick={() => handleSave(false)} variant="secondary" fullWidth disabled={saving}>
          <Save size={20} />
          {saving ? 'جاري الحفظ...' : 'حفظ فقط'}
        </Button>
      </div>

      {draftSaved && (
        <div className="fixed bottom-20 left-4 lg:bottom-4 bg-success-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm z-50">
          ✓ تم الحفظ التلقائي
        </div>
      )}
    </div>
  )
}
