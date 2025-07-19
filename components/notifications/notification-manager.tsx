'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { NotificationList } from './notification-list'
import { NotificationStats } from './notification-stats'
import { NotificationProvider } from './notification-provider'
import { Bell, BellOff, Search, Filter, CheckCircle, Circle, Trash2, Settings } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Database } from '@/lib/database.types'

type Notification = Database['public']['Tables']['notification']['Row']
type Employee = Database['public']['Tables']['employee']['Row']
type HospitalOrMSO = Database['public']['Tables']['hospital_or_mso']['Row']

interface NotificationManagerProps {
  userId: string
}

export function NotificationManager({ userId }: NotificationManagerProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [organization, setOrganization] = useState<HospitalOrMSO | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([])
  const supabase = createClient()

  useEffect(() => {
    fetchEmployee()
  }, [userId])

  useEffect(() => {
    if (employee) {
      fetchOrganization()
      fetchNotifications()
      
      // 실시간 알림 구독
      const channel = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notification',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            console.log('Real-time notification:', payload)
            fetchNotifications()
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [employee, userId])

  const fetchEmployee = async () => {
    try {
      const { data, error } = await supabase
        .from('employee')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      setEmployee(data)
    } catch (error) {
      console.error('Error fetching employee:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchOrganization = async () => {
    if (!employee) return

    try {
      const { data, error } = await supabase
        .from('hospital_or_mso')
        .select('*')
        .eq('id', employee.hospital_id)
        .single()

      if (error) throw error
      setOrganization(data)
    } catch (error) {
      console.error('Error fetching organization:', error)
    }
  }

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notification')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setNotifications(data || [])
    } catch (error) {
      console.error('Error fetching notifications:', error)
    }
  }

  const markAsRead = async (notificationIds: string[]) => {
    try {
      const { error } = await supabase
        .from('notification')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .in('id', notificationIds)

      if (error) throw error
      fetchNotifications()
    } catch (error) {
      console.error('Error marking notifications as read:', error)
    }
  }

  const markAsUnread = async (notificationIds: string[]) => {
    try {
      const { error } = await supabase
        .from('notification')
        .update({ 
          is_read: false, 
          read_at: null 
        })
        .in('id', notificationIds)

      if (error) throw error
      fetchNotifications()
    } catch (error) {
      console.error('Error marking notifications as unread:', error)
    }
  }

  const deleteNotifications = async (notificationIds: string[]) => {
    if (!confirm('선택한 알림을 삭제하시겠습니까?')) return

    try {
      const { error } = await supabase
        .from('notification')
        .delete()
        .in('id', notificationIds)

      if (error) throw error
      setSelectedNotifications([])
      fetchNotifications()
    } catch (error) {
      console.error('Error deleting notifications:', error)
    }
  }

  const markAllAsRead = async () => {
    const unreadNotifications = notifications.filter(n => !n.is_read).map(n => n.id)
    if (unreadNotifications.length > 0) {
      await markAsRead(unreadNotifications)
    }
  }

  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         notification.message.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = !filterType || notification.type === filterType
    const matchesStatus = !filterStatus || 
                         (filterStatus === 'read' ? notification.is_read : !notification.is_read)
    
    return matchesSearch && matchesType && matchesStatus
  })

  const unreadCount = notifications.filter(n => !n.is_read).length
  const selectedCount = selectedNotifications.length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!employee) {
    return (
      <div className="text-center py-8">
        <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">직원 정보를 찾을 수 없습니다.</p>
      </div>
    )
  }

  return (
    <NotificationProvider userId={userId}>
      <div className="space-y-6">
        {/* 알림 통계 */}
        <NotificationStats notifications={notifications} />

        {/* 알림 관리 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  알림 목록
                  {unreadCount > 0 && (
                    <Badge variant="destructive" className="ml-2">
                      {unreadCount}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  총 {filteredNotifications.length}개의 알림
                  {selectedCount > 0 && ` (${selectedCount}개 선택됨)`}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {selectedCount > 0 && (
                  <>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => markAsRead(selectedNotifications)}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      읽음 표시
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => markAsUnread(selectedNotifications)}
                    >
                      <Circle className="h-4 w-4 mr-2" />
                      안읽음 표시
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => deleteNotifications(selectedNotifications)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      삭제
                    </Button>
                  </>
                )}
                {unreadCount > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={markAllAsRead}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    모두 읽음
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* 검색 및 필터 */}
            <div className="flex flex-col gap-4 mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="알림 제목이나 내용으로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="flex gap-4">
                {/* 타입 필터 */}
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="알림 타입" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">전체 타입</SelectItem>
                    <SelectItem value="task">업무</SelectItem>
                    <SelectItem value="schedule">일정</SelectItem>
                    <SelectItem value="file">파일</SelectItem>
                    <SelectItem value="system">시스템</SelectItem>
                    <SelectItem value="announcement">공지사항</SelectItem>
                  </SelectContent>
                </Select>

                {/* 상태 필터 */}
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="읽음 상태" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">전체 상태</SelectItem>
                    <SelectItem value="unread">읽지 않음</SelectItem>
                    <SelectItem value="read">읽음</SelectItem>
                  </SelectContent>
                </Select>

                {/* 필터 초기화 */}
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setFilterType('')
                    setFilterStatus('')
                    setSearchTerm('')
                  }}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  초기화
                </Button>
              </div>
            </div>

            {/* 알림 목록 */}
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all">
                  전체 ({notifications.length})
                </TabsTrigger>
                <TabsTrigger value="unread">
                  읽지 않음 ({unreadCount})
                </TabsTrigger>
                <TabsTrigger value="read">
                  읽음 ({notifications.length - unreadCount})
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="all" className="mt-6">
                <NotificationList
                  notifications={filteredNotifications}
                  selectedNotifications={selectedNotifications}
                  onSelectionChange={setSelectedNotifications}
                  onMarkAsRead={markAsRead}
                  onMarkAsUnread={markAsUnread}
                  onDelete={deleteNotifications}
                />
              </TabsContent>
              
              <TabsContent value="unread" className="mt-6">
                <NotificationList
                  notifications={filteredNotifications.filter(n => !n.is_read)}
                  selectedNotifications={selectedNotifications}
                  onSelectionChange={setSelectedNotifications}
                  onMarkAsRead={markAsRead}
                  onMarkAsUnread={markAsUnread}
                  onDelete={deleteNotifications}
                />
              </TabsContent>
              
              <TabsContent value="read" className="mt-6">
                <NotificationList
                  notifications={filteredNotifications.filter(n => n.is_read)}
                  selectedNotifications={selectedNotifications}
                  onSelectionChange={setSelectedNotifications}
                  onMarkAsRead={markAsRead}
                  onMarkAsUnread={markAsUnread}
                  onDelete={deleteNotifications}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </NotificationProvider>
  )
}