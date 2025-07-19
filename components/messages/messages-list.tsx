'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Clock, 
  Reply, 
  MoreVertical, 
  Heart,
  Download,
  Eye
} from 'lucide-react'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface Message {
  id: string
  room_id: string
  sender_id: string
  content: string
  message_type: 'text' | 'file' | 'image'
  file_url?: string
  created_at: string
  sender?: {
    id: string
    name: string
    email: string
    position: string
  }
}

interface MessagesListProps {
  messages: Message[]
  currentUserId: string
  onReply?: (messageId: string) => void
  onReact?: (messageId: string, reaction: string) => void
}

export function MessagesList({ 
  messages, 
  currentUserId, 
  onReply, 
  onReact 
}: MessagesListProps) {
  
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit'
      })
    } else {
      return date.toLocaleDateString('ko-KR', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  }

  const getFileIcon = (messageType: string) => {
    switch (messageType) {
      case 'image':
        return '🖼️'
      case 'file':
        return '📎'
      default:
        return null
    }
  }

  const isMyMessage = (senderId: string) => senderId === currentUserId

  return (
    <ScrollArea className="flex-1 p-4">
      <div className="space-y-4">
        {messages.map((message, index) => {
          const showAvatar = index === 0 || 
            messages[index - 1].sender_id !== message.sender_id ||
            new Date(message.created_at).getTime() - new Date(messages[index - 1].created_at).getTime() > 300000 // 5분

          const isMyMsg = isMyMessage(message.sender_id)

          return (
            <div key={message.id} className={`flex gap-3 group ${isMyMsg ? 'justify-end' : ''}`}>
              {!isMyMsg && (
                <div className="flex-shrink-0">
                  {showAvatar ? (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {message.sender?.name.substring(0, 1) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="w-8" />
                  )}
                </div>
              )}

              <div className={`flex-1 max-w-[85%] ${isMyMsg ? 'items-end' : ''}`}>
                {!isMyMsg && showAvatar && (
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">
                      {message.sender?.name}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {message.sender?.position}
                    </Badge>
                  </div>
                )}

                <div className={`relative ${isMyMsg ? 'ml-auto' : ''}`}>
                  <div className={`rounded-lg p-3 ${
                    isMyMsg 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-900'
                  }`}>
                    {message.message_type === 'text' ? (
                      <div className="text-sm whitespace-pre-wrap">
                        {message.content}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">
                            {getFileIcon(message.message_type)}
                          </span>
                          <span className="text-sm">{message.content}</span>
                        </div>
                        {message.file_url && (
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              <Download className="h-3 w-3 mr-1" />
                              다운로드
                            </Button>
                            {message.message_type === 'image' && (
                              <Button size="sm" variant="outline">
                                <Eye className="h-3 w-3 mr-1" />
                                미리보기
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 메시지 액션 버튼 */}
                  <div className={`absolute top-0 ${isMyMsg ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'} opacity-0 group-hover:opacity-100 transition-opacity`}>
                    <div className="flex items-center gap-1 px-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 hover:bg-gray-200"
                        onClick={() => onReact?.(message.id, '👍')}
                      >
                        <Heart className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 hover:bg-gray-200"
                        onClick={() => onReply?.(message.id)}
                      >
                        <Reply className="h-3 w-3" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 hover:bg-gray-200"
                          >
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            인용하여 답장
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            메시지 복사
                          </DropdownMenuItem>
                          {isMyMsg && (
                            <>
                              <DropdownMenuItem>
                                수정
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600">
                                삭제
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>

                <div className={`flex items-center gap-1 mt-1 text-xs text-gray-500 ${
                  isMyMsg ? 'justify-end' : ''
                }`}>
                  <Clock className="h-3 w-3" />
                  {formatTime(message.created_at)}
                </div>
              </div>

              {isMyMsg && (
                <div className="flex-shrink-0">
                  {showAvatar ? (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs bg-blue-600 text-white">
                        나
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="w-8" />
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </ScrollArea>
  )
}