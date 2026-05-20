'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  Package, 
  FileText, 
  Users 
} from 'lucide-react'

export default function MobileNav() {
  const pathname = usePathname()

  const navItems = [
    { title: 'الرئيسية', icon: LayoutDashboard, href: '/dashboard' },
    { title: 'المنتجات', icon: Package, href: '/dashboard/products' },
    { title: 'الفواتير', icon: FileText, href: '/dashboard/invoices' },
    { title: 'العملاء', icon: Users, href: '/dashboard/customers' },
  ]

  const isActive = (href) => {
    if (href === '/dashboard') {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex flex-col items-center justify-center gap-1 flex-1 h-full
                transition-colors duration-200
                ${active ? 'text-primary-600' : 'text-gray-500'}
              `}
            >
              <Icon size={22} />
              <span className="text-xs font-medium">{item.title}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
