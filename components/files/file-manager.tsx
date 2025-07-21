'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { getUserPermissions, applyFileFilter, UserPermissions } from '@/lib/permission-helpers'
import { useAccessibleOrganizations } from '@/hooks/use-accessible-organizations'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { FileUpload } from './file-upload'
import { FileList } from './file-list'
import { FileStats } from './file-stats'
import { Upload, Search, Filter, Grid, List, FolderOpen } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Database } from '@/lib/database.types'

type FileRecord = Database['public']['Tables']['file']['Row'] & {
  owner?: { id: string; name: string; email: string } | null
  department?: { id: string; name: string } | null
  task?: { id: string; title: string } | null
}
type Employee = Database['public']['Tables']['employee']['Row']
type Department = Database['public']['Tables']['department']['Row']
type HospitalOrMSO = Database['public']['Tables']['hospital_or_mso']['Row']
type TaskOption = { id: string; title: string }

export function FileManager() {
  const [files, setFiles] = useState<FileRecord[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [tasks, setTasks] = useState<TaskOption[]>([])
  const [userPermissions, setUserPermissions] = useState<UserPermissions>({
    employee: null,
    isAdmin: false,
    isManager: false,
    hospitalId: null,
    departmentId: null
  })
  const [selectedOrg, setSelectedOrg] = useState<string>('')
  const [selectedDepartment, setSelectedDepartment] = useState<string>('')
  const [selectedOwner, setSelectedOwner] = useState<string>('')
  const [selectedFileType, setSelectedFileType] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
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
      fetchTasks(selectedOrg)
      fetchFiles()
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

  const fetchTasks = async (hospitalId: string) => {
    try {
      const { data, error } = await supabase
        .from('task')
        .select('id, title')
        .eq('hospital_id', hospitalId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setTasks(data || [])
    } catch (error) {
      console.error('Error fetching tasks:', error)
    }
  }

  const fetchFiles = async () => {
    try {
      const { data, error } = await supabase
        .from('file')
        .select(`
          *,
          owner:owner_id (
            id,
            name,
            email
          ),
          department:department_id (
            id,
            name
          ),
          task:task_id (
            id,
            title
          )
        `)
        .eq('hospital_id', selectedOrg)
        .order('uploaded_at', { ascending: false })

      if (error) throw error
      setFiles(data || [])
    } catch (error) {
      console.error('Error fetching files:', error)
    }
  }

  const handleFileUploaded = () => {
    setShowUpload(false)
    fetchFiles()
  }

  const handleDelete = async (fileId: string) => {
    if (!confirm('정말로 이 파일을 삭제하시겠습니까?')) return

    try {
      const { error } = await supabase
        .from('file')
        .delete()
        .eq('id', fileId)

      if (error) throw error
      fetchFiles()
    } catch (error) {
      console.error('Error deleting file:', error)
    }
  }

  const handleDownload = async (file: FileRecord) => {
    try {
      // Supabase Storage에서 파일 다운로드
      const { data, error } = await supabase
        .storage
        .from('files')
        .download(file.filename)

      if (error) throw error

      // 파일 다운로드 링크 생성
      const url = URL.createObjectURL(data)
      const link = document.createElement('a')
      link.href = url
      link.download = file.original_filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading file:', error)
    }
  }

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.original_filename.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesDepartment = !selectedDepartment || selectedDepartment === 'all' || file.department_id === selectedDepartment
    const matchesOwner = !selectedOwner || selectedOwner === 'all' || file.owner_id === selectedOwner
    const matchesFileType = !selectedFileType || selectedFileType === 'all' || file.mime_type?.includes(selectedFileType)
    
    return matchesSearch && matchesDepartment && matchesOwner && matchesFileType
  })

  const getFileTypeOptions = () => {
    const types = new Set<string>()
    files.forEach(file => {
      if (file.mime_type) {
        const mainType = file.mime_type.split('/')[0]
        types.add(mainType)
      }
    })
    return Array.from(types)
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
        <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
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
            파일을 관리할 조직을 선택하세요
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
          {/* 파일 통계 */}
          <FileStats files={files} />

          {/* 필터 및 검색 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FolderOpen className="h-5 w-5" />
                    파일 목록
                  </CardTitle>
                  <CardDescription>
                    총 {filteredFiles.length}개의 파일
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
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
                    <Button onClick={() => setShowUpload(true)}>
                      <Upload className="h-4 w-4 mr-2" />
                      파일 업로드
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
                    placeholder="파일명으로 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

                  {/* 업로드자 필터 */}
                  <Select value={selectedOwner || 'all'} onValueChange={(value) => setSelectedOwner(value === 'all' ? '' : value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="업로드자" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체 업로드자</SelectItem>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* 파일 타입 필터 */}
                  <Select value={selectedFileType || 'all'} onValueChange={(value) => setSelectedFileType(value === 'all' ? '' : value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="파일 타입" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체 타입</SelectItem>
                      {getFileTypeOptions().map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* 필터 초기화 */}
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSelectedDepartment('')
                      setSelectedOwner('')
                      setSelectedFileType('')
                      setSearchTerm('')
                    }}
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    초기화
                  </Button>
                </div>
              </div>

              {/* 파일 목록 */}
              <FileList
                files={filteredFiles}
                employees={employees}
                departments={departments}
                tasks={tasks}
                viewMode={viewMode}
                onDownload={handleDownload}
                onDelete={handleDelete}
                isManager={userPermissions.isManager}
              />
            </CardContent>
          </Card>
        </>
      )}

      {/* 파일 업로드 모달 */}
      {showUpload && userPermissions.employee && (
        <FileUpload
          hospitalId={selectedOrg}
          employees={employees}
          departments={departments}
          tasks={tasks}
          currentUserId={userPermissions.employee.id}
          onClose={() => setShowUpload(false)}
          onUploaded={handleFileUploaded}
        />
      )}
    </div>
  )
}