'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Package, FileText, Users, DollarSign } from 'lucide-react'

const items = [
  { title: 'الرئيسية',  icon: LayoutDashboard, href: '/dashboard' },
  { title: 'المنتجات',  icon: Package,          href: '/dashboard/products' },
  { title: 'فاتورة',    icon: FileText,          href: '/dashboard/invoices/new' },
  { title: 'العملاء',   icon: Users,             href: '/dashboard/customers' },
  { title: 'التحصيل',   icon: DollarSign,        href: '/dashboard/payments' },
]

export default function MobileNav() {
  const pathname = usePathname()

  const isActive = (href) =>
    href === '/dashboard' ? pathname === href : pathname.startsWith(href)

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
      <div className="flex items-center justify-around h-16">
        {items.map(({ href, title, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              prefetch={false}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                active ? 'text-primary-600' : 'text-gray-500'
              }`}
            >
              <Icon size={22} />
              <span className="text-xs font-medium">{title}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
