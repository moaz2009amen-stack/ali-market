'use client'
import { Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Card from '@/components/ui/Card'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import Badge from '@/components/ui/Badge'
import { Package, Users, FileText, Search as SearchIcon } from 'lucide-react'
import { formatCurrency, formatPhone } from '@/lib/utils/format'

// ✅ المحتوى الفعلي في component منفصل
function SearchContent() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const supabase     = createClient()

  const [query, setQuery]     = useState(searchParams.get('q') || '')
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [results, setResults] = useState({ products: [], customers: [], invoices: [] })

  useEffect(() => {
    const q = searchParams.get('q')
    if (q) { setQuery(q); performSearch(q) }
  }, [searchParams])

  async function performSearch(searchTerm) {
    if (!searchTerm?.trim()) return
    setLoading(true)
    setSearched(true)
    try {
      const term = `%${searchTerm}%`
      const [{ data: products }, { data: customers }, { data: invoices }] = await Promise.all([
        supabase.from('products').select('id, name, category, selling_price, quantity')
          .or(`name.ilike.${term},barcode.ilike.${term},category.ilike.${term}`)
          .eq('is_active', true).limit(10),
        supabase.from('customers').select('id, name, phone, area, total_debt')
          .or(`name.ilike.${term},phone.ilike.${term},area.ilike.${term}`).limit(10),
        supabase.from('invoices').select('id, invoice_number, total_amount, payment_status, created_at, customers(name)')
          .or(`invoice_number.ilike.${term}`).limit(10),
      ])
      setResults({
        products:  products || [],
        customers: customers || [],
        invoices:  (invoices || []).map(inv => ({
          ...inv, customer_name: inv.customers?.name || 'غير معروف'
        }))
      })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (query.trim()) router.push(`/dashboard/search?q=${encodeURIComponent(query.trim())}`)
  }

  const total = results.products.length + results.customers.length + results.invoices.length

  return (
    <div className="space-y-6">
      <Card>
        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="relative flex-1">
            <SearchIcon size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text" value={query} onChange={e => setQuery(e.target.value)}
              placeholder="بحث عن منتج، عميل، رقم فاتورة..."
              className="w-full pr-9 pl-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary-500"
            />
          </div>
          <button type="submit" className="px-4 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors">
            بحث
          </button>
        </form>
      </Card>

      {loading && <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>}

      {!loading && searched && (
        <Card>
          <div className="flex items-center gap-3">
            <SearchIcon className="text-primary-600" size={22} />
            <div>
              <h2 className="text-lg font-bold text-gray-900">نتائج البحث</h2>
              <p className="text-sm text-gray-500">
                {total > 0 ? `${total} نتيجة` : `لا توجد نتائج لـ "${query}"`}
              </p>
            </div>
          </div>
          {total === 0 && (
            <div className="text-center py-8">
              <SearchIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400">جرب كلمة بحث مختلفة</p>
            </div>
          )}
        </Card>
      )}

      {results.products.length > 0 && (
        <Card title={`المنتجات (${results.products.length})`}>
          <div className="space-y-2">
            {results.products.map(p => (
              <div key={p.id} onClick={() => router.push('/dashboard/products')}
                className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Package className="text-primary-600" size={18} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{p.name}</p>
                    {p.category && <p className="text-xs text-gray-500">{p.category}</p>}
                  </div>
                </div>
                <div className="text-left">
                  <p className="font-semibold text-sm">{formatCurrency(p.selling_price)}</p>
                  <p className="text-xs text-gray-500">الكمية: {p.quantity}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {results.customers.length > 0 && (
        <Card title={`العملاء (${results.customers.length})`}>
          <div className="space-y-2">
            {results.customers.map(c => (
              <div key={c.id} onClick={() => router.push('/dashboard/customers')}
                className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-success-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Users className="text-success-600" size={18} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{c.name}</p>
                    <p className="text-xs text-gray-500">{formatPhone(c.phone)}</p>
                  </div>
                </div>
                <Badge variant={(c.total_debt || 0) > 0 ? 'danger' : 'success'}>
                  {formatCurrency(c.total_debt || 0)}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {results.invoices.length > 0 && (
        <Card title={`الفواتير (${results.invoices.length})`}>
          <div className="space-y-2">
            {results.invoices.map(inv => (
              <div key={inv.id} onClick={() => router.push('/dashboard/invoices')}
                className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="text-blue-600" size={18} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">#{inv.invoice_number}</p>
                    <p className="text-xs text-gray-500">{inv.customer_name}</p>
                  </div>
                </div>
                <div className="text-left">
                  <p className="font-semibold text-sm">{formatCurrency(inv.total_amount)}</p>
                  <Badge variant={inv.payment_status === 'paid' ? 'success' : inv.payment_status === 'partial' ? 'warning' : 'danger'}>
                    {inv.payment_status === 'paid' ? 'مدفوع' : inv.payment_status === 'partial' ? 'جزئي' : 'غير مدفوع'}
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

// ✅ الصفحة الرئيسية تلف SearchContent في Suspense
export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    }>
      <SearchContent />
    </Suspense>
  )
}
