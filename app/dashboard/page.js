'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getFromCache, isOnline } from '@/lib/offline/offlineDb'
import StatCard from '@/components/dashboard/StatCard'
import RecentInvoices from '@/components/dashboard/RecentInvoices'
import Card from '@/components/ui/Card'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import InvoicePreview from '@/components/invoice/InvoicePreview'
import { printThermalInvoice } from '@/lib/utils/exports'
import { DollarSign, FileText, Users, Package, TrendingUp, AlertTriangle, WifiOff } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format'
import toast from 'react-hot-toast'

export default function DashboardPage() {
  const supabase = createClient()
  const [loading, setLoading]           = useState(true)
  const [offline, setOffline]           = useState(false)
  const [previewInvoice, setPreviewInvoice] = useState(null)
  const [stats, setStats] = useState({
    totalSales: 0, totalInvoices: 0, totalCustomers: 0,
    lowStockProducts: 0, todaySales: 0, pendingPayments: 0
  })
  const [recentInvoices, setRecentInvoices] = useState([])

  useEffect(() => {
    loadData()
    setOffline(!navigator.onLine)
    const onOnline  = () => { setOffline(false); loadData() }
    const onOffline = () => setOffline(true)
    window.addEventListener('online',  onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online',  onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  async function loadData() {
    if (!isOnline()) {
      await loadFromCache()
      return
    }
    try {
      await loadFromSupabase()
    } catch {
      await loadFromCache()
    }
  }

  async function loadFromCache() {
    setOffline(true)
    try {
      const [invoices, customers, products] = await Promise.all([
        getFromCache('invoices'),
        getFromCache('customers'),
        getFromCache('products'),
      ])

      const today = new Date().toISOString().split('T')[0]
      setStats({
        totalSales:       invoices.reduce((s, i) => s + (parseFloat(i.total_amount) || 0), 0),
        totalInvoices:    invoices.length,
        totalCustomers:   customers.filter(c => c.is_active !== false).length,
        lowStockProducts: products.filter(p => (p.quantity || 0) <= (p.min_stock || 5)).length,
        todaySales:       invoices.filter(i => i.created_at?.startsWith(today))
                                  .reduce((s, i) => s + (parseFloat(i.total_amount) || 0), 0),
        pendingPayments:  invoices.reduce((s, i) => s + (parseFloat(i.remaining_amount) || 0), 0),
      })
      setRecentInvoices(
        invoices
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 5)
      )
    } finally {
      setLoading(false)
    }
  }

  async function loadFromSupabase() {
    const [
      { data: invoices },
      { count: customersCount },
      { data: products },
      { data: recent },
    ] = await Promise.all([
      supabase.from('invoices').select('total_amount, remaining_amount, created_at'),
      supabase.from('customers').select('*', { count: 'exact', head: true }),
      supabase.from('products').select('quantity, min_stock'),
      supabase.from('invoices')
        .select('id, invoice_number, total_amount, remaining_amount, created_at, customers(name)')
        .order('created_at', { ascending: false })
        .limit(5),
    ])

    const today = new Date().toISOString().split('T')[0]
    setStats({
      totalSales:       (invoices || []).reduce((s, i) => s + (i.total_amount || 0), 0),
      totalInvoices:    (invoices || []).length,
      totalCustomers:   customersCount || 0,
      lowStockProducts: (products || []).filter(p => p.quantity <= (p.min_stock || 5)).length,
      todaySales:       (invoices || []).filter(i => i.created_at?.startsWith(today))
                                        .reduce((s, i) => s + (i.total_amount || 0), 0),
      pendingPayments:  (invoices || []).reduce((s, i) => s + (i.remaining_amount || 0), 0),
    })
    setRecentInvoices(
      (recent || []).map(inv => ({ ...inv, customer_name: inv.customers?.name || 'غير معروف' }))
    )
    setLoading(false)
  }

  const handleViewInvoice = async (invoice) => {
    try {
      if (!isOnline()) {
        const allItems = await getFromCache('invoice_items')
        setPreviewInvoice({ ...invoice, items: allItems.filter(i => i.invoice_id === invoice.id) })
        return
      }
      const { data: items } = await supabase.from('invoice_items').select('*').eq('invoice_id', invoice.id)
      setPreviewInvoice({ ...invoice, items: items || [] })
    } catch {
      toast.error('حدث خطأ في تحميل الفاتورة')
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]"><LoadingSpinner size="lg" /></div>
  )

  return (
    <div className="space-y-6">
      {offline && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center gap-2">
          <WifiOff size={16} className="text-yellow-600 flex-shrink-0" />
          <span className="text-yellow-800 text-sm font-medium">بدون إنترنت — عرض آخر بيانات محفوظة</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="إجمالي المبيعات" value={formatCurrency(stats.totalSales)}   icon={DollarSign}     iconBgColor="bg-success-100" iconColor="text-success-600" />
        <StatCard title="مبيعات اليوم"     value={formatCurrency(stats.todaySales)}   icon={TrendingUp}     iconBgColor="bg-primary-100" iconColor="text-primary-600" />
        <StatCard title="عدد الفواتير"     value={stats.totalInvoices}                icon={FileText}       iconBgColor="bg-blue-100"    iconColor="text-blue-600" />
        <StatCard title="عدد العملاء"      value={stats.totalCustomers}               icon={Users}          iconBgColor="bg-purple-100"  iconColor="text-purple-600" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard title="ديون العملاء"       value={formatCurrency(stats.pendingPayments)} icon={DollarSign}      iconBgColor="bg-warning-100" iconColor="text-warning-600" />
        <StatCard title="منتجات منخفضة"     value={stats.lowStockProducts}               icon={AlertTriangle}   iconBgColor="bg-danger-100"  iconColor="text-danger-600" />
      </div>

      <Card title="آخر الفواتير">
        <RecentInvoices invoices={recentInvoices} onView={handleViewInvoice} />
      </Card>

      {previewInvoice && (
        <InvoicePreview
          invoice={previewInvoice}
          onClose={() => setPreviewInvoice(null)}
          onPrint={() => { printThermalInvoice(previewInvoice); setPreviewInvoice(null) }}
        />
      )}
    </div>
  )
}
