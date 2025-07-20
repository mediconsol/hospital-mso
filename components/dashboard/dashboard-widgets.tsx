'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { getUserPermissions, UserPermissions } from '@/lib/permission-helpers'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { AnnouncementsWidget } from './announcements-widget'
import { 
  Users, 
  ClipboardList, 
  Calendar, 
  FileText, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  Clock,
  Building2,
  Bell
} from 'lucide-react'

interface DashboardStats {
  totalEmployees: number
  activeTasks: number
  todaySchedules: number
  unreadNotifications: number
}

interface Task {
  id: string
  title: string
  department_name: string
  priority: string
  due_date: string | null
  status: string
}

interface Schedule {
  id: string
  title: string
  start_time: string
  department_name: string
  location: string
}

export function DashboardWidgets() {
  const [userPermissions, setUserPermissions] = useState<UserPermissions>({
    employee: null,
    isAdmin: false,
    isManager: false,
    hospitalId: null,
    departmentId: null
  })
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    activeTasks: 0,
    todaySchedules: 0,
    unreadNotifications: 0
  })
  const [recentTasks, setRecentTasks] = useState<Task[]>([])
  const [upcomingEvents, setUpcomingEvents] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function initializeUser() {
      try {
        const permissions = await getUserPermissions()
        setUserPermissions(permissions)
        if (permissions.employee) {
          await fetchDashboardData(permissions)
        }
      } catch (error) {
        console.error('Error getting user permissions:', error)
      } finally {
        setLoading(false)
      }
    }
    initializeUser()
  }, [])

  const fetchDashboardData = async (permissions: UserPermissions) => {
    try {
      // 권한에 따른 데이터 필터링
      const hospitalId = permissions.hospitalId

      // 통계 데이터 가져오기
      await Promise.all([
        fetchEmployeeStats(hospitalId, permissions.isAdmin),
        fetchTaskStats(hospitalId, permissions.isAdmin),
        fetchScheduleStats(hospitalId, permissions.isAdmin),
        fetchNotificationStats(permissions.employee?.id),
        fetchRecentTasks(hospitalId, permissions.isAdmin),
        fetchTodaySchedules(hospitalId, permissions.isAdmin)
      ])
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    }
  }

  const fetchEmployeeStats = async (hospitalId: string | null, isAdmin: boolean) => {
    try {
      let query = supabase.from('employee').select('id', { count: 'exact' })
      
      if (!isAdmin && hospitalId) {
        query = query.eq('hospital_id', hospitalId)
      }
      
      const { count } = await query
      setStats(prev => ({ ...prev, totalEmployees: count || 0 }))
    } catch (error) {
      console.error('Error fetching employee stats:', error)
    }
  }

  const fetchTaskStats = async (hospitalId: string | null, isAdmin: boolean) => {
    try {
      let query = supabase
        .from('task')
        .select('id', { count: 'exact' })
        .in('status', ['pending', 'in_progress'])
      
      if (!isAdmin && hospitalId) {
        query = query.eq('hospital_id', hospitalId)
      }
      
      const { count } = await query
      setStats(prev => ({ ...prev, activeTasks: count || 0 }))
    } catch (error) {
      console.error('Error fetching task stats:', error)
    }
  }

  const fetchScheduleStats = async (hospitalId: string | null, isAdmin: boolean) => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const tomorrow = new Date(Date.now() + 24*60*60*1000).toISOString().split('T')[0]
      
      let query = supabase
        .from('schedule')
        .select('id', { count: 'exact' })
        .gte('start_time', today)
        .lt('start_time', tomorrow)
      
      if (!isAdmin && hospitalId) {
        query = query.eq('hospital_id', hospitalId)
      }
      
      const { count } = await query
      setStats(prev => ({ ...prev, todaySchedules: count || 0 }))
    } catch (error) {
      console.error('Error fetching schedule stats:', error)
    }
  }

  const fetchNotificationStats = async (userId: string | undefined) => {
    if (!userId) return
    
    try {
      const { count } = await supabase
        .from('notification')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .eq('is_read', false)
      
      setStats(prev => ({ ...prev, unreadNotifications: count || 0 }))
    } catch (error) {
      console.error('Error fetching notification stats:', error)
    }
  }

  const fetchRecentTasks = async (hospitalId: string | null, isAdmin: boolean) => {
    try {
      let query = supabase
        .from('task')
        .select(`
          id,
          title,
          priority,
          due_date,
          status,
          department:department_id(name)
        `)
        .order('created_at', { ascending: false })
        .limit(3)
      
      if (!isAdmin && hospitalId) {
        query = query.eq('hospital_id', hospitalId)
      }
      
      const { data, error } = await query
      if (error) throw error
      
      const formattedTasks = data?.map(task => ({
        id: task.id,
        title: task.title,
        department_name: task.department?.name || '부서 없음',
        priority: task.priority,
        due_date: task.due_date,
        status: task.status
      })) || []
      
      setRecentTasks(formattedTasks)
    } catch (error) {
      console.error('Error fetching recent tasks:', error)
    }
  }

  const fetchTodaySchedules = async (hospitalId: string | null, isAdmin: boolean) => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const tomorrow = new Date(Date.now() + 24*60*60*1000).toISOString().split('T')[0]
      
      let query = supabase
        .from('schedule')
        .select(`
          id,
          title,
          start_time,
          location,
          hospital:hospital_id(name)
        `)
        .gte('start_time', today)
        .lt('start_time', tomorrow)
        .order('start_time', { ascending: true })
        .limit(3)
      
      if (!isAdmin && hospitalId) {
        query = query.eq('hospital_id', hospitalId)
      }
      
      const { data, error } = await query
      if (error) throw error
      
      const formattedSchedules = data?.map(schedule => ({
        id: schedule.id,
        title: schedule.title,
        start_time: schedule.start_time || '시간 미정',
        department_name: schedule.hospital?.name || '병원',
        location: schedule.location || '장소 미정'
      })) || []
      
      setUpcomingEvents(formattedSchedules)
    } catch (error) {
      console.error('Error fetching today schedules:', error)
    }
  }

  const dashboardStats = [
    {
      title: '전체 직원',
      value: stats.totalEmployees.toString(),
      change: `${stats.totalEmployees}명`,
      changeType: 'neutral' as const,
      icon: Users,
      color: 'bg-blue-500'
    },
    {
      title: '진행 중인 업무',
      value: stats.activeTasks.toString(),
      change: `${stats.activeTasks}개`,
      changeType: 'positive' as const,
      icon: ClipboardList,
      color: 'bg-green-500'
    },
    {
      title: '오늘 일정',
      value: stats.todaySchedules.toString(),
      change: `${stats.todaySchedules}개`,
      changeType: 'neutral' as const,
      icon: Calendar,
      color: 'bg-orange-500'
    },
    {
      title: '미처리 알림',
      value: stats.unreadNotifications.toString(),
      change: `${stats.unreadNotifications}개`,
      changeType: stats.unreadNotifications > 0 ? 'negative' as const : 'positive' as const,
      icon: Bell,
      color: 'bg-red-500'
    }
  ]

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'in_progress': return <Clock className="h-4 w-4 text-blue-600" />
      case 'pending': return <AlertCircle className="h-4 w-4 text-yellow-600" />
      default: return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-20"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-12"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {dashboardStats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title} className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.color}`}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                <p className={`text-xs ${
                  stat.changeType === 'positive' ? 'text-green-600' :
                  stat.changeType === 'negative' ? 'text-red-600' :
                  'text-gray-600'
                }`}>
                  {stat.change}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 최근 업무 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              최근 업무
            </CardTitle>
            <CardDescription>
              진행 중인 주요 업무들을 확인하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTasks.length > 0 ? recentTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(task.status)}
                    <div>
                      <p className="font-medium text-sm">{task.title}</p>
                      <p className="text-xs text-gray-500">{task.department_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getPriorityColor(task.priority)}>
                      {task.priority === 'high' ? '높음' : 
                       task.priority === 'medium' ? '보통' : '낮음'}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {task.due_date ? new Date(task.due_date).toLocaleDateString('ko-KR') : '날짜 미정'}
                    </span>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8 text-gray-500">
                  등록된 업무가 없습니다.
                </div>
              )}
            </div>
            <Separator className="my-4" />
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => router.push('/tasks')}
            >
              모든 업무 보기
            </Button>
          </CardContent>
        </Card>

        {/* 오늘 일정 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              오늘 일정
            </CardTitle>
            <CardDescription>
              {new Date().toLocaleDateString('ko-KR', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingEvents.length > 0 ? upcomingEvents.map((event) => (
                <div key={event.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="flex flex-col items-center justify-center w-12 h-12 bg-blue-50 rounded-lg">
                    <span className="text-xs font-medium text-blue-600">
                      {event.start_time ? event.start_time.substring(0, 5) : '시간미정'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{event.title}</p>
                    <p className="text-xs text-gray-500">
                      {event.department_name} • {event.location}
                    </p>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8 text-gray-500">
                  오늘 일정이 없습니다.
                </div>
              )}
            </div>
            <Separator className="my-4" />
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => router.push('/calendar')}
            >
              전체 일정 보기
            </Button>
          </CardContent>
        </Card>

        {/* 공지사항 */}
        <AnnouncementsWidget />
      </div>

    </div>
  )
}