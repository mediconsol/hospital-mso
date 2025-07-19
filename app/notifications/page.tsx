import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { IntranetLayout } from '@/components/layout/intranet-layout'
import { AnnouncementsManager } from '@/components/notifications/announcements-manager'

export default async function NotificationsPage() {
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
            <h1 className="text-3xl font-bold text-gray-900">공지사항 및 알림</h1>
            <p className="mt-2 text-gray-600">
              조직의 공지사항과 시스템 알림을 확인하고 관리하세요
            </p>
          </div>
        </div>

        {/* 공지사항 관리 컴포넌트 */}
        <AnnouncementsManager />
      </div>
    </IntranetLayout>
  )
}