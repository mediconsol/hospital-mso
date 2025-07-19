'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { getCurrentEmployee } from '@/lib/auth-helpers'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { 
  Megaphone, 
  AlertCircle, 
  Eye, 
  Clock,
  ChevronRight,
  Bell,
  X
} from 'lucide-react'
import { Database } from '@/lib/database.types'

type Notification = Database['public']['Tables']['notification']['Row']

export function AnnouncementsWidget() {
  const [announcements, setAnnouncements] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [currentEmployee, setCurrentEmployee] = useState<any>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    initializeAndFetchData()
  }, [])

  const initializeAndFetchData = async () => {
    try {
      const employee = await getCurrentEmployee()
      setCurrentEmployee(employee)
      
      if (employee) {
        await fetchAnnouncements(employee.id)
      }
    } catch (error) {
      console.error('Error initializing:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAnnouncements = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('notification')
        .select('*')
        .eq('user_id', userId)
        .in('type', ['announcement', 'system'])
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) throw error
      setAnnouncements(data || [])
    } catch (error) {
      console.error('Error fetching announcements:', error)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notification')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('id', notificationId)

      if (error) throw error

      // 로컬 상태 업데이트
      setAnnouncements(prev => 
        prev.map(announcement => 
          announcement.id === notificationId 
            ? { ...announcement, is_read: true, read_at: new Date().toISOString() }
            : announcement
        )
      )
    } catch (error) {
      console.error('Error marking as read:', error)
    }
  }

  const dismissAnnouncement = async (notificationId: string) => {
    await markAsRead(notificationId)
    setAnnouncements(prev => prev.filter(a => a.id !== notificationId))
  }

  const getTypeInfo = (type: string) => {
    switch (type) {
      case 'announcement':
        return {
          icon: Megaphone,
          color: 'text-purple-600',
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-200',
          label: '공지'
        }
      case 'system':
        return {
          icon: AlertCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          label: '시스템'
        }
      default:
        return {
          icon: Bell,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          label: '알림'
        }
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) {
      return '방금 전'
    } else if (diffInHours < 24) {
      return `${diffInHours}시간 전`
    } else if (diffInHours < 168) { // 7일
      return `${Math.floor(diffInHours / 24)}일 전`
    } else {
      return date.toLocaleDateString('ko-KR', {
        month: 'short',
        day: 'numeric'
      })
    }
  }

  const unreadCount = announcements.filter(a => !a.is_read).length

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            공지사항
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            공지사항
            {unreadCount > 0 && (
              <Badge className="bg-red-500 text-white">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-purple-600">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription>
          최신 공지사항과 시스템 알림을 확인하세요
        </CardDescription>
      </CardHeader>
      <CardContent>
        {announcements.length === 0 ? (
          <div className="text-center py-8">
            <Megaphone className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">새로운 공지사항이 없습니다</p>
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map((announcement) => {
              const typeInfo = getTypeInfo(announcement.type)
              const Icon = typeInfo.icon
              
              return (
                <div
                  key={announcement.id}
                  className={`p-3 rounded-lg border transition-all duration-200 ${
                    announcement.is_read 
                      ? 'bg-gray-50 border-gray-200' 
                      : `${typeInfo.bgColor} ${typeInfo.borderColor}`
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 p-1 rounded ${
                      announcement.is_read ? 'bg-gray-200' : 'bg-white'
                    }`}>
                      <Icon className={`h-4 w-4 ${
                        announcement.is_read ? 'text-gray-500' : typeInfo.color
                      }`} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                announcement.is_read 
                                  ? 'text-gray-500 border-gray-300' 
                                  : `${typeInfo.color} border-current`
                              }`}
                            >
                              {typeInfo.label}
                            </Badge>
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDate(announcement.created_at)}
                            </span>
                          </div>
                          
                          <h4 className={`font-medium text-sm mb-1 ${
                            announcement.is_read ? 'text-gray-600' : 'text-gray-900'
                          }`}>
                            {announcement.title}
                          </h4>
                          
                          <p className={`text-xs leading-relaxed ${
                            announcement.is_read ? 'text-gray-500' : 'text-gray-700'
                          }`}>
                            {announcement.message.length > 80 
                              ? `${announcement.message.substring(0, 80)}...`
                              : announcement.message
                            }
                          </p>
                        </div>
                        
                        <div className="flex flex-col gap-1">
                          {!announcement.is_read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markAsRead(announcement.id)}
                              className="h-6 w-6 p-0 text-gray-400 hover:text-blue-600"
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => dismissAnnouncement(announcement.id)}
                            className="h-6 w-6 p-0 text-gray-400 hover:text-red-600"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
            
            {announcements.length > 0 && (
              <>
                <Separator className="my-4" />
                <Button 
                  variant="outline" 
                  className="w-full text-purple-600"
                  onClick={() => router.push('/notifications')}
                >
                  모든 공지사항 보기
                </Button>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}