'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  Play
} from 'lucide-react'
import { Database } from '@/lib/database.types'

type Task = Database['public']['Tables']['task']['Row'] & {
  assignee?: { id: string; name: string; email: string } | null
  creator?: { id: string; name: string; email: string } | null
  department?: { id: string; name: string } | null
}
type Employee = Database['public']['Tables']['employee']['Row']
type Department = Database['public']['Tables']['department']['Row']

interface TaskBoardProps {
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
  isManager?: boolean
}

export function TaskBoard({ 
  tasks, 
  employees, 
  departments, 
  onEdit, 
  onDelete, 
  onStatusChange,
  getPriorityColor,
  getPriorityLabel,
  getStatusColor,
  getStatusLabel,
  isManager = false
}: TaskBoardProps) {
  
  const columns = [
    { id: 'pending', title: '대기', icon: Clock, color: 'border-yellow-200 bg-yellow-50' },
    { id: 'in_progress', title: '진행중', icon: Play, color: 'border-blue-200 bg-blue-50' },
    { id: 'completed', title: '완료', icon: CheckCircle, color: 'border-green-200 bg-green-50' },
    { id: 'cancelled', title: '취소', icon: XCircle, color: 'border-red-200 bg-red-50' },
  ]

  const getTasksByStatus = (status: string) => {
    return tasks.filter(task => task.status === status)
  }

  const getInitials = (name: string) => {
    return name.split('').slice(0, 2).join('').toUpperCase()
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null
    return new Date(dateString).toLocaleDateString('ko-KR', { 
      month: 'short', 
      day: 'numeric' 
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

  const TaskCard = ({ task }: { task: Task }) => {
    const assignee = getEmployee(task.assignee_id)
    const department = getDepartment(task.department_id)
    const isTaskOverdue = isOverdue(task.due_date, task.status)

    return (
      <Card className="mb-3 hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-sm font-medium leading-tight">
                {task.title}
              </CardTitle>
              {task.description && (
                <CardDescription className="text-xs mt-1 line-clamp-2">
                  {task.description}
                </CardDescription>
              )}
            </div>
            {isManager && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <MoreVertical className="h-3 w-3" />
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
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            {/* 우선순위 */}
            <div className="flex items-center gap-2">
              <Badge className={getPriorityColor(task.priority)}>
                {getPriorityLabel(task.priority)}
              </Badge>
              {isTaskOverdue && (
                <Badge className="bg-red-100 text-red-800">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  지연
                </Badge>
              )}
            </div>

            {/* 담당자 */}
            {assignee && (
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src="" alt={assignee.name} />
                  <AvatarFallback className="text-xs">
                    {getInitials(assignee.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-gray-600">{assignee.name}</span>
              </div>
            )}

            {/* 부서 */}
            {department && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                <span className="text-xs text-gray-600">{department.name}</span>
              </div>
            )}

            {/* 마감일 */}
            {task.due_date && (
              <div className="flex items-center gap-2">
                <Calendar className="h-3 w-3 text-gray-400" />
                <span className={`text-xs ${isTaskOverdue ? 'text-red-600' : 'text-gray-600'}`}>
                  {formatDate(task.due_date)}
                </span>
              </div>
            )}

            {/* 완료일 */}
            {task.completed_at && (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-600" />
                <span className="text-xs text-green-600">
                  {formatDate(task.completed_at)}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {columns.map((column) => {
        const columnTasks = getTasksByStatus(column.id)
        const Icon = column.icon
        
        return (
          <div key={column.id} className={`border-2 border-dashed rounded-lg p-4 ${column.color} min-h-[400px]`}>
            <div className="flex items-center gap-2 mb-4">
              <Icon className="h-5 w-5" />
              <h3 className="font-medium">{column.title}</h3>
              <Badge variant="secondary" className="ml-auto">
                {columnTasks.length}
              </Badge>
            </div>
            
            <div className="space-y-0">
              {columnTasks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Icon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">업무가 없습니다</p>
                </div>
              ) : (
                columnTasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}