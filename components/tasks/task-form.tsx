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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { X, ClipboardList, Plus, Edit } from 'lucide-react'
import { Database } from '@/lib/database.types'

type Task = Database['public']['Tables']['task']['Row']
type Employee = Database['public']['Tables']['employee']['Row']
type Department = Database['public']['Tables']['department']['Row']

const taskSchema = z.object({
  title: z.string().min(1, '제목은 필수입니다'),
  description: z.string().optional(),
  assignee_id: z.string().optional(),
  department_id: z.string().optional(),
  priority: z.enum(['urgent', 'high', 'medium', 'low']).refine(val => val !== undefined, { message: '우선순위를 선택하세요' }),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).refine(val => val !== undefined, { message: '상태를 선택하세요' }),
  due_date: z.string().optional(),
})

type TaskFormData = z.infer<typeof taskSchema>

interface TaskFormProps {
  task?: Task | null
  hospitalId: string
  employees: Employee[]
  departments: Department[]
  currentUserId: string
  onClose: () => void
  onSaved: () => void
}

export function TaskForm({ task, hospitalId, employees, departments, currentUserId, onClose, onSaved }: TaskFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task?.title || '',
      description: task?.description || '',
      assignee_id: task?.assignee_id || '',
      department_id: task?.department_id || '',
      priority: task?.priority as 'urgent' | 'high' | 'medium' | 'low' || 'medium',
      status: task?.status as 'pending' | 'in_progress' | 'completed' | 'cancelled' || 'pending',
      due_date: task?.due_date || '',
    },
  })

  const watchedPriority = watch('priority')
  const watchedStatus = watch('status')
  const watchedAssignee = watch('assignee_id')
  const watchedDepartment = watch('department_id')

  const onSubmit = async (data: TaskFormData) => {
    setIsLoading(true)
    setError(null)

    try {
      const formData = {
        ...data,
        hospital_id: hospitalId,
        creator_id: currentUserId,
        assignee_id: data.assignee_id || null,
        department_id: data.department_id || null,
        description: data.description || null,
        due_date: data.due_date || null,
        completed_at: data.status === 'completed' ? new Date().toISOString() : null,
      }

      if (task) {
        // 수정
        const { error } = await supabase
          .from('task')
          .update(formData)
          .eq('id', task.id)

        if (error) throw error
      } else {
        // 새로 생성
        const { error } = await supabase
          .from('task')
          .insert([formData])

        if (error) throw error
      }

      onSaved()
    } catch (err: any) {
      setError(err.message || '업무 저장 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-50 border-red-200 text-red-800'
      case 'high': return 'bg-orange-50 border-orange-200 text-orange-800'
      case 'medium': return 'bg-yellow-50 border-yellow-200 text-yellow-800'
      case 'low': return 'bg-green-50 border-green-200 text-green-800'
      default: return 'bg-gray-50 border-gray-200 text-gray-800'
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

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return '대기'
      case 'in_progress': return '진행중'
      case 'completed': return '완료'
      case 'cancelled': return '취소'
      default: return status
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {task ? <Edit className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                {task ? '업무 수정' : '새 업무 생성'}
              </CardTitle>
              <CardDescription>
                업무의 상세 정보를 입력하세요
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
                placeholder="업무 제목을 입력하세요"
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
                placeholder="업무에 대한 상세한 설명을 입력하세요"
                disabled={isLoading}
                rows={4}
              />
            </div>

            {/* 담당자 및 부서 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="assignee_id">담당자</Label>
                <Select
                  value={watchedAssignee || 'none'}
                  onValueChange={(value) => setValue('assignee_id', value === 'none' ? undefined : value)}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="담당자를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">담당자 없음</SelectItem>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name} ({emp.position || '직책 없음'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="department_id">부서</Label>
                <Select
                  value={watchedDepartment || 'none'}
                  onValueChange={(value) => setValue('department_id', value === 'none' ? undefined : value)}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="부서를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">부서 없음</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 우선순위 및 상태 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">우선순위 *</Label>
                <Select
                  value={watchedPriority}
                  onValueChange={(value) => setValue('priority', value as 'urgent' | 'high' | 'medium' | 'low')}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="우선순위를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">긴급</SelectItem>
                    <SelectItem value="high">높음</SelectItem>
                    <SelectItem value="medium">보통</SelectItem>
                    <SelectItem value="low">낮음</SelectItem>
                  </SelectContent>
                </Select>
                {errors.priority && (
                  <p className="text-sm text-red-600">{errors.priority.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">상태 *</Label>
                <Select
                  value={watchedStatus}
                  onValueChange={(value) => setValue('status', value as 'pending' | 'in_progress' | 'completed' | 'cancelled')}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="상태를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">대기</SelectItem>
                    <SelectItem value="in_progress">진행중</SelectItem>
                    <SelectItem value="completed">완료</SelectItem>
                    <SelectItem value="cancelled">취소</SelectItem>
                  </SelectContent>
                </Select>
                {errors.status && (
                  <p className="text-sm text-red-600">{errors.status.message}</p>
                )}
              </div>
            </div>

            {/* 마감일 */}
            <div className="space-y-2">
              <Label htmlFor="due_date">마감일</Label>
              <Input
                id="due_date"
                type="date"
                {...register('due_date')}
                disabled={isLoading}
              />
            </div>

            {/* 우선순위 및 상태 미리보기 */}
            {(watchedPriority || watchedStatus) && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <ClipboardList className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">미리보기</span>
                </div>
                <div className="flex gap-2">
                  {watchedPriority && (
                    <div className={`px-2 py-1 rounded text-xs font-medium border ${getPriorityColor(watchedPriority)}`}>
                      우선순위: {getPriorityLabel(watchedPriority)}
                    </div>
                  )}
                  {watchedStatus && (
                    <div className="px-2 py-1 rounded text-xs font-medium bg-blue-50 border border-blue-200 text-blue-800">
                      상태: {getStatusLabel(watchedStatus)}
                    </div>
                  )}
                </div>
              </div>
            )}

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
                {isLoading ? '저장 중...' : task ? '수정' : '생성'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}