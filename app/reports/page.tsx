'use client'

import { useAuth } from '@/components/auth/auth-provider'
import { IntranetLayout } from '@/components/layout/intranet-layout'
import { ReportsManager } from '@/components/reports/reports-manager'
import { Badge } from '@/components/ui/badge'
import { BarChart3, TrendingUp } from 'lucide-react'

export default function ReportsPage() {
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
              <BarChart3 className="h-8 w-8 text-blue-600" />
              보고서
            </h1>
            <p className="mt-2 text-gray-600">
              조직의 활동과 성과를 분석하고 인사이트를 얻으세요
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              데이터 분석
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <BarChart3 className="h-3 w-3" />
              통계 리포트
            </Badge>
          </div>
        </div>
        
        <ReportsManager userId={user.id} />
      </div>
    </IntranetLayout>
  )
}