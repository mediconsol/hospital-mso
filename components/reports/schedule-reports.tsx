'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Database } from '@/lib/database.types'

type Schedule = Database['public']['Tables']['schedule']['Row'] & {
  creator?: { id: string; name: string; email: string } | null
}

interface ScheduleReportsProps {
  organizationId: string
  dateRange: string
}

interface ScheduleStats {
  totalSchedules: number
  upcomingSchedules: number
  pastSchedules: number
  allDaySchedules: number
  byCreator: Record<string, { name: string; count: number }>
  byTimeOfDay: Record<string, number>
  byDayOfWeek: Record<string, number>
  byDuration: Record<string, number>
  busyDays: { date: string; count: number }[]
  recentSchedules: Schedule[]
  longMeetings: Schedule[]
}

export function ScheduleReports({ organizationId, dateRange }: ScheduleReportsProps) {
  const [stats, setStats] = useState<ScheduleStats>({
    totalSchedules: 0,
    upcomingSchedules: 0,
    pastSchedules: 0,
    allDaySchedules: 0,
    byCreator: {},
    byTimeOfDay: {},
    byDayOfWeek: {},
    byDuration: {},
    busyDays: [],
    recentSchedules: [],
    longMeetings: []
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (organizationId) {
      fetchScheduleStats()
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

  const fetchScheduleStats = async () => {
    try {
      setLoading(true)
      const dateFilter = getDateFilter()

      let query = supabase
        .from('schedule')
        .select(`
          *,
          creator:employee!creator_id (
            id,
            name,
            email
          )
        `)
        .eq('hospital_id', organizationId)

      if (dateFilter) {
        query = query.gte('created_at', dateFilter)
      }

      const { data: schedules, error } = await query

      if (error) throw error

      // 통계 계산
      const now = new Date()
      const totalSchedules = schedules?.length || 0
      
      let upcomingSchedules = 0
      let pastSchedules = 0
      let allDaySchedules = 0

      const byCreator: Record<string, { name: string; count: number }> = {}
      const byTimeOfDay: Record<string, number> = {
        '오전 (06-12)': 0,
        '오후 (12-18)': 0,
        '저녁 (18-24)': 0,
        '새벽 (00-06)': 0
      }
      const byDayOfWeek: Record<string, number> = {
        '월요일': 0,
        '화요일': 0,
        '수요일': 0,
        '목요일': 0,
        '금요일': 0,
        '토요일': 0,
        '일요일': 0
      }
      const byDuration: Record<string, number> = {
        '30분 이하': 0,
        '1시간 이하': 0,
        '2시간 이하': 0,
        '반나절 (4시간 이하)': 0,
        '종일': 0
      }

      const dayScheduleCount: Record<string, number> = {}

      schedules?.forEach(schedule => {
        const startTime = new Date(schedule.start_time)
        const endTime = new Date(schedule.end_time)

        // 시간대별 분류
        if (startTime > now) upcomingSchedules++
        else pastSchedules++

        if (Boolean(schedule.is_all_day)) allDaySchedules++

        // 생성자별 통계
        if (schedule.creator) {
          if (!byCreator[schedule.creator.id]) {
            byCreator[schedule.creator.id] = {
              name: schedule.creator.name,
              count: 0
            }
          }
          byCreator[schedule.creator.id].count++
        }

        // 하루 중 시간대별 분포
        const hour = startTime.getHours()
        if (hour >= 0 && hour < 6) byTimeOfDay['새벽 (00-06)']++
        else if (hour >= 6 && hour < 12) byTimeOfDay['오전 (06-12)']++
        else if (hour >= 12 && hour < 18) byTimeOfDay['오후 (12-18)']++
        else byTimeOfDay['저녁 (18-24)']++

        // 요일별 분포
        const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']
        const dayOfWeek = dayNames[startTime.getDay()]
        byDayOfWeek[dayOfWeek]++

        // 일별 일정 수 카운트
        const dateKey = startTime.toISOString().split('T')[0]
        dayScheduleCount[dateKey] = (dayScheduleCount[dateKey] || 0) + 1

        // 일정 길이별 분포
        const durationMs = endTime.getTime() - startTime.getTime()
        const durationHours = durationMs / (1000 * 60 * 60)

        if (Boolean(schedule.is_all_day) || durationHours >= 8) {
          byDuration['종일']++
        } else if (durationHours <= 0.5) {
          byDuration['30분 이하']++
        } else if (durationHours <= 1) {
          byDuration['1시간 이하']++
        } else if (durationHours <= 2) {
          byDuration['2시간 이하']++
        } else {
          byDuration['반나절 (4시간 이하)']++
        }
      })

      // 바쁜 날들 (일정이 많은 날)
      const busyDays = Object.entries(dayScheduleCount)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

      // 최근 일정들
      const recentSchedules = schedules
        ?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        ?.slice(0, 10) || []

      // 긴 회의들 (2시간 이상)
      const longMeetings = schedules
        ?.filter(schedule => {
          if (Boolean(schedule.is_all_day)) return true
          const duration = new Date(schedule.end_time).getTime() - new Date(schedule.start_time).getTime()
          return duration >= 2 * 60 * 60 * 1000 // 2시간 이상
        })
        ?.sort((a, b) => {
          const durationA = new Date(a.end_time).getTime() - new Date(a.start_time).getTime()
          const durationB = new Date(b.end_time).getTime() - new Date(b.start_time).getTime()
          return durationB - durationA
        })
        ?.slice(0, 10) || []

      setStats({
        totalSchedules,
        upcomingSchedules,
        pastSchedules,
        allDaySchedules,
        byCreator,
        byTimeOfDay,
        byDayOfWeek,
        byDuration,
        busyDays,
        recentSchedules,
        longMeetings
      })
    } catch (error) {
      console.error('Error fetching schedule stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDuration = (startTime: string, endTime: string, isAllDay: boolean) => {
    if (isAllDay) return '종일'
    
    const start = new Date(startTime)
    const end = new Date(endTime)
    const durationMs = end.getTime() - start.getTime()
    const hours = Math.floor(durationMs / (1000 * 60 * 60))
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours === 0) return `${minutes}분`
    if (minutes === 0) return `${hours}시간`
    return `${hours}시간 ${minutes}분`
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 기본 통계 카드들 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">전체 일정</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSchedules}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">예정된 일정</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.upcomingSchedules}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">지난 일정</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.pastSchedules}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">종일 일정</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.allDaySchedules}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 시간대별 분포 */}
        <Card>
          <CardHeader>
            <CardTitle>시간대별 일정 분포</CardTitle>
            <CardDescription>하루 중 언제 일정이 많은지 확인</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(stats.byTimeOfDay).map(([timeSlot, count]) => {
              const percentage = stats.totalSchedules > 0 ? (count / stats.totalSchedules) * 100 : 0
              return (
                <div key={timeSlot} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{timeSlot}</span>
                    <span>{count}개 ({percentage.toFixed(0)}%)</span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* 요일별 분포 */}
        <Card>
          <CardHeader>
            <CardTitle>요일별 일정 분포</CardTitle>
            <CardDescription>어느 요일에 일정이 집중되는지 확인</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(stats.byDayOfWeek).map(([day, count]) => {
              const percentage = stats.totalSchedules > 0 ? (count / stats.totalSchedules) * 100 : 0
              return (
                <div key={day} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{day}</span>
                    <span>{count}개 ({percentage.toFixed(0)}%)</span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      {/* 일정 길이별 분포 */}
      <Card>
        <CardHeader>
          <CardTitle>일정 길이별 분포</CardTitle>
          <CardDescription>회의나 일정의 지속 시간 분석</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(stats.byDuration).map(([duration, count]) => (
              <div key={duration} className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{count}</div>
                <div className="text-sm text-gray-600 mt-1">{duration}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 활발한 일정 생성자 */}
      <Card>
        <CardHeader>
          <CardTitle>활발한 일정 생성자</CardTitle>
          <CardDescription>일정을 많이 만든 직원들</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(stats.byCreator)
              .sort(([,a], [,b]) => b.count - a.count)
              .slice(0, 10)
              .map(([creatorId, data], index) => (
                <div key={creatorId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-purple-100 rounded-full">
                      <span className="text-sm font-bold text-purple-800">#{index + 1}</span>
                    </div>
                    <span className="font-medium">{data.name}</span>
                  </div>
                  <Badge variant="outline">
                    {data.count}개
                  </Badge>
                </div>
              ))}
            {Object.keys(stats.byCreator).length === 0 && (
              <p className="text-center text-gray-500 py-4">
                일정 데이터가 없습니다.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 바쁜 날들 */}
      {stats.busyDays.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>바쁜 날들</CardTitle>
            <CardDescription>하루에 일정이 많았던 날들</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.busyDays.map(({ date, count }) => (
                <div key={date} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <div>
                    <div className="font-medium">
                      {new Date(date).toLocaleDateString('ko-KR', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric', 
                        weekday: 'short' 
                      })}
                    </div>
                  </div>
                  <Badge className="bg-orange-100 text-orange-800">
                    {count}개 일정
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 긴 회의들 */}
      {stats.longMeetings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>장시간 회의</CardTitle>
            <CardDescription>2시간 이상 지속된 회의나 일정들</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.longMeetings.map(meeting => (
                <div key={meeting.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">{meeting.title}</h4>
                    <p className="text-sm text-gray-600">
                      생성자: {meeting.creator?.name || '알 수 없음'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(meeting.start_time).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline">
                      {formatDuration(meeting.start_time, meeting.end_time, Boolean(meeting.is_all_day))}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}