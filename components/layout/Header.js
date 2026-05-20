'use client'
import { Menu, Bell, Search } from 'lucide-react'

export default function Header({ onMenuClick, title = 'الرئيسية' }) {
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
          {/* Search Button (Mobile) */}
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors lg:hidden">
            <Search size={20} className="text-gray-600" />
          </button>

          {/* Notifications */}
          <button className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
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
    </header>
  )
}
