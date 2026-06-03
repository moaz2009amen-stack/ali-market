'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Menu, Bell, Search, X } from 'lucide-react'

export default function Header({ onMenuClick }) {
  const router = useRouter()
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/dashboard/search?q=${encodeURIComponent(searchQuery.trim())}`)
      setSearchOpen(false)
      setSearchQuery('')
    }
  }

  return (
    <header className="h-16 bg-white border-b border-gray-200 sticky top-0 z-30 flex-shrink-0">
      <div className="h-full px-4 flex items-center justify-between">

        {/* Right */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Menu size={24} className="text-gray-700" />
          </button>
        </div>

        {/* Left */}
        <div className="flex items-center gap-2">
          {/* Desktop Search */}
          <form onSubmit={handleSearch} className="hidden lg:flex items-center">
            <div className="relative">
              <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="بحث..."
                className="pr-9 pl-4 py-2 border border-gray-300 rounded-lg text-sm w-56 focus:outline-none focus:border-primary-500"
              />
            </div>
          </form>

          {/* Mobile Search */}
          <button
            onClick={() => setSearchOpen(p => !p)}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Search size={20} className="text-gray-600" />
          </button>

          {/* Notifications */}
          <button
            onClick={() => router.push('/dashboard/notifications')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Bell size={20} className="text-gray-600" />
          </button>
        </div>
      </div>

      {/* Mobile Search Bar */}
      {searchOpen && (
        <div className="lg:hidden absolute top-16 left-0 right-0 bg-white border-b border-gray-200 p-3 shadow-lg z-50">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="بحث عن منتج أو عميل أو فاتورة..."
                autoFocus
                className="w-full pr-8 pl-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary-500"
              />
            </div>
            <button
              type="button"
              onClick={() => setSearchOpen(false)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </form>
        </div>
      )}
    </header>
  )
}
