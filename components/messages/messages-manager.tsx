'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { MessagesList } from './messages-list'
import { NewMessageModal } from './new-message-modal'
import { 
  MessageCircle, 
  Plus, 
  Search, 
  Send,
  Users,
  Hash,
  MessageSquare,
  Settings,
  Clock
} from 'lucide-react'
import { Database } from '@/lib/database.types'

type HospitalOrMSO = Database['public']['Tables']['hospital_or_mso']['Row']
type Employee = Database['public']['Tables']['employee']['Row']
type Department = Database['public']['Tables']['department']['Row']

// 메시지 관련 타입 정의
interface ChatRoom {
  id: string
  name: string
  type: 'direct' | 'group' | 'department'
  hospital_id: string
  department_id?: string
  participants: string[]
  created_at: string
  updated_at: string
  last_message?: Message
  unread_count?: number
}

interface Message {
  id: string
  room_id: string
  sender_id: string
  content: string
  message_type: 'text' | 'file' | 'image'
  file_url?: string
  created_at: string
  sender?: Employee
}

interface MessagesManagerProps {
  userId: string
}

export function MessagesManager({ userId }: MessagesManagerProps) {
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [organizations, setOrganizations] = useState<HospitalOrMSO[]>([])
  const [selectedOrg, setSelectedOrg] = useState<string>('')
  const [selectedRoom, setSelectedRoom] = useState<string>('')
  const [newMessage, setNewMessage] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showNewMessage, setShowNewMessage] = useState(false)
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchOrganizations()
  }, [])

  useEffect(() => {
    if (selectedOrg) {
      fetchDepartments(selectedOrg)
      fetchEmployees(selectedOrg)
      fetchChatRooms()
    }
  }, [selectedOrg])

  useEffect(() => {
    if (selectedRoom) {
      fetchMessages(selectedRoom)
      // 실시간 메시지 구독 설정
      const subscription = supabase
        .channel(`room_${selectedRoom}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'message',
          filter: `room_id=eq.${selectedRoom}`
        }, (payload) => {
          setMessages(prev => [...prev, payload.new as Message])
        })
        .subscribe()

      return () => {
        subscription.unsubscribe()
      }
    }
  }, [selectedRoom])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('hospital_or_mso')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setOrganizations(data || [])
      
      if (data && data.length > 0) {
        setSelectedOrg(data[0].id)
      }
    } catch (error) {
      console.error('Error fetching organizations:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchDepartments = async (hospitalId: string) => {
    try {
      const { data, error } = await supabase
        .from('department')
        .select('*')
        .eq('hospital_id', hospitalId)
        .order('name', { ascending: true })

      if (error) throw error
      setDepartments(data || [])
    } catch (error) {
      console.error('Error fetching departments:', error)
    }
  }

  const fetchEmployees = async (hospitalId: string) => {
    try {
      const { data, error } = await supabase
        .from('employee')
        .select('*')
        .eq('hospital_id', hospitalId)
        .eq('status', 'active')
        .order('name', { ascending: true })

      if (error) throw error
      setEmployees(data || [])
    } catch (error) {
      console.error('Error fetching employees:', error)
    }
  }

  const fetchChatRooms = async () => {
    try {
      // 실제 구현에서는 chat_room 테이블에서 가져와야 하지만,
      // 현재는 기존 employee 데이터를 활용해 가상의 채팅방을 생성
      const mockRooms: ChatRoom[] = [
        {
          id: 'general',
          name: '전체 공지',
          type: 'group',
          hospital_id: selectedOrg,
          participants: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          unread_count: 3
        },
        {
          id: 'emergency',
          name: '응급상황',
          type: 'group',
          hospital_id: selectedOrg,
          participants: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          unread_count: 0
        }
      ]

      // 부서별 채팅방 추가
      departments.forEach(dept => {
        mockRooms.push({
          id: `dept_${dept.id}`,
          name: dept.name,
          type: 'department',
          hospital_id: selectedOrg,
          department_id: dept.id,
          participants: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          unread_count: Math.floor(Math.random() * 5)
        })
      })

      setChatRooms(mockRooms)
      
      // 첫 번째 방 자동 선택
      if (mockRooms.length > 0 && !selectedRoom) {
        setSelectedRoom(mockRooms[0].id)
      }
    } catch (error) {
      console.error('Error fetching chat rooms:', error)
    }
  }

  const fetchMessages = async (roomId: string) => {
    try {
      // 실제 구현에서는 message 테이블에서 가져와야 하지만,
      // 현재는 가상의 메시지를 생성
      const mockMessages: Message[] = [
        {
          id: '1',
          room_id: roomId,
          sender_id: 'user1',
          content: '안녕하세요! 새로운 정책 문서가 업데이트되었습니다.',
          message_type: 'text',
          created_at: new Date(Date.now() - 3600000).toISOString(),
          sender: {
            id: 'user1',
            name: '김관리자',
            email: 'admin@hospital.com',
            position: '관리자',
            department_id: 'dept1',
            hospital_id: selectedOrg,
            status: 'active',
            phone: '010-1234-5678',
            hire_date: '2023-01-01',
            role: 'admin',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        },
        {
          id: '2',
          room_id: roomId,
          sender_id: 'user2',
          content: '확인했습니다. 언제부터 적용되나요?',
          message_type: 'text',
          created_at: new Date(Date.now() - 1800000).toISOString(),
          sender: {
            id: 'user2',
            name: '이직원',
            email: 'employee@hospital.com',
            position: '직원',
            department_id: 'dept1',
            hospital_id: selectedOrg,
            status: 'active',
            phone: '010-5678-1234',
            hire_date: '2023-02-01',
            role: 'employee',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        },
        {
          id: '3',
          room_id: roomId,
          sender_id: 'user1',
          content: '다음 주 월요일부터 적용됩니다. 자세한 내용은 문서 관리 페이지를 확인해주세요.',
          message_type: 'text',
          created_at: new Date(Date.now() - 900000).toISOString(),
          sender: {
            id: 'user1',
            name: '김관리자',
            email: 'admin@hospital.com',
            position: '관리자',
            department_id: 'dept1',
            hospital_id: selectedOrg,
            status: 'active',
            phone: '010-1234-5678',
            hire_date: '2023-01-01',
            role: 'admin',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        }
      ]

      setMessages(mockMessages)
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedRoom) return

    try {
      const message: Message = {
        id: Date.now().toString(),
        room_id: selectedRoom,
        sender_id: userId,
        content: newMessage.trim(),
        message_type: 'text',
        created_at: new Date().toISOString(),
        sender: {
          id: userId,
          name: '나',
          email: 'me@hospital.com',
          position: '직원',
          department_id: 'dept1',
          hospital_id: selectedOrg,
          status: 'active',
          phone: '010-0000-0000',
          hire_date: '2023-01-01',
          role: 'employee',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      }

      setMessages(prev => [...prev, message])
      setNewMessage('')

      // 실제 구현에서는 Supabase에 메시지 저장
      // await supabase.from('message').insert([message])
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const filteredRooms = chatRooms.filter(room =>
    room.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const selectedRoomData = chatRooms.find(room => room.id === selectedRoom)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (organizations.length === 0) {
    return (
      <div className="text-center py-8">
        <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">먼저 조직을 등록해주세요.</p>
        <p className="text-sm text-gray-400 mt-2">
          조직 관리 페이지에서 병원 또는 MSO를 등록하세요.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-200px)]">
      {/* 사이드바: 조직 선택 및 채팅방 목록 */}
      <div className="lg:col-span-1 space-y-4">
        {/* 조직 선택 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">조직 선택</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedOrg} onValueChange={setSelectedOrg}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="조직을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* 채팅방 목록 */}
        <Card className="flex-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">채팅방</CardTitle>
              <Button size="sm" onClick={() => setShowNewMessage(true)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="채팅방 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              <div className="space-y-1 p-3">
                {filteredRooms.map((room) => (
                  <div
                    key={room.id}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedRoom === room.id
                        ? 'bg-blue-50 border border-blue-200'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedRoom(room.id)}
                  >
                    <div className="flex-shrink-0">
                      {room.type === 'direct' ? (
                        <MessageSquare className="h-5 w-5 text-green-600" />
                      ) : room.type === 'department' ? (
                        <Hash className="h-5 w-5 text-blue-600" />
                      ) : (
                        <Users className="h-5 w-5 text-purple-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium truncate">{room.name}</p>
                        {room.unread_count && room.unread_count > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {room.unread_count}
                          </Badge>
                        )}
                      </div>
                      {room.last_message && (
                        <p className="text-xs text-gray-500 truncate">
                          {room.last_message.content}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* 메인 채팅 영역 */}
      <div className="lg:col-span-3">
        {selectedRoomData ? (
          <Card className="h-full flex flex-col">
            {/* 채팅방 헤더 */}
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {selectedRoomData.type === 'direct' ? (
                    <MessageSquare className="h-5 w-5 text-green-600" />
                  ) : selectedRoomData.type === 'department' ? (
                    <Hash className="h-5 w-5 text-blue-600" />
                  ) : (
                    <Users className="h-5 w-5 text-purple-600" />
                  )}
                  <div>
                    <CardTitle className="text-lg">{selectedRoomData.name}</CardTitle>
                    <CardDescription>
                      {selectedRoomData.type === 'department' ? '부서 채팅방' :
                       selectedRoomData.type === 'group' ? '그룹 채팅방' : '개인 메시지'}
                    </CardDescription>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>

            {/* 메시지 목록 */}
            <CardContent className="flex-1 p-0">
              <ScrollArea className="h-[400px] p-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div key={message.id} className="flex gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {message.sender?.name.substring(0, 1)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">
                            {message.sender?.name}
                          </span>
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(message.created_at).toLocaleTimeString('ko-KR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <div className="bg-gray-100 rounded-lg p-3 text-sm">
                          {message.content}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            </CardContent>

            {/* 메시지 입력 */}
            <div className="border-t p-4">
              <div className="flex gap-3">
                <Textarea
                  placeholder="메시지를 입력하세요..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  rows={2}
                  className="resize-none"
                />
                <Button 
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  size="sm"
                  className="self-end"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="h-full flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                채팅방을 선택하세요
              </h3>
              <p className="text-gray-500">
                왼쪽에서 채팅방을 선택하여 대화를 시작하세요.
              </p>
            </div>
          </Card>
        )}
      </div>

      {/* 새 메시지 모달 */}
      {showNewMessage && (
        <NewMessageModal
          employees={employees}
          departments={departments}
          hospitalId={selectedOrg}
          currentUserId={userId}
          onClose={() => setShowNewMessage(false)}
          onRoomCreated={(roomId) => {
            setShowNewMessage(false)
            setSelectedRoom(roomId)
            fetchChatRooms()
          }}
        />
      )}
    </div>
  )
}