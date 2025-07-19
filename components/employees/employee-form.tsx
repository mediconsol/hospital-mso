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
import { X } from 'lucide-react'
import { Database } from '@/lib/database.types'

type Employee = Database['public']['Tables']['employee']['Row']
type Department = Database['public']['Tables']['department']['Row']

const employeeSchema = z.object({
  name: z.string().min(1, '이름은 필수입니다'),
  email: z.string().email('유효한 이메일을 입력하세요'),
  department_id: z.string().optional(),
  role: z.enum(['admin', 'manager', 'employee']).refine(val => val !== undefined, { message: '역할을 선택하세요' }),
  position: z.string().optional(),
  phone: z.string().optional(),
  hire_date: z.string().optional(),
  status: z.enum(['active', 'inactive', 'resigned']).refine(val => val !== undefined, { message: '상태를 선택하세요' }),
})

type EmployeeFormData = z.infer<typeof employeeSchema>

interface EmployeeFormProps {
  employee?: Employee | null
  hospitalId: string
  departments: Department[]
  onClose: () => void
  onSaved: () => void
}

export function EmployeeForm({ employee, hospitalId, departments, onClose, onSaved }: EmployeeFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      name: employee?.name || '',
      email: employee?.email || '',
      department_id: employee?.department_id || '',
      role: employee?.role as 'admin' | 'manager' | 'employee' || 'employee',
      position: employee?.position || '',
      phone: employee?.phone || '',
      hire_date: employee?.hire_date || '',
      status: employee?.status as 'active' | 'inactive' | 'resigned' || 'active',
    },
  })

  const watchedRole = watch('role')
  const watchedDepartment = watch('department_id')
  const watchedStatus = watch('status')

  const onSubmit = async (data: EmployeeFormData) => {
    setIsLoading(true)
    setError(null)

    try {
      const formData = {
        ...data,
        hospital_id: hospitalId,
        department_id: data.department_id || null,
        position: data.position || null,
        phone: data.phone || null,
        hire_date: data.hire_date || null,
      }

      if (employee) {
        // 수정
        const { error } = await supabase
          .from('employee')
          .update(formData)
          .eq('id', employee.id)

        if (error) throw error
      } else {
        // 새로 생성
        const { error } = await supabase
          .from('employee')
          .insert([formData])

        if (error) throw error
      }

      onSaved()
    } catch (err: any) {
      setError(err.message || '직원 정보 저장 중 오류가 발생했습니다.')
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
              <CardTitle>
                {employee ? '직원 정보 수정' : '새 직원 등록'}
              </CardTitle>
              <CardDescription>
                직원의 기본 정보와 권한을 설정하세요
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
                  onValueChange={(value) => setValue('role', value as 'admin' | 'manager' | 'employee')}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="역할을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
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

            {/* 직위 및 전화번호 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="position">직위</Label>
                <Input
                  id="position"
                  {...register('position')}
                  placeholder="예: 팀장, 과장, 원장"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">전화번호</Label>
                <Input
                  id="phone"
                  {...register('phone')}
                  placeholder="010-1234-5678"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* 입사일 및 상태 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hire_date">입사일</Label>
                <Input
                  id="hire_date"
                  type="date"
                  {...register('hire_date')}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">상태 *</Label>
                <Select
                  value={watchedStatus}
                  onValueChange={(value) => setValue('status', value as 'active' | 'inactive' | 'resigned')}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="상태를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">활성</SelectItem>
                    <SelectItem value="inactive">비활성</SelectItem>
                    <SelectItem value="resigned">퇴사</SelectItem>
                  </SelectContent>
                </Select>
                {errors.status && (
                  <p className="text-sm text-red-600">{errors.status.message}</p>
                )}
              </div>
            </div>

            {/* 역할 설명 */}
            {watchedRole && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800">
                  <strong>
                    {watchedRole === 'admin' ? '관리자' : 
                     watchedRole === 'manager' ? '매니저' : '직원'}
                  </strong>:{' '}
                  {watchedRole === 'admin' ? '시스템 전체 관리 권한' :
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

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                취소
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? '저장 중...' : employee ? '수정' : '등록'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}