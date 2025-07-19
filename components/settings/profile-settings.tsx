'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { User, Mail, Phone, MapPin, Calendar, Building2, Users, Camera } from 'lucide-react'
import { Database } from '@/lib/database.types'

type Employee = Database['public']['Tables']['employee']['Row']

const profileSchema = z.object({
  name: z.string().min(1, '이름은 필수입니다'),
  email: z.string().email('올바른 이메일 주소를 입력하세요'),
  phone: z.string().optional(),
  position: z.string().optional(),
})

type ProfileFormData = z.infer<typeof profileSchema>

interface ProfileSettingsProps {
  employee: Employee
  onUpdate: () => void
}

export function ProfileSettings({ employee, onUpdate }: ProfileSettingsProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: employee.name || '',
      email: employee.email || '',
      phone: employee.phone || '',
      position: employee.position || '',
    },
  })

  const getInitials = (name: string) => {
    return name.split('').slice(0, 2).join('').toUpperCase()
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return '관리자'
      case 'manager': return '매니저'
      case 'employee': return '직원'
      default: return role
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800'
      case 'manager': return 'bg-blue-100 text-blue-800'
      case 'employee': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return '활성'
      case 'inactive': return '비활성'
      case 'resigned': return '퇴사'
      default: return status
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

  const onSubmit = async (data: ProfileFormData) => {
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const { error } = await supabase
        .from('employee')
        .update({
          name: data.name,
          email: data.email,
          phone: data.phone || null,
          position: data.position || null,
        })
        .eq('id', employee.id)

      if (error) throw error

      setSuccess('프로필이 성공적으로 업데이트되었습니다.')
      onUpdate()
    } catch (err: any) {
      setError(err.message || '프로필 업데이트 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 프로필 헤더 */}
      <Card>
        <CardHeader>
          <CardTitle>프로필 개요</CardTitle>
          <CardDescription>
            현재 프로필 정보를 확인하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start space-x-4">
            <div className="relative">
              <Avatar className="h-20 w-20">
                <AvatarImage src="" alt={employee.name} />
                <AvatarFallback className="text-lg">
                  {getInitials(employee.name)}
                </AvatarFallback>
              </Avatar>
              <Button
                size="sm"
                variant="outline"
                className="absolute -bottom-2 -right-2 h-8 w-8 p-0"
                disabled
              >
                <Camera className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <h3 className="text-xl font-semibold">{employee.name}</h3>
                <p className="text-gray-600">{employee.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={getRoleColor(employee.role)}>
                  {getRoleLabel(employee.role)}
                </Badge>
                <Badge className={getStatusColor(employee.status)}>
                  {getStatusLabel(employee.status)}
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                {employee.position && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {employee.position}
                  </div>
                )}
                {employee.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    {employee.phone}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  입사일: {employee.hire_date ? new Date(employee.hire_date).toLocaleDateString('ko-KR') : '미등록'}
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  사원 ID: {employee.id}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 프로필 수정 폼 */}
      <Card>
        <CardHeader>
          <CardTitle>프로필 수정</CardTitle>
          <CardDescription>
            개인 정보를 수정하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 이름 */}
              <div className="space-y-2">
                <Label htmlFor="name">이름 *</Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="이름을 입력하세요"
                  disabled={isLoading}
                />
                {errors.name && (
                  <p className="text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              {/* 이메일 */}
              <div className="space-y-2">
                <Label htmlFor="email">이메일 *</Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  placeholder="이메일을 입력하세요"
                  disabled={isLoading}
                />
                {errors.email && (
                  <p className="text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              {/* 전화번호 */}
              <div className="space-y-2">
                <Label htmlFor="phone">전화번호</Label>
                <Input
                  id="phone"
                  {...register('phone')}
                  placeholder="전화번호를 입력하세요"
                  disabled={isLoading}
                />
                {errors.phone && (
                  <p className="text-sm text-red-600">{errors.phone.message}</p>
                )}
              </div>

              {/* 직급/직책 */}
              <div className="space-y-2">
                <Label htmlFor="position">직급/직책</Label>
                <Input
                  id="position"
                  {...register('position')}
                  placeholder="직급이나 직책을 입력하세요"
                  disabled={isLoading}
                />
                {errors.position && (
                  <p className="text-sm text-red-600">{errors.position.message}</p>
                )}
              </div>
            </div>


            {/* 상태 메시지 */}
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

            {/* 제출 버튼 */}
            <div className="flex justify-end">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? '저장 중...' : '프로필 업데이트'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}