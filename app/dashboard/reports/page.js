'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { Download, FileText, TrendingUp, Package, Users } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { exportToExcel, exportReportPDF } from '@/lib/utils/exports'
import toast from 'react-hot-toast'

export default function ReportsPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [reportData, setReportData] = useState({
    totalSales: 0,
    totalProfit: 0,
    totalCustomers: 0,
    totalProducts: 0,
    topProducts: [],
    topCustomers: [],
    salesByDate: []
  })

  useEffect(() => {
    fetchReportData()
  }, [])

  async function fetchReportData() {
    try {
      // إجمالي المبيعات والربح
      const { data: invoices } = await supabase
        .from('invoices')
        .select('total_amount, created_at')

      const { data: invoiceItems } = await supabase
        .from('invoice_items')
        .select('profit')

      // عدد العملاء
      const { count: customersCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })

      // عدد المنتجات
      const { count: productsCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })

      // أكثر المنتجات مبيعاً
      const { data: topProductsData } = await supabase
        .from('invoice_items')
        .select('product_name, quantity, total')
        .order('quantity', { ascending: false })
        .limit(5)

      // أكثر العملاء شراءً
      const { data: topCustomersData } = await supabase
        .from('invoices')
        .select(`
          customer_id,
          total_amount,
          customers (name)
        `)
        .order('total_amount', { ascending: false })
        .limit(5)

      // حساب الإحصائيات
      const totalSales = invoices?.reduce((sum, inv) => sum + inv.total_amount, 0) || 0
      const totalProfit = invoiceItems?.reduce((sum, item) => sum + item.profit, 0) || 0

      // تجميع المنتجات المتشابهة
      const productsMap = {}
      topProductsData?.forEach(item => {
        if (productsMap[item.product_name]) {
          productsMap[item.product_name].quantity += item.quantity
          productsMap[item.product_name].total += item.total
        } else {
          productsMap[item.product_name] = {
            product_name: item.product_name,
            quantity: item.quantity,
            total: item.total
          }
        }
      })

      const topProducts = Object.values(productsMap)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5)

      // تجميع العملاء
      const customersMap = {}
      topCustomersData?.forEach(inv => {
        const customerId = inv.customer_id
        if (customersMap[customerId]) {
          customersMap[customerId].total_amount += inv.total_amount
        } else {
          customersMap[customerId] = {
            customer_name: inv.customers?.name || 'غير معروف',
            total_amount: inv.total_amount
          }
        }
      })

      const topCustomers = Object.values(customersMap)
        .sort((a, b) => b.total_amount - a.total_amount)
        .slice(0, 5)

      setReportData({
        totalSales,
        totalProfit,
        totalCustomers: customersCount || 0,
        totalProducts: productsCount || 0,
        topProducts,
        topCustomers,
        salesByDate: invoices || []
      })

    } catch (error) {
      console.error('Error fetching report data:', error)
      toast.error('حدث خطأ في تحميل التقارير')
    } finally {
      setLoading(false)
    }
  }

  const exportSalesReport = () => {
    const data = reportData.salesByDate.map(inv => ({
      'التاريخ': formatDate(inv.created_at),
      'المبلغ': inv.total_amount
    }))
    exportToExcel(data, 'تقرير_المبيعات', 'المبيعات')
    toast.success('تم تصدير التقرير بنجاح')
  }

  const exportTopProductsReport = () => {
    const data = reportData.topProducts.map(p => ({
      'المنتج': p.product_name,
      'الكمية المباعة': p.quantity,
      'إجمالي المبيعات': formatCurrency(p.total)
    }))
    exportToExcel(data, 'أكثر_المنتجات_مبيعا', 'المنتجات')
    toast.success('تم تصدير التقرير بنجاح')
  }

  const exportTopCustomersReport = () => {
    const data = reportData.topCustomers.map(c => ({
      'العميل': c.customer_name,
      'إجمالي المشتريات': formatCurrency(c.total_amount)
    }))
    exportToExcel(data, 'أكثر_العملاء_شراء', 'العملاء')
    toast.success('تم تصدير التقرير بنجاح')
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
      {/* إحصائيات عامة */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card padding={false} className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">إجمالي المبيعات</p>
              <p className="text-2xl font-bold text-success-600">
                {formatCurrency(reportData.totalSales)}
              </p>
            </div>
            <div className="w-12 h-12 bg-success-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="text-success-600" size={24} />
            </div>
          </div>
        </Card>

        <Card padding={false} className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">إجمالي الأرباح</p>
              <p className="text-2xl font-bold text-primary-600">
                {formatCurrency(reportData.totalProfit)}
              </p>
            </div>
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="text-primary-600" size={24} />
            </div>
          </div>
        </Card>

        <Card padding={false} className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">عدد العملاء</p>
              <p className="text-2xl font-bold text-gray-900">
                {reportData.totalCustomers}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="text-blue-600" size={24} />
            </div>
          </div>
        </Card>

        <Card padding={false} className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">عدد المنتجات</p>
              <p className="text-2xl font-bold text-gray-900">
                {reportData.totalProducts}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Package className="text-purple-600" size={24} />
            </div>
          </div>
        </Card>
      </div>

      {/* أكثر المنتجات مبيعاً */}
      <Card 
        title="أكثر المنتجات مبيعاً"
        action={
          <Button onClick={exportTopProductsReport} size="sm" variant="secondary">
            <Download size={18} />
            تصدير
          </Button>
        }
      >
        <div className="space-y-3">
          {reportData.topProducts.map((product, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                  <span className="font-bold text-primary-600">#{index + 1}</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{product.product_name}</p>
                  <p className="text-sm text-gray-500">الكمية: {product.quantity}</p>
                </div>
              </div>
              <div className="text-left">
                <p className="font-bold text-gray-900">{formatCurrency(product.total)}</p>
              </div>
            </div>
          ))}
          {reportData.topProducts.length === 0 && (
            <p className="text-center text-gray-500 py-8">لا توجد بيانات</p>
          )}
        </div>
      </Card>

      {/* أكثر العملاء شراءً */}
      <Card 
        title="أكثر العملاء شراءً"
        action={
          <Button onClick={exportTopCustomersReport} size="sm" variant="secondary">
            <Download size={18} />
            تصدير
          </Button>
        }
      >
        <div className="space-y-3">
          {reportData.topCustomers.map((customer, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-success-100 rounded-lg flex items-center justify-center">
                  <span className="font-bold text-success-600">#{index + 1}</span>
                </div>
                <p className="font-semibold text-gray-900">{customer.customer_name}</p>
              </div>
              <p className="font-bold text-gray-900">{formatCurrency(customer.total_amount)}</p>
            </div>
          ))}
          {reportData.topCustomers.length === 0 && (
            <p className="text-center text-gray-500 py-8">لا توجد بيانات</p>
          )}
        </div>
      </Card>

      {/* زر تصدير تقرير شامل */}
      <Card>
        <div className="text-center space-y-4">
          <FileText className="w-16 h-16 text-primary-600 mx-auto" />
          <h3 className="text-xl font-bold text-gray-900">تصدير تقرير شامل</h3>
          <p className="text-gray-600">تصدير جميع بيانات المبيعات والتقارير في ملف Excel</p>
          <Button onClick={exportSalesReport} size="lg">
            <Download size={20} />
            تصدير التقرير الشامل
          </Button>
        </div>
      </Card>
    </div>
  )
}
