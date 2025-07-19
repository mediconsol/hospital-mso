'use client'

import { useAuth } from '@/components/auth/auth-provider'
import { IntranetLayout } from '@/components/layout/intranet-layout'
import { DocumentsManager } from '@/components/documents/documents-manager'
import { Badge } from '@/components/ui/badge'
import { FileText, BookOpen, Shield } from 'lucide-react'

export default function DocumentsPage() {
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
              <FileText className="h-8 w-8 text-blue-600" />
              문서 관리
            </h1>
            <p className="mt-2 text-gray-600">
              조직의 정책, 매뉴얼, 템플릿을 체계적으로 관리하세요
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="flex items-center gap-1">
              <BookOpen className="h-3 w-3" />
              지식 베이스
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Shield className="h-3 w-3" />
              정책 문서
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              템플릿
            </Badge>
          </div>
        </div>
        
        <DocumentsManager userId={user.id} />
      </div>
    </IntranetLayout>
  )
}