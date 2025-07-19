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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { X, ClipboardList, Zap } from 'lucide-react'

const quickTaskSchema = z.object({
  title: z.string().min(1, '제목은 필수입니다'),
  description: z.string().optional(),
  priority: z.enum(['urgent', 'high', 'medium', 'low']),
  due_date: z.string().optional(),
})

type QuickTaskFormData = z.infer<typeof quickTaskSchema>

interface QuickTaskModalProps {
  onClose: () => void
  onSaved: () => void
}

export function QuickTaskModal({ onClose, onSaved }: QuickTaskModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<QuickTaskFormData>({
    resolver: zodResolver(quickTaskSchema),
    defaultValues: {
      priority: 'medium',
    },
  })

  const watchedPriority = watch('priority')

  const onSubmit = async (data: QuickTaskFormData) => {
    setIsLoading(true)
    setError(null)

    try {
      const currentEmployee = await getCurrentEmployee()
      if (!currentEmployee) {
        throw new Error('직원 정보를 찾을 수 없습니다')
      }

      const formData = {
        title: data.title,
        description: data.description || null,
        status: 'pending' as const,
        priority: data.priority,
        assignee_id: currentEmployee.id, // 자신에게 할당
        creator_id: currentEmployee.id,
        hospital_id: currentEmployee.hospital_id,
        due_date: data.due_date || null,
        department_id: currentEmployee.department_id || null,
      }

      const { error } = await supabase
        .from('task')
        .insert([formData])

      if (error) throw error

      onSaved()
    } catch (err: any) {
      setError(err.message || '업무 생성 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600'
      case 'high': return 'text-orange-600'
      case 'medium': return 'text-yellow-600'
      case 'low': return 'text-green-600'
      default: return 'text-gray-600'
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-blue-600" />
                빠른 업무 생성
              </CardTitle>
              <CardDescription>
                간단한 업무를 빠르게 생성하세요
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
              <Label htmlFor="title">업무 제목 *</Label>
              <Input
                id="title"
                {...register('title')}
                placeholder="무엇을 해야 하나요?"
                disabled={isLoading}
              />
              {errors.title && (
                <p className="text-sm text-red-600">{errors.title.message}</p>
              )}
            </div>

            {/* 설명 */}
            <div className="space-y-2">
              <Label htmlFor="description">간단한 설명</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="업무에 대한 간단한 설명 (선택사항)"
                disabled={isLoading}
                rows={2}
              />
            </div>

            {/* 우선순위 및 마감일 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="priority">우선순위 *</Label>
                <Select
                  value={watchedPriority}
                  onValueChange={(value) => setValue('priority', value as 'urgent' | 'high' | 'medium' | 'low')}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">
                      <span className="text-red-600">긴급</span>
                    </SelectItem>
                    <SelectItem value="high">
                      <span className="text-orange-600">높음</span>
                    </SelectItem>
                    <SelectItem value="medium">
                      <span className="text-yellow-600">보통</span>
                    </SelectItem>
                    <SelectItem value="low">
                      <span className="text-green-600">낮음</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="due_date">마감일</Label>
                <Input
                  id="due_date"
                  type="date"
                  {...register('due_date')}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* 미리보기 */}
            {watchedPriority && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <ClipboardList className="h-4 w-4 text-gray-600" />
                  <span className="text-gray-700">우선순위:</span>
                  <span className={`font-medium ${getPriorityColor(watchedPriority)}`}>
                    {getPriorityLabel(watchedPriority)}
                  </span>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                취소
              </Button>
              <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
                {isLoading ? '생성 중...' : '업무 생성'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}