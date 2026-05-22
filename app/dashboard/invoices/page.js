'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Table from '@/components/ui/Table'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { Plus, Eye, FileText, DollarSign, TrendingUp, Edit2, Trash2, Calendar } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { exportInvoicePDF, printThermalInvoice } from '@/lib/utils/exports'
import toast from 'react-hot-toast'
import InvoicePreview from '@/components/invoice/InvoicePreview'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

export default function InvoicesPage() {
  const router = useRouter()
  const supabase = createClient()
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState('')
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false)
  const [deleteRange, setDeleteRange] = useState('')
  const [previewInvoice, setPreviewInvoice] = useState(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [invoiceToDelete, setInvoiceToDelete] = useState(null)

  useEffect(() => {
    fetchInvoices()
    checkUserRole()
  }, [])

  async function checkUserRole() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single()
        setUserRole(data?.role || 'employee')
      }
    } catch (error) {
      console.error('Error fetching user role:', error)
    }
  }

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

      setPreviewInvoice(fullInvoice)
    } catch (error) {
      console.error('Error loading invoice details:', error)
      toast.error('حدث خطأ في تحميل تفاصيل الفاتورة')
    }
  }

  const handleDeleteInvoice = async (invoice) => {
    if (userRole !== 'owner') {
      toast.error('غير مصرح لك بحذف الفواتير')
      return
    }

    setInvoiceToDelete(invoice)
    setDeleteConfirmOpen(true)
  }

  const confirmDelete = async () => {
    if (!invoiceToDelete) return

    try {
      // حذف بنود الفاتورة
      const { error: itemsError } = await supabase
        .from('invoice_items')
        .delete()
        .eq('invoice_id', invoiceToDelete.id)

      if (itemsError) throw itemsError

      // حذف الفاتورة
      const { error: invoiceError } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceToDelete.id)

      if (invoiceError) throw invoiceError

      toast.success('تم حذف الفاتورة بنجاح')
      setDeleteConfirmOpen(false)
      setInvoiceToDelete(null)
      fetchInvoices()
    } catch (error) {
      console.error('Error deleting invoice:', error)
      toast.error('حدث خطأ في حذف الفاتورة')
    }
  }

  const handleBulkDelete = async () => {
    if (userRole !== 'owner') {
      toast.error('غير مصرح لك بحذف الفواتير')
      return
    }

    if (!deleteRange) {
      toast.error('يرجى اختيار الفترة الزمنية')
      return
    }

    const now = new Date()
    let startDate

    switch(deleteRange) {
      case 'day':
        startDate = new Date(now.setDate(now.getDate() - 1))
        break
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7))
        break
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1))
        break
      case 'year':
        startDate = new Date(now.setFullYear(now.getFullYear() - 1))
        break
      default:
        return
    }

    const rangeNames = {
      day: 'يوم',
      week: 'أسبوع',
      month: 'شهر',
      year: 'سنة'
    }

    if (!confirm(`هل أنت متأكد من حذف جميع الفواتير خلال ${rangeNames[deleteRange]} الماضي؟ لا يمكن التراجع عن هذا الإجراء.`)) {
      return
    }

    try {
      // جلب الفواتير في الفترة المحددة
      const { data: invoicesToDelete, error: fetchError } = await supabase
        .from('invoices')
        .select('id')
        .gte('created_at', startDate.toISOString())

      if (fetchError) throw fetchError

      if (!invoicesToDelete || invoicesToDelete.length === 0) {
        toast.info('لا توجد فواتير في هذه الفترة')
        setBulkDeleteModalOpen(false)
        return
      }

      // حذف بنود الفواتير
      const invoiceIds = invoicesToDelete.map(inv => inv.id)
      const { error: itemsError } = await supabase
        .from('invoice_items')
        .delete()
        .in('invoice_id', invoiceIds)

      if (itemsError) throw itemsError

      // حذف الفواتير
      const { error: invoicesError } = await supabase
        .from('invoices')
        .delete()
        .in('id', invoiceIds)

      if (invoicesError) throw invoicesError

      toast.success(`تم حذف ${invoicesToDelete.length} فاتورة بنجاح`)
      setBulkDeleteModalOpen(false)
      setDeleteRange('')
      fetchInvoices()
    } catch (error) {
      console.error('Error bulk deleting invoices:', error)
      toast.error('حدث خطأ في حذف الفواتير')
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleViewInvoice(row)}
            className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
            title="عرض وطباعة"
          >
            <Eye size={18} />
          </button>
          
          {userRole === 'owner' && (
            <>
              <button
                onClick={() => router.push(`/dashboard/invoices/${row.id}/edit`)}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="تعديل"
              >
                <Edit2 size={18} />
              </button>
              
              <button
                onClick={() => handleDeleteInvoice(row)}
                className="p-2 text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
                title="حذف"
              >
                <Trash2 size={18} />
              </button>
            </>
          )}
        </div>
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
          <div className="flex gap-2">
            {userRole === 'owner' && (
              <Button 
                onClick={() => setBulkDeleteModalOpen(true)}
                variant="danger"
                size="sm"
              >
                <Calendar size={18} />
                حذف بالفترة
              </Button>
            )}
            
            <Button 
              onClick={() => router.push('/dashboard/invoices/new')}
              size="md"
            >
              <Plus size={20} />
              فاتورة جديدة
            </Button>
          </div>
        }
      >
        <Table
          columns={columns}
          data={invoices}
          loading={loading}
          emptyMessage="لا توجد فواتير. ابدأ بإنشاء فاتورة جديدة!"
        />
      </Card>

      {/* Modal حذف بالفترة */}
      <Modal
        isOpen={bulkDeleteModalOpen}
        onClose={() => {
          setBulkDeleteModalOpen(false)
          setDeleteRange('')
        }}
        title="حذف الفواتير بالفترة الزمنية"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-600">اختر الفترة الزمنية لحذف جميع الفواتير خلالها:</p>
          
          <div className="space-y-2">
            {[
              { value: 'day', label: 'آخر يوم' },
              { value: 'week', label: 'آخر أسبوع' },
              { value: 'month', label: 'آخر شهر' },
              { value: 'year', label: 'آخر سنة' }
            ].map(option => (
              <label key={option.value} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="deleteRange"
                  value={option.value}
                  checked={deleteRange === option.value}
                  onChange={(e) => setDeleteRange(e.target.value)}
                  className="w-4 h-4 text-primary-600"
                />
                <span className="text-gray-900">{option.label}</span>
              </label>
            ))}
          </div>

          <div className="flex gap-3 pt-4">
            <Button 
              onClick={handleBulkDelete}
              variant="danger"
              fullWidth
              disabled={!deleteRange}
            >
              <Trash2 size={18} />
              حذف الفواتير
            </Button>
            <Button 
              onClick={() => {
                setBulkDeleteModalOpen(false)
                setDeleteRange('')
              }}
              variant="secondary"
              fullWidth
            >
              إلغاء
            </Button>
          </div>
        </div>
      </Modal>

      {previewInvoice && (
        <InvoicePreview
          invoice={previewInvoice}
          onClose={() => setPreviewInvoice(null)}
          onPrint={() => {
            printThermalInvoice(previewInvoice)
            setPreviewInvoice(null)
          }}
        />
      )}

      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false)
          setInvoiceToDelete(null)
        }}
        onConfirm={confirmDelete}
        title="حذف الفاتورة"
        message={`هل أنت متأكد من حذف الفاتورة #${invoiceToDelete?.invoice_number}؟ سيتم حذف جميع البيانات المرتبطة بها.`}
        confirmText="حذف الفاتورة"
      />
    </div>
  )
}
