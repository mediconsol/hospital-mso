'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { 
  LayoutDashboard,
  Users,
  Building2,
  Settings,
  BarChart3,
  Database,
  Shield,
  FileText,
  Mail,
  Activity,
  UserCheck,
  Globe,
  Server
} from 'lucide-react'
import { Database as DatabaseType } from '@/lib/database.types'

type Employee = DatabaseType['public']['Tables']['employee']['Row'] & {
  hospital?: { id: string; name: string; type: string } | null
}

interface AdminSidebarProps {
  employee: Employee
}

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  description: string
  adminOnly?: boolean
}

const navItems: NavItem[] = [
  {
    title: '대시보드',
    href: '/admin',
    icon: LayoutDashboard,
    description: '시스템 개요 및 통계'
  },
  {
    title: '사용자 관리',
    href: '/admin/users',
    icon: Users,
    description: '전체 사용자 및 직원 관리'
  },
  {
    title: '조직 관리',
    href: '/admin/organizations',
    icon: Building2,
    description: '병원/MSO 및 부서 관리'
  },
  {
    title: '권한 관리',
    href: '/admin/permissions',
    icon: Shield,
    description: '역할 및 권한 설정',
    adminOnly: true
  },
  {
    title: '시스템 통계',
    href: '/admin/analytics',
    icon: BarChart3,
    description: '사용량 및 성능 분석'
  },
  {
    title: '데이터베이스',
    href: '/admin/database',
    icon: Database,
    description: '데이터 관리 및 백업',
    adminOnly: true
  },
  {
    title: '시스템 로그',
    href: '/admin/logs',
    icon: Activity,
    description: '시스템 활동 로그'
  },
  {
    title: '알림 관리',
    href: '/admin/notifications',
    icon: Mail,
    description: '시스템 알림 및 메시지'
  },
  {
    title: '보고서',
    href: '/admin/reports',
    icon: FileText,
    description: '각종 보고서 생성'
  },
  {
    title: '시스템 설정',
    href: '/admin/settings',
    icon: Settings,
    description: '전역 시스템 설정',
    adminOnly: true
  }
]

export function AdminSidebar({ employee }: AdminSidebarProps) {
  const pathname = usePathname()

  // 최종관리자만 접근 가능한 메뉴 필터링
  const filteredNavItems = navItems.filter(item => {
    if (item.adminOnly && employee.role !== 'super_admin') {
      return false
    }
    return true
  })

  return (
    <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-white border-r border-gray-200 overflow-y-auto">
      <div className="p-4">
        <nav className="space-y-2">
          {filteredNavItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-start space-x-3 px-3 py-3 rounded-lg text-sm transition-colors',
                  isActive
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <Icon className={cn(
                  'w-5 h-5 mt-0.5 flex-shrink-0',
                  isActive ? 'text-red-600' : 'text-gray-500'
                )} />
                <div className="flex-1 min-w-0">
                  <div className={cn(
                    'font-medium',
                    isActive ? 'text-red-700' : 'text-gray-900'
                  )}>
                    {item.title}
                  </div>
                  <div className={cn(
                    'text-xs mt-1',
                    isActive ? 'text-red-600' : 'text-gray-500'
                  )}>
                    {item.description}
                  </div>
                </div>
                {item.adminOnly && (
                  <Shield className="w-3 h-3 text-red-500 mt-1" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* 시스템 정보 */}
        <div className="mt-8 p-3 bg-gray-50 rounded-lg">
          <div className="text-xs font-medium text-gray-900 mb-2">시스템 정보</div>
          <div className="space-y-1 text-xs text-gray-600">
            <div className="flex items-center justify-between">
              <span>버전</span>
              <span>v1.0.0</span>
            </div>
            <div className="flex items-center justify-between">
              <span>환경</span>
              <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded">
                개발
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>상태</span>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>정상</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
