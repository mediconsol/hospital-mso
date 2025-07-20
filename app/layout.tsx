import './globals.css'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/components/auth/auth-provider'
import { Navbar } from '@/components/nav/navbar'
import { PWAProvider } from '@/components/pwa/pwa-provider'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: '병원 인트라넷 - MSO 통합 관리 시스템',
  description: '병원 및 MSO를 위한 통합 관리 시스템',
  keywords: ['병원', '인트라넷', 'MSO', '의료', '관리시스템'],
  authors: [{ name: '병원 인트라넷 팀' }],
  themeColor: '#2563eb',
  manifest: '/manifest.json',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '병원인트라넷',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icons/icon-192x192.svg', sizes: '192x192', type: 'image/svg+xml' },
      { url: '/icons/icon-512x512.svg', sizes: '512x512', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/icons/icon-152x152.svg', sizes: '152x152', type: 'image/svg+xml' },
      { url: '/icons/icon-192x192.svg', sizes: '192x192', type: 'image/svg+xml' },
    ],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <head>
        <meta name="application-name" content="병원인트라넷" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="병원인트라넷" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        <meta name="msapplication-TileColor" content="#2563eb" />
        <meta name="msapplication-tap-highlight" content="no" />
        
        <link rel="apple-touch-icon" href="/icons/icon-152x152.svg" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.svg" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-192x192.svg" />
        
        <link rel="icon" type="image/svg+xml" href="/icons/icon-192x192.svg" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="shortcut icon" href="/icons/icon-192x192.svg" />
        
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:url" content="https://yourdomain.com" />
        <meta name="twitter:title" content="병원 인트라넷" />
        <meta name="twitter:description" content="병원 및 MSO를 위한 통합 관리 시스템" />
        <meta name="twitter:image" content="/icons/icon-192x192.svg" />
        <meta name="twitter:creator" content="@yourtwitterhandle" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="병원 인트라넷" />
        <meta property="og:description" content="병원 및 MSO를 위한 통합 관리 시스템" />
        <meta property="og:site_name" content="병원 인트라넷" />
        <meta property="og:url" content="https://yourdomain.com" />
        <meta property="og:image" content="/icons/icon-512x512.svg" />
      </head>
      <body className={inter.className}>
        <PWAProvider>
          <AuthProvider>
            <Navbar />
            {children}
          </AuthProvider>
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
            }}
          />
        </PWAProvider>
      </body>
    </html>
  )
}