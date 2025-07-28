'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { createClient } from '@/lib/supabase'
import { getCurrentEmployee } from '@/lib/auth-helpers'
import { createChatRoom } from '@/lib/messenger-helpers'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  X, 
  MessageSquare, 
  Users, 
  Hash, 
  Search,
  Plus,
  Minus,
  UserPlus,
  MessageCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { Database } from '@/lib/database.types'

const chatRoomSchema = z.object({
  name: z.string().min(1, '채팅방 이름은 필수입니다').max(50, '채팅방 이름은 50자 이하여야 합니다'),
  type: z.enum(['direct', 'group', 'department']),
  description: z.string().max(200, '설명은 200자 이하여야 합니다').optional(),
  department_id: z.string().optional(),
})

type ChatRoomFormData = z.infer<typeof chatRoomSchema>

interface Employee {
  id: string
  name: string
  email: string
  position: string | null
  department_id: string | null
  department?: {
    name: string
  } | null
}

interface Department {
  id: string
  name: string
  description: string | null
}

interface CreateChatModalProps {
  onClose: () => void
  onChatRoomCreated: () => void
}

export function CreateChatModal({ onClose, onChatRoomCreated }: CreateChatModalProps) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ChatRoomFormData>({
    resolver: zodResolver(chatRoomSchema),
    defaultValues: {
      type: 'group'
    }
  })

  const watchedType = watch('type')
  const watchedDepartmentId = watch('department_id')

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    if (watchedType === 'direct') {
      setValue('name', '')
    }
  }, [watchedType, setValue])

  const loadInitialData = async () => {
    try {
      const currentEmployee = await getCurrentEmployee()
      if (!currentEmployee) return

      // 직원 목록 조회
      const { data: employeeData, error: employeeError } = await supabase
        .from('employee')
        .select(`
          id,
          name,
          email,
          position,
          department_id,
          department:department(name)
        `)
        .eq('hospital_id', currentEmployee.hospital_id)
        .eq('status', 'active')
        .neq('id', currentEmployee.id) // 본인 제외
        .order('name')

      if (employeeError) throw employeeError
      setEmployees(employeeData || [])

      // 부서 목록 조회
      const { data: departmentData, error: departmentError } = await supabase
        .from('department')
        .select('id, name, description')
        .eq('hospital_id', currentEmployee.hospital_id)
        .order('name')

      if (departmentError) throw departmentError
      setDepartments(departmentData || [])

    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('데이터 로드 중 오류가 발생했습니다.')
    } finally {
      setLoadingData(false)
    }
  }

  const onSubmit = async (data: ChatRoomFormData) => {
    setLoading(true)
    try {
      let roomName = data.name
      let participants = selectedEmployees

      // 1:1 채팅방인 경우
      if (data.type === 'direct') {
        if (selectedEmployees.length !== 1) {
          toast.error('1:1 채팅은 한 명의 상대방을 선택해야 합니다.')
          setLoading(false)
          return
        }
        
        const selectedEmployee = employees.find(emp => emp.id === selectedEmployees[0])
        roomName = selectedEmployee?.name || '1:1 채팅'
      }

      // 그룹 채팅방인 경우
      else if (data.type === 'group') {
        if (selectedEmployees.length === 0) {
          toast.error('그룹 채팅은 최소 1명 이상의 참여자를 선택해야 합니다.')
          setLoading(false)
          return
        }
        
        if (!data.name.trim()) {
          toast.error('그룹 채팅방 이름을 입력해주세요.')
          setLoading(false)
          return
        }
      }

      // 부서 채팅방인 경우
      else if (data.type === 'department') {
        if (!data.department_id) {
          toast.error('부서를 선택해주세요.')
          setLoading(false)
          return
        }
        
        // 해당 부서 직원들을 자동으로 참여자로 추가
        const departmentEmployees = employees.filter(emp => emp.department_id === data.department_id)
        participants = departmentEmployees.map(emp => emp.id)
        
        const selectedDepartment = departments.find(dept => dept.id === data.department_id)
        roomName = data.name.trim() || `${selectedDepartment?.name} 채팅방`
      }

      const result = await createChatRoom({
        name: roomName,
        type: data.type,
        description: data.description,
        department_id: data.department_id,
        participants
      })

      if (result.success) {
        toast.success('채팅방이 생성되었습니다!')
        onChatRoomCreated()
        onClose()
      } else {
        throw new Error(result.error || '채팅방 생성에 실패했습니다.')
      }
    } catch (error: any) {
      console.error('Error creating chat room:', error)
      toast.error(error.message || '채팅방 생성 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const toggleEmployeeSelection = (employeeId: string) => {
    setSelectedEmployees(prev => {
      if (watchedType === 'direct') {
        // 1:1 채팅은 한 명만 선택 가능
        return [employeeId]
      } else {
        // 그룹 채팅은 여러 명 선택 가능
        if (prev.includes(employeeId)) {
          return prev.filter(id => id !== employeeId)
        } else {
          return [...prev, employeeId]
        }
      }
    })
  }

  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.email.toLowerCase().includes(searchTerm.toLowerCase())
    
    if (watchedType === 'department' && watchedDepartmentId) {
      return matchesSearch && employee.department_id === watchedDepartmentId
    }
    
    return matchesSearch
  })

  const getTypeInfo = (type: string) => {
    switch (type) {
      case 'direct':
        return {
          label: '1:1 채팅',
          description: '두 사람이 대화하는 개인 채팅방',
          icon: MessageCircle,
          color: 'text-blue-600'
        }
      case 'group':
        return {
          label: '그룹 채팅',
          description: '여러 사람이 함께 대화하는 채팅방',
          icon: Users,
          color: 'text-green-600'
        }
      case 'department':
        return {
          label: '부서 채팅',
          description: '특정 부서 구성원들의 채팅방',
          icon: Hash,
          color: 'text-purple-600'
        }
      default:
        return {
          label: '채팅',
          description: '',
          icon: MessageSquare,
          color: 'text-gray-600'
        }
    }
  }

  if (loadingData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <Card className="w-full max-w-2xl">
          <CardContent className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                새 채팅방 만들기
              </CardTitle>
              <CardDescription>
                새로운 채팅방을 생성하여 동료들과 소통하세요
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* 채팅방 타입 선택 */}
            <div className="space-y-3">
              <Label>채팅방 타입</Label>
              <div className="grid grid-cols-3 gap-3">
                {(['direct', 'group', 'department'] as const).map((type) => {
                  const typeInfo = getTypeInfo(type)
                  return (
                    <div
                      key={type}
                      onClick={() => setValue('type', type)}
                      className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                        watchedType === type
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2 text-center">
                        <typeInfo.icon className={`h-6 w-6 ${typeInfo.color}`} />
                        <div>
                          <p className="font-medium text-sm">{typeInfo.label}</p>
                          <p className="text-xs text-gray-500 mt-1">{typeInfo.description}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 부서 선택 (부서 채팅인 경우) */}
            {watchedType === 'department' && (
              <div className="space-y-2">
                <Label htmlFor="department_id">부서 선택</Label>
                <Select
                  value={watchedDepartmentId || 'none'}
                  onValueChange={(value) => setValue('department_id', value === 'none' ? undefined : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="부서를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">부서를 선택하세요</SelectItem>
                    {departments.map(dept => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* 채팅방 이름 (1:1 채팅이 아닌 경우) */}
            {watchedType !== 'direct' && (
              <div className="space-y-2">
                <Label htmlFor="name">
                  채팅방 이름 {watchedType === 'group' ? '*' : ''}
                </Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder={
                    watchedType === 'group' 
                      ? "예: 프로젝트 팀 회의"
                      : "예: 내과 부서 채팅방"
                  }
                  disabled={loading}
                />
                {errors.name && (
                  <p className="text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>
            )}

            {/* 설명 */}
            <div className="space-y-2">
              <Label htmlFor="description">설명 (선택사항)</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="채팅방에 대한 간단한 설명을 입력하세요"
                disabled={loading}
                rows={3}
              />
              {errors.description && (
                <p className="text-sm text-red-600">{errors.description.message}</p>
              )}
            </div>

            {/* 참여자 선택 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>
                  참여자 선택 
                  {watchedType === 'direct' && ' (1명 선택)'}
                  {watchedType === 'group' && ' (1명 이상 선택)'}
                  {watchedType === 'department' && ' (부서 구성원 자동 추가)'}
                </Label>
                <Badge variant="secondary">
                  {selectedEmployees.length}명 선택됨
                </Badge>
              </div>

              {/* 검색 */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="직원 이름 또는 이메일 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* 직원 목록 */}
              <ScrollArea className="h-64 border rounded-lg">
                <div className="p-2 space-y-1">
                  {filteredEmployees.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm">
                        {searchTerm ? '검색 결과가 없습니다' : '참여 가능한 직원이 없습니다'}
                      </p>
                    </div>
                  ) : (
                    filteredEmployees.map((employee) => (
                      <div
                        key={employee.id}
                        onClick={() => toggleEmployeeSelection(employee.id)}
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedEmployees.includes(employee.id)
                            ? 'bg-blue-50 border-2 border-blue-200'
                            : 'hover:bg-gray-50 border-2 border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback>
                              {employee.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{employee.name}</p>
                            <p className="text-xs text-gray-500">{employee.email}</p>
                            {employee.position && (
                              <p className="text-xs text-gray-400">{employee.position}</p>
                            )}
                            {employee.department?.name && (
                              <Badge variant="outline" className="text-xs mt-1">
                                {employee.department.name}
                              </Badge>
                            )}
                          </div>
                        </div>
                        {selectedEmployees.includes(employee.id) ? (
                          <Minus className="h-4 w-4 text-red-500" />
                        ) : (
                          <Plus className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* 선택된 참여자 요약 */}
            {selectedEmployees.length > 0 && (
              <div className="space-y-2">
                <Label>선택된 참여자</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedEmployees.map((employeeId) => {
                    const employee = employees.find(emp => emp.id === employeeId)
                    return (
                      <Badge
                        key={employeeId}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {employee?.name}
                        <X
                          className="h-3 w-3 cursor-pointer hover:text-red-500"
                          onClick={() => toggleEmployeeSelection(employeeId)}
                        />
                      </Badge>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 버튼 */}
            <Separator />
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                취소
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? '생성 중...' : '채팅방 만들기'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}