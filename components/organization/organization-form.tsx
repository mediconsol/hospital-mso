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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { X } from 'lucide-react'
import { Database } from '@/lib/database.types'

type HospitalOrMSO = Database['public']['Tables']['hospital_or_mso']['Row']

const organizationSchema = z.object({
  name: z.string().min(1, '조직명은 필수입니다'),
  type: z.enum(['hospital', 'mso']).refine(val => val !== undefined, { message: '조직 유형을 선택하세요' }),
  representative: z.string().optional(),
  contact_email: z.string().email('유효한 이메일을 입력하세요').optional().or(z.literal('')),
  contact_phone: z.string().optional(),
  address: z.string().optional(),
  logo_url: z.string().optional(),
})

type OrganizationFormData = z.infer<typeof organizationSchema>

interface OrganizationFormProps {
  organization?: HospitalOrMSO | null
  onClose: () => void
  onSaved: () => void
}

export function OrganizationForm({ organization, onClose, onSaved }: OrganizationFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: organization?.name || '',
      type: organization?.type as 'hospital' | 'mso' || 'hospital',
      representative: organization?.representative || '',
      contact_email: organization?.contact_email || '',
      contact_phone: organization?.contact_phone || '',
      address: organization?.address || '',
      logo_url: organization?.logo_url || '',
    },
  })

  const watchedType = watch('type')

  const onSubmit = async (data: OrganizationFormData) => {
    setIsLoading(true)
    setError(null)

    try {
      const formData = {
        ...data,
        contact_email: data.contact_email || null,
        representative: data.representative || null,
        contact_phone: data.contact_phone || null,
        address: data.address || null,
        logo_url: data.logo_url || null,
      }

      if (organization) {
        // 수정
        const { error } = await supabase
          .from('hospital_or_mso')
          .update(formData)
          .eq('id', organization.id)

        if (error) throw error
      } else {
        // 새로 생성
        const { error } = await supabase
          .from('hospital_or_mso')
          .insert([formData])

        if (error) throw error
      }

      onSaved()
    } catch (err: any) {
      setError(err.message || '조직 정보 저장 중 오류가 발생했습니다.')
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
                {organization ? '조직 정보 수정' : '새 조직 등록'}
              </CardTitle>
              <CardDescription>
                병원 또는 의료경영지원회사(MSO) 정보를 입력하세요
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* 조직명 */}
            <div className="space-y-2">
              <Label htmlFor="name">조직명 *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="예: 서울대학교병원"
                disabled={isLoading}
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            {/* 조직 유형 */}
            <div className="space-y-2">
              <Label htmlFor="type">조직 유형 *</Label>
              <Select
                value={watchedType}
                onValueChange={(value) => setValue('type', value as 'hospital' | 'mso')}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="조직 유형을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hospital">병원</SelectItem>
                  <SelectItem value="mso">의료경영지원회사(MSO)</SelectItem>
                </SelectContent>
              </Select>
              {errors.type && (
                <p className="text-sm text-red-600">{errors.type.message}</p>
              )}
            </div>

            {/* 대표자 */}
            <div className="space-y-2">
              <Label htmlFor="representative">대표자</Label>
              <Input
                id="representative"
                {...register('representative')}
                placeholder="예: 홍길동"
                disabled={isLoading}
              />
            </div>

            {/* 연락처 정보 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact_email">이메일</Label>
                <Input
                  id="contact_email"
                  type="email"
                  {...register('contact_email')}
                  placeholder="info@hospital.com"
                  disabled={isLoading}
                />
                {errors.contact_email && (
                  <p className="text-sm text-red-600">{errors.contact_email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_phone">전화번호</Label>
                <Input
                  id="contact_phone"
                  {...register('contact_phone')}
                  placeholder="02-1234-5678"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* 주소 */}
            <div className="space-y-2">
              <Label htmlFor="address">주소</Label>
              <Textarea
                id="address"
                {...register('address')}
                placeholder="서울특별시 종로구 ..."
                disabled={isLoading}
                rows={3}
              />
            </div>

            {/* 로고 URL */}
            <div className="space-y-2">
              <Label htmlFor="logo_url">로고 URL</Label>
              <Input
                id="logo_url"
                {...register('logo_url')}
                placeholder="https://example.com/logo.png"
                disabled={isLoading}
              />
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
                {isLoading ? '저장 중...' : organization ? '수정' : '등록'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}