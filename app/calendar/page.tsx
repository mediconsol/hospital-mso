import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { IntranetLayout } from '@/components/layout/intranet-layout'
import { CalendarManager } from '@/components/calendar/calendar-manager'

export default async function CalendarPage() {
  const supabase = createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login?redirectTo=/calendar')
  }

  return (
    <IntranetLayout>
      <div className="space-y-6">
        {/* 헤더 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">일정 관리</h1>
            <p className="mt-2 text-gray-600">
              일정을 등록하고 관리하세요
            </p>
          </div>
        </div>

        {/* 일정 관리 컴포넌트 */}
        <CalendarManager />
      </div>
    </IntranetLayout>
  )
}