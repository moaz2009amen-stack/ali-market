'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { Save, ArrowRight } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format'
import toast from 'react-hot-toast'

export default function EditInvoicePage() {
  const router   = useRouter()
  const params   = useParams()
  const supabase = createClient()

  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [paidAmount, setPaidAmount] = useState('')
  const [notes, setNotes]           = useState('')
  const [invoice, setInvoice]       = useState(null)

  useEffect(() => { fetchInvoice() }, [])

  async function fetchInvoice() {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*, customers(name), invoice_items(*)')
        .eq('id', params.id)
        .single()
      if (error) throw error
      setInvoice(data)
      setPaidAmount(data.paid_amount.toString())
      setNotes(data.notes || '')
    } catch (error) {
      toast.error('حدث خطأ في تحميل الفاتورة')
      router.push('/dashboard/invoices')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async () => {
    const newPaid = parseFloat(paidAmount) || 0
    if (newPaid < 0) { toast.error('المبلغ لا يمكن أن يكون سالباً'); return }
    if (newPaid > invoice.total_amount) { toast.error('المبلغ أكبر من إجمالي الفاتورة'); return }

    setSaving(true)
    try {
      const remaining     = Math.max(0, invoice.total_amount - newPaid)
      const paymentStatus = newPaid >= invoice.total_amount ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid'

      const { error } = await supabase
        .from('invoices')
        .update({ paid_amount: newPaid, remaining_amount: remaining, payment_status: paymentStatus, notes })
        .eq('id', params.id)
      if (error) throw error

      // سجّل دفعة إضافية لو المبلغ زاد
      const oldPaid = parseFloat(invoice.paid_amount || 0)
      const diff    = newPaid - oldPaid
      if (diff > 0) {
        // ✅ بدون collected_by
        await supabase.from('payments').insert([{
          customer_id:    invoice.customer_id,
          invoice_id:     invoice.id,
          amount:         diff,
          payment_method: 'نقدي',
        }])
      }

      toast.success('تم تحديث الفاتورة بنجاح')
      router.push('/dashboard/invoices')
    } catch (error) {
      toast.error(`حدث خطأ: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]"><LoadingSpinner size="lg" /></div>
  )
  if (!invoice) return null

  const total     = invoice.total_amount
  const paid      = parseFloat(paidAmount) || 0
  const remaining = Math.max(0, total - paid)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowRight size={24} />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">تعديل فاتورة #{invoice.invoice_number}</h1>
      </div>

      <Card title="تفاصيل الفاتورة">
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-500 mb-1">العميل</p>
            <p className="font-bold">{invoice.customers?.name}</p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-500 mb-2">المنتجات</p>
            <div className="space-y-2">
              {invoice.invoice_items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span>{item.product_name} × {item.quantity}</span>
                  <span className="font-semibold">{formatCurrency(item.quantity * item.selling_price)}</span>
                </div>
              ))}
            </div>
          </div>

          <Input
            label={`المبلغ المدفوع (الحالي: ${formatCurrency(invoice.paid_amount)})`}
            type="number" value={paidAmount}
            onChange={e => setPaidAmount(e.target.value)}
            step="0.01" max={total}
          />

          <Input label="ملاحظات" value={notes}
            onChange={e => setNotes(e.target.value)} placeholder="ملاحظات اختيارية..." />

          <div className="bg-primary-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-700">الإجمالي:</span>
              <span className="font-bold">{formatCurrency(total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">المدفوع:</span>
              <span className="font-bold text-success-600">{formatCurrency(paid)}</span>
            </div>
            <div className="flex justify-between text-lg border-t border-primary-200 pt-2">
              <span className="font-bold text-gray-700">المتبقي:</span>
              <span className={`font-bold ${remaining > 0 ? 'text-danger-600' : 'text-success-600'}`}>
                {formatCurrency(remaining)}
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleUpdate} variant="primary" fullWidth disabled={saving}>
              <Save size={20} />
              {saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
            </Button>
            <Button onClick={() => router.back()} variant="secondary" fullWidth>إلغاء</Button>
          </div>
        </div>
      </Card>
    </div>
  )
    }
