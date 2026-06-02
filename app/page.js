'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Client-side redirect — أحسن من server redirect لأنه يشتغل من الـ cache
    router.replace('/dashboard')
  }, [])

  // صفحة بسيطة تظهر لحظة التحميل
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#eff6ff',
      fontFamily: 'Cairo, Arial, sans-serif',
      direction: 'rtl'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 64, height: 64,
          background: '#2563eb',
          borderRadius: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1rem',
          fontSize: '2rem'
        }}>🛒</div>
        <h1 style={{ color: '#1e3a8a', marginBottom: '.5rem' }}>جملة أبو علي</h1>
        <p style={{ color: '#64748b', fontSize: '.9rem' }}>جاري التحميل...</p>
      </div>
    </div>
  )
}
