'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ClipboardList, Clock, CheckCircle, XCircle, AlertCircle, TrendingUp } from 'lucide-react'
import { Database } from '@/lib/database.types'

type Task = Database['public']['Tables']['task']['Row']

interface TaskStatsProps {
  tasks: Task[]
}

export function TaskStats({ tasks }: TaskStatsProps) {
  const totalTasks = tasks.length
  const pendingTasks = tasks.filter(task => task.status === 'pending').length
  const inProgressTasks = tasks.filter(task => task.status === 'in_progress').length
  const completedTasks = tasks.filter(task => task.status === 'completed').length
  const cancelledTasks = tasks.filter(task => task.status === 'cancelled').length
  
  const urgentTasks = tasks.filter(task => task.priority === 'urgent').length
  const highPriorityTasks = tasks.filter(task => task.priority === 'high').length
  const overdueTasks = tasks.filter(task => {
    if (!task.due_date) return false
    return new Date(task.due_date) < new Date() && task.status !== 'completed'
  }).length

  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  const stats = [
    {
      title: '전체 업무',
      value: totalTasks,
      description: '등록된 전체 업무',
      icon: ClipboardList,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: '대기중',
      value: pendingTasks,
      description: '시작되지 않은 업무',
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
    {
      title: '진행중',
      value: inProgressTasks,
      description: '현재 진행중인 업무',
      icon: TrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: '완료',
      value: completedTasks,
      description: '완료된 업무',
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
  ]

  const priorityStats = [
    {
      title: '긴급',
      value: urgentTasks,
      color: 'bg-red-100 text-red-800',
    },
    {
      title: '높음',
      value: highPriorityTasks,
      color: 'bg-orange-100 text-orange-800',
    },
    {
      title: '지연',
      value: overdueTasks,
      color: 'bg-purple-100 text-purple-800',
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

      {/* 완료율 카드 */}
      <Card className="md:col-span-2 lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-sm font-medium">완료율</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{completionRate}%</div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div 
              className="bg-green-600 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${completionRate}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {completedTasks}/{totalTasks} 완료
          </p>
        </CardContent>
      </Card>

      {/* 우선순위 및 지연 업무 */}
      <Card className="md:col-span-2 lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-sm font-medium">주요 지표</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {priorityStats.map((stat) => (
              <div key={stat.title} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{stat.title}</span>
                <Badge className={stat.color}>
                  {stat.value}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 상태별 분포 */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm font-medium">상태별 분포</CardTitle>
          <CardDescription>업무 상태별 현황</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                <span className="text-sm">대기중</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{pendingTasks}</span>
                <span className="text-xs text-gray-500">
                  ({totalTasks > 0 ? Math.round((pendingTasks / totalTasks) * 100) : 0}%)
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full" />
                <span className="text-sm">진행중</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{inProgressTasks}</span>
                <span className="text-xs text-gray-500">
                  ({totalTasks > 0 ? Math.round((inProgressTasks / totalTasks) * 100) : 0}%)
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full" />
                <span className="text-sm">완료</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{completedTasks}</span>
                <span className="text-xs text-gray-500">
                  ({totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%)
                </span>
              </div>
            </div>
            
            {cancelledTasks > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full" />
                  <span className="text-sm">취소</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{cancelledTasks}</span>
                  <span className="text-xs text-gray-500">
                    ({totalTasks > 0 ? Math.round((cancelledTasks / totalTasks) * 100) : 0}%)
                  </span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}