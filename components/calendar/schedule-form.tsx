'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { X, Calendar, Plus, Edit, Clock, MapPin, Users } from 'lucide-react'
import { Database } from '@/lib/database.types'

type Schedule = Database['public']['Tables']['schedule']['Row']
type Employee = Database['public']['Tables']['employee']['Row']
type Department = Database['public']['Tables']['department']['Row']

const scheduleSchema = z.object({
  title: z.string().min(1, '제목은 필수입니다'),
  description: z.string().optional(),
  start_time: z.string().min(1, '시작 시간은 필수입니다'),
  end_time: z.string().min(1, '종료 시간은 필수입니다'),
  location: z.string().optional(),
  is_all_day: z.boolean(),
  participants: z.array(z.string()),
}).refine(data => {
  const startTime = new Date(data.start_time)
  const endTime = new Date(data.end_time)
  return startTime < endTime
}, {
  message: '종료 시간은 시작 시간보다 늦어야 합니다',
  path: ['end_time']
})

type ScheduleFormData = z.infer<typeof scheduleSchema>

interface ScheduleFormProps {
  schedule?: Schedule | null
  hospitalId: string
  employees: Employee[]
  departments: Department[]
  currentUserId: string
  initialDate?: Date
  onClose: () => void
  onSaved: () => void
}

