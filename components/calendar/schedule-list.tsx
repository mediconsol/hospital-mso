'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  Edit, 
  Trash2, 
  MoreVertical, 
  Calendar, 
  Clock, 
  MapPin, 
  Users,
  User,
  AlertCircle
} from 'lucide-react'
import { Database } from '@/lib/database.types'

type Schedule = Database['public']['Tables']['schedule']['Row'] & {
  creator?: { id: string; name: string; email: string } | null
  participant_details?: { id: string; name: string; email: string }[]
}
type Employee = Database['public']['Tables']['employee']['Row']
type Department = Database['public']['Tables']['department']['Row']

interface ScheduleListProps {
  schedules: Schedule[]
  employees: Employee[]
  departments: Department[]
  onEdit: (schedule: Schedule) => void
  onDelete: (scheduleId: string) => void
  isManager?: boolean
}

export function ScheduleList({ 
  schedules, 
  employees, 
  departments, 
  onEdit, 
  onDelete,
  isManager = false 
}: ScheduleListProps) {
  
  const getInitials = (name: string) => {
    return name.split('').slice(0, 2).join('').toUpperCase()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (schedule: Schedule) => {
    const now = new Date()
    const startTime = new Date(schedule.start_time)
    const endTime = new Date(schedule.end_time)

    if (endTime < now) {
      return <Badge variant="secondary" className="bg-gray-100 text-gray-600">완료</Badge>
    } else if (startTime <= now && endTime >= now) {
      return <Badge className="bg-green-100 text-green-800">진행중</Badge>
    } else if (startTime > now) {
      return <Badge className="bg-blue-100 text-blue-800">예정</Badge>
    }
    return null
  }

  const isUpcoming = (schedule: Schedule) => {
    const now = new Date()
    const startTime = new Date(schedule.start_time)
    const diffHours = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60)
    return diffHours <= 24 && diffHours > 0
  }

  if (schedules.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 text-lg">일정이 없습니다</p>
        <p className="text-sm text-gray-400 mt-2">
          새로운 일정을 추가하거나 필터를 조정해보세요
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 데스크톱 뷰 */}
      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">일정</th>
                <th className="text-left py-3 px-4">일시</th>
                <th className="text-left py-3 px-4">장소</th>
                <th className="text-left py-3 px-4">생성자</th>
                <th className="text-left py-3 px-4">참가자</th>
                <th className="text-left py-3 px-4">상태</th>
                <th className="text-right py-3 px-4">작업</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map((schedule) => (
                <tr key={schedule.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="max-w-xs">
                      <div className="flex items-center gap-2">
                        <div className="font-medium text-sm">{schedule.title}</div>
                        {isUpcoming(schedule) && (
                          <AlertCircle className="h-4 w-4 text-orange-500" />
                        )}
                      </div>
                      {schedule.description && (
                        <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {schedule.description}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-sm">
                      <div className="font-medium">
                        {formatDate(schedule.start_time)}
                        {schedule.start_time !== schedule.end_time && 
                         formatDate(schedule.start_time) !== formatDate(schedule.end_time) && (
                          <span> ~ {formatDate(schedule.end_time)}</span>
                        )}
                      </div>
                      <div className="text-gray-500">
                        {schedule.is_all_day ? '종일' : `${formatTime(schedule.start_time)} - ${formatTime(schedule.end_time)}`}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm">
                      {schedule.location || '장소 없음'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {schedule.creator ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src="" alt={schedule.creator.name} />
                          <AvatarFallback className="text-xs">
                            {getInitials(schedule.creator.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{schedule.creator.name}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">알 수 없음</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">
                        {schedule.participant_details?.length || 0}명
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {getStatusBadge(schedule)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {isManager && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit(schedule)}>
                            <Edit className="h-4 w-4 mr-2" />
                            수정
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => onDelete(schedule.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            삭제
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 모바일 뷰 */}
      <div className="md:hidden space-y-4">
        {schedules.map((schedule) => (
          <div key={schedule.id} className="border rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className="font-medium text-sm">{schedule.title}</div>
                  {isUpcoming(schedule) && (
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                  )}
                  {getStatusBadge(schedule)}
                </div>
                {schedule.description && (
                  <div className="text-xs text-gray-500 mb-2 line-clamp-2">
                    {schedule.description}
                  </div>
                )}
              </div>
              {isManager && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(schedule)}>
                      <Edit className="h-4 w-4 mr-2" />
                      수정
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onDelete(schedule.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      삭제
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span>
                  {formatDate(schedule.start_time)}
                  {schedule.start_time !== schedule.end_time && 
                   formatDate(schedule.start_time) !== formatDate(schedule.end_time) && (
                    <span> ~ {formatDate(schedule.end_time)}</span>
                  )}
                </span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-gray-400" />
                <span>
                  {schedule.is_all_day ? '종일' : `${formatTime(schedule.start_time)} - ${formatTime(schedule.end_time)}`}
                </span>
              </div>
              
              {schedule.location && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span>{schedule.location}</span>
                </div>
              )}
              
              {schedule.creator && (
                <div className="flex items-center gap-2 text-sm">
                  <Avatar className="h-4 w-4">
                    <AvatarImage src="" alt={schedule.creator.name} />
                    <AvatarFallback className="text-xs">
                      {getInitials(schedule.creator.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span>생성자: {schedule.creator.name}</span>
                </div>
              )}
              
              {schedule.participant_details && schedule.participant_details.length > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-gray-400" />
                  <span>{schedule.participant_details.length}명 참가</span>
                  <div className="flex -space-x-1 ml-2">
                    {schedule.participant_details.slice(0, 3).map((participant) => (
                      <Avatar key={participant.id} className="h-6 w-6 border border-white">
                        <AvatarImage src="" alt={participant.name} />
                        <AvatarFallback className="text-xs">
                          {getInitials(participant.name)}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {schedule.participant_details.length > 3 && (
                      <div className="h-6 w-6 rounded-full bg-gray-100 border border-white flex items-center justify-center">
                        <span className="text-xs text-gray-600">
                          +{schedule.participant_details.length - 3}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}