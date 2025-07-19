'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { createClient } from '@/lib/supabase'
import { getUserPermissions, UserPermissions } from '@/lib/permission-helpers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { X, Megaphone, Zap, AlertCircle, Bell, Users } from 'lucide-react'

const announcementSchema = z.object({
  title: z.string().min(1, '제목은 필수입니다'),
  message: z.string().min(1, '내용은 필수입니다'),
  type: z.enum(['announcement', 'system']),
})

type AnnouncementFormData = z.infer<typeof announcementSchema>

interface AnnouncementModalProps {
  onClose: () => void
  onSaved: () => void
}

export function AnnouncementModal({ onClose, onSaved }: AnnouncementModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userPermissions, setUserPermissions] = useState<UserPermissions | null>(null)
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AnnouncementFormData>({
    resolver: zodResolver(announcementSchema),
    defaultValues: {
      type: 'announcement',
    },
  })

  const watchedType = watch('type')

  const onSubmit = async (data: AnnouncementFormData) => {
    setIsLoading(true)
    setError(null)

    try {
      const permissions = await getUserPermissions()
      if (!permissions.employee) {
        throw new Error('직원 정보를 찾을 수 없습니다')
      }

      // 관리자 권한 확인
      if (!permissions.isManager) {
        throw new Error('공지사항 작성 권한이 없습니다. 관리자에게 문의하세요.')
      }

      // 같은 병원의 모든 직원 조회
      const { data: employees, error: employeesError } = await supabase
        .from('employee')
        .select('id')
        .eq('hospital_id', permissions.employee.hospital_id)
        .eq('status', 'active')

      if (employeesError) throw employeesError

      if (!employees || employees.length === 0) {
        throw new Error('알림을 보낼 직원이 없습니다')
      }

      // 모든 직원에게 알림 생성
      const notifications = employees.map(emp => ({
        type: data.type,
        user_id: emp.id,
        hospital_id: permissions.employee!.hospital_id,
        title: data.title,
        message: data.message,
        is_read: false,
      }))

      const { error: notificationError } = await supabase
        .from('notification')
        .insert(notifications)

      if (notificationError) throw notificationError

      onSaved()
    } catch (err: any) {
      setError(err.message || '공지사항 발송 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const getTypeInfo = (type: string) => {
    switch (type) {
      case 'announcement':
        return {
          label: '일반 공지',
          description: '병원/조직 내 일반적인 공지사항',
          icon: Megaphone,
          color: 'text-purple-600',
          bgColor: 'bg-purple-50'
        }
      case 'system':
        return {
          label: '시스템 공지',
          description: '시스템 관련 중요 알림',
          icon: AlertCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-50'
        }
      default:
        return {
          label: '공지',
          description: '',
          icon: Bell,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50'
        }
    }
  }

  const typeInfo = getTypeInfo(watchedType)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-purple-600" />
                공지사항 작성
              </CardTitle>
              <CardDescription>
                조직 구성원들에게 공지사항을 전달하세요
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* 공지 유형 */}
            <div className="space-y-2">
              <Label htmlFor="type">공지 유형 *</Label>
              <Select
                value={watchedType}
                onValueChange={(value) => setValue('type', value as 'announcement' | 'system')}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="announcement">
                    <div className="flex items-center gap-2">
                      <Megaphone className="h-4 w-4 text-purple-600" />
                      <span>일반 공지</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="system">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <span>시스템 공지</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 제목 */}
            <div className="space-y-2">
              <Label htmlFor="title">공지 제목 *</Label>
              <Input
                id="title"
                {...register('title')}
                placeholder="공지사항 제목을 입력하세요"
                disabled={isLoading}
              />
              {errors.title && (
                <p className="text-sm text-red-600">{errors.title.message}</p>
              )}
            </div>

            {/* 내용 */}
            <div className="space-y-2">
              <Label htmlFor="message">공지 내용 *</Label>
              <Textarea
                id="message"
                {...register('message')}
                placeholder="공지사항 내용을 자세히 작성하세요"
                disabled={isLoading}
                rows={4}
              />
              {errors.message && (
                <p className="text-sm text-red-600">{errors.message.message}</p>
              )}
            </div>

            {/* 미리보기 */}
            <div className={`p-3 rounded-lg ${typeInfo.bgColor}`}>
              <div className="flex items-start gap-2">
                <typeInfo.icon className={`h-4 w-4 mt-0.5 ${typeInfo.color}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-sm font-medium ${typeInfo.color}`}>
                      {typeInfo.label}
                    </span>
                    <Users className="h-3 w-3 text-gray-500" />
                    <span className="text-xs text-gray-500">전체 구성원</span>
                  </div>
                  <p className="text-xs text-gray-600">{typeInfo.description}</p>
                </div>
              </div>
            </div>

            {/* 권한 안내 */}
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium">관리자/매니저 권한 필요</p>
                  <p className="text-xs mt-1">공지사항은 관리자 또는 매니저만 작성할 수 있습니다.</p>
                </div>
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
              <Button type="submit" disabled={isLoading} className="bg-purple-600 hover:bg-purple-700">
                {isLoading ? '발송 중...' : '공지 발송'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}