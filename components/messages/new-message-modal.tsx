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
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { X, Plus, Users, MessageSquare, Hash } from 'lucide-react'
import { Database } from '@/lib/database.types'

type Employee = Database['public']['Tables']['employee']['Row']
type Department = Database['public']['Tables']['department']['Row']

const newChatSchema = z.object({
  name: z.string().min(1, '채팅방 이름을 입력하세요'),
  type: z.enum(['direct', 'group', 'department']),
  department_id: z.string().optional(),
  participants: z.array(z.string()).min(1, '최소 1명의 참여자를 선택하세요'),
  description: z.string().optional(),
})

type NewChatFormData = z.infer<typeof newChatSchema>

interface NewMessageModalProps {
  employees: Employee[]
  departments: Department[]
  hospitalId: string
  currentUserId: string
  onClose: () => void
  onRoomCreated: (roomId: string) => void
}

export function NewMessageModal({
  employees,
  departments,
  hospitalId,
  currentUserId,
  onClose,
  onRoomCreated
}: NewMessageModalProps) {
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<NewChatFormData>({
    resolver: zodResolver(newChatSchema),
    defaultValues: {
      type: 'group',
      participants: [],
    },
  })

  const watchedType = watch('type')
  const watchedDepartment = watch('department_id')

  const filteredEmployees = employees.filter(employee =>
    employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const toggleParticipant = (employeeId: string) => {
    const newParticipants = selectedParticipants.includes(employeeId)
      ? selectedParticipants.filter(id => id !== employeeId)
      : [...selectedParticipants, employeeId]
    
    setSelectedParticipants(newParticipants)
    setValue('participants', newParticipants)
  }

  const generateRoomName = (type: string, participants: string[]) => {
    if (type === 'direct' && participants.length === 1) {
      const participant = employees.find(emp => emp.id === participants[0])
      return participant ? `${participant.name}과의 대화` : '개인 메시지'
    } else if (type === 'department' && watchedDepartment) {
      const dept = departments.find(d => d.id === watchedDepartment)
      return dept ? `${dept.name} 부서 채팅` : '부서 채팅'
    } else {
      const participantNames = participants
        .map(id => employees.find(emp => emp.id === id)?.name)
        .filter(Boolean)
        .slice(0, 3)
        .join(', ')
      return participantNames.length > 0 
        ? `${participantNames}${participants.length > 3 ? ` 외 ${participants.length - 3}명` : ''}`
        : '그룹 채팅'
    }
  }

  const onSubmit = async (data: NewChatFormData) => {
    setLoading(true)
    try {
      // 실제 구현에서는 chat_room 테이블에 저장
      const roomId = `room_${Date.now()}`
      const roomName = data.name || generateRoomName(data.type, data.participants)
      
      // 가상의 채팅방 생성 (실제로는 Supabase에 저장)
      console.log('Creating chat room:', {
        id: roomId,
        name: roomName,
        type: data.type,
        hospital_id: hospitalId,
        department_id: data.department_id,
        participants: [...data.participants, currentUserId],
        description: data.description,
        created_at: new Date().toISOString()
      })

      onRoomCreated(roomId)
    } catch (error) {
      console.error('Error creating chat room:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                새 채팅방 만들기
              </CardTitle>
              <CardDescription>
                새로운 대화를 시작하세요
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* 채팅방 유형 선택 */}
            <div className="space-y-2">
              <Label>채팅방 유형</Label>
              <div className="grid grid-cols-3 gap-3">
                <div 
                  className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                    watchedType === 'direct' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                  onClick={() => setValue('type', 'direct')}
                >
                  <MessageSquare className="h-5 w-5 text-green-600 mb-2" />
                  <div className="text-sm font-medium">개인 메시지</div>
                  <div className="text-xs text-gray-500">1:1 대화</div>
                </div>
                <div 
                  className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                    watchedType === 'group' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                  onClick={() => setValue('type', 'group')}
                >
                  <Users className="h-5 w-5 text-purple-600 mb-2" />
                  <div className="text-sm font-medium">그룹 채팅</div>
                  <div className="text-xs text-gray-500">여러 명과 대화</div>
                </div>
                <div 
                  className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                    watchedType === 'department' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                  onClick={() => setValue('type', 'department')}
                >
                  <Hash className="h-5 w-5 text-blue-600 mb-2" />
                  <div className="text-sm font-medium">부서 채팅</div>
                  <div className="text-xs text-gray-500">부서 전체 대화</div>
                </div>
              </div>
            </div>

            {/* 채팅방 이름 */}
            <div className="space-y-2">
              <Label htmlFor="name">채팅방 이름</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder={generateRoomName(watchedType, selectedParticipants)}
                disabled={loading}
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            {/* 부서 선택 (부서 채팅인 경우) */}
            {watchedType === 'department' && (
              <div className="space-y-2">
                <Label>부서 선택</Label>
                <Select
                  value={watchedDepartment || 'none'}
                  onValueChange={(value) => setValue('department_id', value === 'none' ? undefined : value)}
                  disabled={loading}
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
            )}

            {/* 참여자 검색 */}
            <div className="space-y-2">
              <Label>참여자 선택</Label>
              <Input
                placeholder="이름 또는 이메일로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* 선택된 참여자 */}
            {selectedParticipants.length > 0 && (
              <div className="space-y-2">
                <Label>선택된 참여자 ({selectedParticipants.length}명)</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedParticipants.map((participantId) => {
                    const participant = employees.find(emp => emp.id === participantId)
                    if (!participant) return null
                    
                    return (
                      <Badge key={participantId} variant="secondary" className="flex items-center gap-1">
                        {participant.name}
                        <button
                          type="button"
                          onClick={() => toggleParticipant(participantId)}
                          className="ml-1 hover:bg-gray-300 rounded-full"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 참여자 목록 */}
            <div className="space-y-2">
              <Label>직원 목록</Label>
              <ScrollArea className="h-48 border rounded-md">
                <div className="p-2 space-y-1">
                  {filteredEmployees
                    .filter(emp => emp.id !== currentUserId) // 자신 제외
                    .map((employee) => (
                    <div
                      key={employee.id}
                      className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded-md cursor-pointer"
                      onClick={() => toggleParticipant(employee.id)}
                    >
                      <Checkbox
                        checked={selectedParticipants.includes(employee.id)}
                        onChange={() => toggleParticipant(employee.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{employee.name}</div>
                        <div className="text-xs text-gray-500">{employee.email}</div>
                        <div className="text-xs text-gray-400">{employee.position}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              {errors.participants && (
                <p className="text-sm text-red-600">{errors.participants.message}</p>
              )}
            </div>

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
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                취소
              </Button>
              <Button type="submit" disabled={loading || selectedParticipants.length === 0}>
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    생성 중...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    채팅방 만들기
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