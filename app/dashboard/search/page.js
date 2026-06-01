'use client'
import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import Badge from '@/components/ui/Badge'
import { Package, Users, FileText, Search as SearchIcon } from 'lucide-react'
import { formatCurrency, formatPhone } from '@/lib/utils/format'

export default function SearchPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()

  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [results, setResults] = useState({ products: [], customers: [], invoices: [] })

  useEffect(() => {
    const q = searchParams.get('q')
    if (q) {
      setQuery(q)
      performSearch(q)
    }
  }, [searchParams])

  async function performSearch(searchTerm) {
    if (!searchTerm?.trim()) return
    setLoading(true)
    setSearched(true)
    try {
      const term = `%${searchTerm}%`

      const [{ data: products }, { data: customers }, { data: invoices }] = await Promise.all([
        supabase
          .from('products')
          .select('id, name, category, selling_price, quantity')
          .or(`name.ilike.${term},barcode.ilike.${term},category.ilike.${term}`)
          .eq('is_active', true)
          .limit(10),

        // ✅ إصلاح: حذف shop_name — العمود ده مش موجود في جدول customers
        supabase
          .from('customers')
          .select('id, name, phone, area, total_debt')
          .or(`name.ilike.${term},phone.ilike.${term},area.ilike.${term}`)
          .limit(10),

        supabase
          .from('invoices')
          .select('id, invoice_number, total_amount, payment_status, created_at, customers(name)')
          .or(`invoice_number.ilike.${term}`)
          .limit(10),
      ])

      setResults({
        products:  products  || [],
        customers: customers || [],
        invoices:  (invoices || []).map(inv => ({
          ...inv,
          customer_name: inv.customers?.name || 'غير معروف'
        }))
      })
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/dashboard/search?q=${encodeURIComponent(query.trim())}`)
    }
  }

  const totalResults = results.products.length + results.customers.length + results.invoices.length

  return (
    <div className="space-y-6">
      {/* شريط البحث */}
      <Card>
        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="relative flex-1">
            <SearchIcon size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="بحث عن منتج، عميل، رقم فاتورة..."
              className="w-full pr-9 pl-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
          >
            بحث
          </button>
        </form>
      </Card>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {!loading && searched && (
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <SearchIcon className="text-primary-600" size={22} />
            <div>
              <h2 className="text-lg font-bold text-gray-900">نتائج البحث</h2>
              <p className="text-sm text-gray-600">
                {totalResults > 0
                  ? `تم العثور على ${totalResults} نتيجة`
                  : `لم يتم العثور على نتائج لـ "${query}"`}
              </p>
            </div>
          </div>

          {totalResults === 0 && (
            <div className="text-center py-8">
              <SearchIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">جرب بحثاً آخر</p>
            </div>
          )}
        </Card>
      )}

      {/* المنتجات */}
      {results.products.length > 0 && (
        <Card title={`المنتجات (${results.products.length})`}>
          <div className="space-y-2">
            {results.products.map((product) => (
              <div
                key={product.id}
                onClick={() => router.push('/dashboard/products')}
                className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Package className="text-primary-600" size={18} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{product.name}</p>
                    {product.category && <p className="text-xs text-gray-500">{product.category}</p>}
                  </div>
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900 text-sm">{formatCurrency(product.selling_price)}</p>
                  <p className="text-xs text-gray-500">الكمية: {product.quantity}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* العملاء */}
      {results.customers.length > 0 && (
        <Card title={`العملاء (${results.customers.length})`}>
          <div className="space-y-2">
            {results.customers.map((customer) => (
              <div
                key={customer.id}
                onClick={() => router.push('/dashboard/customers')}
                className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-success-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Users className="text-success-600" size={18} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{customer.name}</p>
                    <p className="text-xs text-gray-500">{formatPhone(customer.phone)}</p>
                  </div>
                </div>
                <Badge variant={(customer.total_debt || 0) > 0 ? 'danger' : 'success'}>
                  {formatCurrency(customer.total_debt || 0)}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* الفواتير */}
      {results.invoices.length > 0 && (
        <Card title={`الفواتير (${results.invoices.length})`}>
          <div className="space-y-2">
            {results.invoices.map((invoice) => (
              <div
                key={invoice.id}
                onClick={() => router.push('/dashboard/invoices')}
                className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="text-blue-600" size={18} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">#{invoice.invoice_number}</p>
                    <p className="text-xs text-gray-500">{invoice.customer_name}</p>
                  </div>
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900 text-sm">{formatCurrency(invoice.total_amount)}</p>
                  <Badge variant={invoice.payment_status === 'paid' ? 'success' : invoice.payment_status === 'partial' ? 'warning' : 'danger'}>
                    {invoice.payment_status === 'paid' ? 'مدفوع' : invoice.payment_status === 'partial' ? 'جزئي' : 'غير مدفوع'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
