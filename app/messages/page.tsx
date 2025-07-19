'use client'

import { useAuth } from '@/components/auth/auth-provider'
import { IntranetLayout } from '@/components/layout/intranet-layout'
import { RealMessagesManager } from '@/components/messages/real-messages-manager'
import { Badge } from '@/components/ui/badge'
import { MessageCircle, Users, MessageSquare } from 'lucide-react'

export default function MessagesPage() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <IntranetLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </IntranetLayout>
    )
  }

  if (!user) {
    return (
      <IntranetLayout>
        <div className="text-center py-8">
          <p className="text-gray-500">로그인이 필요합니다.</p>
        </div>
      </IntranetLayout>
    )
  }

  return (
    <IntranetLayout>
      <div className="space-y-6">
        {/* 헤더 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <MessageCircle className="h-8 w-8 text-green-600" />
              메시지
            </h1>
            <p className="mt-2 text-gray-600">
              동료들과 실시간으로 소통하고 협업하세요
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              팀 채팅
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              개인 메시지
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <MessageCircle className="h-3 w-3" />
              실시간
            </Badge>
          </div>
        </div>
        
        <RealMessagesManager />
      </div>
    </IntranetLayout>
  )
}