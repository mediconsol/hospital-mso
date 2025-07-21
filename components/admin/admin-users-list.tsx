'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { 
  MoreVertical, 
  Edit, 
  Trash2, 
  UserCheck, 
  UserX, 
  Shield,
  Mail,
  Phone,
  Calendar,
  Building2,
  Users
} from 'lucide-react'
import { Database } from '@/lib/database.types'

type Employee = Database['public']['Tables']['employee']['Row'] & {
  hospital?: { id: string; name: string; type: string } | null
  department?: { id: string; name: string } | null
}

type Hospital = Database['public']['Tables']['hospital_or_mso']['Row']
type Department = Database['public']['Tables']['department']['Row'] & {
  hospital?: { id: string; name: string } | null
}

interface AdminUsersListProps {
  employees: Employee[]
  hospitals: Hospital[]
  departments: Department[]
  onEditUser: (user: Employee) => void
}

export function AdminUsersList({ 
  employees, 
  hospitals, 
  departments, 
  onEditUser 
}: AdminUsersListProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<Employee | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const supabase = createClient()

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

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return '활성'
      case 'inactive': return '비활성'
      case 'resigned': return '퇴사'
      default: return status
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-yellow-100 text-yellow-800'
      case 'resigned': return 'bg-red-100 text-red-800'
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

  const handleStatusChange = async (employeeId: string, newStatus: 'active' | 'inactive' | 'resigned') => {
    try {
      const { error } = await supabase
        .from('employee')
        .update({ status: newStatus })
        .eq('id', employeeId)

      if (error) throw error

      // 페이지 새로고침
      window.location.reload()
    } catch (error) {
      console.error('Status change error:', error)
      alert('상태 변경 중 오류가 발생했습니다.')
    }
  }

  const handleDeleteUser = async () => {
    if (!userToDelete) return

    setIsDeleting(true)
    try {
      const { error } = await supabase
        .from('employee')
        .delete()
        .eq('id', userToDelete.id)

      if (error) throw error

      setDeleteDialogOpen(false)
      setUserToDelete(null)
      // 페이지 새로고침
      window.location.reload()
    } catch (error) {
      console.error('Delete user error:', error)
      alert('사용자 삭제 중 오류가 발생했습니다.')
    } finally {
      setIsDeleting(false)
    }
  }

  const openDeleteDialog = (user: Employee) => {
    setUserToDelete(user)
    setDeleteDialogOpen(true)
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>사용자 목록</span>
          </CardTitle>
          <CardDescription>
            시스템에 등록된 모든 사용자를 관리할 수 있습니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          {employees.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">검색 조건에 맞는 사용자가 없습니다</p>
            </div>
          ) : (
            <div className="space-y-4">
              {employees.map((employee) => (
                <div
                  key={employee.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-4">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src="" alt={employee.name} />
                      <AvatarFallback className="bg-gray-200 text-gray-700">
                        {getInitials(employee.name)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="font-medium text-gray-900">{employee.name}</h3>
                        <Badge className={getRoleColor(employee.role)}>
                          {getRoleLabel(employee.role)}
                        </Badge>
                        <Badge className={getStatusColor(employee.status)}>
                          {getStatusLabel(employee.status)}
                        </Badge>
                      </div>
                      
                      <div className="mt-1 space-y-1">
                        <div className="flex items-center text-sm text-gray-600">
                          <Mail className="w-3 h-3 mr-1" />
                          {employee.email}
                        </div>
                        
                        {employee.phone && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Phone className="w-3 h-3 mr-1" />
                            {employee.phone}
                          </div>
                        )}
                        
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          {employee.hospital && (
                            <div className="flex items-center">
                              <Building2 className="w-3 h-3 mr-1" />
                              {employee.hospital.name}
                            </div>
                          )}
                          
                          {employee.department && (
                            <div>부서: {employee.department.name}</div>
                          )}
                          
                          {employee.position && (
                            <div>직책: {employee.position}</div>
                          )}
                          
                          <div className="flex items-center">
                            <Calendar className="w-3 h-3 mr-1" />
                            가입: {formatDate(employee.created_at)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>사용자 관리</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      
                      <DropdownMenuItem onClick={() => onEditUser(employee)}>
                        <Edit className="w-4 h-4 mr-2" />
                        정보 수정
                      </DropdownMenuItem>
                      
                      {employee.status === 'active' ? (
                        <DropdownMenuItem 
                          onClick={() => handleStatusChange(employee.id, 'inactive')}
                        >
                          <UserX className="w-4 h-4 mr-2" />
                          비활성화
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem 
                          onClick={() => handleStatusChange(employee.id, 'active')}
                        >
                          <UserCheck className="w-4 h-4 mr-2" />
                          활성화
                        </DropdownMenuItem>
                      )}
                      
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => openDeleteDialog(employee)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        사용자 삭제
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>사용자 삭제 확인</AlertDialogTitle>
            <AlertDialogDescription>
              정말로 <strong>{userToDelete?.name}</strong> 사용자를 삭제하시겠습니까?
              <br />
              이 작업은 되돌릴 수 없으며, 모든 관련 데이터가 영구적으로 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? '삭제 중...' : '삭제'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
