'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Table from '@/components/ui/Table'
import Badge from '@/components/ui/Badge'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { Plus, Eye, FileText, DollarSign, TrendingUp } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { exportInvoicePDF, printThermalInvoice } from '@/lib/utils/exports'
import toast from 'react-hot-toast'

export default function InvoicesPage() {
  const router = useRouter()
  const supabase = createClient()
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchInvoices()
  }, [])

  async function fetchInvoices() {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          customers (name),
          users (full_name)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      const formattedData = data?.map(inv => ({
        ...inv,
        customer_name: inv.customers?.name || 'غير معروف',
        created_by_name: inv.users?.full_name || 'غير معروف'
      })) || []
      
      setInvoices(formattedData)
    } catch (error) {
      console.error('Error fetching invoices:', error)
      toast.error('حدث خطأ في تحميل الفواتير')
    } finally {
      setLoading(false)
    }
  }

  const handleViewInvoice = async (invoice) => {
    // جلب تفاصيل الفاتورة كاملة
    try {
      const { data: items, error } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoice.id)

      if (error) throw error

      const fullInvoice = {
        ...invoice,
        items: items || []
      }

      // طباعة أو عرض
      printThermalInvoice(fullInvoice)
    } catch (error) {
      console.error('Error loading invoice details:', error)
      toast.error('حدث خطأ في تحميل تفاصيل الفاتورة')
    }
  }

  const columns = [
    { 
      header: 'رقم الفاتورة', 
      accessor: 'invoice_number',
      render: (row) => (
        <span className="font-mono font-semibold text-primary-600">
          {row.invoice_number}
        </span>
      )
    },
    { 
      header: 'العميل', 
      accessor: 'customer_name',
      render: (row) => (
        <div>
          <p className="font-semibold text-gray-900">{row.customer_name}</p>
          <p className="text-sm text-gray-500">{formatDate(row.created_at)}</p>
        </div>
      )
    },
    { 
      header: 'الإجمالي', 
      accessor: 'total_amount',
      render: (row) => (
        <span className="font-semibold">{formatCurrency(row.total_amount)}</span>
      )
    },
    { 
      header: 'المدفوع', 
      accessor: 'paid_amount',
      render: (row) => formatCurrency(row.paid_amount)
    },
    { 
      header: 'المتبقي', 
      accessor: 'remaining_amount',
      render: (row) => (
        <span className={row.remaining_amount > 0 ? 'text-danger-600 font-semibold' : 'text-success-600'}>
          {formatCurrency(row.remaining_amount)}
        </span>
      )
    },
    { 
      header: 'الحالة', 
      accessor: 'payment_status',
      render: (row) => {
        const variants = {
          paid: 'success',
          partial: 'warning',
          unpaid: 'danger'
        }
        const labels = {
          paid: 'مدفوع',
          partial: 'جزئي',
          unpaid: 'غير مدفوع'
        }
        return (
          <Badge variant={variants[row.payment_status]}>
            {labels[row.payment_status]}
          </Badge>
        )
      }
    },
    { 
      header: 'إجراءات', 
      accessor: 'actions',
      render: (row) => (
        <button
          onClick={() => handleViewInvoice(row)}
          className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
        >
          <Eye size={18} />
        </button>
      )
    },
  ]

  const stats = {
    total: invoices.length,
    totalSales: invoices.reduce((sum, inv) => sum + inv.total_amount, 0),
    totalPaid: invoices.reduce((sum, inv) => sum + inv.paid_amount, 0),
    totalRemaining: invoices.reduce((sum, inv) => sum + inv.remaining_amount, 0)
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
      {/* إحصائيات */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card padding={false} className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">عدد الفواتير</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
              <FileText className="text-primary-600" size={24} />
            </div>
          </div>
        </Card>

        <Card padding={false} className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">إجمالي المبيعات</p>
              <p className="text-2xl font-bold text-success-600">{formatCurrency(stats.totalSales)}</p>
            </div>
            <div className="w-12 h-12 bg-success-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="text-success-600" size={24} />
            </div>
          </div>
        </Card>

        <Card padding={false} className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">المحصّل</p>
              <p className="text-2xl font-bold text-primary-600">{formatCurrency(stats.totalPaid)}</p>
            </div>
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
              <DollarSign className="text-primary-600" size={24} />
            </div>
          </div>
        </Card>

        <Card padding={false} className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">المتبقي</p>
              <p className="text-2xl font-bold text-danger-600">{formatCurrency(stats.totalRemaining)}</p>
            </div>
            <div className="w-12 h-12 bg-danger-100 rounded-lg flex items-center justify-center">
              <DollarSign className="text-danger-600" size={24} />
            </div>
          </div>
        </Card>
      </div>

      {/* جدول الفواتير */}
      <Card 
        title="الفواتير"
        action={
          <Button 
            onClick={() => router.push('/dashboard/invoices/new')}
            size="md"
          >
            <Plus size={20} />
            فاتورة جديدة
          </Button>
        }
      >
        <Table
          columns={columns}
          data={invoices}
          loading={loading}
          emptyMessage="لا توجد فواتير. ابدأ بإنشاء فاتورة جديدة!"
        />
      </Card>
    </div>
  )
}
