import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { IntranetLayout } from '@/components/layout/intranet-layout'
import { OrganizationManager } from '@/components/organization/organization-manager'

export default async function OrganizationPage() {
  const supabase = createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login?redirectTo=/organization')
  }

  return (
    <IntranetLayout>
      <div className="space-y-6">
        {/* 헤더 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">조직 관리</h1>
            <p className="mt-2 text-gray-600">
              병원/MSO 정보와 부서 구조를 관리하세요
            </p>
          </div>
        </div>

        {/* 조직 관리 컴포넌트 */}
        <OrganizationManager userId={user.id} />
      </div>
    </IntranetLayout>
  )
}