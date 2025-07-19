'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { getUserPermissions, applyHospitalFilter, UserPermissions } from '@/lib/permission-helpers'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { OrganizationForm } from './organization-form'
import { DepartmentManager } from './department-manager'
import { Building2, Users, Plus, Edit, Trash2 } from 'lucide-react'
import { Database } from '@/lib/database.types'

type HospitalOrMSO = Database['public']['Tables']['hospital_or_mso']['Row']
type Department = Database['public']['Tables']['department']['Row']
type Employee = Database['public']['Tables']['employee']['Row']

interface OrganizationManagerProps {
  userId: string
}

export function OrganizationManager({ userId }: OrganizationManagerProps) {
  const [organizations, setOrganizations] = useState<HospitalOrMSO[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [selectedOrg, setSelectedOrg] = useState<HospitalOrMSO | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [userPermissions, setUserPermissions] = useState<UserPermissions>({
    employee: null,
    isAdmin: false,
    isManager: false,
    hospitalId: null,
    departmentId: null
  })
  const supabase = createClient()

  useEffect(() => {
    initializeData()
  }, [])

  const initializeData = async () => {
    try {
      // 사용자 권한 정보 가져오기
      const permissions = await getUserPermissions()
      setUserPermissions(permissions)
      
      // 조직 목록 가져오기
      await fetchOrganizations(permissions)
    } catch (error) {
      console.error('Error initializing data:', error)
    }
  }

  const fetchOrganizations = async (permissions?: UserPermissions) => {
    try {
      const currentPermissions = permissions || userPermissions
      let query = supabase
        .from('hospital_or_mso')
        .select('*')
      
      // 관리자가 아니면 소속 조직만 조회
      if (!currentPermissions.isAdmin && currentPermissions.hospitalId) {
        query = query.eq('id', currentPermissions.hospitalId)
      }
      
      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error
      setOrganizations(data || [])
      
      // 첫 번째 조직이 있으면 자동 선택
      if (data && data.length > 0) {
        setSelectedOrg(data[0])
        await fetchDepartments(data[0].id)
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
        .order('created_at', { ascending: true })

      if (error) throw error
      setDepartments(data || [])
    } catch (error) {
      console.error('Error fetching departments:', error)
    }
  }

  const handleOrganizationSelect = async (org: HospitalOrMSO) => {
    setSelectedOrg(org)
    await fetchDepartments(org.id)
  }

  const handleOrganizationSaved = () => {
    setShowForm(false)
    fetchOrganizations()
  }

  const handleDeleteOrganization = async (orgId: string) => {
    if (!confirm('정말로 이 조직을 삭제하시겠습니까?')) return

    try {
      const { error } = await supabase
        .from('hospital_or_mso')
        .delete()
        .eq('id', orgId)

      if (error) throw error
      await fetchOrganizations()
      if (selectedOrg?.id === orgId) {
        setSelectedOrg(null)
        setDepartments([])
      }
    } catch (error) {
      console.error('Error deleting organization:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 조직 목록 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                병원/MSO 목록
              </CardTitle>
              <CardDescription>
                등록된 병원 및 의료경영지원회사를 관리하세요
              </CardDescription>
            </div>
            {userPermissions.isAdmin && (
              <Button onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                새 조직 추가
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {organizations.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">등록된 조직이 없습니다.</p>
              {userPermissions.isAdmin ? (
                <p className="text-sm text-gray-400 mt-2">
                  첫 번째 병원 또는 MSO를 등록해보세요.
                </p>
              ) : (
                <p className="text-sm text-gray-400 mt-2">
                  관리자가 조직을 등록할 때까지 기다려주세요.
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {organizations.map((org) => (
                <div
                  key={org.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedOrg?.id === org.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleOrganizationSelect(org)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{org.name}</h3>
                        <Badge variant={org.type === 'hospital' ? 'default' : 'secondary'}>
                          {org.type === 'hospital' ? '병원' : 'MSO'}
                        </Badge>
                      </div>
                      {org.representative && (
                        <p className="text-sm text-gray-600 mb-1">
                          대표자: {org.representative}
                        </p>
                      )}
                      {org.contact_email && (
                        <p className="text-sm text-gray-600 mb-1">
                          이메일: {org.contact_email}
                        </p>
                      )}
                      {org.contact_phone && (
                        <p className="text-sm text-gray-600">
                          전화: {org.contact_phone}
                        </p>
                      )}
                    </div>
                    {userPermissions.isAdmin && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedOrg(org)
                            setShowForm(true)
                          }}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteOrganization(org.id)
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 부서 관리 */}
      {selectedOrg && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {selectedOrg.name} - 부서 관리
            </CardTitle>
            <CardDescription>
              조직의 부서 구조를 관리하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DepartmentManager
              hospitalId={selectedOrg.id}
              departments={departments}
              onDepartmentsChange={setDepartments}
              isAdmin={userPermissions.isAdmin}
            />
          </CardContent>
        </Card>
      )}

      {/* 조직 등록/수정 폼 */}
      {showForm && (
        <OrganizationForm
          organization={selectedOrg}
          onClose={() => {
            setShowForm(false)
            setSelectedOrg(null)
          }}
          onSaved={handleOrganizationSaved}
        />
      )}
    </div>
  )
}