'use client'
import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Card from '@/components/ui/Card'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import Badge from '@/components/ui/Badge'
import { Package, Users, FileText, Search as SearchIcon } from 'lucide-react'
import { formatCurrency, formatPhone } from '@/lib/utils/format'

export default function SearchPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()
  const query = searchParams.get('q') || ''
  
  const [loading, setLoading] = useState(true)
  const [results, setResults] = useState({
    products: [],
    customers: [],
    invoices: []
  })

  useEffect(() => {
    if (query) {
      performSearch()
    }
  }, [query])

  async function performSearch() {
    setLoading(true)
    try {
      const searchTerm = `%${query}%`

      // البحث في المنتجات
      const { data: products } = await supabase
        .from('products')
        .select('*')
        .or(`name.ilike.${searchTerm},barcode.ilike.${searchTerm},category.ilike.${searchTerm}`)
        .limit(10)

      // البحث في العملاء
      const { data: customers } = await supabase
        .from('customers')
        .select('*')
        .or(`name.ilike.${searchTerm},shop_name.ilike.${searchTerm},phone.ilike.${searchTerm}`)
        .limit(10)

      // البحث في الفواتير
      const { data: invoices } = await supabase
        .from('invoices')
        .select(`
          *,
          customers (name)
        `)
        .or(`invoice_number.ilike.${searchTerm}`)
        .limit(10)

      setResults({
        products: products || [],
        customers: customers || [],
        invoices: invoices?.map(inv => ({
          ...inv,
          customer_name: inv.customers?.name || 'غير معروف'
        })) || []
      })
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setLoading(false)
    }
  }

  const totalResults = results.products.length + results.customers.length + results.invoices.length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* نتائج البحث */}
      <Card>
        <div className="flex items-center gap-3 mb-6">
          <SearchIcon className="text-primary-600" size={24} />
          <div>
            <h2 className="text-xl font-bold text-gray-900">نتائج البحث</h2>
            <p className="text-sm text-gray-600">
              تم العثور على {totalResults} نتيجة لـ "{query}"
            </p>
          </div>
        </div>

        {totalResults === 0 && (
          <div className="text-center py-12">
            <SearchIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">لم يتم العثور على نتائج</p>
          </div>
        )}
      </Card>

      {/* المنتجات */}
      {results.products.length > 0 && (
        <Card title="المنتجات" className="cursor-pointer">
          <div className="space-y-3">
            {results.products.map((product) => (
              <div
                key={product.id}
                onClick={() => router.push('/dashboard/products')}
                className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                    <Package className="text-primary-600" size={20} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-500">{product.category}</p>
                  </div>
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">{formatCurrency(product.selling_price)}</p>
                  <p className="text-sm text-gray-500">الكمية: {product.quantity}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* العملاء */}
      {results.customers.length > 0 && (
        <Card title="العملاء">
          <div className="space-y-3">
            {results.customers.map((customer) => (
              <div
                key={customer.id}
                onClick={() => router.push('/dashboard/customers')}
                className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-success-100 rounded-lg flex items-center justify-center">
                    <Users className="text-success-600" size={20} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{customer.name}</p>
                    <p className="text-sm text-gray-500">{formatPhone(customer.phone)}</p>
                  </div>
                </div>
                <Badge variant={customer.total_debt > 0 ? 'danger' : 'success'}>
                  {formatCurrency(customer.total_debt || 0)}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* الفواتير */}
      {results.invoices.length > 0 && (
        <Card title="الفواتير">
          <div className="space-y-3">
            {results.invoices.map((invoice) => (
              <div
                key={invoice.id}
                onClick={() => router.push('/dashboard/invoices')}
                className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileText className="text-blue-600" size={20} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{invoice.invoice_number}</p>
                    <p className="text-sm text-gray-500">{invoice.customer_name}</p>
                  </div>
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">{formatCurrency(invoice.total_amount)}</p>
                  <Badge variant={invoice.payment_status === 'paid' ? 'success' : 'warning'}>
                    {invoice.payment_status === 'paid' ? 'مدفوع' : 'جزئي'}
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
