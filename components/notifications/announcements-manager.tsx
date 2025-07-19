'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { getCurrentEmployee } from '@/lib/auth-helpers'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Megaphone, 
  AlertCircle, 
  Bell,
  Search, 
  Filter, 
  CheckCircle, 
  Circle, 
  Trash2, 
  Eye,
  EyeOff,
  Calendar,
  Clock,
  User,
  X,
  MoreVertical,
  ArrowUpDown
} from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Database } from '@/lib/database.types'

type Notification = Database['public']['Tables']['notification']['Row']

export function AnnouncementsManager() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([])
  const [currentEmployee, setCurrentEmployee] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('newest')
  const [loading, setLoading] = useState(true)
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([])
  const [expandedNotification, setExpandedNotification] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    initializeData()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [notifications, searchTerm, filterType, filterStatus, sortBy])

  const initializeData = async () => {
    try {
      const employee = await getCurrentEmployee()
      setCurrentEmployee(employee)
      
      if (employee) {
        await fetchNotifications(employee.id)
      }
    } catch (error) {
      console.error('Error initializing data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchNotifications = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('notification')
        .select('*')
        .eq('user_id', userId)
        .in('type', ['announcement', 'system'])
        .order('created_at', { ascending: false })

      if (error) throw error
      setNotifications(data || [])
    } catch (error) {
      console.error('Error fetching notifications:', error)
    }
  }

  const applyFilters = () => {
    let filtered = [...notifications]

    // 검색 필터
    if (searchTerm) {
      filtered = filtered.filter(notification =>
        notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        notification.message.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // 타입 필터
    if (filterType !== 'all') {
      filtered = filtered.filter(notification => notification.type === filterType)
    }

    // 상태 필터
    if (filterStatus !== 'all') {
      const isRead = filterStatus === 'read'
      filtered = filtered.filter(notification => notification.is_read === isRead)
    }

    // 정렬
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'unread':
          if (a.is_read === b.is_read) {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          }
          return a.is_read ? 1 : -1
        default:
          return 0
      }
    })

    setFilteredNotifications(filtered)
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

      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, is_read: true, read_at: new Date().toISOString() }
            : notification
        )
      )
    } catch (error) {
      console.error('Error marking as read:', error)
    }
  }

  const markAsUnread = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notification')
        .update({ 
          is_read: false, 
          read_at: null 
        })
        .eq('id', notificationId)

      if (error) throw error

      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, is_read: false, read_at: null }
            : notification
        )
      )
    } catch (error) {
      console.error('Error marking as unread:', error)
    }
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notification')
        .delete()
        .eq('id', notificationId)

      if (error) throw error

      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      setSelectedNotifications(prev => prev.filter(id => id !== notificationId))
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

  const bulkMarkAsRead = async () => {
    if (selectedNotifications.length === 0) return

    try {
      const { error } = await supabase
        .from('notification')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .in('id', selectedNotifications)

      if (error) throw error

      setNotifications(prev => 
        prev.map(notification => 
          selectedNotifications.includes(notification.id)
            ? { ...notification, is_read: true, read_at: new Date().toISOString() }
            : notification
        )
      )
      setSelectedNotifications([])
    } catch (error) {
      console.error('Error bulk marking as read:', error)
    }
  }

  const bulkDelete = async () => {
    if (selectedNotifications.length === 0) return

    try {
      const { error } = await supabase
        .from('notification')
        .delete()
        .in('id', selectedNotifications)

      if (error) throw error

      setNotifications(prev => 
        prev.filter(n => !selectedNotifications.includes(n.id))
      )
      setSelectedNotifications([])
    } catch (error) {
      console.error('Error bulk deleting:', error)
    }
  }

  const toggleSelection = (notificationId: string) => {
    setSelectedNotifications(prev => 
      prev.includes(notificationId)
        ? prev.filter(id => id !== notificationId)
        : [...prev, notificationId]
    )
  }

  const toggleSelectAll = () => {
    if (selectedNotifications.length === filteredNotifications.length) {
      setSelectedNotifications([])
    } else {
      setSelectedNotifications(filteredNotifications.map(n => n.id))
    }
  }

  const getTypeInfo = (type: string) => {
    switch (type) {
      case 'announcement':
        return {
          icon: Megaphone,
          color: 'text-purple-600',
          bgColor: 'bg-purple-100',
          label: '공지'
        }
      case 'system':
        return {
          icon: AlertCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          label: '시스템'
        }
      default:
        return {
          icon: Bell,
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
          label: '알림'
        }
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) {
      return '방금 전'
    } else if (diffInHours < 24) {
      return `${diffInHours}시간 전`
    } else if (diffInHours < 168) {
      return `${Math.floor(diffInHours / 24)}일 전`
    } else {
      return date.toLocaleDateString('ko-KR')
    }
  }

  const stats = {
    total: notifications.length,
    unread: notifications.filter(n => !n.is_read).length,
    announcements: notifications.filter(n => n.type === 'announcement').length,
    system: notifications.filter(n => n.type === 'system').length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전체</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">읽지 않음</CardTitle>
            <Circle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.unread}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">일반 공지</CardTitle>
            <Megaphone className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.announcements}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">시스템 알림</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.system}</div>
          </CardContent>
        </Card>
      </div>

      {/* 필터 및 검색 */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>공지사항 목록</CardTitle>
              <CardDescription>
                {filteredNotifications.length}개의 공지사항이 있습니다
              </CardDescription>
            </div>
            
            {selectedNotifications.length > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {selectedNotifications.length}개 선택됨
                </Badge>
                <Button size="sm" onClick={bulkMarkAsRead}>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  읽음 처리
                </Button>
                <Button size="sm" variant="destructive" onClick={bulkDelete}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  삭제
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            {/* 검색 */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="제목이나 내용으로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            {/* 필터 */}
            <div className="flex gap-2">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="유형" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 유형</SelectItem>
                  <SelectItem value="announcement">일반 공지</SelectItem>
                  <SelectItem value="system">시스템</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="상태" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 상태</SelectItem>
                  <SelectItem value="unread">읽지 않음</SelectItem>
                  <SelectItem value="read">읽음</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="정렬" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">최신순</SelectItem>
                  <SelectItem value="oldest">오래된순</SelectItem>
                  <SelectItem value="unread">읽지 않음 우선</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 전체 선택 */}
          {filteredNotifications.length > 0 && (
            <div className="flex items-center gap-2 mb-4 pb-4 border-b">
              <Checkbox
                checked={selectedNotifications.length === filteredNotifications.length}
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-sm text-gray-600">
                전체 선택 ({filteredNotifications.length}개)
              </span>
            </div>
          )}

          {/* 공지사항 목록 */}
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-12">
              <Megaphone className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchTerm || filterType !== 'all' || filterStatus !== 'all' 
                  ? '검색 조건에 맞는 공지사항이 없습니다' 
                  : '공지사항이 없습니다'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notification) => {
                const typeInfo = getTypeInfo(notification.type)
                const Icon = typeInfo.icon
                const isExpanded = expandedNotification === notification.id
                
                return (
                  <div
                    key={notification.id}
                    className={`border rounded-lg p-4 transition-all duration-200 ${
                      notification.is_read 
                        ? 'bg-gray-50 border-gray-200' 
                        : 'bg-white border-gray-300 shadow-sm'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedNotifications.includes(notification.id)}
                        onCheckedChange={() => toggleSelection(notification.id)}
                      />
                      
                      <div className={`flex-shrink-0 p-2 rounded-lg ${typeInfo.bgColor}`}>
                        <Icon className={`h-4 w-4 ${typeInfo.color}`} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className={typeInfo.color}>
                                {typeInfo.label}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {getRelativeTime(notification.created_at)}
                              </span>
                              {!notification.is_read && (
                                <Badge className="bg-red-500 text-white">새로움</Badge>
                              )}
                            </div>
                            
                            <h3 className={`font-semibold mb-2 ${
                              notification.is_read ? 'text-gray-600' : 'text-gray-900'
                            }`}>
                              {notification.title}
                            </h3>
                            
                            <p className={`text-sm leading-relaxed ${
                              notification.is_read ? 'text-gray-500' : 'text-gray-700'
                            }`}>
                              {isExpanded 
                                ? notification.message
                                : notification.message.length > 150 
                                  ? `${notification.message.substring(0, 150)}...`
                                  : notification.message
                              }
                            </p>
                            
                            {notification.message.length > 150 && (
                              <Button
                                variant="link"
                                size="sm"
                                onClick={() => setExpandedNotification(
                                  isExpanded ? null : notification.id
                                )}
                                className="p-0 h-auto text-purple-600"
                              >
                                {isExpanded ? '접기' : '더 보기'}
                              </Button>
                            )}
                            
                            <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(notification.created_at)}
                              </span>
                              {notification.read_at && (
                                <span className="flex items-center gap-1">
                                  <Eye className="h-3 w-3" />
                                  {formatDate(notification.read_at)}에 읽음
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {notification.is_read ? (
                                <DropdownMenuItem onClick={() => markAsUnread(notification.id)}>
                                  <EyeOff className="h-4 w-4 mr-2" />
                                  읽지 않음으로 표시
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => markAsRead(notification.id)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  읽음으로 표시
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem 
                                onClick={() => deleteNotification(notification.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                삭제
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}