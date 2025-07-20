'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from './header'
import { Sidebar } from './sidebar'
import { useAuth } from '@/components/auth/auth-provider'

interface IntranetLayoutProps {
  children: React.ReactNode
}

export function IntranetLayout({ children }: IntranetLayoutProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return null // 리다이렉트 중이므로 아무것도 렌더링하지 않음
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* 사이드바 - 데스크톱 */}
      <div className="hidden md:flex md:w-64 md:flex-col">
        <Sidebar />
      </div>

      {/* 메인 콘텐츠 */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        
        {/* 페이지 콘텐츠 */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}