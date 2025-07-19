'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  CheckCircle,
  Circle,
  Trash2,
  MoreVertical,
  Bell,
  Clock,
  FileText,
  Calendar,
  Folder,
  Settings,
  Megaphone,
  Eye,
  EyeOff,
  AlertCircle
} from 'lucide-react'
import { Database } from '@/lib/database.types'

type Notification = Database['public']['Tables']['notification']['Row']

interface NotificationListProps {
  notifications: Notification[]
  selectedNotifications: string[]
  onSelectionChange: (selected: string[]) => void
  onMarkAsRead: (notificationIds: string[]) => Promise<void>
  onMarkAsUnread: (notificationIds: string[]) => Promise<void>
  onDelete: (notificationIds: string[]) => Promise<void>
}

export function NotificationList({ 
  notifications, 
  selectedNotifications, 
  onSelectionChange, 
  onMarkAsRead, 
  onMarkAsUnread, 
  onDelete 
}: NotificationListProps) {
  const [expandedNotifications, setExpandedNotifications] = useState<string[]>([])

  const getTypeIcon = (type: string, size: string = 'h-4 w-4') => {
    const iconClass = `${size} text-gray-500`
    
    switch (type) {
      case 'task': return <FileText className={iconClass} />
      case 'schedule': return <Calendar className={iconClass} />
      case 'file': return <Folder className={iconClass} />
      case 'system': return <Settings className={iconClass} />
      case 'announcement': return <Megaphone className={iconClass} />
      default: return <Bell className={iconClass} />
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'task': return '업무'
      case 'schedule': return '일정'
      case 'file': return '파일'
      case 'system': return '시스템'
      case 'announcement': return '공지사항'
      default: return '기타'
    }
  }

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'task': return 'bg-blue-100 text-blue-800'
      case 'schedule': return 'bg-green-100 text-green-800'
      case 'file': return 'bg-purple-100 text-purple-800'
      case 'system': return 'bg-orange-100 text-orange-800'
      case 'announcement': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60)
      return `${diffInMinutes}분 전`
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}시간 전`
    } else {
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(notifications.map(n => n.id))
    } else {
      onSelectionChange([])
    }
  }

  const handleSelectNotification = (notificationId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedNotifications, notificationId])
    } else {
      onSelectionChange(selectedNotifications.filter(id => id !== notificationId))
    }
  }

  const toggleExpanded = (notificationId: string) => {
    setExpandedNotifications(prev => 
      prev.includes(notificationId) 
        ? prev.filter(id => id !== notificationId)
        : [...prev, notificationId]
    )
  }

  const isAllSelected = notifications.length > 0 && selectedNotifications.length === notifications.length
  const isPartiallySelected = selectedNotifications.length > 0 && selectedNotifications.length < notifications.length

  if (notifications.length === 0) {
    return (
      <div className="text-center py-12">
        <Bell className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 text-lg">알림이 없습니다</p>
        <p className="text-sm text-gray-400 mt-2">
          새로운 알림이 도착하면 여기에 표시됩니다
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 전체 선택 */}
      <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-lg">
        <Checkbox
          checked={isAllSelected}
          onCheckedChange={handleSelectAll}
        />
        <span className="text-sm text-gray-600">
          전체 선택 ({selectedNotifications.length}/{notifications.length})
        </span>
      </div>

      {/* 알림 목록 */}
      <div className="space-y-2">
        {notifications.map((notification) => {
          const isSelected = selectedNotifications.includes(notification.id)
          const isExpanded = expandedNotifications.includes(notification.id)
          const isUnread = !notification.is_read
          
          return (
            <div 
              key={notification.id} 
              className={`p-4 border rounded-lg transition-colors ${
                isUnread ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'
              } ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={(checked) => 
                    handleSelectNotification(notification.id, checked as boolean)
                  }
                />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(notification.type)}
                      <Badge className={getTypeBadgeColor(notification.type)}>
                        {getTypeLabel(notification.type)}
                      </Badge>
                      {isUnread && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        {formatDate(notification.created_at)}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {isUnread ? (
                            <DropdownMenuItem onClick={() => onMarkAsRead([notification.id])}>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              읽음 표시
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => onMarkAsUnread([notification.id])}>
                              <Circle className="h-4 w-4 mr-2" />
                              안읽음 표시
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            onClick={() => onDelete([notification.id])}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            삭제
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className={`font-medium ${isUnread ? 'text-gray-900' : 'text-gray-700'}`}>
                      {notification.title}
                    </h3>
                    
                    <div className="text-sm text-gray-600">
                      {notification.message.length > 150 && !isExpanded ? (
                        <>
                          {notification.message.substring(0, 150)}...
                          <button
                            onClick={() => toggleExpanded(notification.id)}
                            className="text-blue-600 hover:text-blue-800 ml-2"
                          >
                            더보기
                          </button>
                        </>
                      ) : (
                        <>
                          {notification.message}
                          {notification.message.length > 150 && (
                            <button
                              onClick={() => toggleExpanded(notification.id)}
                              className="text-blue-600 hover:text-blue-800 ml-2"
                            >
                              접기
                            </button>
                          )}
                        </>
                      )}
                    </div>
                    
                    {notification.related_id && (
                      <div className="text-xs text-gray-500">
                        관련 ID: {notification.related_id}
                      </div>
                    )}
                    
                    {notification.read_at && (
                      <div className="text-xs text-gray-500">
                        읽은 시간: {formatDate(notification.read_at)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}