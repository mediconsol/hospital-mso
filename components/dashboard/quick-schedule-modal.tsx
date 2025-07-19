'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { createClient } from '@/lib/supabase'
import { getCurrentEmployee } from '@/lib/auth-helpers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { X, CalendarPlus, Zap, Clock, MapPin } from 'lucide-react'

const quickScheduleSchema = z.object({
  title: z.string().min(1, '제목은 필수입니다'),
  description: z.string().optional(),
  start_time: z.string().min(1, '시작 시간은 필수입니다'),
  end_time: z.string().min(1, '종료 시간은 필수입니다'),
  location: z.string().optional(),
  is_all_day: z.boolean(),
}).refine(data => {
  if (data.is_all_day) return true
  const startTime = new Date(data.start_time)
  const endTime = new Date(data.end_time)
  return startTime < endTime
}, {
  message: '종료 시간은 시작 시간보다 늦어야 합니다',
  path: ['end_time']
})

type QuickScheduleFormData = z.infer<typeof quickScheduleSchema>

interface QuickScheduleModalProps {
  onClose: () => void
  onSaved: () => void
}

export function QuickScheduleModal({ onClose, onSaved }: QuickScheduleModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const currentTime = today.toTimeString().slice(0, 5)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<QuickScheduleFormData>({
    resolver: zodResolver(quickScheduleSchema),
    defaultValues: {
      start_time: `${todayStr}T${currentTime}`,
      end_time: `${todayStr}T${currentTime}`,
      is_all_day: false,
    },
  })

  const watchedIsAllDay = watch('is_all_day')
  const watchedStartTime = watch('start_time')

  const onSubmit = async (data: QuickScheduleFormData) => {
    setIsLoading(true)
    setError(null)

    try {
      const currentEmployee = await getCurrentEmployee()
      if (!currentEmployee) {
        throw new Error('직원 정보를 찾을 수 없습니다')
      }

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
        hospital_id: currentEmployee.hospital_id,
        creator_id: currentEmployee.id,
        participants: [currentEmployee.id], // 자신을 참가자로 추가
      }

      const { error } = await supabase
        .from('schedule')
        .insert([formData])

      if (error) throw error

      onSaved()
    } catch (err: any) {
      setError(err.message || '일정 생성 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  // 시작 시간이 변경되면 종료 시간을 1시간 후로 자동 설정
  const handleStartTimeChange = (value: string) => {
    setValue('start_time', value)
    if (!watchedIsAllDay && value) {
      const startTime = new Date(value)
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000) // 1시간 후
      setValue('end_time', endTime.toISOString().slice(0, 16))
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-orange-600" />
                빠른 일정 추가
              </CardTitle>
              <CardDescription>
                새로운 일정을 빠르게 등록하세요
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* 제목 */}
            <div className="space-y-2">
              <Label htmlFor="title">일정 제목 *</Label>
              <Input
                id="title"
                {...register('title')}
                placeholder="무엇을 하실 예정인가요?"
                disabled={isLoading}
              />
              {errors.title && (
                <p className="text-sm text-red-600">{errors.title.message}</p>
              )}
            </div>

            {/* 종일 일정 체크박스 */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_all_day"
                checked={watchedIsAllDay}
                onCheckedChange={(checked) => setValue('is_all_day', checked as boolean)}
                disabled={isLoading}
              />
              <Label htmlFor="is_all_day" className="text-sm">
                종일 일정
              </Label>
            </div>

            {/* 시간 설정 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="start_time">
                  <Clock className="h-4 w-4 inline mr-1" />
                  시작 {watchedIsAllDay ? '날짜' : '시간'} *
                </Label>
                <Input
                  id="start_time"
                  type={watchedIsAllDay ? 'date' : 'datetime-local'}
                  value={watchedIsAllDay ? watchedStartTime?.split('T')[0] : watchedStartTime}
                  onChange={(e) => handleStartTimeChange(
                    watchedIsAllDay 
                      ? `${e.target.value}T00:00` 
                      : e.target.value
                  )}
                  disabled={isLoading}
                />
                {errors.start_time && (
                  <p className="text-sm text-red-600">{errors.start_time.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_time">
                  <Clock className="h-4 w-4 inline mr-1" />
                  종료 {watchedIsAllDay ? '날짜' : '시간'} *
                </Label>
                <Input
                  id="end_time"
                  type={watchedIsAllDay ? 'date' : 'datetime-local'}
                  {...register('end_time')}
                  disabled={isLoading || watchedIsAllDay}
                />
                {errors.end_time && (
                  <p className="text-sm text-red-600">{errors.end_time.message}</p>
                )}
              </div>
            </div>

            {/* 장소 */}
            <div className="space-y-2">
              <Label htmlFor="location">
                <MapPin className="h-4 w-4 inline mr-1" />
                장소
              </Label>
              <Input
                id="location"
                {...register('location')}
                placeholder="어디에서 진행되나요? (선택사항)"
                disabled={isLoading}
              />
            </div>

            {/* 설명 */}
            <div className="space-y-2">
              <Label htmlFor="description">간단한 설명</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="일정에 대한 간단한 설명 (선택사항)"
                disabled={isLoading}
                rows={2}
              />
            </div>

            {/* 미리보기 */}
            <div className="p-3 bg-orange-50 rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <CalendarPlus className="h-4 w-4 text-orange-600" />
                <span className="text-gray-700">
                  {watchedIsAllDay ? '종일 일정' : '시간 지정 일정'}으로 생성됩니다
                </span>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                취소
              </Button>
              <Button type="submit" disabled={isLoading} className="bg-orange-600 hover:bg-orange-700">
                {isLoading ? '생성 중...' : '일정 추가'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}