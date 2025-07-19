import { Suspense } from 'react'
import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { IntranetLayout } from '@/components/layout/intranet-layout'
import { SettingsManager } from '@/components/settings/settings-manager'

export default async function SettingsPage() {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login?redirectTo=/settings')
  }

  return (
    <IntranetLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">설정</h2>
        </div>
        <Suspense fallback={<div>설정을 불러오는 중...</div>}>
          <SettingsManager userId={user.id} />
        </Suspense>
      </div>
    </IntranetLayout>
  )
}