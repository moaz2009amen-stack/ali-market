'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { Plus, Trash2, Save, Printer } from 'lucide-react'
import { formatCurrency, formatNumber } from '@/lib/utils/format'
import { calculateInvoiceTotal, calculateInvoiceProfit } from '@/lib/utils/calculations'
import { printThermalInvoice } from '@/lib/utils/exports'
import toast from 'react-hot-toast'

export default function NewInvoicePage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [invoiceItems, setInvoiceItems] = useState([])
  const [paidAmount, setPaidAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [draftSaved, setDraftSaved] = useState(false)

  useEffect(() => {
    fetchInitialData()
  }, [])

  // تحميل المسودة عند الدخول
  useEffect(() => {
    const savedDraft = localStorage.getItem('invoice_draft')
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft)
        
        if (confirm('تم العثور على مسودة محفوظة. هل تريد استكمالها؟')) {
          setSelectedCustomer(draft.customer_id)
          setInvoiceItems(draft.items)
          setPaidAmount(draft.paid_amount)
          setNotes(draft.notes)
          toast.success('تم تحميل المسودة')
        } else {
          localStorage.removeItem('invoice_draft')
        }
      } catch (error) {
        console.error('Error loading draft:', error)
      }
    }
  }, [])

  // Auto Save كل 30 ثانية
  useEffect(() => {
    const autoSave = setInterval(() => {
      if (invoiceItems.length > 0 && selectedCustomer) {
        saveDraft()
      }
    }, 30000) // كل 30 ثانية

    return () => clearInterval(autoSave)
  }, [invoiceItems, selectedCustomer, paidAmount, notes])

  async function fetchInitialData() {
    try {
      // جلب العملاء
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('id, name, shop_name')
        .eq('is_active', true)
        .order('name')

      if (customersError) throw customersError

      // جلب المنتجات المتاحة
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .gt('quantity', 0)
        .order('name')

      if (productsError) throw productsError

      setCustomers(customersData || [])
      setProducts(productsData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('حدث خطأ في تحميل البيانات')
    } finally {
      setLoading(false)
    }
  }

  // دالة حفظ المسودة
  const saveDraft = () => {
    try {
      const draft = {
        customer_id: selectedCustomer,
        items: invoiceItems,
        paid_amount: paidAmount,
        notes: notes,
        saved_at: new Date().toISOString()
      }
      
      localStorage.setItem('invoice_draft', JSON.stringify(draft))
      setDraftSaved(true)
      
      setTimeout(() => setDraftSaved(false), 2000)
    } catch (error) {
      console.error('Error saving draft:', error)
    }
  }

  const addInvoiceItem = () => {
    setInvoiceItems([
      ...invoiceItems,
      {
        id: Date.now(),
        product_id: '',
        product_name: '',
        quantity: 1,
        cost_price: 0,
        selling_price: 0,
        available_quantity: 0
      }
    ])
  }

  const removeInvoiceItem = (itemId) => {
    setInvoiceItems(invoiceItems.filter(item => item.id !== itemId))
  }

  const updateInvoiceItem = (itemId, field, value) => {
    setInvoiceItems(invoiceItems.map(item => {
      if (item.id === itemId) {
        let updatedItem = { ...item, [field]: value }
        
        // عند اختيار منتج
        if (field === 'product_id' && value) {
          const product = products.find(p => p.id === value)
          if (product) {
            updatedItem = {
              ...updatedItem,
              product_name: product.name,
              cost_price: product.cost_price,
              selling_price: product.selling_price,
              available_quantity: product.quantity
            }
          }
        }
        
        return updatedItem
      }
      return item
    }))
  }

  const calculateTotals = () => {
    const total = invoiceItems.reduce((sum, item) => {
      return sum + (item.quantity * item.selling_price)
    }, 0)
    
    const paid = parseFloat(paidAmount) || 0
    const remaining = total - paid
    
    return { total, paid, remaining }
  }

  const validateInvoice = () => {
    if (!selectedCustomer) {
      toast.error('يرجى اختيار العميل')
      return false
    }
    
    if (invoiceItems.length === 0) {
      toast.error('يرجى إضافة منتج واحد على الأقل')
      return false
    }
    
    for (const item of invoiceItems) {
      if (!item.product_id) {
        toast.error('يرجى اختيار المنتج لكل سطر')
        return false
      }
      
      if (item.quantity <= 0) {
        toast.error('الكمية يجب أن تكون أكبر من صفر')
        return false
      }
      
      if (item.quantity > item.available_quantity) {
        toast.error(`الكمية المتاحة من ${item.product_name} هي ${item.available_quantity} فقط`)
        return false
      }
    }
    
    const { total, paid } = calculateTotals()
    
    if (paid < 0 || paid > total) {
      toast.error('المبلغ المدفوع غير صحيح')
      return false
    }
    
    return true
  }

  const handleSaveInvoice = async (printAfterSave = false) => {
    if (!validateInvoice()) return
    
    setSaving(true)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { total, paid, remaining } = calculateTotals()
      
      // توليد رقم الفاتورة
      const { data: invoiceNumberData } = await supabase
        .rpc('generate_invoice_number')
      
      const invoiceNumber = invoiceNumberData || `INV-${Date.now()}`
      
      // تحديد حالة الدفع
      let paymentStatus = 'unpaid'
      if (paid >= total) paymentStatus = 'paid'
      else if (paid > 0) paymentStatus = 'partial'
      
      // حفظ الفاتورة
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert([{
          invoice_number: invoiceNumber,
          customer_id: selectedCustomer,
          total_amount: total,
          paid_amount: paid,
          remaining_amount: remaining,
          payment_status: paymentStatus,
          notes: notes,
          created_by: user.id
        }])
        .select()
        .single()
      
      if (invoiceError) throw invoiceError
      
      // حفظ بنود الفاتورة
      const items = invoiceItems.map(item => ({
        invoice_id: invoice.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        cost_price: item.cost_price,
        selling_price: item.selling_price,
        total: item.quantity * item.selling_price,
        profit: (item.selling_price - item.cost_price) * item.quantity
      }))
      
      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(items)
      
      if (itemsError) throw itemsError
      
      // تسجيل الدفعة إذا كان هناك مبلغ مدفوع
      if (paid > 0) {
        const { error: paymentError } = await supabase
          .from('payments')
          .insert([{
            customer_id: selectedCustomer,
            invoice_id: invoice.id,
            amount: paid,
            payment_method: 'نقدي',
            collected_by: user.id
          }])
        
        if (paymentError) throw paymentError
      }
      
      // حذف المسودة بعد الحفظ الناجح
      localStorage.removeItem('invoice_draft')
      
      toast.success('تم حفظ الفاتورة بنجاح')
      
      // الطباعة إذا طُلبت
      if (printAfterSave) {
        const customer = customers.find(c => c.id === selectedCustomer)
        const fullInvoice = {
          ...invoice,
          customer_name: customer?.name || 'غير معروف',
          items: items
        }
        printThermalInvoice(fullInvoice)
      }
      
      // العودة لصفحة الفواتير
      router.push('/dashboard/invoices')
      router.refresh()
      
    } catch (error) {
      console.error('Error saving invoice:', error)
      toast.error('حدث خطأ في حفظ الفاتورة')
    } finally {
      setSaving(false)
    }
  }

  const { total, paid, remaining } = calculateTotals()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card title="إنشاء فاتورة جديدة">
        <div className="space-y-6">
          {/* اختيار العميل */}
          <Select
            label="العميل"
            value={selectedCustomer}
            onChange={(e) => setSelectedCustomer(e.target.value)}
            options={customers.map(c => ({
              value: c.id,
              label: c.shop_name ? `${c.name} - ${c.shop_name}` : c.name
            }))}
            placeholder="اختر العميل"
            required
          />

          {/* المنتجات */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">المنتجات</h3>
              <Button onClick={addInvoiceItem} size="sm">
                <Plus size={18} />
                إضافة منتج
              </Button>
            </div>

            <div className="space-y-3">
              {invoiceItems.map((item, index) => (
                <div key={item.id} className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                    <div className="sm:col-span-4">
                      <Select
                        label="المنتج"
                        value={item.product_id}
                        onChange={(e) => updateInvoiceItem(item.id, 'product_id', e.target.value)}
                        options={products.map(p => ({
                          value: p.id,
                          label: `${p.name} (متوفر: ${p.quantity})`
                        }))}
                        placeholder="اختر المنتج"
                        required
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <Input
                        label="الكمية"
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateInvoiceItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                        min="1"
                        max={item.available_quantity}
                        required
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <Input
                        label="السعر"
                        type="number"
                        value={item.selling_price}
                        onChange={(e) => updateInvoiceItem(item.id, 'selling_price', parseFloat(e.target.value) || 0)}
                        step="0.01"
                        required
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        الإجمالي
                      </label>
                      <div className="px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 font-semibold">
                        {formatCurrency(item.quantity * item.selling_price)}
                      </div>
                    </div>

                    <div className="sm:col-span-1 flex justify-center">
                      <button
                        onClick={() => removeInvoiceItem(item.id)}
                        className="p-2 text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {invoiceItems.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  لم تقم بإضافة أي منتجات بعد
                </div>
              )}
            </div>
          </div>

          {/* ملاحظات */}
          <Input
            label="ملاحظات (اختياري)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="أي ملاحظات على الفاتورة..."
          />

          {/* الإجماليات */}
          <div className="bg-primary-50 p-6 rounded-lg space-y-3">
            <div className="flex justify-between items-center text-lg">
              <span className="font-medium text-gray-700">الإجمالي:</span>
              <span className="font-bold text-gray-900">{formatCurrency(total)}</span>
            </div>

            <Input
              label="المبلغ المدفوع"
              type="number"
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
              placeholder="0.00"
              step="0.01"
              max={total}
            />

            <div className="flex justify-between items-center text-lg pt-3 border-t border-primary-200">
              <span className="font-medium text-gray-700">المتبقي:</span>
              <span className={`font-bold ${remaining > 0 ? 'text-danger-600' : 'text-success-600'}`}>
                {formatCurrency(remaining)}
              </span>
            </div>
          </div>

          {/* أزرار الحفظ */}
          <div className="flex gap-3">
            <Button
              onClick={() => handleSaveInvoice(true)}
              variant="primary"
              fullWidth
              disabled={saving}
            >
              <Printer size={20} />
              {saving ? 'جاري الحفظ...' : 'حفظ وطباعة'}
            </Button>

            <Button
              onClick={() => handleSaveInvoice(false)}
              variant="secondary"
              fullWidth
              disabled={saving}
            >
              <Save size={20} />
              حفظ فقط
            </Button>
          </div>
        </div>
      </Card>

      {draftSaved && (
        <div className="fixed bottom-4 left-4 bg-success-500 text-white px-4 py-2 rounded-lg shadow-lg">
          ✓ تم الحفظ تلقائياً
        </div>
      )}
    </div>
  )
}