export function ScheduleForm({ 
  schedule, 
  hospitalId, 
  employees, 
  departments, 
  currentUserId, 
  initialDate,
  onClose, 
  onSaved 
}: ScheduleFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(
    schedule?.participants as string[] || []
  )
  const supabase = createClient()

  const getDefaultDateTime = (date: Date, isEnd: boolean = false) => {
    const newDate = new Date(date)
    if (isEnd) {
      newDate.setHours(newDate.getHours() + 1)
    }
    return newDate.toISOString().slice(0, 16)
  }

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      title: schedule?.title || '',
      description: schedule?.description || '',
      start_time: schedule?.start_time ? new Date(schedule.start_time).toISOString().slice(0, 16) : 
                  (initialDate ? getDefaultDateTime(initialDate) : ''),
      end_time: schedule?.end_time ? new Date(schedule.end_time).toISOString().slice(0, 16) : 
                (initialDate ? getDefaultDateTime(initialDate, true) : ''),
      location: schedule?.location || '',
      is_all_day: Boolean(schedule?.is_all_day),
      participants: (schedule?.participants as string[]) || [],
    },
  })

  const watchedIsAllDay = watch('is_all_day')
  const watchedStartTime = watch('start_time')

  const onSubmit = async (data: ScheduleFormData) => {
    setIsLoading(true)
    setError(null)

    try {
      let startTime = new Date(data.start_time)
      let endTime = new Date(data.end_time)

      // 종일 일정의 경우 시간 조정
      if (data.is_all_day) {
        startTime.setHours(0, 0, 0, 0)
        endTime.setHours(23, 59, 59, 999)
      }

      const formData = {
        title: data.title,
        description: data.description || null,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        location: data.location || null,
        is_all_day: data.is_all_day,
        hospital_id: hospitalId,
        creator_id: currentUserId,
        participants: selectedParticipants,
      }

      if (schedule) {
        // 수정
        const { error } = await supabase
          .from('schedule')
          .update(formData)
          .eq('id', schedule.id)

        if (error) throw error
      } else {
        // 새로 생성
        const { error } = await supabase
          .from('schedule')
          .insert([formData])

        if (error) throw error
      }

      onSaved()
    } catch (err: any) {
      setError(err.message || '일정 저장 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleParticipantToggle = (employeeId: string) => {
    setSelectedParticipants(prev => {
      const newParticipants = prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
      
      setValue('participants', newParticipants)
      return newParticipants
    })
  }

  const handleAllDayToggle = (checked: boolean) => {
    setValue('is_all_day', checked)
    
    if (checked && watchedStartTime) {
      // 종일 일정으로 변경 시 시간 조정
      const startDate = new Date(watchedStartTime)
      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + 1)
      endDate.setHours(0, 0, 0, 0)
      
      setValue('start_time', startDate.toISOString().slice(0, 10) + 'T00:00')
      setValue('end_time', endDate.toISOString().slice(0, 10) + 'T00:00')
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {schedule ? <Edit className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                {schedule ? '일정 수정' : '새 일정 생성'}
              </CardTitle>
              <CardDescription>
                일정의 상세 정보를 입력하세요
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* 제목 */}
            <div className="space-y-2">
              <Label htmlFor="title">제목 *</Label>
              <Input
                id="title"
                {...register('title')}
                placeholder="일정 제목을 입력하세요"
                disabled={isLoading}
              />
              {errors.title && (
                <p className="text-sm text-red-600">{errors.title.message}</p>
              )}
            </div>

            {/* 설명 */}
            <div className="space-y-2">
              <Label htmlFor="description">설명</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="일정에 대한 상세한 설명을 입력하세요"
                disabled={isLoading}
                rows={3}
              />
            </div>

            {/* 종일 일정 체크박스 */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_all_day"
                checked={watchedIsAllDay}
                onCheckedChange={handleAllDayToggle}
                disabled={isLoading}
              />
              <Label htmlFor="is_all_day" className="text-sm">
                종일 일정
              </Label>
            </div>

            {/* 시간 설정 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_time">시작 {watchedIsAllDay ? '날짜' : '시간'} *</Label>
                <Input
                  id="start_time"
                  type={watchedIsAllDay ? 'date' : 'datetime-local'}
                  {...register('start_time')}
                  disabled={isLoading}
                />
                {errors.start_time && (
                  <p className="text-sm text-red-600">{errors.start_time.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_time">종료 {watchedIsAllDay ? '날짜' : '시간'} *</Label>
                <Input
                  id="end_time"
                  type={watchedIsAllDay ? 'date' : 'datetime-local'}
                  {...register('end_time')}
                  disabled={isLoading}
                />
                {errors.end_time && (
                  <p className="text-sm text-red-600">{errors.end_time.message}</p>
                )}
              </div>
            </div>

            {/* 장소 */}
            <div className="space-y-2">
              <Label htmlFor="location">장소</Label>
              <Input
                id="location"
                {...register('location')}
                placeholder="회의실, 병원 등 장소를 입력하세요"
                disabled={isLoading}
              />
            </div>

            {/* 참가자 선택 */}
            <div className="space-y-3">
              <Label>참가자 선택</Label>
              <div className="border rounded-lg p-4 max-h-60 overflow-y-auto">
                <div className="space-y-2">
                  {employees.length === 0 ? (
                    <p className="text-sm text-gray-500">등록된 직원이 없습니다.</p>
                  ) : (
                    employees.map((employee) => (
                      <div key={employee.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`participant_${employee.id}`}
                          checked={selectedParticipants.includes(employee.id)}
                          onCheckedChange={() => handleParticipantToggle(employee.id)}
                          disabled={isLoading}
                        />
                        <Label 
                          htmlFor={`participant_${employee.id}`} 
                          className="text-sm font-normal cursor-pointer"
                        >
                          {employee.name}
                          {employee.position && ` (${employee.position})`}
                          {employee.department_id && (
                            <span className="text-gray-500 ml-2">
                              - {departments.find(d => d.id === employee.department_id)?.name}
                            </span>
                          )}
                        </Label>
                      </div>
                    ))
                  )}
                </div>
              </div>
              {selectedParticipants.length > 0 && (
                <p className="text-sm text-gray-600">
                  {selectedParticipants.length}명이 선택되었습니다.
                </p>
              )}
            </div>

            {/* 일정 미리보기 */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">미리보기</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span>
                    {watchedIsAllDay ? '종일' : 
                     `${watch('start_time') ? new Date(watch('start_time')).toLocaleString('ko-KR') : '시작시간'} - ${
                       watch('end_time') ? new Date(watch('end_time')).toLocaleString('ko-KR') : '종료시간'
                     }`}
                  </span>
                </div>
                {watch('location') && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span>{watch('location')}</span>
                  </div>
                )}
                {selectedParticipants.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-500" />
                    <span>{selectedParticipants.length}명 참가</span>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                취소
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? '저장 중...' : schedule ? '수정' : '생성'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}