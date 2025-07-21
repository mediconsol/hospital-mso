import { createClient } from '@/lib/supabase-server'
import { AdminDashboard } from '@/components/admin/admin-dashboard'

export default async function AdminPage() {
  const supabase = createClient()

  // 시스템 통계 데이터 수집
  const [
    { count: totalUsers },
    { count: totalEmployees },
    { count: totalHospitals },
    { count: totalDepartments },
    { count: activeUsers },
    { count: todaySignups }
  ] = await Promise.all([
    supabase.from('employee').select('*', { count: 'exact', head: true }),
    supabase.from('employee').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('hospital_or_mso').select('*', { count: 'exact', head: true }),
    supabase.from('department').select('*', { count: 'exact', head: true }),
    supabase.from('employee').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('employee').select('*', { count: 'exact', head: true }).gte('created_at', new Date().toISOString().split('T')[0])
  ])

  // 최근 활동 데이터
  const { data: recentEmployees } = await supabase
    .from('employee')
    .select(`
      *,
      hospital:hospital_id (
        name
      )
    `)
    .order('created_at', { ascending: false })
    .limit(5)

  // 역할별 통계
  const { data: roleStats } = await supabase
    .from('employee')
    .select('role')

  const roleDistribution = roleStats?.reduce((acc, emp) => {
    acc[emp.role] = (acc[emp.role] || 0) + 1
    return acc
  }, {} as Record<string, number>) || {}

  const stats = {
    totalUsers: totalUsers || 0,
    totalEmployees: totalEmployees || 0,
    totalHospitals: totalHospitals || 0,
    totalDepartments: totalDepartments || 0,
    activeUsers: activeUsers || 0,
    todaySignups: todaySignups || 0,
    roleDistribution,
    recentEmployees: recentEmployees || []
  }

  return <AdminDashboard stats={stats} />
}
