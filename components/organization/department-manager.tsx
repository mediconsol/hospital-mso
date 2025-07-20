'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Edit, Trash2, Building, ChevronRight } from 'lucide-react'
import { Database } from '@/lib/database.types'

type Department = Database['public']['Tables']['department']['Row']

const departmentSchema = z.object({
  name: z.string().min(1, '부서명은 필수입니다'),
  parent_id: z.string().optional(),
  description: z.string().optional(),
})

type DepartmentFormData = z.infer<typeof departmentSchema>

interface DepartmentManagerProps {
  hospitalId: string
  departments: Department[]
  onDepartmentsChange: (departments: Department[]) => void
  isAdmin?: boolean
}

export function DepartmentManager({ hospitalId, departments, onDepartmentsChange, isAdmin = false }: DepartmentManagerProps) {
  const [showForm, setShowForm] = useState(false)
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<DepartmentFormData>({
    resolver: zodResolver(departmentSchema),
  })

  const watchedParentId = watch('parent_id')

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('department')
        .select('*')
        .eq('hospital_id', hospitalId)
        .order('created_at', { ascending: true })

      if (error) throw error
      onDepartmentsChange(data || [])
    } catch (error) {
      console.error('Error fetching departments:', error)
    }
  }

  const onSubmit = async (data: DepartmentFormData) => {
    setIsLoading(true)
    setError(null)

    try {
      const formData = {
        ...data,
        hospital_id: hospitalId,
        parent_id: data.parent_id || null,
        description: data.description || null,
      }

      if (editingDepartment) {
        // 수정
        const { error } = await supabase
          .from('department')
          .update(formData)
          .eq('id', editingDepartment.id)

        if (error) throw error
      } else {
        // 새로 생성
        const { error } = await supabase
          .from('department')
          .insert([formData])

        if (error) throw error
      }

      await fetchDepartments()
      handleCloseForm()
    } catch (err: any) {
      setError(err.message || '부서 정보 저장 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (department: Department) => {
    setEditingDepartment(department)
    reset({
      name: department.name,
      parent_id: department.parent_id || undefined,
      description: department.description || undefined,
    })
    // parent_id가 없으면 'none'으로 설정
    setValue('parent_id', department.parent_id || undefined)
    setShowForm(true)
  }

  const handleDelete = async (departmentId: string) => {
    if (!confirm('정말로 이 부서를 삭제하시겠습니까?')) return

    try {
      const { error } = await supabase
        .from('department')
        .delete()
        .eq('id', departmentId)

      if (error) throw error
      await fetchDepartments()
    } catch (error) {
      console.error('Error deleting department:', error)
    }
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingDepartment(null)
    setError(null)
    reset()
  }

  const buildDepartmentTree = (departments: Department[], parentId: string | null = null, level: number = 0): JSX.Element[] => {
    return departments
      .filter(dept => dept.parent_id === parentId)
      .map(dept => (
        <div key={dept.id}>
          <div className={`flex items-center justify-between p-3 border rounded-lg ${level > 0 ? 'ml-6 border-l-4 border-l-blue-200' : ''}`}>
            <div className="flex items-center gap-2">
              {level > 0 && <ChevronRight className="h-4 w-4 text-gray-400" />}
              <Building className="h-4 w-4 text-gray-600" />
              <div>
                <h3 className="font-medium">{dept.name}</h3>
                {dept.description && (
                  <p className="text-sm text-gray-500">{dept.description}</p>
                )}
              </div>
            </div>
            {isAdmin && (
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(dept)}
                >
                  <Edit className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(dept.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
          {buildDepartmentTree(departments, dept.id, level + 1)}
        </div>
      ))
  }

  return (
    <div className="space-y-4">
      {/* 부서 추가 버튼 */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">
          총 {departments.length}개 부서
        </p>
        {isAdmin && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            부서 추가
          </Button>
        )}
      </div>

      {/* 부서 트리 */}
      {departments.length === 0 ? (
        <div className="text-center py-8">
          <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">등록된 부서가 없습니다.</p>
          {isAdmin ? (
            <p className="text-sm text-gray-400 mt-2">
              첫 번째 부서를 추가해보세요.
            </p>
          ) : (
            <p className="text-sm text-gray-400 mt-2">
              관리자가 부서를 등록할 때까지 기다려주세요.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {buildDepartmentTree(departments)}
        </div>
      )}

      {/* 부서 등록/수정 폼 */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingDepartment ? '부서 수정' : '새 부서 추가'}
            </CardTitle>
            <CardDescription>
              부서 정보를 입력하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* 부서명 */}
              <div className="space-y-2">
                <Label htmlFor="name">부서명 *</Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="예: 내과, 외과, 행정팀"
                  disabled={isLoading}
                />
                {errors.name && (
                  <p className="text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              {/* 상위 부서 */}
              <div className="space-y-2">
                <Label htmlFor="parent_id">상위 부서</Label>
                <Select
                  value={watchedParentId || 'none'}
                  onValueChange={(value) => setValue('parent_id', value === 'none' ? undefined : value)}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="상위 부서를 선택하세요 (선택사항)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">최상위 부서</SelectItem>
                    {departments
                      .filter(dept => dept.id !== editingDepartment?.id)
                      .map(dept => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 설명 */}
              <div className="space-y-2">
                <Label htmlFor="description">설명</Label>
                <Textarea
                  id="description"
                  {...register('description')}
                  placeholder="부서에 대한 설명을 입력하세요"
                  disabled={isLoading}
                  rows={3}
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleCloseForm} disabled={isLoading}>
                  취소
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? '저장 중...' : editingDepartment ? '수정' : '추가'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}