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
import { 
  Edit, 
  Trash2, 
  MoreVertical, 
  Calendar, 
  User, 
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Play,
  ClipboardList
} from 'lucide-react'
import { Database } from '@/lib/database.types'

type Task = Database['public']['Tables']['task']['Row'] & {
  assignee?: { id: string; name: string; email: string } | null
  creator?: { id: string; name: string; email: string } | null
  department?: { id: string; name: string } | null
}
type Employee = Database['public']['Tables']['employee']['Row']
type Department = Database['public']['Tables']['department']['Row']

interface TaskListProps {
  tasks: Task[]
  employees: Employee[]
  departments: Department[]
  onEdit: (task: Task) => void
  onDelete: (taskId: string) => void
  onStatusChange: (taskId: string, newStatus: 'pending' | 'in_progress' | 'completed' | 'cancelled') => void
  getPriorityColor: (priority: string) => string
  getPriorityLabel: (priority: string) => string
  getStatusColor: (status: string) => string
  getStatusLabel: (status: string) => string
}

export function TaskList({ 
  tasks, 
  employees, 
  departments, 
  onEdit, 
  onDelete, 
  onStatusChange,
  getPriorityColor,
  getPriorityLabel,
  getStatusColor,
  getStatusLabel
}: TaskListProps) {
  
  const getInitials = (name: string) => {
    return name.split('').slice(0, 2).join('').toUpperCase()
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('ko-KR')
  }

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('ko-KR', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const isOverdue = (dueDate: string | null, status: string) => {
    if (!dueDate || status === 'completed') return false
    return new Date(dueDate) < new Date()
  }

  const getEmployee = (employeeId: string | null) => {
    if (!employeeId) return null
    return employees.find(emp => emp.id === employeeId)
  }

  const getDepartment = (departmentId: string | null) => {
    if (!departmentId) return null
    return departments.find(dept => dept.id === departmentId)
  }

  const getCreator = (creatorId: string | null) => {
    if (!creatorId) return null
    return employees.find(emp => emp.id === creatorId)
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8">
        <ClipboardList className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">조건에 맞는 업무가 없습니다.</p>
        <p className="text-sm text-gray-400 mt-2">
          필터를 조정하거나 새로운 업무를 생성해보세요.
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
                <th className="text-left py-3 px-4">업무</th>
                <th className="text-left py-3 px-4">담당자</th>
                <th className="text-left py-3 px-4">부서</th>
                <th className="text-left py-3 px-4">우선순위</th>
                <th className="text-left py-3 px-4">상태</th>
                <th className="text-left py-3 px-4">마감일</th>
                <th className="text-left py-3 px-4">생성일</th>
                <th className="text-right py-3 px-4">작업</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => {
                const assignee = getEmployee(task.assignee_id)
                const department = getDepartment(task.department_id)
                const creator = getCreator(task.creator_id)
                const isTaskOverdue = isOverdue(task.due_date, task.status)

                return (
                  <tr key={task.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="max-w-xs">
                        <div className="font-medium text-sm">{task.title}</div>
                        {task.description && (
                          <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {task.description}
                          </div>
                        )}
                        {creator && (
                          <div className="text-xs text-gray-400 mt-1">
                            생성자: {creator.name}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {assignee ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src="" alt={assignee.name} />
                            <AvatarFallback className="text-xs">
                              {getInitials(assignee.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="text-sm font-medium">{assignee.name}</div>
                            {assignee.position && (
                              <div className="text-xs text-gray-500">{assignee.position}</div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">미할당</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm">
                        {department ? department.name : '부서 없음'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge className={getPriorityColor(task.priority)}>
                        {getPriorityLabel(task.priority)}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(task.status)}>
                          {getStatusLabel(task.status)}
                        </Badge>
                        {isTaskOverdue && (
                          <Badge className="bg-red-100 text-red-800">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            지연
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-sm ${isTaskOverdue ? 'text-red-600' : ''}`}>
                        {formatDate(task.due_date)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-gray-600">
                        {formatDateTime(task.created_at)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit(task)}>
                            <Edit className="h-4 w-4 mr-2" />
                            수정
                          </DropdownMenuItem>
                          {task.status === 'pending' && (
                            <DropdownMenuItem onClick={() => onStatusChange(task.id, 'in_progress')}>
                              <Play className="h-4 w-4 mr-2" />
                              시작
                            </DropdownMenuItem>
                          )}
                          {task.status === 'in_progress' && (
                            <DropdownMenuItem onClick={() => onStatusChange(task.id, 'completed')}>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              완료
                            </DropdownMenuItem>
                          )}
                          {task.status !== 'completed' && (
                            <DropdownMenuItem onClick={() => onStatusChange(task.id, 'cancelled')}>
                              <XCircle className="h-4 w-4 mr-2" />
                              취소
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            onClick={() => onDelete(task.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            삭제
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 모바일 뷰 */}
      <div className="md:hidden space-y-4">
        {tasks.map((task) => {
          const assignee = getEmployee(task.assignee_id)
          const department = getDepartment(task.department_id)
          const creator = getCreator(task.creator_id)
          const isTaskOverdue = isOverdue(task.due_date, task.status)

          return (
            <div key={task.id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="font-medium text-sm mb-1">{task.title}</div>
                  {task.description && (
                    <div className="text-xs text-gray-500 mb-2 line-clamp-2">
                      {task.description}
                    </div>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(task)}>
                      <Edit className="h-4 w-4 mr-2" />
                      수정
                    </DropdownMenuItem>
                    {task.status === 'pending' && (
                      <DropdownMenuItem onClick={() => onStatusChange(task.id, 'in_progress')}>
                        <Play className="h-4 w-4 mr-2" />
                        시작
                      </DropdownMenuItem>
                    )}
                    {task.status === 'in_progress' && (
                      <DropdownMenuItem onClick={() => onStatusChange(task.id, 'completed')}>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        완료
                      </DropdownMenuItem>
                    )}
                    {task.status !== 'completed' && (
                      <DropdownMenuItem onClick={() => onStatusChange(task.id, 'cancelled')}>
                        <XCircle className="h-4 w-4 mr-2" />
                        취소
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem 
                      onClick={() => onDelete(task.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      삭제
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge className={getPriorityColor(task.priority)}>
                    {getPriorityLabel(task.priority)}
                  </Badge>
                  <Badge className={getStatusColor(task.status)}>
                    {getStatusLabel(task.status)}
                  </Badge>
                  {isTaskOverdue && (
                    <Badge className="bg-red-100 text-red-800">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      지연
                    </Badge>
                  )}
                </div>
                
                {assignee && (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src="" alt={assignee.name} />
                      <AvatarFallback className="text-xs">
                        {getInitials(assignee.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-gray-600">
                      {assignee.name} {assignee.position && `(${assignee.position})`}
                    </span>
                  </div>
                )}
                
                {department && (
                  <div className="text-sm text-gray-600">
                    부서: {department.name}
                  </div>
                )}
                
                {creator && (
                  <div className="text-xs text-gray-500">
                    생성자: {creator.name}
                  </div>
                )}
                
                {task.due_date && (
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Calendar className="h-3 w-3" />
                    마감일: <span className={isTaskOverdue ? 'text-red-600' : ''}>{formatDate(task.due_date)}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="h-3 w-3" />
                  생성일: {formatDateTime(task.created_at)}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}