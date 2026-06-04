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

  const [invoices, setInvoices]         = useState([])
  const [loading, setLoading]           = useState(true)
  const [offline, setOffline]           = useState(false)
  const [searchQuery, setSearchQuery]   = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [previewInvoice, setPreviewInvoice]   = useState(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [invoiceToDelete, setInvoiceToDelete]     = useState(null)
  const [deleting, setDeleting]         = useState(false)

  useEffect(() => {
    loadInvoices()
    const onOnline  = () => { setOffline(false); loadInvoices() }
    const onOffline = () => setOffline(true)
    window.addEventListener('online',  onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online',  onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  async function loadInvoices() {
    const online = isOnline()
    setOffline(!online)

    if (!online) {
      // ✅ offline — جيب من الـ cache مباشرة
      const cached = await getFromCache('invoices')
      setInvoices(
        cached.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      )
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*, customers(name)')
        .order('created_at', { ascending: false })
      if (error) throw error

      const result = (data || []).map(inv => ({
        ...inv,
        customer_name: inv.customers?.name || 'غير معروف'
      }))
      setInvoices(result)

      // ✅ احفظ في الـ cache بعد كل fetch ناجح
      await saveToCache('invoices', result)

    } catch {
      // fallback للـ cache
      const cached = await getFromCache('invoices')
      setInvoices(cached.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)))
      setOffline(true)
    } finally {
      setLoading(false)
    }
  }

  const handleView = async (invoice) => {
    if (!isOnline()) {
      // جيب items من cache
      const allItems = await getFromCache('invoice_items')
      const items    = allItems.filter(i => i.invoice_id === invoice.id)
      setPreviewInvoice({ ...invoice, items })
      return
    }
    try {
      const { data: items } = await supabase
        .from('invoice_items').select('*').eq('invoice_id', invoice.id)
      setPreviewInvoice({ ...invoice, items: items || [] })
    } catch {
      toast.error('حدث خطأ في تحميل تفاصيل الفاتورة')
    }
  }

  const confirmDelete = async () => {
    if (!invoiceToDelete || deleting) return
    setDeleting(true)
    try {
      await supabase.from('invoice_items').delete().eq('invoice_id', invoiceToDelete.id)
      await supabase.from('payments').delete().eq('invoice_id', invoiceToDelete.id)
      const { error } = await supabase.from('invoices').delete().eq('id', invoiceToDelete.id)
      if (error) throw error

      const updated = invoices.filter(i => i.id !== invoiceToDelete.id)
      setInvoices(updated)
      await saveToCache('invoices', updated)
      toast.success('تم حذف الفاتورة')
      setDeleteConfirmOpen(false)
      setInvoiceToDelete(null)
    } catch {
      toast.error('حدث خطأ في الحذف')
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

  const filtered = invoices.filter(inv => {
    const q = searchQuery.toLowerCase()
    const matchSearch = !q ||
      inv.invoice_number?.toLowerCase().includes(q) ||
      inv.customer_name?.toLowerCase().includes(q)
    const matchStatus = filterStatus === 'all' || inv.payment_status === filterStatus
    return matchSearch && matchStatus
  })

  const stats = {
    total:     invoices.length,
    paid:      invoices.filter(i => i.payment_status === 'paid').length,
    partial:   invoices.filter(i => i.payment_status === 'partial').length,
    remaining: invoices.reduce((s, i) => s + (parseFloat(i.remaining_amount) || 0), 0),
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]"><LoadingSpinner size="lg" /></div>
  )

  return (
    <div className="space-y-4 sm:space-y-6">

      {offline && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center gap-2">
          <WifiOff size={16} className="text-yellow-600 flex-shrink-0" />
          <span className="text-yellow-800 text-sm font-medium">
            بدون إنترنت — عرض الفواتير المحفوظة
          </span>
        </div>
      )}

      {/* إحصائيات */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card padding={false} className="p-4"><p className="text-xs text-gray-500">الفواتير</p><p className="text-2xl font-bold">{stats.total}</p></Card>
        <Card padding={false} className="p-4"><p className="text-xs text-gray-500">مدفوعة</p><p className="text-2xl font-bold text-success-600">{stats.paid}</p></Card>
        <Card padding={false} className="p-4"><p className="text-xs text-gray-500">جزئية</p><p className="text-2xl font-bold text-warning-600">{stats.partial}</p></Card>
        <Card padding={false} className="p-4"><p className="text-xs text-gray-500">إجمالي الديون</p><p className="text-base font-bold text-danger-600">{formatCurrency(stats.remaining)}</p></Card>
      </div>

      <Card
        title="الفواتير"
        action={
          !offline && (
            <Button onClick={() => router.push('/dashboard/invoices/new')} size="sm">
              <Plus size={18} /><span className="hidden sm:inline">فاتورة جديدة</span>
            </Button>
          )
        }
      >
        {/* فلاتر */}
        <div className="flex gap-3 mb-4 flex-col sm:flex-row">
          <div className="relative flex-1">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="بحث برقم الفاتورة أو العميل..."
              className="w-full pr-9 pl-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary-500"
            />
          </div>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none"
          >
            {[['all','الكل'],['paid','مدفوع'],['partial','جزئي'],['unpaid','غير مدفوع']].map(([v,l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        {/* Desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                {['رقم الفاتورة','العميل','الإجمالي','المدفوع','المتبقي','الحالة','التاريخ',''].map(h => (
                  <th key={h} className="px-4 py-3 text-right text-sm font-semibold text-gray-700">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">لا توجد فواتير</td></tr>
              ) : filtered.map(inv => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-semibold text-primary-600">#{inv.invoice_number}</td>
                  <td className="px-4 py-3">{inv.customer_name}</td>
                  <td className="px-4 py-3 font-semibold">{formatCurrency(inv.total_amount||0)}</td>
                  <td className="px-4 py-3 text-success-600">{formatCurrency(inv.paid_amount||0)}</td>
                  <td className="px-4 py-3 text-danger-600">{formatCurrency(inv.remaining_amount||0)}</td>
                  <td className="px-4 py-3">{getStatusBadge(inv.payment_status)}</td>
                  <td className="px-4 py-3 text-gray-400 text-sm">{formatDate(inv.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => handleView(inv)} className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg"><Eye size={16} /></button>
                      {!offline && (
                        <>
                          <button onClick={() => router.push(`/dashboard/invoices/${inv.id}/edit`)} className="p-2 text-warning-600 hover:bg-warning-50 rounded-lg"><Edit2 size={16} /></button>
                          <button onClick={() => { setInvoiceToDelete(inv); setDeleteConfirmOpen(true) }} className="p-2 text-danger-600 hover:bg-danger-50 rounded-lg"><Trash2 size={16} /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile */}
        <div className="md:hidden space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-gray-400">لا توجد فواتير</div>
          ) : filtered.map(inv => (
            <div key={inv.id} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-bold text-primary-600">#{inv.invoice_number}</p>
                  <p className="text-sm text-gray-700">{inv.customer_name}</p>
                  <p className="text-xs text-gray-400">{formatDate(inv.created_at)}</p>
                </div>
                {getStatusBadge(inv.payment_status)}
              </div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[['الإجمالي', inv.total_amount, 'text-gray-900'], ['المدفوع', inv.paid_amount, 'text-success-600'], ['المتبقي', inv.remaining_amount, 'text-danger-600']].map(([l,v,c]) => (
                  <div key={l} className="bg-white rounded-lg p-2 text-center">
                    <p className="text-xs text-gray-400">{l}</p>
                    <p className={`font-bold text-xs ${c}`}>{formatCurrency(v||0)}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleView(inv)} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-primary-600 bg-primary-50 rounded-lg text-sm">
                  <Eye size={14} /> معاينة
                </button>
                {!offline && (
                  <>
                    <button onClick={() => router.push(`/dashboard/invoices/${inv.id}/edit`)} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-warning-600 bg-warning-50 rounded-lg text-sm">
                      <Edit2 size={14} /> تعديل
                    </button>
                    <button onClick={() => { setInvoiceToDelete(inv); setDeleteConfirmOpen(true) }} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-danger-600 bg-danger-50 rounded-lg text-sm">
                      <Trash2 size={14} /> حذف
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
        confirmText={deleting ? 'جاري الحذف...' : 'حذف'}
      />
    </div>
  )
        }
