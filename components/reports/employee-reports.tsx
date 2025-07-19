'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Database } from '@/lib/database.types'

type Employee = Database['public']['Tables']['employee']['Row'] & {
  department?: { id: string; name: string } | null
}

interface EmployeeReportsProps {
  organizationId: string
  dateRange: string
}

interface EmployeeStats {
  totalEmployees: number
  activeEmployees: number
  byDepartment: Record<string, number>
  byRole: Record<string, number>
  byStatus: Record<string, number>
  recentJoins: Employee[]
  topPerformers: { employee: Employee; completedTasks: number; completionRate: number }[]
}

export function EmployeeReports({ organizationId, dateRange }: EmployeeReportsProps) {
  const [stats, setStats] = useState<EmployeeStats>({
    totalEmployees: 0,
    activeEmployees: 0,
    byDepartment: {},
    byRole: {},
    byStatus: {},
    recentJoins: [],
    topPerformers: []
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (organizationId) {
      fetchEmployeeStats()
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

  const fetchEmployeeStats = async () => {
    try {
      setLoading(true)
      const dateFilter = getDateFilter()

      // 직원 데이터 조회
      const { data: employees, error: employeeError } = await supabase
        .from('employee')
        .select(`
          *,
          department:department!department_id (
            id,
            name
          )
        `)
        .eq('hospital_id', organizationId)

      if (employeeError) throw employeeError

      // 업무 데이터 조회 (성과 분석용)
      let taskQuery = supabase
        .from('task')
        .select('assignee_id, status, created_at, completed_at')
        .eq('hospital_id', organizationId)
        .not('assignee_id', 'is', null)

      if (dateFilter) {
        taskQuery = taskQuery.gte('created_at', dateFilter)
      }

      const { data: tasks, error: taskError } = await taskQuery

      if (taskError) throw taskError

      // 통계 계산
      const totalEmployees = employees?.length || 0
      const activeEmployees = employees?.filter(emp => emp.status === 'active').length || 0

      const byDepartment: Record<string, number> = {}
      const byRole: Record<string, number> = {}
      const byStatus: Record<string, number> = {}

      employees?.forEach(employee => {
        // 부서별 통계
        if (employee.department?.name) {
          byDepartment[employee.department.name] = (byDepartment[employee.department.name] || 0) + 1
        } else {
          byDepartment['미배정'] = (byDepartment['미배정'] || 0) + 1
        }

        // 역할별 통계
        byRole[employee.role] = (byRole[employee.role] || 0) + 1

        // 상태별 통계
        byStatus[employee.status] = (byStatus[employee.status] || 0) + 1
      })

      // 최근 합류한 직원들 (입사일 기준)
      const recentJoins = employees
        ?.filter(emp => emp.hire_date)
        ?.sort((a, b) => new Date(b.hire_date!).getTime() - new Date(a.hire_date!).getTime())
        ?.slice(0, 5) || []

      // 성과 분석 (업무 완료율 기준)
      const employeeTaskStats = new Map<string, { total: number; completed: number }>()

      tasks?.forEach(task => {
        if (task.assignee_id) {
          if (!employeeTaskStats.has(task.assignee_id)) {
            employeeTaskStats.set(task.assignee_id, { total: 0, completed: 0 })
          }
          const stats = employeeTaskStats.get(task.assignee_id)!
          stats.total += 1
          if (task.status === 'completed') {
            stats.completed += 1
          }
        }
      })

      const topPerformers = Array.from(employeeTaskStats.entries())
        .map(([employeeId, taskStats]) => {
          const employee = employees?.find(emp => emp.id === employeeId)
          if (!employee || taskStats.total < 3) return null // 최소 3개 이상의 업무가 있는 경우만

          return {
            employee,
            completedTasks: taskStats.completed,
            completionRate: (taskStats.completed / taskStats.total) * 100
          }
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
        .sort((a, b) => b.completionRate - a.completionRate)
        .slice(0, 5)

      setStats({
        totalEmployees,
        activeEmployees,
        byDepartment,
        byRole,
        byStatus,
        recentJoins,
        topPerformers
      })
    } catch (error) {
      console.error('Error fetching employee stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return '관리자'
      case 'manager': return '매니저'
      case 'employee': return '직원'
      default: return role
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return '활성'
      case 'inactive': return '비활성'
      case 'resigned': return '퇴사'
      default: return status
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-yellow-100 text-yellow-800'
      case 'resigned': return 'bg-red-100 text-red-800'
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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 부서별 분포 */}
        <Card>
          <CardHeader>
            <CardTitle>부서별 직원 분포</CardTitle>
            <CardDescription>각 부서의 직원 수</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(stats.byDepartment).map(([department, count]) => {
              const percentage = stats.totalEmployees > 0 ? (count / stats.totalEmployees) * 100 : 0
              return (
                <div key={department} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{department}</span>
                    <span>{count}명 ({percentage.toFixed(0)}%)</span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* 역할별 분포 */}
        <Card>
          <CardHeader>
            <CardTitle>역할별 분포</CardTitle>
            <CardDescription>직원의 역할별 현황</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(stats.byRole).map(([role, count]) => {
              const percentage = stats.totalEmployees > 0 ? (count / stats.totalEmployees) * 100 : 0
              return (
                <div key={role} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{getRoleLabel(role)}</span>
                  <div className="text-sm">
                    {count}명 ({percentage.toFixed(0)}%)
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* 상태별 분포 */}
        <Card>
          <CardHeader>
            <CardTitle>직원 상태</CardTitle>
            <CardDescription>직원의 근무 상태별 현황</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(stats.byStatus).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <Badge className={getStatusColor(status)}>
                  {getStatusLabel(status)}
                </Badge>
                <span className="text-sm font-medium">{count}명</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* 최근 합류한 직원들 */}
      <Card>
        <CardHeader>
          <CardTitle>최근 합류한 직원</CardTitle>
          <CardDescription>가장 최근에 입사한 직원들</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.recentJoins.map(employee => (
              <div key={employee.id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                <Avatar>
                  <AvatarFallback>
                    {employee.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h4 className="font-medium">{employee.name}</h4>
                  <p className="text-sm text-gray-600">
                    {employee.position || '직책 없음'} • {employee.department?.name || '부서 미배정'}
                  </p>
                </div>
                <div className="text-right">
                  <Badge className={getStatusColor(employee.status)}>
                    {getStatusLabel(employee.status)}
                  </Badge>
                  <p className="text-sm text-gray-500 mt-1">
                    입사: {employee.hire_date ? new Date(employee.hire_date).toLocaleDateString('ko-KR') : '미정'}
                  </p>
                </div>
              </div>
            ))}
            {stats.recentJoins.length === 0 && (
              <p className="text-center text-gray-500 py-4">
                최근 합류한 직원이 없습니다.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 우수 성과자 */}
      <Card>
        <CardHeader>
          <CardTitle>우수 성과자</CardTitle>
          <CardDescription>업무 완료율이 높은 직원들</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.topPerformers.map((performer, index) => (
              <div key={performer.employee.id} className="flex items-center space-x-4 p-3 bg-green-50 rounded-lg">
                <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full">
                  <span className="text-sm font-bold text-green-800">#{index + 1}</span>
                </div>
                <Avatar>
                  <AvatarFallback>
                    {performer.employee.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h4 className="font-medium">{performer.employee.name}</h4>
                  <p className="text-sm text-gray-600">
                    {performer.employee.position || '직책 없음'} • {performer.employee.department?.name || '부서 미배정'}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-green-700">
                    {performer.completionRate.toFixed(0)}%
                  </div>
                  <p className="text-sm text-gray-600">
                    완료: {performer.completedTasks}개
                  </p>
                </div>
              </div>
            ))}
            {stats.topPerformers.length === 0 && (
              <p className="text-center text-gray-500 py-4">
                성과 데이터가 충분하지 않습니다.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}