import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { IntranetLayout } from '@/components/layout/intranet-layout'
import { EmployeeManager } from '@/components/employees/employee-manager'

export default async function EmployeesPage() {
  const supabase = createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login?redirectTo=/employees')
  }

  return (
    <IntranetLayout>
      <div className="space-y-6">
        {/* 헤더 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">직원 관리</h1>
            <p className="mt-2 text-gray-600">
              조직의 직원들을 초대하고 권한을 관리하세요
            </p>
          </div>
        </div>

        {/* 직원 관리 컴포넌트 */}
        <EmployeeManager userId={user.id} />
      </div>
    </IntranetLayout>
  )
}