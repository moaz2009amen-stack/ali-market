'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Menu, Bell, Search, X } from 'lucide-react'
import Input from '@/components/ui/Input'

export default function Header({ onMenuClick, title = 'الرئيسية' }) {
  const router = useRouter()
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/dashboard/search?q=${encodeURIComponent(searchQuery)}`)
      setSearchOpen(false)
      setSearchQuery('')
    }
  }

  return (
    <header className="h-16 bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="h-full px-4 flex items-center justify-between">
        {/* Right Side */}
        <div className="flex items-center gap-4">
          {/* Mobile Menu Button */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Menu size={24} className="text-gray-700" />
          </button>

          {/* Page Title */}
          <h2 className="text-xl font-bold text-gray-900">
            {title}
          </h2>
        </div>

        {/* Left Side */}
        <div className="flex items-center gap-3">
          {/* Search - Desktop */}
          <div className="hidden lg:block">
            <form onSubmit={handleSearch} className="relative">
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث عن منتج، عميل، فاتورة..."
                className="w-64"
                icon={<Search size={18} />}
              />
            </form>
          </div>

          {/* Search Button (Mobile) */}
          <button 
            onClick={() => setSearchOpen(!searchOpen)}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Search size={20} className="text-gray-600" />
          </button>

          {/* Notifications */}
          <button 
            onClick={() => router.push('/dashboard/notifications')}
            className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Bell size={20} className="text-gray-600" />
            <span className="absolute top-1 left-1 w-2 h-2 bg-danger-500 rounded-full"></span>
          </button>

          {/* User Avatar (Desktop) */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
            <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-semibold">ع</span>
            </div>
            <span className="text-sm font-medium text-gray-700">علي</span>
          </div>
        </div>
      </div>

      {/* Mobile Search Bar */}
      {searchOpen && (
        <div className="lg:hidden absolute top-16 left-0 right-0 bg-white border-b border-gray-200 p-4 shadow-lg z-50">
          <form onSubmit={handleSearch} className="relative">
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث..."
              autoFocus
              icon={<Search size={18} />}
            />
            <button
              type="button"
              onClick={() => setSearchOpen(false)}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
            >
              <X size={18} />
            </button>
          </form>
        </div>
      )}
    </header>
  )
}
