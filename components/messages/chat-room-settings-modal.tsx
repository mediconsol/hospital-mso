'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  X, 
  Settings, 
  Users, 
  UserPlus, 
  UserMinus, 
  Crown, 
  Shield,
  Trash2,
  Edit
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface ChatRoom {
  id: string
  name: string
  description?: string
  type: 'direct' | 'group' | 'department' | 'project'
  hospital_id: string
  creator_id: string
  is_active: boolean
  created_at: string
  updated_at: string
  participants?: any[]
}

interface Participant {
  id: string
  employee_id: string
  role: 'admin' | 'member'
  is_active: boolean
  joined_at: string
  employee: {
    id: string
    name: string
    email: string
    position?: string
  }
}

interface ChatRoomSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
  room: ChatRoom | null
  currentEmployee: any
}

export function ChatRoomSettingsModal({ 
  isOpen, 
  onClose, 
  onUpdate, 
  room, 
  currentEmployee 
}: ChatRoomSettingsModalProps) {
  const [roomName, setRoomName] = useState('')
  const [roomDescription, setRoomDescription] = useState('')
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('info')
  const [showAddParticipant, setShowAddParticipant] = useState(false)
  
  const supabase = createClient()

  useEffect(() => {
    if (isOpen && room) {
      setRoomName(room.name)
      setRoomDescription(room.description || '')
      loadParticipants()
    }
  }, [isOpen, room])

  const loadParticipants = async () => {
    if (!room) return

    try {
      const { data, error } = await supabase
        .from('chat_room_participant')
        .select(`
          *,
          employee:employee_id (
            id,
            name,
            email,
            position
          )
        `)
        .eq('room_id', room.id)
        .eq('is_active', true)
        .order('joined_at')

      if (error) {
        console.error('Error loading participants:', error)
        // 오류 시 목 데이터 생성
        const mockParticipants = [
          {
            id: 'mock-1',
            employee_id: currentEmployee?.id || 'mock-user',
            role: 'admin',
            is_active: true,
            joined_at: new Date().toISOString(),
            employee: {
              id: currentEmployee?.id || 'mock-user',
              name: currentEmployee?.name || '현재 사용자',
              email: currentEmployee?.email || 'user@example.com',
              position: currentEmployee?.position || '직원'
            }
          }
        ]
        setParticipants(mockParticipants)
        return
      }

      setParticipants(data || [])
    } catch (error) {
      console.error('Error loading participants:', error)
      setParticipants([])
    }
  }

  const isAdmin = () => {
    if (!currentEmployee || !room) return false
    return room.creator_id === currentEmployee.id || 
           participants.find(p => p.employee_id === currentEmployee.id)?.role === 'admin'
  }

  const handleUpdateRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!room || !isAdmin()) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('chat_room')
        .update({
          name: roomName.trim(),
          description: roomDescription.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', room.id)

      if (error) throw error

      onUpdate()
      alert('채팅방 정보가 업데이트되었습니다.')
    } catch (error: any) {
      console.error('Error updating room:', error)
      alert(error.message || '업데이트에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleChangeRole = async (participantId: string, newRole: 'admin' | 'member') => {
    if (!isAdmin()) return

    try {
      const { error } = await supabase
        .from('chat_room_participant')
        .update({ role: newRole })
        .eq('id', participantId)

      if (error) throw error

      await loadParticipants()
      alert(`권한이 ${newRole === 'admin' ? '관리자' : '멤버'}로 변경되었습니다.`)
    } catch (error: any) {
      console.error('Error changing role:', error)
      alert(error.message || '권한 변경에 실패했습니다.')
    }
  }

  const handleRemoveParticipant = async (participantId: string, employeeName: string) => {
    if (!isAdmin()) return
    
    if (!confirm(`${employeeName}님을 채팅방에서 내보내시겠습니까?`)) return

    try {
      const { error } = await supabase
        .from('chat_room_participant')
        .update({ is_active: false })
        .eq('id', participantId)

      if (error) throw error

      await loadParticipants()
      alert(`${employeeName}님이 채팅방에서 제거되었습니다.`)
    } catch (error: any) {
      console.error('Error removing participant:', error)
      alert(error.message || '참여자 제거에 실패했습니다.')
    }
  }

  const handleDeleteRoom = async () => {
    if (!room || !isAdmin()) return
    
    if (!confirm('채팅방을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return

    try {
      const { error } = await supabase
        .from('chat_room')
        .update({ is_active: false })
        .eq('id', room.id)

      if (error) throw error

      onUpdate()
      onClose()
      alert('채팅방이 삭제되었습니다.')
    } catch (error: any) {
      console.error('Error deleting room:', error)
      alert(error.message || '채팅방 삭제에 실패했습니다.')
    }
  }

  const getRoleIcon = (role: string) => {
    return role === 'admin' ? <Crown className="h-4 w-4 text-yellow-500" /> : <Shield className="h-4 w-4 text-gray-400" />
  }

  const getRoleLabel = (role: string) => {
    return role === 'admin' ? '관리자' : '멤버'
  }

  if (!isOpen || !room) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="w-full max-w-2xl my-8">
        <Card className="w-full max-h-none">
          <CardHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  채팅방 설정
                </CardTitle>
                <CardDescription>
                  {room.name} 채팅방 관리
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="max-h-[calc(90vh-8rem)] overflow-y-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="info">기본 정보</TabsTrigger>
              <TabsTrigger value="participants">참여자 ({participants.length})</TabsTrigger>
              <TabsTrigger value="settings">설정</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-4">
              <form onSubmit={handleUpdateRoom} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="roomName">채팅방 이름</Label>
                  <Input
                    id="roomName"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    disabled={!isAdmin()}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="roomDescription">설명</Label>
                  <Textarea
                    id="roomDescription"
                    value={roomDescription}
                    onChange={(e) => setRoomDescription(e.target.value)}
                    rows={3}
                    disabled={!isAdmin()}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-gray-600">채팅방 유형</Label>
                    <p className="capitalize">{room.type}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600">생성일</Label>
                    <p>{new Date(room.created_at).toLocaleDateString('ko-KR')}</p>
                  </div>
                </div>

                {isAdmin() && (
                  <Button type="submit" disabled={loading}>
                    {loading ? '저장 중...' : '변경사항 저장'}
                  </Button>
                )}
              </form>
            </TabsContent>

            <TabsContent value="participants" className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>참여자 목록</Label>
                {isAdmin() && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAddParticipant(true)}
                  >
                    <UserPlus className="h-4 w-4 mr-1" />
                    참여자 추가
                  </Button>
                )}
              </div>

              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {participants.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p>참여자 정보를 불러오는 중...</p>
                    </div>
                  ) : (
                    participants.map((participant) => (
                    <div
                      key={participant.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src="" />
                          <AvatarFallback>
                            {participant.employee.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">
                              {participant.employee.name}
                            </p>
                            <Badge variant={participant.role === 'admin' ? 'default' : 'secondary'} className="text-xs">
                              {getRoleIcon(participant.role)}
                              {getRoleLabel(participant.role)}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500">
                            {participant.employee.email}
                          </p>
                          {participant.employee.position && (
                            <p className="text-xs text-gray-400">
                              {participant.employee.position}
                            </p>
                          )}
                        </div>
                      </div>

                      {isAdmin() && participant.employee_id !== currentEmployee.id && (
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleChangeRole(
                              participant.id, 
                              participant.role === 'admin' ? 'member' : 'admin'
                            )}
                          >
                            {participant.role === 'admin' ? (
                              <Shield className="h-4 w-4" />
                            ) : (
                              <Crown className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveParticipant(participant.id, participant.employee.name)}
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              {isAdmin() ? (
                <div className="space-y-4">
                  <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                    <h3 className="font-medium text-red-900 mb-2">위험 구역</h3>
                    <p className="text-sm text-red-700 mb-4">
                      아래 작업들은 되돌릴 수 없습니다. 신중하게 진행하세요.
                    </p>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDeleteRoom}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      채팅방 삭제
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Shield className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p>관리자만 설정을 변경할 수 있습니다.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
