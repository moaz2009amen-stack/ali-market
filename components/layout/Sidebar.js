'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Package, Users,
  FileText, DollarSign, BarChart3,
  LogOut, ShoppingBag
} from 'lucide-react'

const menuItems = [
  { title: 'الرئيسية',   icon: LayoutDashboard, href: '/dashboard' },
  { title: 'المنتجات',   icon: Package,          href: '/dashboard/products' },
  { title: 'العملاء',    icon: Users,             href: '/dashboard/customers' },
  { title: 'الفواتير',   icon: FileText,          href: '/dashboard/invoices' },
  { title: 'التحصيلات',  icon: DollarSign,        href: '/dashboard/payments' },
  { title: 'التقارير',   icon: BarChart3,          href: '/dashboard/reports' },
]

export default function Sidebar({ isOpen, onClose }) {
  const pathname = usePathname()
  const router   = useRouter()

  const isActive = (href) =>
    href === '/dashboard' ? pathname === href : pathname.startsWith(href)

  const handleLogout = () => {
    onClose()
    router.push('/welcome')
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed lg:sticky top-0 right-0 h-screen
        w-64 sm:w-72 lg:w-64
        bg-white border-l border-gray-200
        transform transition-transform duration-300 ease-in-out
        z-50 flex flex-col
        ${isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="h-16 flex items-center border-b border-gray-200 px-4 flex-shrink-0">
          <div className="flex items-center gap-2 w-full">
            <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <ShoppingBag className="text-white" size={22} />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-gray-900 truncate">جملة أبو علي</h1>
              <p className="text-xs text-gray-500">نظام الإدارة</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          <ul className="space-y-1">
            {menuItems.map(({ title, icon: Icon, href }) => {
              const active = isActive(href)
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onClose}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-lg
                      transition-all duration-200 text-sm font-medium
                      ${active
                        ? 'bg-primary-50 text-primary-700 font-semibold'
                        : 'text-gray-700 hover:bg-gray-100'
                      }
                    `}
                  >
                    <Icon size={20} className="flex-shrink-0" />
                    <span className="truncate">{title}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 flex-shrink-0">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-primary-700 font-bold text-sm">أ</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">أيمن</p>
              <p className="text-xs text-gray-500">مالك المحل</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm"
          >
            <LogOut size={18} />
            <span>الخروج</span>
          </button>
        </div>
      </aside>
    </>
  )
}
