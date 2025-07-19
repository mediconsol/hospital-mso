import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { IntranetLayout } from '@/components/layout/intranet-layout'
import { DashboardWidgets } from '@/components/dashboard/dashboard-widgets'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  return (
    <IntranetLayout>
      <div className="space-y-6">
        {/* 헤더 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">대시보드</h1>
            <p className="mt-2 text-gray-600">
              안녕하세요, {user.user_metadata?.name || '사용자'}님! 
              오늘도 좋은 하루 보내세요.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date().toLocaleDateString('ko-KR', { 
                month: 'long', 
                day: 'numeric' 
              })}
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {new Date().toLocaleTimeString('ko-KR', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </Badge>
          </div>
        </div>

        {/* 빠른 작업 */}
        <QuickActions />

        {/* 대시보드 위젯들 */}
        <DashboardWidgets />
      </div>
    </IntranetLayout>
  )
}