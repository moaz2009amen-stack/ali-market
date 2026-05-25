import './globals.css'
import { Cairo } from 'next/font/google'
import Script from 'next/script'

const cairo = Cairo({ 
  subsets: ['arabic', 'latin'],
  weight: ['400', '600', '700'],
  display: 'swap',
})

export const metadata = {
  title: 'جملة أبو علي - نظام إدارة المخزن',
  description: 'نظام إدارة مخزن وتوزيع ومبيعات ذكي',
  manifest: '/manifest.json',
  themeColor: '#3b82f6',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'جملة أبو علي'
  }
}

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="جملة أبو علي" />
      </head>
      <body className={cairo.className}>
        {children}
        
        <Script id="register-sw" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js')
                  .then(reg => console.log('SW registered'))
                  .catch(err => console.log('SW registration failed'));
              });
            }
          `}
        </Script>
      </body>
    </html>
  )
}
