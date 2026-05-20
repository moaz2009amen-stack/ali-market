'use client'
import { Toaster } from 'react-hot-toast'

export default function Toast() {
  return (
    <Toaster
      position="top-center"
      reverseOrder={false}
      toastOptions={{
        duration: 3000,
        style: {
          background: '#fff',
          color: '#1f2937',
          padding: '16px',
          borderRadius: '8px',
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
          fontFamily: 'Cairo, sans-serif',
        },
        success: {
          iconTheme: {
            primary: '#10b981',
            secondary: '#fff',
          },
        },
        error: {
          iconTheme: {
            primary: '#ef4444',
            secondary: '#fff',
          },
        },
      }}
    />
  )
}
