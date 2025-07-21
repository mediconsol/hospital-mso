'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Edit, Trash2, MoreVertical, Mail, Phone, Calendar, User } from 'lucide-react'
import { Database } from '@/lib/database.types'

type Employee = Database['public']['Tables']['employee']['Row'] & {
  department?: { id: string; name: string } | null
}
type Department = Database['public']['Tables']['department']['Row']

interface EmployeeListProps {
  employees: Employee[]
  departments: Department[]
  onEdit: (employee: Employee) => void
  onDelete: (employeeId: string) => void
  onStatusChange: (employeeId: string, newStatus: 'active' | 'inactive' | 'resigned') => void
  getRoleColor: (role: string) => string
  getRoleLabel: (role: string) => string
  getStatusColor: (status: string) => string
  getStatusLabel: (status: string) => string
  isManager?: boolean
  currentEmployee?: Employee | null
}

export function EmployeeList({
  employees,
  departments,
  onEdit,
  onDelete,
  onStatusChange,
  getRoleColor,
  getRoleLabel,
  getStatusColor,
  getStatusLabel,
  isManager = false,
  currentEmployee = null
}: EmployeeListProps) {

  const getDepartmentName = (departmentId: string | null) => {
    if (!departmentId) return '부서 없음'
    const dept = departments.find(d => d.id === departmentId)
    return dept?.name || '알 수 없음'
  }

  // 직원 수정 권한 체크 함수
  const canEditEmployee = (employee: Employee): boolean => {
    if (!currentEmployee) return false

    // 최고관리자와 관리자는 모든 직원 수정 가능
    if (currentEmployee.role === 'super_admin' || currentEmployee.role === 'admin') {
      return true
    }

    // 매니저와 직원은 본인 정보만 수정 가능
    return currentEmployee.id === employee.id
  }

  // 직원 삭제 권한 체크 함수
  const canDeleteEmployee = (employee: Employee): boolean => {
    if (!currentEmployee) return false

    // 최고관리자와 관리자만 삭제 가능 (본인 제외)
    if (currentEmployee.role === 'super_admin' || currentEmployee.role === 'admin') {
      return currentEmployee.id !== employee.id // 본인은 삭제 불가
    }

    return false
  }

  // 직원 상태 변경 권한 체크 함수
  const canChangeStatus = (employee: Employee): boolean => {
    if (!currentEmployee) return false

    // 최고관리자와 관리자만 상태 변경 가능 (본인 제외)
    if (currentEmployee.role === 'super_admin' || currentEmployee.role === 'admin') {
      return currentEmployee.id !== employee.id // 본인 상태는 변경 불가
    }

    return false
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('ko-KR')
  }

  const getInitials = (name: string) => {
    return name.split('').slice(0, 2).join('').toUpperCase()
  }

  if (employees.length === 0) {
    return (
      <div className="text-center py-8">
        <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">등록된 직원이 없습니다.</p>
        <p className="text-sm text-gray-400 mt-2">
          직원을 초대하거나 등록해보세요.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 데스크톱 뷰 */}
      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">직원</th>
                <th className="text-left py-3 px-4">부서</th>
                <th className="text-left py-3 px-4">역할</th>
                <th className="text-left py-3 px-4">상태</th>
                <th className="text-left py-3 px-4">입사일</th>
                <th className="text-left py-3 px-4">연락처</th>
                <th className="text-right py-3 px-4">작업</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src="" alt={employee.name} />
                        <AvatarFallback className="text-xs">
                          {getInitials(employee.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{employee.name}</div>
                        <div className="text-sm text-gray-500">{employee.email}</div>
                        {employee.position && (
                          <div className="text-xs text-gray-400">{employee.position}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm">
                      {getDepartmentName(employee.department_id)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <Badge className={getRoleColor(employee.role)}>
                      {getRoleLabel(employee.role)}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <Badge className={getStatusColor(employee.status)}>
                      {getStatusLabel(employee.status)}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm">{formatDate(employee.hire_date)}</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-sm">
                      {employee.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {employee.phone}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {(canEditEmployee(employee) || canDeleteEmployee(employee) || canChangeStatus(employee)) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canEditEmployee(employee) && (
                            <DropdownMenuItem onClick={() => onEdit(employee)}>
                              <Edit className="h-4 w-4 mr-2" />
                              수정
                            </DropdownMenuItem>
                          )}
                          {canChangeStatus(employee) && (
                            <DropdownMenuItem
                              onClick={() => onStatusChange(employee.id,
                                employee.status === 'active' ? 'inactive' : 'active')}
                            >
                              <User className="h-4 w-4 mr-2" />
                              {employee.status === 'active' ? '비활성화' : '활성화'}
                            </DropdownMenuItem>
                          )}
                          {canDeleteEmployee(employee) && (
                            <DropdownMenuItem
                              onClick={() => onDelete(employee.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              삭제
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 모바일 뷰 */}
      <div className="md:hidden space-y-4">
        {employees.map((employee) => (
          <div key={employee.id} className="border rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src="" alt={employee.name} />
                  <AvatarFallback className="text-sm">
                    {getInitials(employee.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{employee.name}</div>
                  <div className="text-sm text-gray-500">{employee.email}</div>
                  {employee.position && (
                    <div className="text-xs text-gray-400">{employee.position}</div>
                  )}
                </div>
              </div>
              {(canEditEmployee(employee) || canDeleteEmployee(employee) || canChangeStatus(employee)) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {canEditEmployee(employee) && (
                      <DropdownMenuItem onClick={() => onEdit(employee)}>
                        <Edit className="h-4 w-4 mr-2" />
                        수정
                      </DropdownMenuItem>
                    )}
                    {canChangeStatus(employee) && (
                      <DropdownMenuItem
                        onClick={() => onStatusChange(employee.id,
                          employee.status === 'active' ? 'inactive' : 'active')}
                      >
                        <User className="h-4 w-4 mr-2" />
                        {employee.status === 'active' ? '비활성화' : '활성화'}
                      </DropdownMenuItem>
                    )}
                    {canDeleteEmployee(employee) && (
                      <DropdownMenuItem
                        onClick={() => onDelete(employee.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        삭제
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge className={getRoleColor(employee.role)}>
                  {getRoleLabel(employee.role)}
                </Badge>
                <Badge className={getStatusColor(employee.status)}>
                  {getStatusLabel(employee.status)}
                </Badge>
              </div>
              
              <div className="text-sm text-gray-600">
                부서: {getDepartmentName(employee.department_id)}
              </div>
              
              {employee.hire_date && (
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Calendar className="h-3 w-3" />
                  입사일: {formatDate(employee.hire_date)}
                </div>
              )}
              
              {employee.phone && (
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Phone className="h-3 w-3" />
                  {employee.phone}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}