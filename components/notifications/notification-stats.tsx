'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Bell, BellOff, Clock, CheckCircle, AlertCircle, FileText, Calendar, Folder, Settings, Megaphone } from 'lucide-react'
import { Database } from '@/lib/database.types'

type Notification = Database['public']['Tables']['notification']['Row']

interface NotificationStatsProps {
  notifications: Notification[]
}

export function NotificationStats({ notifications }: NotificationStatsProps) {
  const totalNotifications = notifications.length
  const unreadNotifications = notifications.filter(n => !n.is_read).length
  const readNotifications = notifications.filter(n => n.is_read).length
  
  // 오늘 받은 알림
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayNotifications = notifications.filter(n => {
    const notificationDate = new Date(n.created_at)
    return notificationDate >= today
  }).length

  // 이번 주 받은 알림
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay())
  const weekNotifications = notifications.filter(n => {
    const notificationDate = new Date(n.created_at)
    return notificationDate >= weekStart
  }).length

  // 타입별 분류
  const typeCount = notifications.reduce((acc, n) => {
    acc[n.type] = (acc[n.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'task': return FileText
      case 'schedule': return Calendar
      case 'file': return Folder
      case 'system': return Settings
      case 'announcement': return Megaphone
      default: return Bell
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

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'task': return 'bg-blue-500'
      case 'schedule': return 'bg-green-500'
      case 'file': return 'bg-purple-500'
      case 'system': return 'bg-orange-500'
      case 'announcement': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const stats = [
    {
      title: '전체 알림',
      value: totalNotifications,
      description: '받은 전체 알림',
      icon: Bell,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: '읽지 않음',
      value: unreadNotifications,
      description: '확인하지 않은 알림',
      icon: BellOff,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      title: '읽음',
      value: readNotifications,
      description: '확인한 알림',
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: '오늘',
      value: todayNotifications,
      description: '오늘 받은 알림',
      icon: Clock,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 주요 통계 */}
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <div className={`p-2 rounded-full ${stat.bgColor}`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">{stat.description}</p>
          </CardContent>
        </Card>
      ))}

      {/* 타입별 분포 */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm font-medium">알림 타입별 분포</CardTitle>
          <CardDescription>받은 알림의 타입별 현황</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(typeCount).length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">알림이 없습니다</p>
              </div>
            ) : (
              Object.entries(typeCount)
                .sort(([, a], [, b]) => b - a)
                .map(([type, count]) => {
                  const Icon = getTypeIcon(type)
                  return (
                    <div key={type} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 ${getTypeColor(type)} rounded-full`} />
                        <Icon className="h-4 w-4 text-gray-600" />
                        <span className="text-sm">{getTypeLabel(type)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{count}</Badge>
                        <span className="text-xs text-gray-500">
                          ({totalNotifications > 0 ? Math.round((count / totalNotifications) * 100) : 0}%)
                        </span>
                      </div>
                    </div>
                  )
                })
            )}
          </div>
        </CardContent>
      </Card>

      {/* 활동 현황 */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm font-medium">활동 현황</CardTitle>
          <CardDescription>최근 알림 활동</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full" />
                <span className="text-sm">이번 주</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{weekNotifications}</Badge>
                <span className="text-xs text-gray-500">
                  ({totalNotifications > 0 ? Math.round((weekNotifications / totalNotifications) * 100) : 0}%)
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full" />
                <span className="text-sm">읽음 비율</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {totalNotifications > 0 ? Math.round((readNotifications / totalNotifications) * 100) : 0}%
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full" />
                <span className="text-sm">미확인 알림</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{unreadNotifications}</Badge>
                <span className="text-xs text-gray-500">
                  ({totalNotifications > 0 ? Math.round((unreadNotifications / totalNotifications) * 100) : 0}%)
                </span>
              </div>
            </div>

            {/* 읽음 상태 진행률 */}
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">읽음 진행률</span>
                <span className="text-sm font-medium">
                  {totalNotifications > 0 ? Math.round((readNotifications / totalNotifications) * 100) : 0}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                  style={{ 
                    width: `${totalNotifications > 0 ? (readNotifications / totalNotifications) * 100 : 0}%` 
                  }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {readNotifications}/{totalNotifications} 읽음
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}