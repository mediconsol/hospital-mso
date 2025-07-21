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
import { X, Shield, Link, Mail, AlertTriangle, CheckCircle, User, Building2, Plus, Trash2 } from 'lucide-react'
import { useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Database } from '@/lib/database.types'

type Employee = Database['public']['Tables']['employee']['Row'] & {
  hospital?: { id: string; name: string; type: string } | null
  department?: { id: string; name: string } | null
}

type Hospital = Database['public']['Tables']['hospital_or_mso']['Row']
type Department = Database['public']['Tables']['department']['Row'] & {
  hospital?: { id: string; name: string } | null
}

const userSchema = z.object({
  name: z.string().min(1, '이름은 필수입니다'),
  email: z.string().email('유효한 이메일을 입력하세요'),
  hospital_id: z.string().min(1, '병원을 선택하세요'),
  department_id: z.string().optional(),
  role: z.enum(['super_admin', 'admin', 'manager', 'employee']).refine(val => val !== undefined, { message: '역할을 선택하세요' }),
  position: z.string().optional(),
  phone: z.string().optional(),
  hire_date: z.string().optional(),
  status: z.enum(['active', 'inactive', 'resigned']).refine(val => val !== undefined, { message: '상태를 선택하세요' }),
})

type UserFormData = z.infer<typeof userSchema>

interface AdminUserFormProps {
  user?: Employee | null
  hospitals: Hospital[]
  departments: Department[]
  onClose: () => void
  onSaved: () => void
}

