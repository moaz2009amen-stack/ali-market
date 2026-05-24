'use client'
import { useEffect, useState } from 'react'
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
  const router = useRouter()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  
  const [customerType, setCustomerType] = useState('existing') // 'existing' or 'temporary'
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [temporaryCustomerName, setTemporaryCustomerName] = useState('')
  const [invoiceItems, setInvoiceItems] = useState([])
  const [paidAmount, setPaidAmount] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    fetchInitialData()
  }, [])

  async function fetchInitialData() {
    try {
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('id, name, shop_name')
        .eq('is_active', true)
        .order('name')

      if (customersError) throw customersError

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
    if (customerType === 'existing' && !selectedCustomer) {
      toast.error('يرجى اختيار العميل')
      return false
    }
    
    if (customerType === 'temporary' && !temporaryCustomerName.trim()) {
      toast.error('يرجى إدخال اسم العميل')
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
      
      const { data: invoiceNumberData } = await supabase
        .rpc('generate_invoice_number')
      
      const invoiceNumber = invoiceNumberData || `INV-${Date.now()}`
      
      let paymentStatus = 'unpaid'
      if (paid >= total) paymentStatus = 'paid'
      else if (paid > 0) paymentStatus = 'partial'
      
      let finalCustomerId = selectedCustomer
      let customerName = ''

      // إذا كان عميل مؤقت، نسجله أولاً
      if (customerType === 'temporary') {
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert([{
            name: temporaryCustomerName,
            phone: 'مؤقت',
            is_active: false, // عميل مؤقت
            created_by: user.id
          }])
          .select()
          .single()

        if (customerError) throw customerError
        finalCustomerId = newCustomer.id
        customerName = temporaryCustomerName
      } else {
        const customer = customers.find(c => c.id === selectedCustomer)
        customerName = customer?.name || 'غير معروف'
      }

      // حفظ الفاتورة
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert([{
          invoice_number: invoiceNumber,
          customer_id: finalCustomerId,
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
      
      // تسجيل الدفعة
      if (paid > 0) {
        await supabase
          .from('payments')
          .insert([{
            customer_id: finalCustomerId,
            invoice_id: invoice.id,
            amount: paid,
            payment_method: 'نقدي',
            collected_by: user.id
          }])
      }
      
      toast.success('تم حفظ الفاتورة بنجاح')
      
      // الطباعة
      if (printAfterSave) {
        const fullInvoice = {
          ...invoice,
          customer_name: customerName,
          items: items
        }
        printThermalInvoice(fullInvoice)
      }
      
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
    <div className="space-y-4 sm:space-y-6 pb-safe">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowRight size={24} />
        </button>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
          إنشاء فاتورة جديدة
        </h1>
      </div>

      <Card title="بيانات العميل">
        <div className="space-y-4">
          {/* نوع العميل */}
          <div className="flex gap-3 p-3 bg-gray-50 rounded-lg">
            <button
              onClick={() => setCustomerType('existing')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                customerType === 'existing'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              عميل مسجل
            </button>
            <button
              onClick={() => setCustomerType('temporary')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                customerType === 'temporary'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              عميل مؤقت
            </button>
          </div>

          {/* اختيار العميل */}
          {customerType === 'existing' ? (
            <Select
              label="اختر العميل"
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              options={customers.map(c => ({
                value: c.id,
                label: c.shop_name ? `${c.name} - ${c.shop_name}` : c.name
              }))}
              placeholder="اختر العميل"
              required
            />
          ) : (
            <Input
              label="اسم العميل"
              value={temporaryCustomerName}
              onChange={(e) => setTemporaryCustomerName(e.target.value)}
              placeholder="أدخل اسم العميل"
              required
            />
          )}
        </div>
      </Card>

      {/* المنتجات */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">المنتجات</h3>
          <Button onClick={addInvoiceItem} size="sm">
            <Plus size={18} />
            <span className="hidden sm:inline">إضافة منتج</span>
          </Button>
        </div>

        <div className="space-y-3">
          {invoiceItems.map((item, index) => (
            <div key={item.id} className="bg-gray-50 p-3 sm:p-4 rounded-lg">
              <div className="space-y-3">
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

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <Input
                    label="الكمية"
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateInvoiceItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                    min="1"
                    max={item.available_quantity}
                    required
                  />

                  <Input
                    label="السعر"
                    type="number"
                    value={item.selling_price}
                    onChange={(e) => updateInvoiceItem(item.id, 'selling_price', parseFloat(e.target.value) || 0)}
                    step="0.01"
                    required
                  />

                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الإجمالي
                    </label>
                    <div className="px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 font-semibold">
                      {formatCurrency(item.quantity * item.selling_price)}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => removeInvoiceItem(item.id)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-danger-600 bg-danger-50 hover:bg-danger-100 rounded-lg transition-colors"
                >
                  <Trash2 size={18} />
                  <span className="text-sm">حذف المنتج</span>
                </button>
              </div>
            </div>
          ))}

          {invoiceItems.length === 0 && (
            <div className="text-center py-8 text-gray-500 text-sm">
              لم تقم بإضافة أي منتجات بعد
            </div>
          )}
        </div>
      </Card>

      {/* ملاحظات */}
      <Card>
        <Input
          label="ملاحظات (اختياري)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="أي ملاحظات على الفاتورة..."
        />
      </Card>

      {/* الإجماليات */}
      <Card>
        <div className="bg-primary-50 p-4 sm:p-6 rounded-lg space-y-3">
          <div className="flex justify-between items-center text-base sm:text-lg">
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

          <div className="flex justify-between items-center text-lg sm:text-xl pt-3 border-t border-primary-200">
            <span className="font-bold text-gray-700">المتبقي:</span>
            <span className={`font-bold ${remaining > 0 ? 'text-danger-600' : 'text-success-600'}`}>
              {formatCurrency(remaining)}
            </span>
          </div>
        </div>
      </Card>

      {/* أزرار الحفظ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
  )
}
