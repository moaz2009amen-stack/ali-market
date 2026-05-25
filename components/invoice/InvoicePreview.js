'use client'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import Button from '@/components/ui/Button'
import { X, Printer } from 'lucide-react'

export default function InvoicePreview({ invoice, onClose, onPrint }) {
  if (!invoice) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-2xl w-full my-8">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between rounded-t-lg">
          <h3 className="text-lg font-bold text-gray-900">معاينة الفاتورة</h3>
          <div className="flex items-center gap-2">
            <Button onClick={onPrint} size="sm" variant="primary">
              <Printer size={18} />
              طباعة
            </Button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Invoice Content */}
        <div className="p-6 space-y-6">
          {/* Header Info */}
          <div className="text-center border-b border-gray-200 pb-6">
            <h1 className="text-3xl font-bold text-primary-600 mb-2">جملة أبو علي</h1>
            <p className="text-gray-600 text-sm">نظام إدارة المخزن والمبيعات</p>
            <p className="text-gray-500 text-xs mt-2">صاحب المحل: أيمن</p>
          </div>

          {/* Invoice Details */}
          <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
            <div>
              <p className="text-sm text-gray-600">رقم الفاتورة</p>
              <p className="font-bold text-gray-900">{invoice.invoice_number}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">التاريخ</p>
              <p className="font-bold text-gray-900">{formatDate(invoice.created_at)}</p>
            </div>
            <div className="col-span-2">
              <p className="text-sm text-gray-600">العميل</p>
              <p className="font-bold text-gray-900">{invoice.customer_name}</p>
            </div>
          </div>

          {/* Items Table */}
          <div>
            <h4 className="font-bold text-gray-900 mb-3">المنتجات</h4>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">المنتج</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">الكمية</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">السعر</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {invoice.items?.map((item, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3 text-gray-900">{item.product_name}</td>
                      <td className="px-4 py-3 text-gray-900">{item.quantity}</td>
                      <td className="px-4 py-3 text-gray-900">{formatCurrency(item.selling_price)}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">
                        {formatCurrency(item.quantity * item.selling_price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="border-t border-gray-200 pt-4 space-y-2">
            <div className="flex justify-between text-lg">
              <span className="font-medium text-gray-700">الإجمالي:</span>
              <span className="font-bold text-gray-900">
                {formatCurrency(invoice.total_amount || 0)}
              </span>
            </div>
            <div className="flex justify-between text-lg">
              <span className="font-medium text-gray-700">المدفوع:</span>
              <span className="font-bold text-success-600">
                {formatCurrency(invoice.paid_amount || 0)}
              </span>
            </div>
            <div className="flex justify-between text-xl border-t border-gray-300 pt-2">
              <span className="font-bold text-gray-700">المتبقي:</span>
              <span className={`font-bold ${(invoice.remaining_amount || 0) > 0 ? 'text-danger-600' : 'text-success-600'}`}>
                {formatCurrency(invoice.remaining_amount || 0)}
              </span>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm font-medium text-yellow-800 mb-1">ملاحظات:</p>
              <p className="text-sm text-yellow-700">{invoice.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="text-center text-sm text-gray-500 border-t border-gray-200 pt-4">
            <p className="font-semibold">شكراً لتعاملكم معنا</p>
            <p className="mt-1">جملة أبو علي - {new Date().toLocaleString('ar-EG')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
