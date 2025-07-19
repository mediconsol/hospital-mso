'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, MapPin, Users, TrendingUp, AlertCircle } from 'lucide-react'
import { Database } from '@/lib/database.types'

type Schedule = Database['public']['Tables']['schedule']['Row']

interface ScheduleStatsProps {
  schedules: Schedule[]
}

export function ScheduleStats({ schedules }: ScheduleStatsProps) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay())
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)

  const totalSchedules = schedules.length
  
  // 오늘 일정
  const todaySchedules = schedules.filter(schedule => {
    const scheduleDate = new Date(schedule.start_time)
    return scheduleDate >= today && scheduleDate < tomorrow
  }).length

  // 이번 주 일정
  const weekSchedules = schedules.filter(schedule => {
    const scheduleDate = new Date(schedule.start_time)
    return scheduleDate >= weekStart && scheduleDate <= weekEnd
  }).length

  // 예정된 일정
  const upcomingSchedules = schedules.filter(schedule => {
    const scheduleDate = new Date(schedule.start_time)
    return scheduleDate >= now
  }).length

  // 종일 일정
  const allDaySchedules = schedules.filter(schedule => schedule.is_all_day).length

  // 장소가 있는 일정
  const schedulesWithLocation = schedules.filter(schedule => schedule.location).length

  // 참가자가 있는 일정
  const schedulesWithParticipants = schedules.filter(schedule => {
    return schedule.participants && Array.isArray(schedule.participants) && schedule.participants.length > 0
  }).length

  // 진행 중인 일정
  const ongoingSchedules = schedules.filter(schedule => {
    const startTime = new Date(schedule.start_time)
    const endTime = new Date(schedule.end_time)
    return startTime <= now && endTime >= now
  }).length

  const stats = [
    {
      title: '전체 일정',
      value: totalSchedules,
      description: '등록된 전체 일정',
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: '오늘 일정',
      value: todaySchedules,
      description: '오늘 예정된 일정',
      icon: Clock,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: '이번 주',
      value: weekSchedules,
      description: '이번 주 전체 일정',
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: '예정된 일정',
      value: upcomingSchedules,
      description: '앞으로 예정된 일정',
      icon: AlertCircle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
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

      {/* 일정 유형별 분포 */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm font-medium">일정 유형별 분포</CardTitle>
          <CardDescription>일정의 특성별 현황</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full" />
                <span className="text-sm">종일 일정</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{allDaySchedules}</Badge>
                <span className="text-xs text-gray-500">
                  ({totalSchedules > 0 ? Math.round((allDaySchedules / totalSchedules) * 100) : 0}%)
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full" />
                <span className="text-sm">장소 지정</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{schedulesWithLocation}</Badge>
                <span className="text-xs text-gray-500">
                  ({totalSchedules > 0 ? Math.round((schedulesWithLocation / totalSchedules) * 100) : 0}%)
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full" />
                <span className="text-sm">참가자 있음</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{schedulesWithParticipants}</Badge>
                <span className="text-xs text-gray-500">
                  ({totalSchedules > 0 ? Math.round((schedulesWithParticipants / totalSchedules) * 100) : 0}%)
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full" />
                <span className="text-sm">진행 중</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{ongoingSchedules}</Badge>
                <span className="text-xs text-gray-500">
                  ({totalSchedules > 0 ? Math.round((ongoingSchedules / totalSchedules) * 100) : 0}%)
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 일정 활동 현황 */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm font-medium">일정 활동 현황</CardTitle>
          <CardDescription>시간대별 일정 분포</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* 시간대별 분포 */}
            {(() => {
              const timeSlots = {
                '오전 (06:00-12:00)': 0,
                '오후 (12:00-18:00)': 0,
                '저녁 (18:00-24:00)': 0,
                '새벽 (00:00-06:00)': 0,
              }

              schedules.forEach(schedule => {
                if (!schedule.is_all_day) {
                  const hour = new Date(schedule.start_time).getHours()
                  if (hour >= 6 && hour < 12) {
                    timeSlots['오전 (06:00-12:00)']++
                  } else if (hour >= 12 && hour < 18) {
                    timeSlots['오후 (12:00-18:00)']++
                  } else if (hour >= 18 && hour < 24) {
                    timeSlots['저녁 (18:00-24:00)']++
                  } else {
                    timeSlots['새벽 (00:00-06:00)']++
                  }
                }
              })

              const colors = ['bg-yellow-500', 'bg-blue-500', 'bg-purple-500', 'bg-gray-500']
              
              return Object.entries(timeSlots).map(([timeSlot, count], index) => (
                <div key={timeSlot} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 ${colors[index]} rounded-full`} />
                    <span className="text-sm">{timeSlot}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{count}</Badge>
                    <span className="text-xs text-gray-500">
                      ({totalSchedules > 0 ? Math.round((count / totalSchedules) * 100) : 0}%)
                    </span>
                  </div>
                </div>
              ))
            })()}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}