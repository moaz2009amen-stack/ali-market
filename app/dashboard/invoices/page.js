'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { saveToCache, getFromCache, isOnline } from '@/lib/offline/offlineDb'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import InvoicePreview from '@/components/invoice/InvoicePreview'
import { printThermalInvoice } from '@/lib/utils/exports'
import { Plus, Eye, Edit2, Trash2, Search, WifiOff } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import toast from 'react-hot-toast'

export default function InvoicesPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [invoices, setInvoices]           = useState([])
  const [loading, setLoading]             = useState(true)
  const [offline, setOffline]             = useState(false)
  const [searchQuery, setSearchQuery]     = useState('')
  const [filterStatus, setFilterStatus]   = useState('all')
  const [previewInvoice, setPreviewInvoice] = useState(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [invoiceToDelete, setInvoiceToDelete]     = useState(null)
  const [deleting, setDeleting]           = useState(false)

  useEffect(() => {
    fetchInvoices()
    const onOnline  = () => { setOffline(false); fetchInvoices() }
    const onOffline = () => setOffline(true)
    window.addEventListener('online',  onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online',  onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  async function fetchInvoices() {
    // ✅ offline: جيب من الـ cache
    if (!isOnline()) {
      setOffline(true)
      const cached = await getFromCache('invoices')
      if (cached.length > 0) setInvoices(cached)
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`*, customers (name)`)
        .order('created_at', { ascending: false })
      if (error) throw error

      const result = (data || []).map(inv => ({
        ...inv,
        customer_name: inv.customers?.name || 'غير معروف'
      }))
      setInvoices(result)
      setOffline(false)
      await saveToCache('invoices', result)
    } catch (error) {
      // fallback للـ cache لو الـ network فشل
      const cached = await getFromCache('invoices')
      if (cached.length > 0) {
        setInvoices(cached)
        setOffline(true)
      } else {
        toast.error('حدث خطأ في تحميل الفواتير')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleView = async (invoice) => {
    // لو offline جرب من الـ cache
    if (!isOnline()) {
      const cachedItems = await getFromCache('invoice_items')
      const items = cachedItems.filter(i => i.invoice_id === invoice.id)
      setPreviewInvoice({ ...invoice, items })
      return
    }
    try {
      const { data: items, error } = await supabase
        .from('invoice_items').select('*').eq('invoice_id', invoice.id)
      if (error) throw error
      setPreviewInvoice({ ...invoice, items: items || [] })
    } catch (error) {
      toast.error('حدث خطأ في تحميل الفاتورة')
    }
  }

  const handleDelete = (invoice) => {
    if (offline) { toast.error('لا يمكن الحذف بدون إنترنت'); return }
    setInvoiceToDelete(invoice)
    setDeleteConfirmOpen(true)
  }

  const confirmDelete = async () => {
    if (!invoiceToDelete || deleting) return
    setDeleting(true)
    try {
      await supabase.from('invoice_items').delete().eq('invoice_id', invoiceToDelete.id)
      await supabase.from('payments').delete().eq('invoice_id', invoiceToDelete.id)
      const { error } = await supabase.from('invoices').delete().eq('id', invoiceToDelete.id)
      if (error) throw error

      const updated = invoices.filter(inv => inv.id !== invoiceToDelete.id)
      setInvoices(updated)
      await saveToCache('invoices', updated)
      toast.success('تم حذف الفاتورة بنجاح')
      setDeleteConfirmOpen(false)
      setInvoiceToDelete(null)
    } catch (error) {
      toast.error('حدث خطأ في حذف الفاتورة')
    } finally {
      setDeleting(false)
    }
  }

  const getStatusBadge = (status) => {
    const map = {
      paid:    { variant: 'success', label: 'مدفوع' },
      partial: { variant: 'warning', label: 'جزئي' },
      unpaid:  { variant: 'danger',  label: 'غير مدفوع' },
    }
    const s = map[status] || { variant: 'default', label: status }
    return <Badge variant={s.variant}>{s.label}</Badge>
  }

  const filteredInvoices = invoices.filter(inv => {
    const matchSearch = !searchQuery ||
      inv.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.customer_name?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchStatus = filterStatus === 'all' || inv.payment_status === filterStatus
    return matchSearch && matchStatus
  })

  const stats = {
    total:          invoices.length,
    paid:           invoices.filter(i => i.payment_status === 'paid').length,
    partial:        invoices.filter(i => i.payment_status === 'partial').length,
    totalRemaining: invoices.reduce((s, i) => s + (parseFloat(i.remaining_amount) || 0), 0),
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]"><LoadingSpinner size="lg" /></div>
  )

  return (
    <div className="space-y-4 sm:space-y-6">
      {offline && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center gap-2">
          <WifiOff size={16} className="text-yellow-600 flex-shrink-0" />
          <span className="text-yellow-800 text-sm">وضع بدون إنترنت — البيانات المحفوظة</span>
        </div>
      )}

      {/* إحصائيات */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card padding={false} className="p-4 sm:p-6">
          <p className="text-xs sm:text-sm text-gray-600">إجمالي الفواتير</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.total}</p>
        </Card>
        <Card padding={false} className="p-4 sm:p-6">
          <p className="text-xs sm:text-sm text-gray-600">مدفوعة</p>
          <p className="text-xl sm:text-2xl font-bold text-success-600">{stats.paid}</p>
        </Card>
        <Card padding={false} className="p-4 sm:p-6">
          <p className="text-xs sm:text-sm text-gray-600">جزئية</p>
          <p className="text-xl sm:text-2xl font-bold text-warning-600">{stats.partial}</p>
        </Card>
        <Card padding={false} className="p-4 sm:p-6">
          <p className="text-xs sm:text-sm text-gray-600">إجمالي الديون</p>
          <p className="text-base sm:text-xl font-bold text-danger-600">{formatCurrency(stats.totalRemaining)}</p>
        </Card>
      </div>

      <Card
        title="الفواتير"
        action={
          !offline && (
            <Button onClick={() => router.push('/dashboard/invoices/new')} size="sm">
              <Plus size={18} />
              <span className="hidden sm:inline">فاتورة جديدة</span>
            </Button>
          )
        }
      >
        {/* فلاتر */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="بحث برقم الفاتورة أو العميل..."
              className="w-full pr-9 pl-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary-500"
            />
          </div>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-white appearance-none focus:outline-none focus:border-primary-500"
          >
            <option value="all">الكل</option>
            <option value="paid">مدفوع</option>
            <option value="partial">جزئي</option>
            <option value="unpaid">غير مدفوع</option>
          </select>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                {['رقم الفاتورة','العميل','الإجمالي','المدفوع','المتبقي','الحالة','التاريخ','إجراءات'].map(h => (
                  <th key={h} className="px-4 py-3 text-right text-sm font-semibold text-gray-700">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredInvoices.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-500">لا توجد فواتير</td></tr>
              ) : filteredInvoices.map(invoice => (
                <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-primary-600">#{invoice.invoice_number}</td>
                  <td className="px-4 py-3 text-gray-900">{invoice.customer_name}</td>
                  <td className="px-4 py-3 font-semibold">{formatCurrency(invoice.total_amount || 0)}</td>
                  <td className="px-4 py-3 text-success-600">{formatCurrency(invoice.paid_amount || 0)}</td>
                  <td className="px-4 py-3 text-danger-600">{formatCurrency(invoice.remaining_amount || 0)}</td>
                  <td className="px-4 py-3">{getStatusBadge(invoice.payment_status)}</td>
                  <td className="px-4 py-3 text-gray-500 text-sm">{formatDate(invoice.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleView(invoice)} className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"><Eye size={16} /></button>
                      {!offline && (
                        <>
                          <button onClick={() => router.push(`/dashboard/invoices/${invoice.id}/edit`)} className="p-2 text-warning-600 hover:bg-warning-50 rounded-lg transition-colors"><Edit2 size={16} /></button>
                          <button onClick={() => handleDelete(invoice)} className="p-2 text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-3">
          {filteredInvoices.length === 0 ? (
            <div className="text-center py-8 text-gray-500">لا توجد فواتير</div>
          ) : filteredInvoices.map(invoice => (
            <div key={invoice.id} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-bold text-primary-600">#{invoice.invoice_number}</p>
                  <p className="text-sm font-medium text-gray-700">{invoice.customer_name}</p>
                  <p className="text-xs text-gray-500">{formatDate(invoice.created_at)}</p>
                </div>
                {getStatusBadge(invoice.payment_status)}
              </div>
              <div className="grid grid-cols-3 gap-2 text-center mb-3">
                {[
                  { label: 'الإجمالي', val: invoice.total_amount, cls: 'text-gray-900' },
                  { label: 'المدفوع',  val: invoice.paid_amount,  cls: 'text-success-600' },
                  { label: 'المتبقي',  val: invoice.remaining_amount, cls: 'text-danger-600' },
                ].map(({ label, val, cls }) => (
                  <div key={label} className="bg-white rounded-lg p-2">
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className={`font-bold text-xs ${cls}`}>{formatCurrency(val || 0)}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleView(invoice)} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg text-sm transition-colors">
                  <Eye size={15} /> معاينة
                </button>
                {!offline && (
                  <>
                    <button onClick={() => router.push(`/dashboard/invoices/${invoice.id}/edit`)} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-warning-600 bg-warning-50 hover:bg-warning-100 rounded-lg text-sm transition-colors">
                      <Edit2 size={15} /> تعديل
                    </button>
                    <button onClick={() => handleDelete(invoice)} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-danger-600 bg-danger-50 hover:bg-danger-100 rounded-lg text-sm transition-colors">
                      <Trash2 size={15} /> حذف
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {previewInvoice && (
        <InvoicePreview
          invoice={previewInvoice}
          onClose={() => setPreviewInvoice(null)}
          onPrint={() => printThermalInvoice(previewInvoice)}
        />
      )}

      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => { if (!deleting) { setDeleteConfirmOpen(false); setInvoiceToDelete(null) } }}
        onConfirm={confirmDelete}
        title="حذف الفاتورة"
        message={`هل أنت متأكد من حذف الفاتورة #${invoiceToDelete?.invoice_number}؟`}
        confirmText={deleting ? 'جاري الحذف...' : 'حذف الفاتورة'}
      />
    </div>
  )
}
