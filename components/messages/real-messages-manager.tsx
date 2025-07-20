'use client'

import { useState, useEffect, useRef } from 'react'
import { getCurrentEmployee } from '@/lib/auth-helpers'
import { 
  getChatRooms, 
  getChatMessages, 
  sendMessage, 
  markAsRead, 
  subscribeToMessages,
  createChatRoom
} from '@/lib/messenger-helpers'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  MessageSquare, 
  Plus, 
  Send, 
  Search,
  Users,
  Hash,
  Clock,
  MoreVertical,
  Settings
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CreateChatModal } from './create-chat-modal'

// 메시지 관련 타입 정의
interface ChatRoom {
  id: string
  name: string
  type: 'direct' | 'group' | 'department'
  hospital_id: string
  department_id?: string
  creator_id: string
  is_active: boolean
  created_at: string
  updated_at: string
  participants?: any[]
  last_message?: Message
  unread_count?: number
}

interface Message {
  id: string
  room_id: string
  sender_id: string
  content: string
  message_type: 'text' | 'file' | 'image' | 'system'
  file_url?: string
  file_name?: string
  reply_to_id?: string
  is_edited: boolean
  created_at: string
  updated_at: string
  sender?: {
    id: string
    name: string
    email: string
    position?: string
  }
}

export function RealMessagesManager() {
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([])
  const [currentRoom, setCurrentRoom] = useState<ChatRoom | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [currentEmployee, setCurrentEmployee] = useState<any>(null)
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showNewChatModal, setShowNewChatModal] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const unsubscribeRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    initializeData()
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
      }
    }
  }, [])

  useEffect(() => {
    if (currentRoom) {
      loadMessages(currentRoom.id)
      markAsRead(currentRoom.id)
      
      // 실시간 메시지 구독
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
      }
      
      unsubscribeRef.current = subscribeToMessages(
        currentRoom.id,
        (message) => {
          setMessages(prev => [...prev, message])
          scrollToBottom()
        },
        (message) => {
          setMessages(prev => prev.map(m => m.id === message.id ? message : m))
        }
      )
    }
  }, [currentRoom])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const initializeData = async () => {
    try {
      const employee = await getCurrentEmployee()
      setCurrentEmployee(employee)
      
      if (employee) {
        await loadChatRooms()
      }
    } catch (error) {
      console.error('Error initializing data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadChatRooms = async () => {
    try {
      const rooms = await getChatRooms()
      setChatRooms(rooms)
      
      // 첫 번째 채팅방 자동 선택
      if (rooms.length > 0 && !currentRoom) {
        setCurrentRoom(rooms[0])
      }
    } catch (error) {
      console.error('Error loading chat rooms:', error)
    }
  }

  const loadMessages = async (roomId: string) => {
    try {
      const roomMessages = await getChatMessages(roomId)
      setMessages(roomMessages)
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newMessage.trim() || !currentRoom || sending) return

    setSending(true)
    
    try {
      const result = await sendMessage({
        room_id: currentRoom.id,
        content: newMessage.trim(),
      })

      if (result.success && result.message) {
        // 실시간 구독을 통해 메시지가 추가되므로 여기서는 별도 처리 불필요
        setNewMessage('')
      } else {
        throw new Error(result.error || '메시지 전송에 실패했습니다')
      }
    } catch (error: any) {
      console.error('Error sending message:', error)
      alert(error.message || '메시지 전송에 실패했습니다')
    } finally {
      setSending(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const isToday = date.toDateString() === today.toDateString()
    
    if (isToday) {
      return formatTime(dateString)
    } else {
      return date.toLocaleDateString('ko-KR', {
        month: 'short',
        day: 'numeric'
      })
    }
  }

  const getRoomDisplayName = (room: ChatRoom) => {
    if (room.type === 'direct') {
      // 1:1 대화의 경우 상대방 이름 표시
      const otherParticipant = room.participants?.find(
        p => p.employee_id !== currentEmployee?.id
      )
      return otherParticipant?.employee?.name || room.name
    }
    return room.name
  }

  const getRoomIcon = (room: ChatRoom) => {
    switch (room.type) {
      case 'direct':
        return <Users className="h-4 w-4" />
      case 'department':
        return <Hash className="h-4 w-4" />
      default:
        return <MessageSquare className="h-4 w-4" />
    }
  }

  const filteredRooms = chatRooms.filter(room =>
    getRoomDisplayName(room).toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[700px]">
      {/* 채팅방 목록 */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              메시지
            </CardTitle>
            <Button size="sm" onClick={() => setShowNewChatModal(true)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            {filteredRooms.length}개의 대화
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {/* 검색 */}
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="대화 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* 채팅방 목록 */}
          <ScrollArea className="h-[500px]">
            {filteredRooms.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>진행 중인 대화가 없습니다</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => setShowNewChatModal(true)}
                >
                  새 대화 시작
                </Button>
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {filteredRooms.map((room) => (
                  <div
                    key={room.id}
                    onClick={() => setCurrentRoom(room)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      currentRoom?.id === room.id
                        ? 'bg-blue-50 border border-blue-200'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src="" />
                        <AvatarFallback>
                          {getRoomDisplayName(room).charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            {getRoomIcon(room)}
                            <h3 className="font-medium text-sm truncate">
                              {getRoomDisplayName(room)}
                            </h3>
                          </div>
                          {room.last_message && (
                            <span className="text-xs text-gray-500">
                              {formatDate(room.last_message.created_at)}
                            </span>
                          )}
                        </div>
                        
                        {room.last_message && (
                          <p className="text-xs text-gray-500 truncate mt-1">
                            {room.last_message.sender?.name}: {room.last_message.content}
                          </p>
                        )}
                        
                        <div className="flex items-center justify-between mt-1">
                          <Badge variant="outline" className="text-xs">
                            {room.type === 'direct' ? '개인' : 
                             room.type === 'department' ? '부서' : '그룹'}
                          </Badge>
                          {room.unread_count && room.unread_count > 0 && (
                            <Badge className="bg-red-500 text-white">
                              {room.unread_count}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* 메시지 영역 */}
      <Card className="lg:col-span-2">
        {currentRoom ? (
          <>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src="" />
                    <AvatarFallback>
                      {getRoomDisplayName(currentRoom).charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">
                      {getRoomDisplayName(currentRoom)}
                    </CardTitle>
                    <CardDescription>
                      {currentRoom.participants?.length || 0}명 참여
                    </CardDescription>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="p-0 flex flex-col">
              {/* 메시지 목록 */}
              <ScrollArea className="flex-1 h-[450px] p-4">
                <div className="space-y-4">
                  {messages.map((message, index) => {
                    const isOwn = message.sender_id === currentEmployee?.id
                    const showAvatar = index === 0 || 
                      messages[index - 1].sender_id !== message.sender_id
                    
                    return (
                      <div
                        key={message.id}
                        className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}
                      >
                        {!isOwn && (
                          <Avatar className={`h-8 w-8 ${showAvatar ? '' : 'invisible'}`}>
                            <AvatarImage src="" />
                            <AvatarFallback>
                              {message.sender?.name?.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        
                        <div className={`flex-1 ${isOwn ? 'text-right' : ''}`}>
                          {showAvatar && !isOwn && (
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium">
                                {message.sender?.name || '알 수 없는 사용자'}
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatTime(message.created_at)}
                              </span>
                            </div>
                          )}
                          {showAvatar && isOwn && (
                            <div className="flex items-center justify-end gap-2 mb-1">
                              <span className="text-xs text-gray-500">
                                {formatTime(message.created_at)}
                              </span>
                              <span className="text-sm font-medium">
                                {message.sender?.name || currentEmployee?.name || '나'}
                              </span>
                            </div>
                          )}
                          
                          <div
                            className={`inline-block p-3 rounded-lg max-w-[70%] ${
                              isOwn
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-900'
                            }`}
                          >
                            <p className="text-sm leading-relaxed">
                              {message.content}
                            </p>
                            {isOwn && !showAvatar && (
                              <span className="text-xs opacity-75 block mt-1">
                                {formatTime(message.created_at)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              <Separator />

              {/* 메시지 입력 */}
              <div className="p-4">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <Textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="메시지를 입력하세요..."
                    className="flex-1 min-h-[44px] max-h-32"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage(e)
                      }
                    }}
                    disabled={sending}
                  />
                  <Button 
                    type="submit" 
                    disabled={!newMessage.trim() || sending}
                    className="self-end"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </CardContent>
          </>
        ) : (
          <CardContent className="flex items-center justify-center h-full">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">대화를 선택하여 메시지를 시작하세요</p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* 새 채팅방 생성 모달 */}
      {showNewChatModal && (
        <CreateChatModal
          onClose={() => setShowNewChatModal(false)}
          onChatRoomCreated={() => {
            setShowNewChatModal(false)
            loadChatRooms() // 채팅방 목록 새로고침
          }}
        />
      )}
    </div>
  )
}