'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  ClipboardList, 
  FolderOpen, 
  Calendar, 
  TrendingUp, 
  TrendingDown,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react'

interface ReportsStatsProps {
  organizationId: string
  dateRange: string
}

interface StatsData {
  totalEmployees: number
  activeEmployees: number
  totalTasks: number
  completedTasks: number
  inProgressTasks: number
  overdueTasks: number
  totalFiles: number
  totalFileSize: number
  totalSchedules: number
  upcomingSchedules: number
}

export function ReportsStats({ organizationId, dateRange }: ReportsStatsProps) {
  const [stats, setStats] = useState<StatsData>({
    totalEmployees: 0,
    activeEmployees: 0,
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    overdueTasks: 0,
    totalFiles: 0,
    totalFileSize: 0,
    totalSchedules: 0,
    upcomingSchedules: 0
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (organizationId) {
      fetchStats()
    }
  }, [organizationId, dateRange])

  const getDateFilter = () => {
    const now = new Date()
    let startDate: Date

    switch (dateRange) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
        break
      case 'quarter':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
        break
      case 'year':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
        break
      default:
        return null
    }

    return startDate.toISOString()
  }

  const fetchStats = async () => {
    try {
      setLoading(true)
      const dateFilter = getDateFilter()

      // 직원 통계
      const { data: employees } = await supabase
        .from('employee')
        .select('id, status')
        .eq('hospital_id', organizationId)

      // 업무 통계
      let taskQuery = supabase
        .from('task')
        .select('id, status, due_date, created_at')
        .eq('hospital_id', organizationId)

      if (dateFilter) {
        taskQuery = taskQuery.gte('created_at', dateFilter)
      }

      const { data: tasks } = await taskQuery

      // 파일 통계
      let fileQuery = supabase
        .from('file')
        .select('id, file_size, uploaded_at')
        .eq('hospital_id', organizationId)

      if (dateFilter) {
        fileQuery = fileQuery.gte('uploaded_at', dateFilter)
      }

      const { data: files } = await fileQuery

      // 일정 통계
      let scheduleQuery = supabase
        .from('schedule')
        .select('id, start_time, created_at')
        .eq('hospital_id', organizationId)

      if (dateFilter) {
        scheduleQuery = scheduleQuery.gte('created_at', dateFilter)
      }

      const { data: schedules } = await scheduleQuery

      // 통계 계산
      const now = new Date()
      const totalEmployees = employees?.length || 0
      const activeEmployees = employees?.filter(emp => emp.status === 'active').length || 0

      const totalTasks = tasks?.length || 0
      const completedTasks = tasks?.filter(task => task.status === 'completed').length || 0
      const inProgressTasks = tasks?.filter(task => task.status === 'in_progress').length || 0
      const overdueTasks = tasks?.filter(task => 
        task.status !== 'completed' && 
        task.due_date && 
        new Date(task.due_date) < now
      ).length || 0

      const totalFiles = files?.length || 0
      const totalFileSize = files?.reduce((total, file) => total + (file.file_size || 0), 0) || 0

      const totalSchedules = schedules?.length || 0
      const upcomingSchedules = schedules?.filter(schedule => 
        new Date(schedule.start_time) > now
      ).length || 0

      setStats({
        totalEmployees,
        activeEmployees,
        totalTasks,
        completedTasks,
        inProgressTasks,
        overdueTasks,
        totalFiles,
        totalFileSize,
        totalSchedules,
        upcomingSchedules
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const taskCompletionRate = stats.totalTasks > 0 ? (stats.completedTasks / stats.totalTasks) * 100 : 0
  const employeeActiveRate = stats.totalEmployees > 0 ? (stats.activeEmployees / stats.totalEmployees) * 100 : 0

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-full"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 주요 지표 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 직원 통계 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">직원 현황</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeEmployees}/{stats.totalEmployees}</div>
            <div className="space-y-2 mt-2">
              <Progress value={employeeActiveRate} className="h-2" />
              <p className="text-xs text-muted-foreground">
                활성 직원 {employeeActiveRate.toFixed(0)}%
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 업무 통계 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">업무 현황</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTasks}</div>
            <div className="space-y-2 mt-2">
              <Progress value={taskCompletionRate} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>완료율 {taskCompletionRate.toFixed(0)}%</span>
                {stats.overdueTasks > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    지연 {stats.overdueTasks}개
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 파일 통계 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">파일 현황</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalFiles}</div>
            <p className="text-xs text-muted-foreground mt-2">
              총 용량: {formatFileSize(stats.totalFileSize)}
            </p>
          </CardContent>
        </Card>

        {/* 일정 통계 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">일정 현황</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSchedules}</div>
            <p className="text-xs text-muted-foreground mt-2">
              예정 일정: {stats.upcomingSchedules}개
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 상세 업무 현황 */}
      <Card>
        <CardHeader>
          <CardTitle>업무 상태별 현황</CardTitle>
          <CardDescription>
            업무의 상태별 분포를 확인하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-900">완료된 업무</p>
                <p className="text-2xl font-bold text-green-700">{stats.completedTasks}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg">
              <Clock className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-900">진행 중인 업무</p>
                <p className="text-2xl font-bold text-blue-700">{stats.inProgressTasks}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-4 bg-red-50 rounded-lg">
              <AlertCircle className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-sm font-medium text-red-900">지연된 업무</p>
                <p className="text-2xl font-bold text-red-700">{stats.overdueTasks}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}