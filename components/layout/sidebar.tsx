'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Building2, 
  Users, 
  ClipboardList, 
  FolderOpen, 
  Calendar, 
  Bell,
  Settings,
  BarChart3,
  FileText,
  MessageSquare,
  Search,
  Home
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

// 모달 컴포넌트들 import
import { QuickTaskModal } from '@/components/dashboard/quick-task-modal'
import { QuickFileUploadModal } from '@/components/dashboard/quick-file-upload-modal'
import { QuickScheduleModal } from '@/components/dashboard/quick-schedule-modal'
import { AnnouncementModal } from '@/components/dashboard/announcement-modal'

const navigation = [
  { name: '대시보드', href: '/dashboard', icon: Home },
  { name: '조직 관리', href: '/organization', icon: Building2 },
  { name: '직원 관리', href: '/employees', icon: Users },
  { name: '업무 관리', href: '/tasks', icon: ClipboardList },
  { name: '파일 관리', href: '/files', icon: FolderOpen },
  { name: '일정 관리', href: '/calendar', icon: Calendar },
  { name: '알림 센터', href: '/notifications', icon: Bell, badge: '3' },
  { name: '보고서', href: '/reports', icon: BarChart3 },
  { name: '문서 관리', href: '/documents', icon: FileText },
  { name: '메신저', href: '/messages', icon: MessageSquare, badge: '12' },
]

const quickActions = [
  { name: '새 업무 생성', action: 'task', icon: ClipboardList },
  { name: '파일 업로드', action: 'upload', icon: FolderOpen },
  { name: '일정 추가', action: 'schedule', icon: Calendar },
  { name: '공지사항', action: 'announcement', icon: Bell },
]

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  const [activeModal, setActiveModal] = useState<string | null>(null)

  return (
    <div className={cn('pb-12 w-64 bg-white border-r border-gray-200', className)}>
      <div className="space-y-4 py-4">
        {/* 검색 */}
        <div className="px-3 py-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              placeholder="검색..."
              className="w-full pl-8 pr-4 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* 메인 네비게이션 */}
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight text-gray-900">
            메인 메뉴
          </h2>
          <div className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              
              return (
                <Link key={item.name} href={item.href}>
                  <Button
                    variant={isActive ? 'secondary' : 'ghost'}
                    className={cn(
                      'w-full justify-start px-4 py-2 h-auto',
                      isActive && 'bg-blue-50 text-blue-700 border-blue-200'
                    )}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    <span className="flex-1 text-left">{item.name}</span>
                    {item.badge && (
                      <Badge variant="secondary" className="ml-auto">
                        {item.badge}
                      </Badge>
                    )}
                  </Button>
                </Link>
              )
            })}
          </div>
        </div>

        <Separator />

        {/* 빠른 작업 */}
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight text-gray-900">
            빠른 작업
          </h2>
          <div className="space-y-1">
            {quickActions.map((item) => {
              const Icon = item.icon
              
              return (
                <Button
                  key={item.name}
                  variant="ghost"
                  className="w-full justify-start px-4 py-2 h-auto text-sm"
                  onClick={() => setActiveModal(item.action)}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  <span className="flex-1 text-left">{item.name}</span>
                </Button>
              )
            })}
          </div>
        </div>

        <Separator />

        {/* 설정 */}
        <div className="px-3 py-2">
          <Link href="/settings">
            <Button variant="ghost" className="w-full justify-start px-4 py-2 h-auto">
              <Settings className="mr-2 h-4 w-4" />
              설정
            </Button>
          </Link>
        </div>
      </div>

      {/* 모달들 */}
      {activeModal === 'task' && (
        <QuickTaskModal 
          onClose={() => setActiveModal(null)}
          onSaved={() => setActiveModal(null)}
        />
      )}
      
      {activeModal === 'upload' && (
        <QuickFileUploadModal 
          onClose={() => setActiveModal(null)}
          onUploaded={() => setActiveModal(null)}
        />
      )}
      
      {activeModal === 'schedule' && (
        <QuickScheduleModal 
          onClose={() => setActiveModal(null)}
          onSaved={() => setActiveModal(null)}
        />
      )}
      
      {activeModal === 'announcement' && (
        <AnnouncementModal 
          onClose={() => setActiveModal(null)}
          onSaved={() => setActiveModal(null)}
        />
      )}
    </div>
  )
}