'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Database } from '@/lib/database.types'

type Task = Database['public']['Tables']['task']['Row'] & {
  assignee?: { id: string; name: string; email: string } | null
  creator?: { id: string; name: string; email: string } | null
  department?: { id: string; name: string } | null
}

interface TaskReportsProps {
  organizationId: string
  dateRange: string
}

interface TaskStats {
  byStatus: Record<string, number>
  byPriority: Record<string, number>
  byDepartment: Record<string, number>
  byAssignee: Record<string, { name: string; count: number; completed: number }>
  averageCompletionTime: number
  overdueTasks: Task[]
  productivityTrend: { period: string; completed: number; created: number }[]
}

export function TaskReports({ organizationId, dateRange }: TaskReportsProps) {
  const [stats, setStats] = useState<TaskStats>({
    byStatus: {},
    byPriority: {},
    byDepartment: {},
    byAssignee: {},
    averageCompletionTime: 0,
    overdueTasks: [],
    productivityTrend: []
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (organizationId) {
      fetchTaskStats()
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

  const fetchTaskStats = async () => {
    try {
      setLoading(true)
      const dateFilter = getDateFilter()

      let query = supabase
        .from('task')
        .select(`
          *,
          assignee:employee!assignee_id (
            id,
            name,
            email
          ),
          creator:employee!creator_id (
            id,
            name,
            email
          ),
          department:department!department_id (
            id,
            name
          )
        `)
        .eq('hospital_id', organizationId)

      if (dateFilter) {
        query = query.gte('created_at', dateFilter)
      }

      const { data: tasks, error } = await query

      if (error) throw error

      // 통계 계산
      const byStatus: Record<string, number> = {}
      const byPriority: Record<string, number> = {}
      const byDepartment: Record<string, number> = {}
      const byAssignee: Record<string, { name: string; count: number; completed: number }> = {}
      const overdueTasks: Task[] = []
      const completionTimes: number[] = []

      const now = new Date()

      tasks?.forEach(task => {
        // 상태별 통계
        byStatus[task.status] = (byStatus[task.status] || 0) + 1

        // 우선순위별 통계
        byPriority[task.priority] = (byPriority[task.priority] || 0) + 1

        // 부서별 통계
        if (task.department?.name) {
          byDepartment[task.department.name] = (byDepartment[task.department.name] || 0) + 1
        }

        // 담당자별 통계
        if (task.assignee) {
          if (!byAssignee[task.assignee.id]) {
            byAssignee[task.assignee.id] = {
              name: task.assignee.name,
              count: 0,
              completed: 0
            }
          }
          byAssignee[task.assignee.id].count += 1
          if (task.status === 'completed') {
            byAssignee[task.assignee.id].completed += 1
          }
        }

        // 지연된 업무
        if (task.status !== 'completed' && task.due_date && new Date(task.due_date) < now) {
          overdueTasks.push(task)
        }

        // 완료 시간 계산
        if (task.status === 'completed' && task.completed_at && task.created_at) {
          const createdTime = new Date(task.created_at).getTime()
          const completedTime = new Date(task.completed_at).getTime()
          const completionTime = (completedTime - createdTime) / (1000 * 60 * 60 * 24) // days
          completionTimes.push(completionTime)
        }
      })

      const averageCompletionTime = completionTimes.length > 0 
        ? completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length 
        : 0

      setStats({
        byStatus,
        byPriority,
        byDepartment,
        byAssignee,
        averageCompletionTime,
        overdueTasks,
        productivityTrend: [] // TODO: 생산성 트렌드 데이터 구현
      })
    } catch (error) {
      console.error('Error fetching task stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return '대기'
      case 'in_progress': return '진행중'
      case 'completed': return '완료'
      case 'cancelled': return '취소'
      default: return status
    }
  }

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent': return '긴급'
      case 'high': return '높음'
      case 'medium': return '보통'
      case 'low': return '낮음'
      default: return priority
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const totalTasks = Object.values(stats.byStatus).reduce((sum, count) => sum + count, 0)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 상태별 분포 */}
        <Card>
          <CardHeader>
            <CardTitle>업무 상태별 분포</CardTitle>
            <CardDescription>현재 업무의 상태별 현황</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(stats.byStatus).map(([status, count]) => {
              const percentage = totalTasks > 0 ? (count / totalTasks) * 100 : 0
              return (
                <div key={status} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{getStatusLabel(status)}</span>
                    <span>{count}개 ({percentage.toFixed(0)}%)</span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* 우선순위별 분포 */}
        <Card>
          <CardHeader>
            <CardTitle>우선순위별 분포</CardTitle>
            <CardDescription>업무의 우선순위별 현황</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(stats.byPriority).map(([priority, count]) => {
              const percentage = totalTasks > 0 ? (count / totalTasks) * 100 : 0
              return (
                <div key={priority} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className={getPriorityColor(priority)}>
                      {getPriorityLabel(priority)}
                    </Badge>
                  </div>
                  <div className="text-sm font-medium">
                    {count}개 ({percentage.toFixed(0)}%)
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      {/* 담당자별 성과 */}
      <Card>
        <CardHeader>
          <CardTitle>담당자별 업무 성과</CardTitle>
          <CardDescription>각 직원의 업무 처리 현황과 완료율</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(stats.byAssignee).map(([assigneeId, data]) => {
              const completionRate = data.count > 0 ? (data.completed / data.count) * 100 : 0
              return (
                <div key={assigneeId} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{data.name}</span>
                    <div className="text-sm text-gray-600">
                      {data.completed}/{data.count} ({completionRate.toFixed(0)}%)
                    </div>
                  </div>
                  <Progress value={completionRate} className="h-2" />
                </div>
              )
            })}
            {Object.keys(stats.byAssignee).length === 0 && (
              <p className="text-center text-gray-500 py-4">
                담당자별 데이터가 없습니다.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 지연된 업무 */}
      {stats.overdueTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-red-700">지연된 업무</CardTitle>
            <CardDescription>마감일이 지난 미완료 업무들</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.overdueTasks.slice(0, 10).map(task => (
                <div key={task.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div>
                    <h4 className="font-medium">{task.title}</h4>
                    <p className="text-sm text-gray-600">
                      담당자: {task.assignee?.name || '미지정'}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge className={getPriorityColor(task.priority)}>
                      {getPriorityLabel(task.priority)}
                    </Badge>
                    <p className="text-sm text-red-600 mt-1">
                      마감: {task.due_date ? new Date(task.due_date).toLocaleDateString('ko-KR') : '미정'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 평균 완료 시간 */}
      <Card>
        <CardHeader>
          <CardTitle>업무 처리 효율성</CardTitle>
          <CardDescription>업무 완료까지 걸리는 평균 시간</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">
              {stats.averageCompletionTime.toFixed(1)}일
            </div>
            <p className="text-sm text-gray-600 mt-2">
              평균 업무 완료 시간
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}