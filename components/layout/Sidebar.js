'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  Truck,
  FileText, 
  DollarSign, 
  BarChart3,
  LogOut,
  ShoppingBag
} from 'lucide-react'

export default function Sidebar({ isOpen, onClose, userRole }) {
  const pathname = usePathname()

  const menuItems = [
    { 
      title: 'الرئيسية', 
      icon: LayoutDashboard, 
      href: '/dashboard',
      roles: ['owner', 'employee']
    },
    { 
      title: 'المنتجات', 
      icon: Package, 
      href: '/dashboard/products',
      roles: ['owner', 'employee']
    },
    { 
      title: 'العملاء', 
      icon: Users, 
      href: '/dashboard/customers',
      roles: ['owner', 'employee']
    },
    { 
      title: 'الموردين', 
      icon: Truck, 
      href: '/dashboard/suppliers',
      roles: ['owner']
    },
    { 
      title: 'الفواتير', 
      icon: FileText, 
      href: '/dashboard/invoices',
      roles: ['owner', 'employee']
    },
    { 
      title: 'التحصيلات', 
      icon: DollarSign, 
      href: '/dashboard/payments',
      roles: ['owner', 'employee']
    },
    { 
      title: 'التقارير', 
      icon: BarChart3, 
      href: '/dashboard/reports',
      roles: ['owner']
    },
  ]

  const filteredMenu = menuItems.filter(item => 
    item.roles.includes(userRole)
  )

  const isActive = (href) => {
    if (href === '/dashboard') {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:sticky top-0 right-0 h-screen
        w-64 bg-white border-l border-gray-200
        transform transition-transform duration-300 ease-in-out
        z-50 flex flex-col
        ${isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-center border-b border-gray-200 px-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
              <ShoppingBag className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Ali Market</h1>
              <p className="text-xs text-gray-500">نظام الإدارة</p>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <ul className="space-y-1">
            {filteredMenu.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => onClose()}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-lg
                      transition-all duration-200
                      ${active 
                        ? 'bg-primary-50 text-primary-700 font-semibold' 
                        : 'text-gray-700 hover:bg-gray-100'
                      }
                    `}
                  >
                    <Icon size={20} />
                    <span>{item.title}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* User Info & Logout */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-primary-700 font-semibold text-sm">
                {userRole === 'owner' ? 'مالك' : 'موظف'}
              </span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">
                {userRole === 'owner' ? 'المالك' : 'الموظف'}
              </p>
              <p className="text-xs text-gray-500">
                {userRole === 'owner' ? 'صلاحيات كاملة' : 'صلاحيات محدودة'}
              </p>
            </div>
          </div>
          
          <form action="/api/auth/signout" method="post">
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              <LogOut size={18} />
              <span>تسجيل الخروج</span>
            </button>
          </form>
        </div>
      </aside>
    </>
  )
}
