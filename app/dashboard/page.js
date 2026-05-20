'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import StatCard from '@/components/dashboard/StatCard'
import RecentInvoices from '@/components/dashboard/RecentInvoices'
import Card from '@/components/ui/Card'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { 
  DollarSign, 
  FileText, 
  Users, 
  Package,
  TrendingUp,
  AlertTriangle
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format'

export default function DashboardPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalSales: 0,
    totalInvoices: 0,
    totalCustomers: 0,
    lowStockProducts: 0,
    todaySales: 0,
    pendingPayments: 0
  })
  const [recentInvoices, setRecentInvoices] = useState([])

  useEffect(() => {
    fetchDashboardData()
  }, [])

  async function fetchDashboardData() {
    try {
      // جلب إحصائيات المبيعات
      const { data: invoices } = await supabase
        .from('invoices')
        .select('total_amount, remaining_amount, created_at')

      // جلب عدد العملاء
      const { count: customersCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })

      // جلب المنتجات المنخفضة
      const { data: products } = await supabase
        .from('products')
        .select('quantity, min_stock')

      const lowStock = products?.filter(p => p.quantity <= p.min_stock).length || 0

      // حساب الإحصائيات
      const totalSales = invoices?.reduce((sum, inv) => sum + inv.total_amount, 0) || 0
      const pendingPayments = invoices?.reduce((sum, inv) => sum + inv.remaining_amount, 0) || 0
      
      // مبيعات اليوم
      const today = new Date().toISOString().split('T')[0]
      const todaySales = invoices?.filter(inv => 
        inv.created_at.startsWith(today)
      ).reduce((sum, inv) => sum + inv.total_amount, 0) || 0

      setStats({
        totalSales,
        totalInvoices: invoices?.length || 0,
        totalCustomers: customersCount || 0,
        lowStockProducts: lowStock,
        todaySales,
        pendingPayments
      })

      // جلب آخر الفواتير
      const { data: recent } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          total_amount,
          remaining_amount,
          created_at,
          customers (name)
        `)
        .order('created_at', { ascending: false })
        .limit(5)

      setRecentInvoices(recent?.map(inv => ({
        ...inv,
        customer_name: inv.customers?.name || 'غير معروف'
      })) || [])

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* الإحصائيات الرئيسية */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="إجمالي المبيعات"
          value={formatCurrency(stats.totalSales)}
          icon={DollarSign}
          iconBgColor="bg-success-100"
          iconColor="text-success-600"
        />
        
        <StatCard
          title="مبيعات اليوم"
          value={formatCurrency(stats.todaySales)}
          icon={TrendingUp}
          iconBgColor="bg-primary-100"
          iconColor="text-primary-600"
        />
        
        <StatCard
          title="عدد الفواتير"
          value={stats.totalInvoices}
          icon={FileText}
          iconBgColor="bg-blue-100"
          iconColor="text-blue-600"
        />
        
        <StatCard
          title="عدد العملاء"
          value={stats.totalCustomers}
          icon={Users}
          iconBgColor="bg-purple-100"
          iconColor="text-purple-600"
        />
      </div>

      {/* الصف الثاني من الإحصائيات */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          title="ديون العملاء"
          value={formatCurrency(stats.pendingPayments)}
          icon={DollarSign}
          iconBgColor="bg-warning-100"
          iconColor="text-warning-600"
        />
        
        <StatCard
          title="منتجات منخفضة"
          value={stats.lowStockProducts}
          icon={AlertTriangle}
          iconBgColor="bg-danger-100"
          iconColor="text-danger-600"
        />
      </div>

      {/* آخر الفواتير */}
      <Card title="آخر الفواتير">
        <RecentInvoices invoices={recentInvoices} />
      </Card>
    </div>
  )
}
