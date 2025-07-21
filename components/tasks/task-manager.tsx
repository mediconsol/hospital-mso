'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { getUserPermissions, applyTaskFilter, UserPermissions } from '@/lib/permission-helpers'
import { useAccessibleOrganizations } from '@/hooks/use-accessible-organizations'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { TaskForm } from './task-form'
import { TaskBoard } from './task-board'
import { TaskList } from './task-list'
import { TaskStats } from './task-stats'
import { ClipboardList, Plus, Search, Filter, Grid, List, Calendar } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Database } from '@/lib/database.types'

type Task = Database['public']['Tables']['task']['Row'] & {
  assignee?: { id: string; name: string; email: string } | null
  creator?: { id: string; name: string; email: string } | null
  department?: { id: string; name: string } | null
}
type Employee = Database['public']['Tables']['employee']['Row']
type Department = Database['public']['Tables']['department']['Row']
type HospitalOrMSO = Database['public']['Tables']['hospital_or_mso']['Row']

export function TaskManager() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [userPermissions, setUserPermissions] = useState<UserPermissions>({
    employee: null,
    isAdmin: false,
    isManager: false,
    hospitalId: null,
    departmentId: null
  })
  const [selectedOrg, setSelectedOrg] = useState<string>('')
  const [selectedDepartment, setSelectedDepartment] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [selectedPriority, setSelectedPriority] = useState<string>('')
  const [selectedAssignee, setSelectedAssignee] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  // 다중 조직 접근 권한 훅 사용
  const {
    organizationOptions,
    primaryOrganization,
    hasAccessToOrganization
  } = useAccessibleOrganizations()

  useEffect(() => {
    initializeUser()
  }, [])

  // 접근 가능한 조직이 로드되면 첫 번째 조직 자동 선택
  useEffect(() => {
    if (organizationOptions.length > 0 && !selectedOrg) {
      // 기본 조직이 있으면 선택, 없으면 첫 번째 조직 선택
      const defaultOrg = primaryOrganization?.organization_id || organizationOptions[0].value
      setSelectedOrg(defaultOrg)
    }
  }, [organizationOptions, primaryOrganization, selectedOrg])

  useEffect(() => {
    if (selectedOrg) {
      fetchDepartments(selectedOrg)
      fetchEmployees(selectedOrg)
      fetchTasks()
    }
  }, [selectedOrg])

  const initializeUser = async () => {
    try {
      const permissions = await getUserPermissions()
      setUserPermissions(permissions)
    } catch (error) {
      console.error('Error initializing user:', error)
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

  const fetchEmployees = async (hospitalId: string) => {
    try {
      const { data, error } = await supabase
        .from('employee')
        .select('*')
        .eq('hospital_id', hospitalId)
        .eq('status', 'active')
        .order('name', { ascending: true })

      if (error) throw error
      setEmployees(data || [])
    } catch (error) {
      console.error('Error fetching employees:', error)
    }
  }

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('task')
        .select(`
          *,
          assignee:employee!assignee_id (
            id,
            name,
            email
          ),
          creator:employee!creator_id (
            id,
            name,
            email
          ),
          department:department!department_id (
            id,
            name
          )
        `)
        .eq('hospital_id', selectedOrg)
        .order('created_at', { ascending: false })

      if (error) throw error
      setTasks(data || [])
    } catch (error) {
      console.error('Error fetching tasks:', error)
    }
  }

  const handleTaskSaved = () => {
    setShowForm(false)
    setEditingTask(null)
    fetchTasks()
  }

  const handleEdit = (task: Task) => {
    setEditingTask(task)
    setShowForm(true)
  }

  const handleDelete = async (taskId: string) => {
    if (!confirm('정말로 이 업무를 삭제하시겠습니까?')) return

    try {
      const { error } = await supabase
        .from('task')
        .delete()
        .eq('id', taskId)

      if (error) throw error
      fetchTasks()
    } catch (error) {
      console.error('Error deleting task:', error)
    }
  }

  const handleStatusChange = async (taskId: string, newStatus: 'pending' | 'in_progress' | 'completed' | 'cancelled') => {
    try {
      const updateData: any = { status: newStatus }
      
      // 완료 상태로 변경 시 완료 시간 설정
      if (newStatus === 'completed') {
        updateData.completed_at = new Date().toISOString()
      } else {
        updateData.completed_at = null
      }

      const { error } = await supabase
        .from('task')
        .update(updateData)
        .eq('id', taskId)

      if (error) throw error
      fetchTasks()
    } catch (error) {
      console.error('Error updating task status:', error)
    }
  }

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesDepartment = !selectedDepartment || selectedDepartment === 'all' || task.department_id === selectedDepartment
    const matchesStatus = !selectedStatus || selectedStatus === 'all' || task.status === selectedStatus
    const matchesPriority = !selectedPriority || selectedPriority === 'all' || task.priority === selectedPriority
    const matchesAssignee = !selectedAssignee || selectedAssignee === 'all' || task.assignee_id === selectedAssignee
    
    return matchesSearch && matchesDepartment && matchesStatus && matchesPriority && matchesAssignee
  })

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-gray-100 text-gray-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent': return '긴급'
      case 'high': return '높음'
      case 'medium': return '보통'
      case 'low': return '낮음'
      default: return priority
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return '대기'
      case 'in_progress': return '진행중'
      case 'completed': return '완료'
      case 'cancelled': return '취소'
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

  if (organizationOptions.length === 0) {
    return (
      <div className="text-center py-8">
        <ClipboardList className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">접근 가능한 조직이 없습니다.</p>
        <p className="text-sm text-gray-400 mt-2">
          관리자에게 조직 접근 권한을 요청하세요.
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
            업무를 관리할 조직을 선택하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedOrg} onValueChange={setSelectedOrg}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="조직을 선택하세요" />
            </SelectTrigger>
            <SelectContent>
              {organizationOptions.map((org) => (
                <SelectItem key={org.value} value={org.value}>
                  <div className="flex items-center space-x-2">
                    <span>{org.label}</span>
                    <Badge variant={org.isPrimary ? "default" : "secondary"} className="text-xs">
                      {org.type === 'hospital' ? '병원' : 'MSO'}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {org.accessLevel === 'admin' ? '관리자' :
                       org.accessLevel === 'write' ? '쓰기' : '읽기'}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedOrg && (
        <>
          {/* 업무 통계 */}
          <TaskStats tasks={tasks} />

          {/* 필터 및 검색 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5" />
                    업무 목록
                  </CardTitle>
                  <CardDescription>
                    총 {filteredTasks.length}개의 업무
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={viewMode === 'board' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('board')}
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                  {userPermissions.isManager && (
                    <Button onClick={() => setShowForm(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      업무 생성
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* 검색 및 필터 */}
              <div className="flex flex-col gap-4 mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="업무 제목 또는 설명으로 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {/* 부서 필터 */}
                  <Select value={selectedDepartment || 'all'} onValueChange={(value) => setSelectedDepartment(value === 'all' ? '' : value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="부서" />
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

                  {/* 상태 필터 */}
                  <Select value={selectedStatus || 'all'} onValueChange={(value) => setSelectedStatus(value === 'all' ? '' : value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="상태" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체 상태</SelectItem>
                      <SelectItem value="pending">대기</SelectItem>
                      <SelectItem value="in_progress">진행중</SelectItem>
                      <SelectItem value="completed">완료</SelectItem>
                      <SelectItem value="cancelled">취소</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* 우선순위 필터 */}
                  <Select value={selectedPriority || 'all'} onValueChange={(value) => setSelectedPriority(value === 'all' ? '' : value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="우선순위" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체 우선순위</SelectItem>
                      <SelectItem value="urgent">긴급</SelectItem>
                      <SelectItem value="high">높음</SelectItem>
                      <SelectItem value="medium">보통</SelectItem>
                      <SelectItem value="low">낮음</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* 담당자 필터 */}
                  <Select value={selectedAssignee || 'all'} onValueChange={(value) => setSelectedAssignee(value === 'all' ? '' : value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="담당자" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체 담당자</SelectItem>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* 필터 초기화 */}
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSelectedDepartment('')
                      setSelectedStatus('')
                      setSelectedPriority('')
                      setSelectedAssignee('')
                      setSearchTerm('')
                    }}
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    초기화
                  </Button>
                </div>
              </div>

              {/* 업무 표시 */}
              {viewMode === 'board' ? (
                <TaskBoard
                  tasks={filteredTasks}
                  employees={employees}
                  departments={departments}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onStatusChange={handleStatusChange}
                  getPriorityColor={getPriorityColor}
                  getPriorityLabel={getPriorityLabel}
                  getStatusColor={getStatusColor}
                  getStatusLabel={getStatusLabel}
                  isManager={userPermissions.isManager}
                />
              ) : (
                <TaskList
                  tasks={filteredTasks}
                  employees={employees}
                  departments={departments}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onStatusChange={handleStatusChange}
                  getPriorityColor={getPriorityColor}
                  getPriorityLabel={getPriorityLabel}
                  getStatusColor={getStatusColor}
                  getStatusLabel={getStatusLabel}
                  isManager={userPermissions.isManager}
                />
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* 업무 생성/수정 폼 */}
      {showForm && userPermissions.employee && (
        <TaskForm
          task={editingTask}
          hospitalId={selectedOrg}
          employees={employees}
          departments={departments}
          currentUserId={userPermissions.employee.id}
          onClose={() => {
            setShowForm(false)
            setEditingTask(null)
          }}
          onSaved={handleTaskSaved}
        />
      )}
    </div>
  )
}