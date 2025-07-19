'use client'

import { useState, useEffect } from 'react'
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

export function DashboardWidgets() {
  const [userPermissions, setUserPermissions] = useState<UserPermissions>({
    employee: null,
    isAdmin: false,
    isManager: false,
    hospitalId: null,
    departmentId: null
  })

  useEffect(() => {
    async function initializeUser() {
      try {
        const permissions = await getUserPermissions()
        setUserPermissions(permissions)
      } catch (error) {
        console.error('Error getting user permissions:', error)
      }
    }
    initializeUser()
  }, [])
  const stats = [
    {
      title: '전체 직원',
      value: '127',
      change: '+12%',
      changeType: 'positive',
      icon: Users,
      color: 'bg-blue-500'
    },
    {
      title: '진행 중인 업무',
      value: '24',
      change: '+3',
      changeType: 'positive',
      icon: ClipboardList,
      color: 'bg-green-500'
    },
    {
      title: '오늘 일정',
      value: '8',
      change: '3개 완료',
      changeType: 'neutral',
      icon: Calendar,
      color: 'bg-orange-500'
    },
    {
      title: '미처리 알림',
      value: '15',
      change: '+5',
      changeType: 'negative',
      icon: Bell,
      color: 'bg-red-500'
    }
  ]

  const recentTasks = [
    {
      id: 1,
      title: '병원 인증평가 준비',
      department: '의료질관리실',
      priority: 'high',
      dueDate: '2024-07-25',
      status: 'in_progress'
    },
    {
      id: 2,
      title: '직원 교육 계획 수립',
      department: '인사팀',
      priority: 'medium',
      dueDate: '2024-07-30',
      status: 'pending'
    },
    {
      id: 3,
      title: '환자 만족도 조사',
      department: '고객서비스팀',
      priority: 'low',
      dueDate: '2024-08-05',
      status: 'completed'
    }
  ]

  const upcomingEvents = [
    {
      id: 1,
      title: '경영진 회의',
      time: '09:00',
      department: '경영진',
      location: '대회의실'
    },
    {
      id: 2,
      title: '직원 안전교육',
      time: '14:00',
      department: '전체직원',
      location: '강당'
    },
    {
      id: 3,
      title: '의료진 컨퍼런스',
      time: '16:00',
      department: '의료진',
      location: '세미나실'
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

  return (
    <div className="space-y-6">
      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
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
              {recentTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(task.status)}
                    <div>
                      <p className="font-medium text-sm">{task.title}</p>
                      <p className="text-xs text-gray-500">{task.department}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getPriorityColor(task.priority)}>
                      {task.priority === 'high' ? '높음' : 
                       task.priority === 'medium' ? '보통' : '낮음'}
                    </Badge>
                    <span className="text-xs text-gray-500">{task.dueDate}</span>
                  </div>
                </div>
              ))}
            </div>
            <Separator className="my-4" />
            <Button variant="outline" className="w-full">
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
              {upcomingEvents.map((event) => (
                <div key={event.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="flex flex-col items-center justify-center w-12 h-12 bg-blue-50 rounded-lg">
                    <span className="text-xs font-medium text-blue-600">
                      {event.time}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{event.title}</p>
                    <p className="text-xs text-gray-500">
                      {event.department} • {event.location}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <Separator className="my-4" />
            <Button variant="outline" className="w-full">
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