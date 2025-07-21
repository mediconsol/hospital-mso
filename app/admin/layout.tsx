import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { AdminSidebar } from '@/components/admin/admin-sidebar'
import { AdminHeader } from '@/components/admin/admin-header'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  
  // 사용자 인증 확인
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    redirect('/auth/login?redirectTo=/admin')
  }

  // 직원 정보 및 권한 확인
  const { data: employee, error: empError } = await supabase
    .from('employee')
    .select(`
      *,
      hospital:hospital_id (
        id,
        name,
        type
      )
    `)
    .eq('auth_user_id', user.id)
    .single()

  if (empError || !employee) {
    redirect('/auth/login?redirectTo=/admin&error=no-employee-record')
  }

  // 관리자 권한 확인 (super_admin 또는 admin만 접근 가능)
  if (employee.role !== 'super_admin' && employee.role !== 'admin') {
    redirect('/dashboard?error=access-denied')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 관리자 헤더 */}
      <AdminHeader employee={employee} />
      
      <div className="flex">
        {/* 사이드바 */}
        <AdminSidebar employee={employee} />
        
        {/* 메인 콘텐츠 */}
        <main className="flex-1 ml-64 p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
