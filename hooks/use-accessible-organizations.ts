'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/components/auth/auth-provider'

export interface AccessibleOrganization {
  organization_id: string
  organization_name: string
  organization_type: string
  access_level: string
  is_primary: boolean
}

export function useAccessibleOrganizations() {
  const [organizations, setOrganizations] = useState<AccessibleOrganization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()
  const supabase = createClient()

  useEffect(() => {
    if (!user) {
      setOrganizations([])
      setLoading(false)
      return
    }

    loadAccessibleOrganizations()
  }, [user])

  const loadAccessibleOrganizations = async () => {
    if (!user) {
      return
    }
    setLoading(true)
    setError(null)

    try {
      // 1. 먼저 기본 소속 조직 조회 (이메일과 auth_user_id 둘 다 시도)
      // auth_user_id로 먼저 시도
      let { data: employees, error: empError } = await supabase
        .from('employee')
        .select(`
          id,
          hospital_id,
          hospital:hospital_id (
            id,
            name,
            type
          )
        `)
        .eq('auth_user_id', user.id)

      // auth_user_id로 찾지 못하면 이메일로 시도
      if (empError || !employees || employees.length === 0) {
        const { data: emailEmployees, error: emailError } = await supabase
          .from('employee')
          .select(`
            id,
            hospital_id,
            hospital:hospital_id (
              id,
              name,
              type
            )
          `)
          .eq('email', user.email)

        employees = emailEmployees
        empError = emailError
      }

      // 첫 번째 직원 레코드 사용
      const employee = employees?.[0]

      const accessibleOrgs: AccessibleOrganization[] = []

      // 기본 소속 조직 추가
      if (!empError && employee?.hospital) {
        accessibleOrgs.push({
          organization_id: employee.hospital.id,
          organization_name: employee.hospital.name,
          organization_type: employee.hospital.type,
          access_level: 'admin',
          is_primary: true
        })
      }

      // 2. 추가 접근 권한 조직 조회 (employee가 있을 때만)
      let additionalAccess = []
      let accessError = null

      if (employee?.id) {
        const { data: access, error: err } = await supabase
          .from('employee_organization_access')
          .select(`
            organization_id,
            access_level,
            organization:organization_id (
              id,
              name,
              type
            )
          `)
          .eq('employee_id', employee.id)
          .eq('is_active', true)
          .or('expires_at.is.null,expires_at.gt.now()')

        additionalAccess = access || []
        accessError = err
      }

      // 추가 접근 권한 조직 추가 (기본 소속과 중복되지 않는 것만)
      if (!accessError && additionalAccess && additionalAccess.length > 0) {
        additionalAccess.forEach(access => {
          if (access.organization && access.organization.id !== employee?.hospital_id) {
            accessibleOrgs.push({
              organization_id: access.organization.id,
              organization_name: access.organization.name,
              organization_type: access.organization.type,
              access_level: access.access_level,
              is_primary: false
            })
          }
        })
      }


      setOrganizations(accessibleOrgs)

      if (accessibleOrgs.length === 0) {
        setError('접근 가능한 조직이 없습니다. 관리자에게 문의하세요.')
      }
    } catch (err: any) {
      console.error('Error loading accessible organizations:', err)
      setError(err.message || '조직 목록을 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 기본 조직 (primary organization) 가져오기
  const primaryOrganization = organizations.find(org => org.is_primary)

  // 조직 선택 옵션 생성
  const organizationOptions = organizations.map(org => ({
    value: org.organization_id,
    label: `${org.organization_name} ${org.is_primary ? '(기본)' : ''}`,
    type: org.organization_type,
    accessLevel: org.access_level,
    isPrimary: org.is_primary
  }))

  // 특정 조직에 대한 접근 권한 확인
  const hasAccessToOrganization = (organizationId: string, requiredLevel?: string) => {
    const org = organizations.find(o => o.organization_id === organizationId)
    if (!org) return false

    if (!requiredLevel) return true

    // 권한 레벨 순서: admin > write > read
    const levelOrder = { admin: 3, write: 2, read: 1 }
    const userLevel = levelOrder[org.access_level as keyof typeof levelOrder] || 0
    const required = levelOrder[requiredLevel as keyof typeof levelOrder] || 0

    return userLevel >= required
  }

  // 쓰기 권한이 있는 조직들만 필터링
  const writableOrganizations = organizations.filter(org => 
    org.access_level === 'admin' || org.access_level === 'write'
  )

  // 관리자 권한이 있는 조직들만 필터링
  const adminOrganizations = organizations.filter(org => 
    org.access_level === 'admin'
  )

  return {
    organizations,
    organizationOptions,
    primaryOrganization,
    writableOrganizations,
    adminOrganizations,
    loading,
    error,
    hasAccessToOrganization,
    refresh: loadAccessibleOrganizations
  }
}
