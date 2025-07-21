'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { getUserPermissions, UserPermissions } from '@/lib/permission-helpers'
import { useAccessibleOrganizations } from '@/hooks/use-accessible-organizations'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ReportsStats } from './reports-stats'
import { TaskReports } from './task-reports'
import { EmployeeReports } from './employee-reports'
import { FileReports } from './file-reports'
import { ScheduleReports } from './schedule-reports'
import { BarChart3, Download, Filter, Calendar, Users, FolderOpen, ClipboardList } from 'lucide-react'
import { Database } from '@/lib/database.types'

type HospitalOrMSO = Database['public']['Tables']['hospital_or_mso']['Row']

interface ReportsManagerProps {
  userId: string
}

export function ReportsManager({ userId }: ReportsManagerProps) {
  const [selectedOrg, setSelectedOrg] = useState<string>('')
  const [dateRange, setDateRange] = useState<string>('month')
  const [loading, setLoading] = useState(true)
  const [userPermissions, setUserPermissions] = useState<UserPermissions>({
    employee: null,
    isAdmin: false,
    isManager: false,
    hospitalId: null,
    departmentId: null
  })
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

  useEffect(() => {
    if (userPermissions.employee) {
      fetchOrganizations()
    }
  }, [userPermissions])

  const initializeUser = async () => {
    try {
      const permissions = await getUserPermissions()
      setUserPermissions(permissions)
      
      if (permissions.employee) {
        setSelectedOrg(permissions.employee.hospital_id)
      }
    } catch (error) {
      console.error('Error initializing user:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchOrganizations = async () => {
    try {
      let query = supabase
        .from('hospital_or_mso')
        .select('*')
      
      // 관리자가 아니면 소속 조직만 조회
      if (!userPermissions.isAdmin && userPermissions.hospitalId) {
        query = query.eq('id', userPermissions.hospitalId)
      }
      
      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error
      setOrganizations(data || [])
      
      // 첫 번째 조직 자동 선택
      if (data && data.length > 0 && !selectedOrg) {
        setSelectedOrg(data[0].id)
      }
    } catch (error) {
      console.error('Error fetching organizations:', error)
    }
  }

  const handleExportReport = async (type: string) => {
    // TODO: 보고서 내보내기 기능 구현
    console.log(`Exporting ${type} report for organization ${selectedOrg}`)
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
        <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">접근 가능한 조직이 없습니다.</p>
        <p className="text-sm text-gray-400 mt-2">
          관리자에게 조직 접근 권한을 요청하세요.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 조직 선택 및 설정 */}
      <Card>
        <CardHeader>
          <CardTitle>보고서 설정</CardTitle>
          <CardDescription>
            보고서를 생성할 조직과 기간을 선택하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">조직 선택</label>
              <Select value={selectedOrg} onValueChange={setSelectedOrg}>
                <SelectTrigger>
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
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">기간 선택</label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue placeholder="기간을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">지난 주</SelectItem>
                  <SelectItem value="month">지난 달</SelectItem>
                  <SelectItem value="quarter">지난 분기</SelectItem>
                  <SelectItem value="year">지난 년도</SelectItem>
                  <SelectItem value="all">전체 기간</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {userPermissions.isManager && (
              <div className="space-y-2">
                <label className="text-sm font-medium">보고서 내보내기</label>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleExportReport('pdf')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    PDF
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleExportReport('excel')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Excel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedOrg && (
        <>
          {/* 전체 통계 */}
          <ReportsStats 
            organizationId={selectedOrg} 
            dateRange={dateRange} 
          />

          {/* 상세 보고서 탭 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                상세 보고서
              </CardTitle>
              <CardDescription>
                각 영역별 상세한 분석 보고서를 확인하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="tasks" className="space-y-4">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="tasks" className="flex items-center gap-2">
                    <ClipboardList className="h-4 w-4" />
                    업무 보고서
                  </TabsTrigger>
                  <TabsTrigger value="employees" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    직원 보고서
                  </TabsTrigger>
                  <TabsTrigger value="files" className="flex items-center gap-2">
                    <FolderOpen className="h-4 w-4" />
                    파일 보고서
                  </TabsTrigger>
                  <TabsTrigger value="schedules" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    일정 보고서
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="tasks">
                  <TaskReports 
                    organizationId={selectedOrg} 
                    dateRange={dateRange} 
                  />
                </TabsContent>

                <TabsContent value="employees">
                  <EmployeeReports 
                    organizationId={selectedOrg} 
                    dateRange={dateRange} 
                  />
                </TabsContent>

                <TabsContent value="files">
                  <FileReports 
                    organizationId={selectedOrg} 
                    dateRange={dateRange} 
                  />
                </TabsContent>

                <TabsContent value="schedules">
                  <ScheduleReports 
                    organizationId={selectedOrg} 
                    dateRange={dateRange} 
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}