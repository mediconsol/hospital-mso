'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Users, 
  Building2, 
  UserCheck, 
  TrendingUp,
  Activity,
  Shield,
  Calendar,
  Clock
} from 'lucide-react'
import { Database } from '@/lib/database.types'

type Employee = Database['public']['Tables']['employee']['Row'] & {
  hospital?: { name: string } | null
}

interface AdminDashboardProps {
  stats: {
    totalUsers: number
    totalEmployees: number
    totalHospitals: number
    totalDepartments: number
    activeUsers: number
    todaySignups: number
    roleDistribution: Record<string, number>
    recentEmployees: Employee[]
  }
}

export function AdminDashboard({ stats }: AdminDashboardProps) {
  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'super_admin': return '최종관리자'
      case 'admin': return '관리자'
      case 'manager': return '매니저'
      case 'employee': return '직원'
      default: return role
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-red-100 text-red-800'
      case 'admin': return 'bg-purple-100 text-purple-800'
      case 'manager': return 'bg-blue-100 text-blue-800'
      case 'employee': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getInitials = (name: string) => {
    return name.split('').slice(0, 2).join('').toUpperCase()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">백오피스 대시보드</h1>
        <p className="text-gray-600 mt-2">시스템 전체 현황을 한눈에 확인하세요</p>
      </div>

      {/* 주요 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전체 사용자</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              활성 사용자: {stats.activeUsers}명
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">병원/MSO</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalHospitals}</div>
            <p className="text-xs text-muted-foreground">
              부서: {stats.totalDepartments}개
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">오늘 가입</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todaySignups}</div>
            <p className="text-xs text-muted-foreground">
              신규 사용자
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">시스템 상태</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">정상</div>
            <p className="text-xs text-muted-foreground">
              모든 서비스 운영 중
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 역할별 분포 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="w-5 h-5" />
              <span>역할별 분포</span>
            </CardTitle>
            <CardDescription>사용자 권한별 현황</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(stats.roleDistribution).map(([role, count]) => {
              const percentage = stats.totalUsers > 0 ? (count / stats.totalUsers) * 100 : 0
              return (
                <div key={role} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge className={getRoleColor(role)}>
                      {getRoleLabel(role)}
                    </Badge>
                  </div>
                  <div className="text-sm font-medium">
                    {count}명 ({percentage.toFixed(0)}%)
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* 최근 가입 사용자 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <UserCheck className="w-5 h-5" />
              <span>최근 가입 사용자</span>
            </CardTitle>
            <CardDescription>최근 5명의 신규 사용자</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats.recentEmployees.length > 0 ? (
              stats.recentEmployees.map((employee) => (
                <div key={employee.id} className="flex items-center space-x-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src="" alt={employee.name} />
                    <AvatarFallback className="bg-gray-200 text-gray-700 text-xs">
                      {getInitials(employee.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">
                      {employee.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {employee.email}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className={getRoleColor(employee.role)}>
                      {getRoleLabel(employee.role)}
                    </Badge>
                    <div className="text-xs text-gray-500 mt-1">
                      {formatDate(employee.created_at)}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-4">
                최근 가입한 사용자가 없습니다
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 빠른 액션 */}
      <Card>
        <CardHeader>
          <CardTitle>빠른 액션</CardTitle>
          <CardDescription>자주 사용하는 관리 기능</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <a
              href="/admin/users"
              className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Users className="w-8 h-8 text-blue-600 mb-2" />
              <span className="text-sm font-medium">사용자 관리</span>
            </a>
            <a
              href="/admin/organizations"
              className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Building2 className="w-8 h-8 text-green-600 mb-2" />
              <span className="text-sm font-medium">조직 관리</span>
            </a>
            <a
              href="/admin/analytics"
              className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <TrendingUp className="w-8 h-8 text-purple-600 mb-2" />
              <span className="text-sm font-medium">통계 분석</span>
            </a>
            <a
              href="/admin/settings"
              className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Shield className="w-8 h-8 text-red-600 mb-2" />
              <span className="text-sm font-medium">시스템 설정</span>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
