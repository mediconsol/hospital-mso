'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Plus, 
  Upload, 
  Calendar, 
  Megaphone,
  ClipboardList,
  FileText,
  CalendarPlus,
  Bell
} from 'lucide-react'

// 모달 컴포넌트들 import
import { QuickTaskModal } from './quick-task-modal'
import { QuickFileUploadModal } from './quick-file-upload-modal'
import { QuickScheduleModal } from './quick-schedule-modal'
import { AnnouncementModal } from './announcement-modal'

export function QuickActions() {
  const [activeModal, setActiveModal] = useState<string | null>(null)

  const quickActions = [
    {
      id: 'task',
      title: '새 업무',
      description: '업무를 빠르게 생성',
      icon: ClipboardList,
      color: 'bg-blue-500 hover:bg-blue-600',
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
      action: () => setActiveModal('task')
    },
    {
      id: 'upload',
      title: '파일 업로드',
      description: '문서를 빠르게 업로드',
      icon: Upload,
      color: 'bg-green-500 hover:bg-green-600',
      textColor: 'text-green-600',
      bgColor: 'bg-green-50',
      action: () => setActiveModal('upload')
    },
    {
      id: 'schedule',
      title: '일정 추가',
      description: '새 일정을 등록',
      icon: CalendarPlus,
      color: 'bg-orange-500 hover:bg-orange-600',
      textColor: 'text-orange-600',
      bgColor: 'bg-orange-50',
      action: () => setActiveModal('schedule')
    },
    {
      id: 'announcement',
      title: '공지사항',
      description: '공지사항 작성',
      icon: Megaphone,
      color: 'bg-purple-500 hover:bg-purple-600',
      textColor: 'text-purple-600',
      bgColor: 'bg-purple-50',
      action: () => setActiveModal('announcement')
    }
  ]

  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            빠른 작업
          </CardTitle>
          <CardDescription>
            자주 사용하는 기능들을 빠르게 실행하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <Button
                key={action.id}
                variant="outline"
                className={`h-auto p-4 flex flex-col items-center gap-3 ${action.bgColor} border-0 hover:shadow-md transition-all duration-200`}
                onClick={action.action}
              >
                <div className={`p-3 rounded-full ${action.color} text-white`}>
                  <action.icon className="h-6 w-6" />
                </div>
                <div className="text-center">
                  <div className={`font-semibold ${action.textColor}`}>
                    {action.title}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {action.description}
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

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