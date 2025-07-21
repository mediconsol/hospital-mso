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
import { X, Mail, Send } from 'lucide-react'
import { Database } from '@/lib/database.types'

type Department = Database['public']['Tables']['department']['Row']

const inviteSchema = z.object({
  email: z.string().email('유효한 이메일을 입력하세요'),
  name: z.string().min(1, '이름은 필수입니다'),
  department_id: z.string().optional(),
  role: z.enum(['super_admin', 'admin', 'manager', 'employee']).refine(val => val !== undefined, { message: '역할을 선택하세요' }),
  position: z.string().optional(),
  message: z.string().optional(),
})

type InviteFormData = z.infer<typeof inviteSchema>

interface InviteEmployeeFormProps {
  hospitalId: string
  departments: Department[]
  onClose: () => void
  onSent: () => void
}

export function InviteEmployeeForm({ hospitalId, departments, onClose, onSent }: InviteEmployeeFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      role: 'employee',
      message: '안녕하세요!\n\n저희 조직에 합류해주셔서 감사합니다.\n아래 링크를 통해 계정을 생성하고 로그인해주세요.\n\n감사합니다.',
    },
  })

  const watchedRole = watch('role')
  const watchedDepartment = watch('department_id')

  const onSubmit = async (data: InviteFormData) => {
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // API 엔드포인트를 통해 직원 초대
      const response = await fetch('/api/invite-employee', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          hospital_id: hospitalId,
          department_id: data.department_id || null,
          role: data.role,
          position: data.position || null,
          message: data.message,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '초대 이메일 발송 중 오류가 발생했습니다.')
      }

      setSuccess(result.message || '초대 이메일이 성공적으로 발송되었습니다!')

      // 2초 후 폼 닫기
      setTimeout(() => {
        onSent()
      }, 2000)

    } catch (err: any) {
      setError(err.message || '초대 이메일 발송 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                직원 초대
              </CardTitle>
              <CardDescription>
                새로운 직원에게 초대 이메일을 발송하세요
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* 기본 정보 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">이름 *</Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="홍길동"
                  disabled={isLoading}
                />
                {errors.name && (
                  <p className="text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">이메일 *</Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  placeholder="hong@hospital.com"
                  disabled={isLoading}
                />
                {errors.email && (
                  <p className="text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>
            </div>

            {/* 부서 및 역할 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              <div className="space-y-2">
                <Label htmlFor="role">역할 *</Label>
                <Select
                  value={watchedRole}
                  onValueChange={(value) => setValue('role', value as 'super_admin' | 'admin' | 'manager' | 'employee')}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="역할을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="super_admin">최종관리자</SelectItem>
                    <SelectItem value="admin">관리자</SelectItem>
                    <SelectItem value="manager">매니저</SelectItem>
                    <SelectItem value="employee">직원</SelectItem>
                  </SelectContent>
                </Select>
                {errors.role && (
                  <p className="text-sm text-red-600">{errors.role.message}</p>
                )}
              </div>
            </div>

            {/* 직위 */}
            <div className="space-y-2">
              <Label htmlFor="position">직위</Label>
              <Input
                id="position"
                {...register('position')}
                placeholder="예: 팀장, 과장, 원장"
                disabled={isLoading}
              />
            </div>

            {/* 초대 메시지 */}
            <div className="space-y-2">
              <Label htmlFor="message">초대 메시지</Label>
              <Textarea
                id="message"
                {...register('message')}
                placeholder="초대 메시지를 입력하세요"
                disabled={isLoading}
                rows={4}
              />
              <p className="text-xs text-gray-500">
                이 메시지는 초대 이메일에 포함됩니다.
              </p>
            </div>

            {/* 역할 설명 */}
            {watchedRole && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800">
                  <strong>
                    {watchedRole === 'super_admin' ? '최종관리자' :
                     watchedRole === 'admin' ? '관리자' :
                     watchedRole === 'manager' ? '매니저' : '직원'}
                  </strong>:{' '}
                  {watchedRole === 'super_admin' ? '시스템 최고 관리 권한 (모든 병원/MSO 관리)' :
                   watchedRole === 'admin' ? '시스템 전체 관리 권한' :
                   watchedRole === 'manager' ? '부서 관리 및 업무 할당 권한' :
                   '기본 업무 수행 권한'}
                </p>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {success && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-600">{success}</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                취소
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    발송 중...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    초대 발송
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}