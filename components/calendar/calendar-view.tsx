'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Clock, 
  MapPin, 
  Users,
  Edit,
  Trash2,
  MoreVertical
} from 'lucide-react'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Database } from '@/lib/database.types'

type Schedule = Database['public']['Tables']['schedule']['Row'] & {
  creator?: { id: string; name: string; email: string } | null
  participant_details?: { id: string; name: string; email: string }[]
}

interface CalendarViewProps {
  schedules: Schedule[]
  selectedDate: Date
  onDateSelect: (date: Date) => void
  onScheduleClick: (schedule: Schedule) => void
  onScheduleDelete: (scheduleId: string) => void
}

export function CalendarView({ 
  schedules, 
  selectedDate, 
  onDateSelect, 
  onScheduleClick, 
  onScheduleDelete 
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(selectedDate)
  const [viewType, setViewType] = useState<'month' | 'week' | 'day'>('month')

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()
    
    const days = []
    
    // 이전 달의 마지막 날들
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const prevDate = new Date(year, month, -i)
      days.push({
        date: prevDate,
        isCurrentMonth: false,
        isToday: false,
        isSelected: false
      })
    }
    
    // 현재 달의 날들
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDay = new Date(year, month, day)
      const today = new Date()
      days.push({
        date: currentDay,
        isCurrentMonth: true,
        isToday: currentDay.toDateString() === today.toDateString(),
        isSelected: currentDay.toDateString() === selectedDate.toDateString()
      })
    }
    
    // 다음 달의 첫 날들 (42일 맞추기)
    const remainingDays = 42 - days.length
    for (let day = 1; day <= remainingDays; day++) {
      const nextDate = new Date(year, month + 1, day)
      days.push({
        date: nextDate,
        isCurrentMonth: false,
        isToday: false,
        isSelected: false
      })
    }
    
    return days
  }

  const getSchedulesForDate = (date: Date) => {
    return schedules.filter(schedule => {
      const scheduleDate = new Date(schedule.start_time)
      return scheduleDate.toDateString() === date.toDateString()
    })
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long'
    })
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1))
    setCurrentDate(newDate)
  }

  const goToToday = () => {
    const today = new Date()
    setCurrentDate(today)
    onDateSelect(today)
  }

  const days = getDaysInMonth(currentDate)
  const weekDays = ['일', '월', '화', '수', '목', '금', '토']

  const ScheduleItem = ({ schedule }: { schedule: Schedule }) => {
    const isAllDay = schedule.is_all_day
    const startTime = formatTime(schedule.start_time)
    const endTime = formatTime(schedule.end_time)
    
    return (
      <div 
        className="group p-2 mb-1 bg-blue-50 border border-blue-200 rounded text-xs cursor-pointer hover:bg-blue-100 relative"
        onClick={(e) => {
          e.stopPropagation()
          onScheduleClick(schedule)
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{schedule.title}</div>
            <div className="flex items-center gap-2 text-gray-600">
              {!isAllDay && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{startTime} - {endTime}</span>
                </div>
              )}
              {schedule.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate">{schedule.location}</span>
                </div>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onScheduleClick(schedule)}>
                <Edit className="h-4 w-4 mr-2" />
                수정
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onScheduleDelete(schedule.id)}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 캘린더 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-xl font-semibold min-w-[200px] text-center">
              {formatDate(currentDate)}
            </h2>
            <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={goToToday}>
            오늘
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={viewType === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewType('month')}
          >
            월
          </Button>
          <Button
            variant={viewType === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewType('week')}
          >
            주
          </Button>
          <Button
            variant={viewType === 'day' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewType('day')}
          >
            일
          </Button>
        </div>
      </div>

      {/* 캘린더 본문 */}
      <Card>
        <CardContent className="p-0">
          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 border-b">
            {weekDays.map((day) => (
              <div key={day} className="p-4 text-center font-medium bg-gray-50 border-r last:border-r-0">
                {day}
              </div>
            ))}
          </div>

          {/* 날짜 그리드 */}
          <div className="grid grid-cols-7">
            {days.map((day, index) => {
              const daySchedules = getSchedulesForDate(day.date)
              const hasSchedules = daySchedules.length > 0
              
              return (
                <div
                  key={index}
                  className={`min-h-[120px] p-2 border-r border-b last:border-r-0 cursor-pointer hover:bg-gray-50 ${
                    !day.isCurrentMonth ? 'bg-gray-50 text-gray-400' : ''
                  } ${
                    day.isToday ? 'bg-blue-50 border-blue-200' : ''
                  } ${
                    day.isSelected ? 'bg-blue-100 border-blue-300' : ''
                  }`}
                  onClick={() => onDateSelect(day.date)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-medium ${
                      day.isToday ? 'text-blue-600' : day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                    }`}>
                      {day.date.getDate()}
                    </span>
                    {hasSchedules && (
                      <Badge variant="secondary" className="text-xs">
                        {daySchedules.length}
                      </Badge>
                    )}
                  </div>
                  
                  {/* 일정 목록 */}
                  <div className="space-y-1">
                    {daySchedules.slice(0, 3).map((schedule) => (
                      <ScheduleItem key={schedule.id} schedule={schedule} />
                    ))}
                    {daySchedules.length > 3 && (
                      <div className="text-xs text-gray-500 text-center py-1">
                        +{daySchedules.length - 3} 더보기
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* 선택된 날짜의 일정 상세 */}
      {selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {selectedDate.toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long'
              })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {getSchedulesForDate(selectedDate).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>이 날에는 일정이 없습니다.</p>
                <p className="text-sm mt-2">새로운 일정을 추가해보세요.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {getSchedulesForDate(selectedDate).map((schedule) => (
                  <div key={schedule.id} className="p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-lg">{schedule.title}</h3>
                        {schedule.description && (
                          <p className="text-gray-600 mt-1">{schedule.description}</p>
                        )}
                        
                        <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>
                              {schedule.is_all_day ? '종일' : `${formatTime(schedule.start_time)} - ${formatTime(schedule.end_time)}`}
                            </span>
                          </div>
                          
                          {schedule.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              <span>{schedule.location}</span>
                            </div>
                          )}
                          
                          {schedule.participant_details && schedule.participant_details.length > 0 && (
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              <span>{schedule.participant_details.length}명</span>
                            </div>
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
                          <DropdownMenuItem onClick={() => onScheduleClick(schedule)}>
                            <Edit className="h-4 w-4 mr-2" />
                            수정
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => onScheduleDelete(schedule.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            삭제
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}