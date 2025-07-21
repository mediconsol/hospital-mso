'use client'

import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Bell, Settings, LogOut, User, Menu, Shield } from 'lucide-react'
import { useAuth } from '@/components/auth/auth-provider'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Sidebar } from './sidebar'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { NotificationProvider } from '@/components/notifications/notification-provider'
import { useRouter } from 'next/navigation'
import { getUserPermissions } from '@/lib/permission-helpers'
import { useEffect, useState } from 'react'

export function Header() {
  const { user, signOut, loading } = useAuth()
  const router = useRouter()
  const [employeeId, setEmployeeId] = useState<string | null>(null)
  const [permissions, setPermissions] = useState<any>(null)

  // Employee ID 및 권한 정보 가져오기
  useEffect(() => {
    if (user) {
      getUserPermissions().then(userPermissions => {
        setPermissions(userPermissions)
        if (userPermissions.employee) {
          console.log('Header: Found employee.id:', userPermissions.employee.id)
          setEmployeeId(userPermissions.employee.id)
        } else {
          console.log('Header: No employee found for user')
        }
      }).catch(error => {
        console.error('Header: Error getting employee permissions:', error)
      })
    }
  }, [user])

  // 로딩 중이거나 사용자가 없으면 렌더링하지 않음
  if (loading || !user) return null

  // employeeId가 없으면 아직 로딩 중
  if (!employeeId) return null

  // 디버깅용 로그 (필요시 주석 해제)
  // console.log('Header: user.id (auth):', user.id)
  // console.log('Header: employee.id:', employeeId)

  const handleProfileClick = () => {
    router.push('/settings?tab=profile')
  }

  const handleSettingsClick = () => {
    router.push('/settings?tab=security')
  }

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <NotificationProvider userId={employeeId}>
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container flex h-16 items-center justify-between px-4">
        {/* 모바일 메뉴 */}
        <div className="flex items-center gap-4">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <Sidebar />
            </SheetContent>
          </Sheet>

          {/* 로고 및 타이틀 */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">H</span>
              </div>
              <div className="hidden md:block">
                <h1 className="text-lg font-semibold text-gray-900">
                  병원 인트라넷
                </h1>
                <p className="text-xs text-gray-500">
                  MSO 통합 관리 시스템
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 우측 메뉴 */}
        <div className="flex items-center space-x-4">
          {/* 현재 시간 */}
          <div className="hidden md:block text-sm text-gray-600">
            {new Date().toLocaleString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'short',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>

          {/* 알림 */}
          <NotificationBell userId={employeeId} />

          {/* 사용자 메뉴 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.user_metadata?.avatar_url} alt={user.user_metadata?.name} />
                  <AvatarFallback className="bg-blue-500 text-white">
                    {user.user_metadata?.name?.charAt(0) || user.email?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user.user_metadata?.name || '사용자'}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleProfileClick}>
                <User className="mr-2 h-4 w-4" />
                <span>프로필</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSettingsClick}>
                <Settings className="mr-2 h-4 w-4" />
                <span>설정</span>
              </DropdownMenuItem>
              {permissions && (permissions.isAdmin || permissions.isSuperAdmin) && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push('/admin')}>
                    <Shield className="mr-2 h-4 w-4" />
                    <span>백오피스 관리</span>
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>로그아웃</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        </div>
      </header>
    </NotificationProvider>
  )
}