import { createClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import { SettingsManager } from '@/components/settings/settings-manager'

export default async function SettingsPage() {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">설정</h2>
      </div>
      <SettingsManager userId={user.id} />
    </div>
  )
}