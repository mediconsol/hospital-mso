'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { 
  Settings, 
  LogOut, 
  User, 
  Shield, 
  Home,
  Bell,
  Search
} from 'lucide-react'
import { Database } from '@/lib/database.types'

type Employee = Database['public']['Tables']['employee']['Row'] & {
  hospital?: { id: string; name: string; type: string } | null
}

interface AdminHeaderProps {
  employee: Employee
}

export function AdminHeader({ employee }: AdminHeaderProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    setIsLoading(true)
    try {
      await supabase.auth.signOut()
      router.push('/auth/login')
    } catch (error) {
      console.error('Sign out error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'super_admin': return '최종관리자'
      case 'admin': return '관리자'
      case 'manager': return '매니저'
      case 'employee': return '직원'
      default: return role
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-red-100 text-red-800'
      case 'admin': return 'bg-purple-100 text-purple-800'
      case 'manager': return 'bg-blue-100 text-blue-800'
      case 'employee': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getInitials = (name: string) => {
    return name.split('').slice(0, 2).join('').toUpperCase()
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* 좌측: 로고 및 타이틀 */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">백오피스 관리</h1>
                <p className="text-sm text-gray-500">시스템 관리자 전용</p>
              </div>
            </div>
          </div>

          {/* 우측: 사용자 정보 및 메뉴 */}
          <div className="flex items-center space-x-4">
            {/* 일반 사용자 페이지로 이동 */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/dashboard')}
              className="flex items-center space-x-2"
            >
              <Home className="w-4 h-4" />
              <span>일반 페이지</span>
            </Button>

            {/* 알림 */}
            <Button variant="ghost" size="sm">
              <Bell className="w-5 h-5" />
            </Button>

            {/* 사용자 메뉴 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-3 p-2">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src="" alt={employee.name} />
                    <AvatarFallback className="bg-gray-200 text-gray-700 text-sm">
                      {getInitials(employee.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left">
                    <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                    <div className="text-xs text-gray-500">{employee.email}</div>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>
                  <div className="space-y-2">
                    <div className="font-medium">{employee.name}</div>
                    <div className="text-xs text-gray-500">{employee.email}</div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getRoleColor(employee.role)}>
                        {getRoleLabel(employee.role)}
                      </Badge>
                      {employee.hospital && (
                        <span className="text-xs text-gray-500">
                          {employee.hospital.name}
                        </span>
                      )}
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/settings/profile')}>
                  <User className="w-4 h-4 mr-2" />
                  프로필 설정
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/settings')}>
                  <Settings className="w-4 h-4 mr-2" />
                  시스템 설정
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleSignOut}
                  disabled={isLoading}
                  className="text-red-600"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {isLoading ? '로그아웃 중...' : '로그아웃'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  )
}