export function AdminUserForm({ user, hospitals, departments, onClose, onSaved }: AdminUserFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>(user?.hospital_id || '')
  const [authLinkLoading, setAuthLinkLoading] = useState(false)
  const [passwordResetLoading, setPasswordResetLoading] = useState(false)
  const [showPasswordResetDialog, setShowPasswordResetDialog] = useState(false)
  const [activeTab, setActiveTab] = useState('basic')
  const [organizationAccess, setOrganizationAccess] = useState<any[]>([])
  const [loadingOrgAccess, setLoadingOrgAccess] = useState(false)
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      hospital_id: user?.hospital_id || '',
      department_id: user?.department_id || '',
      role: user?.role || 'employee',
      position: user?.position || '',
      phone: user?.phone || '',
      hire_date: user?.hire_date || '',
      status: user?.status || 'active',
    },
  })

  // 부서 선택값을 위한 computed value
  const departmentValue = watch('department_id') || 'none'

  // 조직 접근 권한 로드
  const loadOrganizationAccess = async () => {
    if (!user) return

    setLoadingOrgAccess(true)
    try {
      const { data, error } = await supabase
        .from('employee_organization_access')
        .select(`
          *,
          organization:organization_id (
            id,
            name,
            type
          ),
          granted_by_employee:granted_by (
            id,
            name
          )
        `)
        .eq('employee_id', user.id)
        .eq('is_active', true)

      if (error) throw error
      setOrganizationAccess(data || [])
    } catch (error) {
      console.error('Error loading organization access:', error)
    } finally {
      setLoadingOrgAccess(false)
    }
  }

  // 조직 접근 권한 추가
  const addOrganizationAccess = async (organizationId: string, accessLevel: string, notes?: string) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('employee_organization_access')
        .insert([{
          employee_id: user.id,
          organization_id: organizationId,
          access_level: accessLevel,
          notes: notes || null,
          granted_by: null // 현재 사용자 ID를 여기에 설정해야 함
        }])

      if (error) throw error

      setSuccess('✅ 조직 접근 권한이 추가되었습니다!')
      loadOrganizationAccess()
    } catch (error: any) {
      setError(error.message || '조직 접근 권한 추가 중 오류가 발생했습니다.')
    }
  }

  // 조직 접근 권한 제거
  const removeOrganizationAccess = async (accessId: string) => {
    try {
      const { error } = await supabase
        .from('employee_organization_access')
        .update({ is_active: false })
        .eq('id', accessId)

      if (error) throw error

      setSuccess('✅ 조직 접근 권한이 제거되었습니다!')
      loadOrganizationAccess()
    } catch (error: any) {
      setError(error.message || '조직 접근 권한 제거 중 오류가 발생했습니다.')
    }
  }

  const watchedRole = watch('role')

  // 선택된 병원에 속한 부서들만 필터링
  const filteredDepartments = departments.filter(dept =>
    dept.hospital_id === selectedHospitalId
  )

  // 사용자가 있을 때 조직 접근 권한 로드
  useEffect(() => {
    if (user) {
      loadOrganizationAccess()
    }
  }, [user])

  // auth_user_id 연결 함수
  const linkAuthUser = async () => {
    if (!user) return

    setAuthLinkLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/link-auth-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employee_id: user.id,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '연결 중 오류가 발생했습니다.')
      }

      setSuccess('✅ 인증 사용자와 성공적으로 연결되었습니다!')

      // 3초 후 성공 메시지 제거
      setTimeout(() => {
        setSuccess(null)
        onSaved() // 목록 새로고침
      }, 2000)

    } catch (err: any) {
      setError(err.message || '인증 사용자 연결 중 오류가 발생했습니다.')
    } finally {
      setAuthLinkLoading(false)
    }
  }

  // 비밀번호 재설정 함수
  const resetPassword = async () => {
    if (!user?.email) return

    setPasswordResetLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })

      if (error) throw error

      setSuccess('✅ 비밀번호 재설정 이메일이 발송되었습니다!')
      setShowPasswordResetDialog(false)

      // 3초 후 성공 메시지 제거
      setTimeout(() => {
        setSuccess(null)
      }, 3000)

    } catch (err: any) {
      setError(err.message || '비밀번호 재설정 중 오류가 발생했습니다.')
    } finally {
      setPasswordResetLoading(false)
    }
  }

  const onSubmit = async (data: UserFormData) => {
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const formData = {
        ...data,
        department_id: data.department_id || null,
        position: data.position || null,
        phone: data.phone || null,
        hire_date: data.hire_date || null,
      }

      if (user) {
        // 수정
        const { error } = await supabase
          .from('employee')
          .update(formData)
          .eq('id', user.id)

        if (error) throw error
        setSuccess('✅ 사용자 정보가 성공적으로 수정되었습니다!')
      } else {
        // 새로 생성
        const { error } = await supabase
          .from('employee')
          .insert([formData])

        if (error) throw error
        setSuccess('✅ 새 사용자가 성공적으로 추가되었습니다!')
      }

      // 2초 후 폼 닫기
      setTimeout(() => {
        onSaved()
      }, 1500)

    } catch (err: any) {
      setError(err.message || '사용자 정보 저장 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'super_admin': return '최종관리자'
      case 'admin': return '관리자'
      case 'manager': return '매니저'
      case 'employee': return '직원'
      default: return role
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-red-100 text-red-800'
      case 'admin': return 'bg-purple-100 text-purple-800'
      case 'manager': return 'bg-blue-100 text-blue-800'
      case 'employee': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-yellow-100 text-yellow-800'
      case 'resigned': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <User className="w-5 h-5" />
                  <span>{user ? '사용자 정보 수정' : '새 사용자 추가'}</span>
                </CardTitle>
                <CardDescription>
                  {user ? `${user.name} (${user.email})의 정보를 수정합니다` : '새로운 사용자를 시스템에 추가합니다'}
                </CardDescription>
              </div>
              {user && (
                <div className="flex items-center space-x-2">
                  <Badge className={getRoleColor(user.role)}>
                    {getRoleLabel(user.role)}
                  </Badge>
                  <Badge className={getStatusColor(user.status)}>
                    {user.status === 'active' ? '활성' : user.status === 'inactive' ? '비활성' : '퇴사'}
                  </Badge>
                </div>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* 성공/오류 메시지 */}
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-600">{success}</p>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic" className="flex items-center space-x-2">
                <User className="w-4 h-4" />
                <span>기본 정보</span>
              </TabsTrigger>
              <TabsTrigger value="organization" className="flex items-center space-x-2">
                <Building2 className="w-4 h-4" />
                <span>조직 & 권한</span>
              </TabsTrigger>
              {user && (
                <TabsTrigger value="advanced" className="flex items-center space-x-2">
                  <Shield className="w-4 h-4" />
                  <span>고급 설정</span>
                </TabsTrigger>
              )}
            </TabsList>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-6">
              {/* 기본 정보 탭 */}
              <TabsContent value="basic" className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center space-x-2">
                    <User className="w-5 h-5" />
                    <span>기본 정보</span>
                  </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">이름 *</Label>
                  <Input
                    id="name"
                    {...register('name')}
                    placeholder="사용자 이름"
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
                    placeholder="user@example.com"
                  />
                  {errors.email && (
                    <p className="text-sm text-red-600">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">전화번호</Label>
                  <Input
                    id="phone"
                    {...register('phone')}
                    placeholder="010-1234-5678"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="position">직책</Label>
                  <Input
                    id="position"
                    {...register('position')}
                    placeholder="예: 팀장, 과장"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hire_date">입사일</Label>
                  <Input
                    id="hire_date"
                    type="date"
                    {...register('hire_date')}
                  />
                </div>
              </div>
                </div>
              </TabsContent>

              {/* 조직 & 권한 탭 */}
              <TabsContent value="organization" className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center space-x-2">
                    <Building2 className="w-5 h-5" />
                    <span>조직 정보</span>
                  </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hospital_id">병원/MSO *</Label>
                  <Select
                    value={selectedHospitalId}
                    onValueChange={(value) => {
                      setSelectedHospitalId(value)
                      setValue('hospital_id', value)
                      setValue('department_id', '') // 병원 변경 시 부서 초기화
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="병원을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {hospitals.map((hospital) => (
                        <SelectItem key={hospital.id} value={hospital.id}>
                          {hospital.name} ({hospital.type === 'hospital' ? '병원' : 'MSO'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.hospital_id && (
                    <p className="text-sm text-red-600">{errors.hospital_id.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department_id">부서</Label>
                  <Select
                    value={departmentValue}
                    onValueChange={(value) => setValue('department_id', value === 'none' ? '' : value)}
                    disabled={!selectedHospitalId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="부서를 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">부서 없음</SelectItem>
                      {filteredDepartments.map((department) => (
                        <SelectItem key={department.id} value={department.id}>
                          {department.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
                </div>

                <Separator className="my-6" />

                {/* 권한 및 상태 */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center space-x-2">
                    <Shield className="w-5 h-5" />
                    <span>권한 및 상태</span>
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="role">역할 *</Label>
                      <Select
                        value={watch('role')}
                        onValueChange={(value) => setValue('role', value as any)}
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

                    <div className="space-y-2">
                      <Label htmlFor="status">상태 *</Label>
                      <Select
                        value={watch('status')}
                        onValueChange={(value) => setValue('status', value as any)}
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

                  {/* 권한 설명 */}
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
                </div>
              </TabsContent>

              {/* 고급 설정 탭 (수정 모드일 때만) */}
              {user && (
                <TabsContent value="advanced" className="space-y-6">
                  <div className="space-y-6">
                    <h3 className="text-lg font-medium flex items-center space-x-2">
                      <Shield className="w-5 h-5" />
                      <span>고급 설정</span>
                    </h3>

                    {/* 인증 사용자 연결 */}
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
                      <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center space-x-2">
                        <Link className="w-4 h-4" />
                        <span>인증 사용자 연결</span>
                      </h4>

                      <div className="space-y-3">
                        <div className="text-xs text-gray-600">
                          <strong>직원 이메일:</strong> {user.email}
                        </div>
                        <div className="text-xs text-gray-600">
                          <strong>인증 사용자 ID:</strong> {user.auth_user_id ? (
                            <code className="bg-gray-100 px-1 rounded">{user.auth_user_id}</code>
                          ) : (
                            <span className="text-red-600">❌ 연결되지 않음</span>
                          )}
                        </div>

                        {!user.auth_user_id && (
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

                        {user.auth_user_id && (
                          <div className="flex items-center text-green-600 text-xs">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            ✅ 인증 사용자와 연결됨
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 비밀번호 재설정 */}
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                      <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center space-x-2">
                        <Mail className="w-4 h-4" />
                        <span>비밀번호 재설정</span>
                      </h4>

                      <div className="space-y-3">
                        <p className="text-xs text-gray-600">
                          사용자에게 비밀번호 재설정 이메일을 발송합니다.
                          <br />
                          사용자는 이메일을 통해 새로운 비밀번호를 설정할 수 있습니다.
                        </p>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowPasswordResetDialog(true)}
                          className="text-xs"
                        >
                          <Mail className="w-3 h-3 mr-1" />
                          비밀번호 재설정 이메일 발송
                        </Button>
                      </div>
                    </div>

                    {/* 조직 접근 권한 관리 */}
                    <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                      <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center space-x-2">
                        <Building2 className="w-4 h-4" />
                        <span>조직 접근 권한</span>
                      </h4>

                      <div className="space-y-4">
                        <p className="text-xs text-gray-600">
                          이 사용자가 접근할 수 있는 추가 조직을 관리합니다.
                          <br />
                          기본 소속 조직 외에 다른 조직에도 접근 권한을 부여할 수 있습니다.
                        </p>

                        {/* 현재 접근 권한 목록 */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-700">현재 접근 권한</span>
                            {loadingOrgAccess && (
                              <span className="text-xs text-gray-500">로딩 중...</span>
                            )}
                          </div>

                          {/* 기본 소속 조직 */}
                          <div className="flex items-center justify-between p-2 bg-white border border-gray-200 rounded text-xs">
                            <div className="flex items-center space-x-2">
                              <Building2 className="w-3 h-3 text-blue-600" />
                              <span className="font-medium">
                                {user.hospital?.name || '기본 소속'}
                              </span>
                              <Badge className="bg-blue-100 text-blue-800 text-xs">기본 소속</Badge>
                            </div>
                            <span className="text-gray-500">관리자</span>
                          </div>

                          {/* 추가 접근 권한 */}
                          {organizationAccess.map((access) => (
                            <div key={access.id} className="flex items-center justify-between p-2 bg-white border border-gray-200 rounded text-xs">
                              <div className="flex items-center space-x-2">
                                <Building2 className="w-3 h-3 text-green-600" />
                                <span className="font-medium">
                                  {access.organization?.name}
                                </span>
                                <Badge className="bg-green-100 text-green-800 text-xs">
                                  {access.access_level === 'read' ? '읽기' :
                                   access.access_level === 'write' ? '쓰기' : '관리자'}
                                </Badge>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeOrganizationAccess(access.id)}
                                className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}

                          {organizationAccess.length === 0 && !loadingOrgAccess && (
                            <div className="text-center py-4 text-xs text-gray-500">
                              추가 조직 접근 권한이 없습니다
                            </div>
                          )}
                        </div>

                        {/* 새 접근 권한 추가 */}
                        <div className="border-t pt-3">
                          <OrganizationAccessForm
                            hospitals={hospitals.filter(h => h.id !== user.hospital_id)}
                            onAdd={addOrganizationAccess}
                          />
                        </div>
                      </div>
                    </div>

                    {/* 사용자 정보 */}
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                      <h4 className="text-sm font-medium text-gray-900 mb-3">사용자 정보</h4>

                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-gray-600">생성일:</span>
                          <div className="font-mono">{new Date(user.created_at).toLocaleString('ko-KR')}</div>
                        </div>
                        <div>
                          <span className="text-gray-600">수정일:</span>
                          <div className="font-mono">{new Date(user.updated_at).toLocaleString('ko-KR')}</div>
                        </div>
                        <div>
                          <span className="text-gray-600">사용자 ID:</span>
                          <div className="font-mono">{user.id}</div>
                        </div>
                        <div>
                          <span className="text-gray-600">병원 ID:</span>
                          <div className="font-mono">{user.hospital_id}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              )}

              {/* 폼 버튼 */}
              <div className="flex justify-end gap-2 pt-6 border-t">
                <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                  취소
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? '저장 중...' : user ? '수정' : '추가'}
                </Button>
              </div>
            </form>
          </Tabs>
        </CardContent>
      </Card>

      {/* 비밀번호 재설정 확인 다이얼로그 */}
      <AlertDialog open={showPasswordResetDialog} onOpenChange={setShowPasswordResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>비밀번호 재설정 확인</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{user?.name}</strong> ({user?.email})에게 비밀번호 재설정 이메일을 발송하시겠습니까?
              <br />
              <br />
              사용자는 이메일을 통해 새로운 비밀번호를 설정할 수 있습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={resetPassword}
              disabled={passwordResetLoading}
            >
              {passwordResetLoading ? '발송 중...' : '이메일 발송'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// 조직 접근 권한 추가 폼 컴포넌트
interface OrganizationAccessFormProps {
  hospitals: Hospital[]
  onAdd: (organizationId: string, accessLevel: string, notes?: string) => void
}

function OrganizationAccessForm({ hospitals, onAdd }: OrganizationAccessFormProps) {
  const [selectedOrg, setSelectedOrg] = useState('')
  const [accessLevel, setAccessLevel] = useState('read')
  const [notes, setNotes] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const handleAdd = async () => {
    if (!selectedOrg) return

    setIsAdding(true)
    try {
      await onAdd(selectedOrg, accessLevel, notes)
      // 성공 시 폼 초기화
      setSelectedOrg('')
      setAccessLevel('read')
      setNotes('')
    } catch (error) {
      console.error('Error adding organization access:', error)
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="text-xs font-medium text-gray-700">새 조직 접근 권한 추가</div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <Select value={selectedOrg} onValueChange={setSelectedOrg}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="조직 선택" />
          </SelectTrigger>
          <SelectContent>
            {hospitals.map((hospital) => (
              <SelectItem key={hospital.id} value={hospital.id}>
                {hospital.name} ({hospital.type === 'hospital' ? '병원' : 'MSO'})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={accessLevel} onValueChange={setAccessLevel}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="read">읽기 권한</SelectItem>
            <SelectItem value="write">쓰기 권한</SelectItem>
            <SelectItem value="admin">관리자 권한</SelectItem>
          </SelectContent>
        </Select>

        <Button
          type="button"
          size="sm"
          onClick={handleAdd}
          disabled={!selectedOrg || isAdding}
          className="h-8 text-xs"
        >
          {isAdding ? '추가 중...' : (
            <>
              <Plus className="w-3 h-3 mr-1" />
              추가
            </>
          )}
        </Button>
      </div>

      <Input
        placeholder="메모 (선택사항)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="h-8 text-xs"
      />
    </div>
  )
}
