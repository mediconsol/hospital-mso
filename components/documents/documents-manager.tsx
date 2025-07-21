'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { getUserPermissions, UserPermissions } from '@/lib/permission-helpers'
import { useAccessibleOrganizations } from '@/hooks/use-accessible-organizations'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DocumentsList } from './documents-list'
import { DocumentUpload } from './document-upload'
import { DocumentCategories } from './document-categories'
import { DocumentStats } from './document-stats'
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  BookOpen, 
  Shield, 
  Settings, 
  Users,
  Building2
} from 'lucide-react'
import { Database } from '@/lib/database.types'

type HospitalOrMSO = Database['public']['Tables']['hospital_or_mso']['Row']
type Employee = Database['public']['Tables']['employee']['Row']
type Department = Database['public']['Tables']['department']['Row']

// 파일 테이블을 문서로 활용하되, 문서 타입별로 분류
type DocumentFile = Database['public']['Tables']['file']['Row'] & {
  owner?: { id: string; name: string; email: string } | null
  department?: { id: string; name: string } | null
}

interface DocumentsManagerProps {
  userId: string
}

// 문서 카테고리 정의
const DOCUMENT_CATEGORIES = {
  policy: { name: '정책 문서', icon: Shield, color: 'text-red-600' },
  manual: { name: '업무 매뉴얼', icon: BookOpen, color: 'text-blue-600' },
  template: { name: '템플릿', icon: FileText, color: 'text-green-600' },
  form: { name: '양식', icon: Settings, color: 'text-purple-600' },
  announcement: { name: '공지사항', icon: Users, color: 'text-orange-600' },
  other: { name: '기타', icon: FileText, color: 'text-gray-600' }
}

export function DocumentsManager({ userId }: DocumentsManagerProps) {
  const [documents, setDocuments] = useState<DocumentFile[]>([])
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
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all')
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
      fetchDocuments()
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

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('file')
        .select(`
          *,
          owner:employee!owner_id (
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
        .order('uploaded_at', { ascending: false })

      if (error) throw error
      setDocuments(data || [])
    } catch (error) {
      console.error('Error fetching documents:', error)
    }
  }

  const handleDocumentUploaded = () => {
    setShowUpload(false)
    fetchDocuments()
  }

  const handleDelete = async (documentId: string) => {
    if (!confirm('정말로 이 문서를 삭제하시겠습니까?')) return

    try {
      const { error } = await supabase
        .from('file')
        .delete()
        .eq('id', documentId)

      if (error) throw error
      fetchDocuments()
    } catch (error) {
      console.error('Error deleting document:', error)
    }
  }

  const handleDownload = async (doc: DocumentFile) => {
    try {
      // Supabase Storage에서 파일 다운로드
      const { data, error } = await supabase
        .storage
        .from('files')
        .download(doc.filename)

      if (error) throw error

      // 파일 다운로드 링크 생성
      const url = URL.createObjectURL(data)
      const link = document.createElement('a')
      link.href = url
      link.download = doc.original_filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading document:', error)
    }
  }

  // 문서 카테고리 분류 (파일명이나 메타데이터 기반)
  const getDocumentCategory = (document: DocumentFile) => {
    const fileName = document.original_filename.toLowerCase()
    const mimeType = document.mime_type || ''
    
    if (fileName.includes('정책') || fileName.includes('policy') || fileName.includes('규정')) {
      return 'policy'
    } else if (fileName.includes('매뉴얼') || fileName.includes('manual') || fileName.includes('가이드')) {
      return 'manual'
    } else if (fileName.includes('템플릿') || fileName.includes('template') || fileName.includes('양식')) {
      return 'template'
    } else if (fileName.includes('공지') || fileName.includes('announcement') || fileName.includes('알림')) {
      return 'announcement'
    } else if (mimeType.includes('pdf') || mimeType.includes('word') || mimeType.includes('text')) {
      return 'form'
    }
    return 'other'
  }

  const filteredDocuments = documents.filter(document => {
    const matchesSearch = document.original_filename.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesDepartment = selectedDepartment === 'all' || document.department_id === selectedDepartment
    const documentCategory = getDocumentCategory(document)
    const matchesCategory = selectedCategory === 'all' || documentCategory === selectedCategory
    
    return matchesSearch && matchesDepartment && matchesCategory
  })

  // 카테고리별 문서 수 계산
  const categoryStats = Object.keys(DOCUMENT_CATEGORIES).reduce((acc, category) => {
    acc[category] = documents.filter(doc => getDocumentCategory(doc) === category).length
    return acc
  }, {} as Record<string, number>)

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
        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
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
            문서를 관리할 조직을 선택하세요
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
          {/* 문서 통계 */}
          <DocumentStats 
            documents={documents} 
            categoryStats={categoryStats}
            categories={DOCUMENT_CATEGORIES}
          />

          {/* 문서 목록 및 관리 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    문서 목록
                  </CardTitle>
                  <CardDescription>
                    총 {filteredDocuments.length}개의 문서
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {userPermissions.isManager && (
                    <Button onClick={() => setShowUpload(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      문서 업로드
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
                    placeholder="문서명으로 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* 카테고리 필터 */}
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="카테고리" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체 카테고리</SelectItem>
                      {Object.entries(DOCUMENT_CATEGORIES).map(([key, category]) => (
                        <SelectItem key={key} value={key}>
                          {category.name} ({categoryStats[key] || 0})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* 부서 필터 */}
                  <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
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

                  {/* 필터 초기화 */}
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSelectedCategory('all')
                      setSelectedDepartment('all')
                      setSearchTerm('')
                    }}
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    초기화
                  </Button>
                </div>
              </div>

              {/* 카테고리별 탭 */}
              <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="space-y-4">
                <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7">
                  <TabsTrigger value="all">전체</TabsTrigger>
                  {Object.entries(DOCUMENT_CATEGORIES).map(([key, category]) => {
                    const Icon = category.icon
                    return (
                      <TabsTrigger key={key} value={key} className="flex items-center gap-1">
                        <Icon className="h-3 w-3" />
                        <span className="hidden sm:inline">{category.name}</span>
                      </TabsTrigger>
                    )
                  })}
                </TabsList>

                <TabsContent value={selectedCategory}>
                  <DocumentsList
                    documents={filteredDocuments}
                    categories={DOCUMENT_CATEGORIES}
                    getDocumentCategory={getDocumentCategory}
                    onDownload={handleDownload}
                    onDelete={handleDelete}
                    viewMode={viewMode}
                    isManager={userPermissions.isManager}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </>
      )}

      {/* 문서 업로드 모달 */}
      {showUpload && (
        <DocumentUpload
          hospitalId={selectedOrg}
          employees={employees}
          departments={departments}
          currentUserId={userId}
          onClose={() => setShowUpload(false)}
          onUploaded={handleDocumentUploaded}
        />
      )}
    </div>
  )
}