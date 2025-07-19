'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { EmployeeForm } from './employee-form'
import { EmployeeList } from './employee-list'
import { InviteEmployeeForm } from './invite-employee-form'
import { Users, Plus, Search, UserPlus, Filter } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Database } from '@/lib/database.types'

type Employee = Database['public']['Tables']['employee']['Row']
type Department = Database['public']['Tables']['department']['Row']
type HospitalOrMSO = Database['public']['Tables']['hospital_or_mso']['Row']

interface EmployeeManagerProps {
  userId: string
}

export function EmployeeManager({ userId }: EmployeeManagerProps) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [organizations, setOrganizations] = useState<HospitalOrMSO[]>([])
  const [selectedOrg, setSelectedOrg] = useState<string>('')
  const [selectedDepartment, setSelectedDepartment] = useState<string>('')
  const [selectedRole, setSelectedRole] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchOrganizations()
  }, [])

  useEffect(() => {
    if (selectedOrg) {
      fetchDepartments(selectedOrg)
      fetchEmployees()
    }
  }, [selectedOrg])

  const fetchOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('hospital_or_mso')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setOrganizations(data || [])
      
      // 첫 번째 조직 자동 선택
      if (data && data.length > 0) {
        setSelectedOrg(data[0].id)
      }
    } catch (error) {
      console.error('Error fetching organizations:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchDepartments = async (hospitalId: string) => {
    try {
      const { data, error } = await supabase
        .from('department')
        .select('*')
        .eq('hospital_id', hospitalId)
        .order('name', { ascending: true })

      if (error) throw error
      setDepartments(data || [])
    } catch (error) {
      console.error('Error fetching departments:', error)
    }
  }

  const fetchEmployees = async () => {
    try {
      let query = supabase
        .from('employee')
        .select(`
          *,
          department:department_id (
            id,
            name
          )
        `)
        .eq('hospital_id', selectedOrg)
        .order('created_at', { ascending: false })

      const { data, error } = await query

      if (error) throw error
      setEmployees(data || [])
    } catch (error) {
      console.error('Error fetching employees:', error)
    }
  }

  const handleEmployeeSaved = () => {
    setShowForm(false)
    setEditingEmployee(null)
    fetchEmployees()
  }

  const handleInviteSent = () => {
    setShowInviteForm(false)
    fetchEmployees()
  }

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee)
    setShowForm(true)
  }

  const handleDelete = async (employeeId: string) => {
    if (!confirm('정말로 이 직원을 삭제하시겠습니까?')) return

    try {
      const { error } = await supabase
        .from('employee')
        .delete()
        .eq('id', employeeId)

      if (error) throw error
      fetchEmployees()
    } catch (error) {
      console.error('Error deleting employee:', error)
    }
  }

  const handleStatusChange = async (employeeId: string, newStatus: 'active' | 'inactive' | 'resigned') => {
    try {
      const { error } = await supabase
        .from('employee')
        .update({ status: newStatus })
        .eq('id', employeeId)

      if (error) throw error
      fetchEmployees()
    } catch (error) {
      console.error('Error updating employee status:', error)
    }
  }

  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesDepartment = !selectedDepartment || selectedDepartment === 'all' || employee.department_id === selectedDepartment
    const matchesRole = !selectedRole || selectedRole === 'all' || employee.role === selectedRole
    
    return matchesSearch && matchesDepartment && matchesRole
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-yellow-100 text-yellow-800'
      case 'resigned': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800'
      case 'manager': return 'bg-blue-100 text-blue-800'
      case 'employee': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return '관리자'
      case 'manager': return '매니저'
      case 'employee': return '직원'
      default: return role
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return '활성'
      case 'inactive': return '비활성'
      case 'resigned': return '퇴사'
      default: return status
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (organizations.length === 0) {
    return (
      <div className="text-center py-8">
        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">먼저 조직을 등록해주세요.</p>
        <p className="text-sm text-gray-400 mt-2">
          조직 관리 페이지에서 병원 또는 MSO를 등록하세요.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 조직 선택 */}
      <Card>
        <CardHeader>
          <CardTitle>조직 선택</CardTitle>
          <CardDescription>
            직원을 관리할 조직을 선택하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedOrg} onValueChange={setSelectedOrg}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="조직을 선택하세요" />
            </SelectTrigger>
            <SelectContent>
              {organizations.map((org) => (
                <SelectItem key={org.id} value={org.id}>
                  {org.name} ({org.type === 'hospital' ? '병원' : 'MSO'})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedOrg && (
        <>
          {/* 필터 및 검색 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    직원 목록
                  </CardTitle>
                  <CardDescription>
                    총 {filteredEmployees.length}명의 직원
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setShowInviteForm(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    직원 초대
                  </Button>
                  <Button onClick={() => setShowForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    직원 등록
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                {/* 검색 */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="이름 또는 이메일로 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* 부서 필터 */}
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="부서 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 부서</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* 역할 필터 */}
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger className="w-full sm:w-32">
                    <SelectValue placeholder="역할 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 역할</SelectItem>
                    <SelectItem value="admin">관리자</SelectItem>
                    <SelectItem value="manager">매니저</SelectItem>
                    <SelectItem value="employee">직원</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 직원 목록 */}
              <EmployeeList
                employees={filteredEmployees}
                departments={departments}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onStatusChange={handleStatusChange}
                getRoleColor={getRoleColor}
                getRoleLabel={getRoleLabel}
                getStatusColor={getStatusColor}
                getStatusLabel={getStatusLabel}
              />
            </CardContent>
          </Card>
        </>
      )}

      {/* 직원 등록/수정 폼 */}
      {showForm && (
        <EmployeeForm
          employee={editingEmployee}
          hospitalId={selectedOrg}
          departments={departments}
          onClose={() => {
            setShowForm(false)
            setEditingEmployee(null)
          }}
          onSaved={handleEmployeeSaved}
        />
      )}

      {/* 직원 초대 폼 */}
      {showInviteForm && (
        <InviteEmployeeForm
          hospitalId={selectedOrg}
          departments={departments}
          onClose={() => setShowInviteForm(false)}
          onSent={handleInviteSent}
        />
      )}
    </div>
  )
}