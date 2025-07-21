'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  Download,
  UserCheck,
  UserX,
  Shield,
  Building2
} from 'lucide-react'
import { Database } from '@/lib/database.types'
import { AdminUsersList } from './admin-users-list'
import { AdminUserForm } from './admin-user-form'

type Employee = Database['public']['Tables']['employee']['Row'] & {
  hospital?: { id: string; name: string; type: string } | null
  department?: { id: string; name: string } | null
}

type Hospital = Database['public']['Tables']['hospital_or_mso']['Row']
type Department = Database['public']['Tables']['department']['Row'] & {
  hospital?: { id: string; name: string } | null
}

interface AdminUsersManagerProps {
  employees: Employee[]
  hospitals: Hospital[]
  departments: Department[]
  stats: {
    totalUsers: number
    activeUsers: number
    inactiveUsers: number
    adminUsers: number
  }
}

export function AdminUsersManager({ 
  employees, 
  hospitals, 
  departments, 
  stats 
}: AdminUsersManagerProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [hospitalFilter, setHospitalFilter] = useState<string>('all')
  const [showUserForm, setShowUserForm] = useState(false)
  const [editingUser, setEditingUser] = useState<Employee | null>(null)

  // 필터링된 사용자 목록
  const filteredEmployees = useMemo(() => {
    return employees.filter(employee => {
      const matchesSearch = 
        employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (employee.position && employee.position.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchesRole = roleFilter === 'all' || employee.role === roleFilter
      const matchesStatus = statusFilter === 'all' || employee.status === statusFilter
      const matchesHospital = hospitalFilter === 'all' || employee.hospital_id === hospitalFilter

      return matchesSearch && matchesRole && matchesStatus && matchesHospital
    })
  }, [employees, searchTerm, roleFilter, statusFilter, hospitalFilter])

  const handleEditUser = (user: Employee) => {
    setEditingUser(user)
    setShowUserForm(true)
  }

  const handleAddUser = () => {
    setEditingUser(null)
    setShowUserForm(true)
  }

  const handleFormClose = () => {
    setShowUserForm(false)
    setEditingUser(null)
  }

  const handleFormSaved = () => {
    setShowUserForm(false)
    setEditingUser(null)
    // 페이지 새로고침으로 데이터 업데이트
    window.location.reload()
  }

  const exportUsers = () => {
    const csvContent = [
      ['이름', '이메일', '역할', '상태', '병원', '부서', '직책', '가입일'],
      ...filteredEmployees.map(emp => [
        emp.name,
        emp.email,
        emp.role,
        emp.status,
        emp.hospital?.name || '',
        emp.department?.name || '',
        emp.position || '',
        new Date(emp.created_at).toLocaleDateString('ko-KR')
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `users_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">사용자 관리</h1>
          <p className="text-gray-600 mt-2">전체 시스템 사용자를 관리하고 권한을 설정하세요</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={exportUsers}>
            <Download className="w-4 h-4 mr-2" />
            내보내기
          </Button>
          <Button onClick={handleAddUser}>
            <Plus className="w-4 h-4 mr-2" />
            사용자 추가
          </Button>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전체 사용자</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">활성 사용자</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.activeUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">비활성 사용자</CardTitle>
            <UserX className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.inactiveUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">관리자</CardTitle>
            <Shield className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.adminUsers}</div>
          </CardContent>
        </Card>
      </div>

      {/* 검색 및 필터 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="w-5 h-5" />
            <span>검색 및 필터</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* 검색 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="이름, 이메일, 직책 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* 역할 필터 */}
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="역할 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 역할</SelectItem>
                <SelectItem value="super_admin">최종관리자</SelectItem>
                <SelectItem value="admin">관리자</SelectItem>
                <SelectItem value="manager">매니저</SelectItem>
                <SelectItem value="employee">직원</SelectItem>
              </SelectContent>
            </Select>

            {/* 상태 필터 */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="상태 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 상태</SelectItem>
                <SelectItem value="active">활성</SelectItem>
                <SelectItem value="inactive">비활성</SelectItem>
                <SelectItem value="resigned">퇴사</SelectItem>
              </SelectContent>
            </Select>

            {/* 병원 필터 */}
            <Select value={hospitalFilter} onValueChange={setHospitalFilter}>
              <SelectTrigger>
                <SelectValue placeholder="병원 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 병원</SelectItem>
                {hospitals.map(hospital => (
                  <SelectItem key={hospital.id} value={hospital.id}>
                    {hospital.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 필터 초기화 */}
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm('')
                setRoleFilter('all')
                setStatusFilter('all')
                setHospitalFilter('all')
              }}
            >
              초기화
            </Button>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              총 {filteredEmployees.length}명의 사용자가 검색되었습니다
            </div>
            <div className="flex items-center space-x-2">
              {searchTerm && (
                <Badge variant="secondary">검색: {searchTerm}</Badge>
              )}
              {roleFilter !== 'all' && (
                <Badge variant="secondary">역할: {roleFilter}</Badge>
              )}
              {statusFilter !== 'all' && (
                <Badge variant="secondary">상태: {statusFilter}</Badge>
              )}
              {hospitalFilter !== 'all' && (
                <Badge variant="secondary">
                  병원: {hospitals.find(h => h.id === hospitalFilter)?.name}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 사용자 목록 */}
      <AdminUsersList 
        employees={filteredEmployees}
        hospitals={hospitals}
        departments={departments}
        onEditUser={handleEditUser}
      />

      {/* 사용자 추가/수정 폼 */}
      {showUserForm && (
        <AdminUserForm
          user={editingUser}
          hospitals={hospitals}
          departments={departments}
          onClose={handleFormClose}
          onSaved={handleFormSaved}
        />
      )}
    </div>
  )
}
