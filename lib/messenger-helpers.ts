import { createClient } from '@/lib/supabase'
import { getCurrentEmployee } from '@/lib/auth-helpers'
import { Database } from '@/lib/database.types'

// 개발용 임시 메시지 저장소
let tempMessages: Message[] = []
let tempRooms: ChatRoom[] = []

// 임시 참여자 저장소
let tempParticipants: { [roomId: string]: string[] } = {}

// 실시간 구독 콜백 저장소
const messageSubscriptions = new Map<string, ((message: Message) => void)[]>()

// 타입 정의는 migration 이후 자동 생성될 예정이므로 임시로 정의
interface ChatRoom {
  id: string
  name: string
  description?: string
  type: 'direct' | 'group' | 'department'
  hospital_id: string
  department_id?: string
  creator_id: string
  is_active: boolean
  created_at: string
  updated_at: string
}

interface Message {
  id: string
  room_id: string
  sender_id: string
  content: string
  message_type: 'text' | 'file' | 'image' | 'system'
  file_url?: string
  file_name?: string
  file_size?: number
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

interface ChatRoomParticipant {
  id: string
  room_id: string
  employee_id: string
  joined_at: string
  last_read_at: string
  is_active: boolean
}

/**
 * 채팅방 생성
 */
export async function createChatRoom(data: {
  name: string
  type: 'direct' | 'group' | 'department'
  description?: string
  department_id?: string
  participants: string[] // employee IDs
}): Promise<{ success: boolean; roomId?: string; error?: string }> {
  const supabase = createClient()
  
  try {
    const currentEmployee = await getCurrentEmployee()
    if (!currentEmployee) {
      return { success: false, error: '직원 정보를 찾을 수 없습니다' }
    }

    // 데이터베이스 저장 시도
    const { data: room, error: roomError } = await (supabase as any)
      .from('chat_room')
      .insert([{
        name: data.name,
        description: data.description,
        type: data.type,
        hospital_id: currentEmployee.hospital_id,
        department_id: data.department_id,
        creator_id: currentEmployee.id,
      }])
      .select()
      .single()

    if (roomError) {
      console.log('Database chat room creation failed, using temporary storage:', roomError.message)
      
      // 임시 저장소에 채팅방 생성
      const roomId = `temp_room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const tempRoom: ChatRoom = {
        id: roomId,
        name: data.name,
        description: data.description,
        type: data.type,
        hospital_id: currentEmployee.hospital_id,
        department_id: data.department_id,
        creator_id: currentEmployee.id,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      tempRooms.push(tempRoom)
      
      // 참여자 추가 (생성자 포함)
      const participantSet = new Set([currentEmployee.id, ...data.participants])
      tempParticipants[roomId] = Array.from(participantSet)
      
      // 환영 메시지 생성
      const welcomeMessage: Message = {
        id: `welcome_${roomId}`,
        room_id: roomId,
        sender_id: 'system',
        content: `${data.name} 채팅방에 오신 것을 환영합니다! 🎉`,
        message_type: 'system',
        is_edited: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sender: {
          id: 'system',
          name: '시스템',
          email: 'system@hospital.com'
        }
      }
      tempMessages.push(welcomeMessage)
      
      return { success: true, roomId }
    }

    // 데이터베이스 저장 성공 시 참여자 추가
    const participantSet = new Set([currentEmployee.id, ...data.participants])
    const allParticipants = Array.from(participantSet)
    const participants = allParticipants.map(employeeId => ({
      room_id: room.id,
      employee_id: employeeId,
    }))

    const { error: participantsError } = await (supabase as any)
      .from('chat_room_participant')
      .insert(participants)

    if (participantsError) throw participantsError

    return { success: true, roomId: room.id }
  } catch (error: any) {
    console.error('Error creating chat room:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 메시지 전송
 */
export async function sendMessage(data: {
  room_id: string
  content: string
  message_type?: 'text' | 'file' | 'image'
  file_url?: string
  file_name?: string
  file_size?: number
  reply_to_id?: string
}): Promise<{ success: boolean; message?: Message; error?: string }> {
  const supabase = createClient()
  
  try {
    const currentEmployee = await getCurrentEmployee()
    if (!currentEmployee) {
      return { success: false, error: '직원 정보를 찾을 수 없습니다' }
    }

    // 데이터베이스 저장 시도
    const { data: message, error } = await (supabase as any)
      .from('message')
      .insert([{
        room_id: data.room_id,
        sender_id: currentEmployee.id,
        content: data.content,
        message_type: data.message_type || 'text',
        file_url: data.file_url,
        file_name: data.file_name,
        file_size: data.file_size,
        reply_to_id: data.reply_to_id,
      }])
      .select(`
        *,
        sender:employee!sender_id(id, name, email, position)
      `)
      .single()

    if (error) {
      console.log('Database insert failed, using temporary storage:', error.message)
      
      // 임시 저장소에 메시지 저장
      const tempMessage: Message = {
        id: `temp_${Date.now()}_${Math.random()}`,
        room_id: data.room_id,
        sender_id: currentEmployee.id,
        content: data.content,
        message_type: data.message_type || 'text',
        file_url: data.file_url,
        file_name: data.file_name,
        file_size: data.file_size,
        reply_to_id: data.reply_to_id,
        is_edited: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sender: {
          id: currentEmployee.id,
          name: currentEmployee.name,
          email: currentEmployee.email,
          position: currentEmployee.position || undefined
        }
      }
      
      tempMessages.push(tempMessage)
      
      // 실시간 구독자들에게 알림
      const callbacks = messageSubscriptions.get(data.room_id) || []
      callbacks.forEach(callback => callback(tempMessage))
      
      return { success: true, message: tempMessage }
    }

    return { success: true, message: message as Message }
  } catch (error: any) {
    console.error('Error sending message:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 채팅방 목록 조회
 */
export async function getChatRooms(): Promise<ChatRoom[]> {
  const supabase = createClient()
  
  try {
    const currentEmployee = await getCurrentEmployee()
    if (!currentEmployee) {
      console.log('No current employee found, creating mock rooms for development')
      // 개발용 목 데이터 반환
      return [
        {
          id: 'general',
          name: '전체 공지',
          type: 'group' as const,
          hospital_id: 'mock-hospital',
          creator_id: 'mock-user',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'emergency',
          name: '응급상황',
          type: 'group' as const,
          hospital_id: 'mock-hospital',
          creator_id: 'mock-user',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]
    }

    // 실제 데이터베이스에서 조회 시도
    const { data, error } = await (supabase as any)
      .from('chat_room')
      .select(`
        *,
        participants:chat_room_participant!inner(
          employee_id,
          last_read_at,
          employee:employee(id, name, email, position)
        )
      `)
      .eq('chat_room_participant.employee_id', currentEmployee.id)
      .eq('chat_room_participant.is_active', true)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })

    if (error) {
      console.log('Database query failed, using mock data and temp rooms:', error.message)
      
      // 기본 목 데이터
      const mockRooms = [
        {
          id: 'general',
          name: '전체 공지',
          type: 'group' as const,
          hospital_id: currentEmployee.hospital_id,
          creator_id: currentEmployee.id,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]
      
      // 임시 생성된 채팅방들과 합치기
      const allRooms = [...mockRooms, ...tempRooms.filter(room => 
        room.hospital_id === currentEmployee.hospital_id &&
        (tempParticipants[room.id]?.includes(currentEmployee.id) || room.creator_id === currentEmployee.id)
      )]
      
      return allRooms
    }
    
    return data || []
  } catch (error) {
    console.error('Error fetching chat rooms:', error)
    return []
  }
}

/**
 * 채팅방 메시지 조회
 */
export async function getChatMessages(roomId: string, limit: number = 50): Promise<Message[]> {
  const supabase = createClient()
  
  try {
    const currentEmployee = await getCurrentEmployee()
    
    const { data, error } = await (supabase as any)
      .from('message')
      .select(`
        *,
        sender:employee!sender_id(id, name, email, position),
        reply_to:message!reply_to_id(id, content, sender:employee!sender_id(name))
      `)
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.log('Message query failed, using temporary storage:', error.message)
      
      // 임시 저장소에서 해당 방의 메시지 조회
      const roomMessages = tempMessages
        .filter(msg => msg.room_id === roomId)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      
      // 임시 저장소에 메시지가 없으면 초기 메시지 생성
      if (roomMessages.length === 0) {
        const initialMessage: Message = {
          id: '1',
          room_id: roomId,
          sender_id: currentEmployee?.id || 'mock-user',
          content: '안녕하세요! 새로운 실시간 메신저 시스템입니다. 메시지를 입력해 보세요.',
          message_type: 'text',
          file_url: undefined,
          file_name: undefined,
          file_size: undefined,
          reply_to_id: undefined,
          is_edited: false,
          created_at: new Date(Date.now() - 3600000).toISOString(),
          updated_at: new Date(Date.now() - 3600000).toISOString(),
          sender: {
            id: currentEmployee?.id || 'mock-user',
            name: currentEmployee?.name || '시스템',
            email: currentEmployee?.email || 'system@hospital.com',
            position: currentEmployee?.position || '관리자'
          }
        }
        tempMessages.push(initialMessage)
        return [initialMessage]
      }
      
      return roomMessages
    }
    
    return (data || []).reverse() // 최신 메시지가 아래로 오도록
  } catch (error) {
    console.error('Error fetching messages:', error)
    return []
  }
}

/**
 * 읽음 상태 업데이트
 */
export async function markAsRead(roomId: string): Promise<boolean> {
  const supabase = createClient()
  
  try {
    const currentEmployee = await getCurrentEmployee()
    if (!currentEmployee) return false

    const { error } = await (supabase as any)
      .from('chat_room_participant')
      .update({ last_read_at: new Date().toISOString() })
      .eq('room_id', roomId)
      .eq('employee_id', currentEmployee.id)

    if (error) {
      console.log('Database mark as read failed, using temporary storage:', error.message)
      // 임시 저장소에서는 읽음 상태를 메모리에서만 관리
      // 실제 구현에서는 여기서 읽음 상태를 업데이트할 수 있음
      return true
    }
    
    return true
  } catch (error) {
    console.error('Error marking as read:', error)
    return false
  }
}

/**
 * 메시지 반응 추가/제거
 */
export async function toggleMessageReaction(
  messageId: string, 
  reaction: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()
  
  try {
    const currentEmployee = await getCurrentEmployee()
    if (!currentEmployee) {
      return { success: false, error: '직원 정보를 찾을 수 없습니다' }
    }

    // 기존 반응 확인
    const { data: existing } = await (supabase as any)
      .from('message_reaction')
      .select('id')
      .eq('message_id', messageId)
      .eq('employee_id', currentEmployee.id)
      .eq('reaction', reaction)
      .single()

    if (existing) {
      // 반응 제거
      const { error } = await (supabase as any)
        .from('message_reaction')
        .delete()
        .eq('id', existing.id)
      
      if (error) throw error
    } else {
      // 반응 추가
      const { error } = await (supabase as any)
        .from('message_reaction')
        .insert([{
          message_id: messageId,
          employee_id: currentEmployee.id,
          reaction,
        }])
      
      if (error) throw error
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error toggling reaction:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 실시간 메시지 구독
 */
export function subscribeToMessages(
  roomId: string, 
  onNewMessage: (message: Message) => void,
  onMessageUpdate: (message: Message) => void
) {
  const supabase = createClient()
  
  // 임시 저장소용 구독 추가
  if (!messageSubscriptions.has(roomId)) {
    messageSubscriptions.set(roomId, [])
  }
  messageSubscriptions.get(roomId)!.push(onNewMessage)
  
  // 실제 데이터베이스 구독 시도
  const channel = supabase
    .channel(`room:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'message',
        filter: `room_id=eq.${roomId}`
      },
      async (payload) => {
        try {
          // 새 메시지의 sender 정보를 가져와서 콜백 실행
          const { data: messageWithSender } = await (supabase as any)
            .from('message')
            .select(`
              *,
              sender:employee!sender_id(id, name, email, position)
            `)
            .eq('id', payload.new.id)
            .single()
          
          if (messageWithSender) {
            onNewMessage(messageWithSender as Message)
          }
        } catch (error) {
          console.log('Real-time subscription failed, using temporary storage')
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'message',
        filter: `room_id=eq.${roomId}`
      },
      async (payload) => {
        try {
          const { data: messageWithSender } = await (supabase as any)
            .from('message')
            .select(`
              *,
              sender:employee!sender_id(id, name, email, position)
            `)
            .eq('id', payload.new.id)
            .single()
          
          if (messageWithSender) {
            onMessageUpdate(messageWithSender as Message)
          }
        } catch (error) {
          console.log('Real-time update subscription failed')
        }
      }
    )
    .subscribe()

  return () => {
    // 임시 저장소 구독 해제
    const callbacks = messageSubscriptions.get(roomId) || []
    const index = callbacks.indexOf(onNewMessage)
    if (index > -1) {
      callbacks.splice(index, 1)
    }
    
    // 실제 데이터베이스 구독 해제
    supabase.removeChannel(channel)
  }
}