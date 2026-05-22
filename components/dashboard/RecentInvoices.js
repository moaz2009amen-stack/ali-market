import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import Badge from '@/components/ui/Badge'
import { Eye, Printer } from 'lucide-react'

export default function RecentInvoices({ invoices = [], onView }) {
  if (invoices.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">لا توجد فواتير حديثة</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {invoices.map((invoice) => (
        <div 
          key={invoice.id}
          className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div>
                <p className="font-semibold text-gray-900">
                  فاتورة #{invoice.invoice_number}
                </p>
                <p className="text-sm text-gray-600">{invoice.customer_name}</p>
              </div>
            </div>
            
            <Badge variant={invoice.remaining_amount > 0 ? 'warning' : 'success'}>
              {invoice.remaining_amount > 0 ? 'جزئي' : 'مدفوع'}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              {formatDate(invoice.created_at)}
            </span>
            
            <div className="flex items-center gap-3">
              <span className="font-semibold text-gray-900">
                {formatCurrency(invoice.total_amount)}
              </span>
              
              <button
                onClick={() => onView && onView(invoice)}
                className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                title="معاينة"
              >
                <Eye size={18} />
              </button>
            </div>
          </div>
        </div>
      ))}
      
      <Link
        href="/dashboard/invoices"
        className="block text-center text-primary-600 hover:text-primary-700 font-medium mt-4"
      >
        عرض جميع الفواتير ←
      </Link>
    </div>
  )
}
