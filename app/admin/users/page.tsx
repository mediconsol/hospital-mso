import { createClient } from '@/lib/supabase-server'
import { AdminUsersManager } from '@/components/admin/admin-users-manager'

export default async function AdminUsersPage() {
  const supabase = createClient()

  // 모든 직원 정보 조회 (관리자용)
  const { data: employees, error: employeesError } = await supabase
    .from('employee')
    .select(`
      *,
      hospital:hospital_id (
        id,
        name,
        type
      ),
      department:department_id (
        id,
        name
      )
    `)
    .order('created_at', { ascending: false })

  if (employeesError) {
    console.error('Error fetching employees:', employeesError)
  }

  // 병원/MSO 목록 조회
  const { data: hospitals, error: hospitalsError } = await supabase
    .from('hospital_or_mso')
    .select('*')
    .order('name')

  if (hospitalsError) {
    console.error('Error fetching hospitals:', hospitalsError)
  }

  // 부서 목록 조회
  const { data: departments, error: departmentsError } = await supabase
    .from('department')
    .select(`
      *,
      hospital:hospital_id (
        id,
        name
      )
    `)
    .order('name')

  if (departmentsError) {
    console.error('Error fetching departments:', departmentsError)
  }

  // 통계 데이터
  const stats = {
    totalUsers: employees?.length || 0,
    activeUsers: employees?.filter(emp => emp.status === 'active').length || 0,
    inactiveUsers: employees?.filter(emp => emp.status === 'inactive').length || 0,
    adminUsers: employees?.filter(emp => emp.role === 'super_admin' || emp.role === 'admin').length || 0,
  }

  return (
    <AdminUsersManager 
      employees={employees || []}
      hospitals={hospitals || []}
      departments={departments || []}
      stats={stats}
    />
  )
}
