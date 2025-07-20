'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { 
  Plus,
  Upload, 
  CalendarPlus,
  Megaphone,
  ClipboardList,
  FileText,
  Calendar,
  Bell
} from 'lucide-react'

// 모달 컴포넌트들 import
import { QuickTaskModal } from '@/components/dashboard/quick-task-modal'
import { QuickFileUploadModal } from '@/components/dashboard/quick-file-upload-modal'
import { QuickScheduleModal } from '@/components/dashboard/quick-schedule-modal'
import { AnnouncementModal } from '@/components/dashboard/announcement-modal'

export function BottomNavigation() {
  const [activeModal, setActiveModal] = useState<string | null>(null)

  const quickActions = [
    {
      id: 'task',
      title: '업무',
      icon: ClipboardList,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      action: () => setActiveModal('task')
    },
    {
      id: 'upload',
      title: '파일',
      icon: Upload,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      action: () => setActiveModal('upload')
    },
    {
      id: 'schedule',
      title: '일정',
      icon: CalendarPlus,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      action: () => setActiveModal('schedule')
    },
    {
      id: 'announcement',
      title: '공지',
      icon: Megaphone,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      action: () => setActiveModal('announcement')
    }
  ]

  return (
    <>
      {/* 모바일 하단 네비게이션 바 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden z-40 mobile-bottom-nav">
        <div className="grid grid-cols-4 h-16">
          {quickActions.map((action) => (
            <Button
              key={action.id}
              variant="ghost"
              className="h-full rounded-none flex flex-col items-center justify-center gap-1 px-2 py-2 hover:bg-gray-50"
              onClick={action.action}
            >
              <div className={`p-1.5 rounded-lg ${action.bgColor}`}>
                <action.icon className={`h-4 w-4 ${action.color}`} />
              </div>
              <span className={`text-xs font-medium ${action.color}`}>
                {action.title}
              </span>
            </Button>
          ))}
        </div>
        {/* iOS Safe Area 하단 패딩 */}
        <div className="safe-area-pb" />
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
    </>
  )
}