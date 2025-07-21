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
  role: z.enum(['super_admin', 'admin', 'manager', 'employee']).refine(val => val !== undefined, { message: '역할을 선택하세요' }),
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
  const [authLinkLoading, setAuthLinkLoading] = useState(false)
  const [authLinkSuccess, setAuthLinkSuccess] = useState<string | null>(null)
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
      role: employee?.role as 'super_admin' | 'admin' | 'manager' | 'employee' || 'employee',
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

  const linkAuthUser = async () => {
    if (!employee) return

    setAuthLinkLoading(true)
    setError(null)
    setAuthLinkSuccess(null)

    try {
      console.log('🔍 Starting simple auth user connection...')

      // 1. 현재 로그인된 사용자 확인
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        throw new Error('현재 로그인된 사용자를 찾을 수 없습니다.')
      }

      console.log('Current user:', user.email)
      console.log('Employee email:', employee.email)

      // 2. 이메일 주소 일치 확인
      if (user.email !== employee.email) {
        throw new Error(`이메일이 일치하지 않습니다.\n현재 사용자: ${user.email}\n직원 이메일: ${employee.email}`)
      }

      // 3. 이미 연결되어 있는지 확인
      if (employee.auth_user_id === user.id) {
        setAuthLinkSuccess('✅ 이미 연결되어 있습니다!')
        return
      }

      console.log('🔄 Updating auth_user_id:', user.id)

      // 4. 간단하게 auth_user_id 업데이트
      const { error: updateError } = await supabase
        .from('employee')
        .update({ auth_user_id: user.id })
        .eq('id', employee.id)
        .eq('email', employee.email) // 추가 안전장치

      if (updateError) {
        console.error('Update error:', updateError)
        throw new Error(`업데이트 실패: ${updateError.message}`)
      }

      console.log('✅ Auth user connected successfully!')

      setAuthLinkSuccess('✅ 인증 사용자와 성공적으로 연결되었습니다!')

      // 2초 후 새로고침
      setTimeout(() => {
        setAuthLinkSuccess(null)
        onSaved() // 목록 새로고침
      }, 2000)

    } catch (err: any) {
      console.error('Link auth user error:', err)
      setError(err.message || '인증 사용자 연결 중 오류가 발생했습니다.')
    } finally {
      setAuthLinkLoading(false)
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

            {authLinkSuccess && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-600">{authLinkSuccess}</p>
              </div>
            )}

            {/* 인증 사용자 연결 섹션 (수정 모드일 때만 표시) */}
            {employee && (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
                <h4 className="text-sm font-medium text-gray-900 mb-2">🔗 인증 사용자 연결</h4>
                <div className="space-y-2">
                  <div className="text-xs text-gray-600">
                    <strong>직원 이메일:</strong> {employee.email}
                  </div>
                  <div className="text-xs text-gray-600">
                    <strong>인증 사용자 ID:</strong> {employee.auth_user_id ? (
                      <code className="bg-gray-100 px-1 rounded">{employee.auth_user_id}</code>
                    ) : (
                      <span className="text-red-600">❌ 연결되지 않음</span>
                    )}
                  </div>

                  {!employee.auth_user_id && (
                    <div className="mt-3">
                      <p className="text-xs text-gray-600 mb-2">
                        현재 로그인된 사용자와 이 직원 정보를 연결하려면 아래 버튼을 클릭하세요.
                        <br />
                        <strong>주의:</strong> 해당 이메일로 로그인된 상태에서만 연결 가능합니다.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={linkAuthUser}
                        disabled={authLinkLoading}
                        className="text-xs"
                      >
                        {authLinkLoading ? '연결 중...' : '현재 사용자와 연결'}
                      </Button>
                    </div>
                  )}

                  {employee.auth_user_id && (
                    <div className="flex items-center text-green-600 text-xs">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      ✅ 인증 사용자와 연결됨
                    </div>
                  )}
                </div>
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