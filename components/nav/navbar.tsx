'use client'

import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/auth/auth-provider'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function Navbar() {
  const { user, signOut } = useAuth()
  const pathname = usePathname()

  // 인트라넷 레이아웃을 사용하는 페이지에서는 네비게이션을 숨김
  if (pathname.startsWith('/dashboard') || 
      pathname.startsWith('/organization') || 
      pathname.startsWith('/employees') ||
      pathname.startsWith('/tasks') ||
      pathname.startsWith('/files') ||
      pathname.startsWith('/calendar') ||
      pathname.startsWith('/notifications') ||
      pathname.startsWith('/reports') ||
      pathname.startsWith('/documents') ||
      pathname.startsWith('/messages') ||
      pathname.startsWith('/settings')) {
    return null
  }

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-gray-900">
              병원/MSO 포털
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <span className="text-sm text-gray-700">
                  {user.user_metadata?.name || user.email}
                </span>
                <Link href="/dashboard">
                  <Button variant="ghost">대시보드</Button>
                </Link>
                <Button variant="outline" onClick={signOut}>
                  로그아웃
                </Button>
              </>
            ) : (
              <>
                <Link href="/auth/login">
                  <Button variant="ghost">로그인</Button>
                </Link>
                <Link href="/auth/signup">
                  <Button>회원가입</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}