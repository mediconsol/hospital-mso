import { getCurrentEmployee } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase'
import { Database } from '@/lib/database.types'

type Employee = Database['public']['Tables']['employee']['Row']

export interface UserPermissions {
  employee: Employee | null
  isAdmin: boolean
  isManager: boolean
  isSuperAdmin: boolean
  hospitalId: string | null
  departmentId: string | null
}

/**
 * 현재 사용자의 권한과 소속 정보를 가져옵니다.
 */
export async function getUserPermissions(): Promise<UserPermissions> {
  try {
    const employee = await getCurrentEmployee()
    
    if (!employee) {
      return {
        employee: null,
        isAdmin: false,
        isManager: false,
        hospitalId: null,
        departmentId: null
      }
    }

    return {
      employee,
      isAdmin: employee.role === 'admin' || employee.role === 'super_admin',
      isManager: employee.role === 'manager' || employee.role === 'admin' || employee.role === 'super_admin',
      isSuperAdmin: employee.role === 'super_admin',
      hospitalId: employee.hospital_id,
      departmentId: employee.department_id
    }
  } catch (error) {
    console.error('Error getting user permissions:', error)
    return {
      employee: null,
      isAdmin: false,
      isManager: false,
      isSuperAdmin: false,
      hospitalId: null,
      departmentId: null
    }
  }
}

/**
 * 관리자가 아닌 사용자의 데이터 조회 시 필터링을 위한 헬퍼
 */
export function applyHospitalFilter(supabaseQuery: any, userPermissions: UserPermissions) {
  // 관리자가 아니면 자신의 병원 데이터만 조회
  if (!userPermissions.isAdmin && userPermissions.hospitalId) {
    return supabaseQuery.eq('hospital_id', userPermissions.hospitalId)
  }
  return supabaseQuery
}

/**
 * 부서 관련 데이터 필터링 (관리자가 아닌 경우 소속 병원만)
 */
export function applyDepartmentFilter(supabaseQuery: any, userPermissions: UserPermissions) {
  if (!userPermissions.isAdmin && userPermissions.hospitalId) {
    return supabaseQuery.eq('hospital_id', userPermissions.hospitalId)
  }
  return supabaseQuery
}

/**
 * 직원 관련 데이터 필터링
 */
export function applyEmployeeFilter(supabaseQuery: any, userPermissions: UserPermissions) {
  if (!userPermissions.isAdmin && userPermissions.hospitalId) {
    return supabaseQuery.eq('hospital_id', userPermissions.hospitalId)
  }
  return supabaseQuery
}

/**
 * 업무 관련 데이터 필터링
 */
export function applyTaskFilter(supabaseQuery: any, userPermissions: UserPermissions) {
  if (!userPermissions.isAdmin && userPermissions.hospitalId) {
    return supabaseQuery.eq('hospital_id', userPermissions.hospitalId)
  }
  return supabaseQuery
}

/**
 * 파일 관련 데이터 필터링
 */
export function applyFileFilter(supabaseQuery: any, userPermissions: UserPermissions) {
  if (!userPermissions.isAdmin && userPermissions.hospitalId) {
    return supabaseQuery.eq('hospital_id', userPermissions.hospitalId)
  }
  return supabaseQuery
}

/**
 * 일정 관련 데이터 필터링
 */
export function applyScheduleFilter(supabaseQuery: any, userPermissions: UserPermissions) {
  if (!userPermissions.isAdmin && userPermissions.hospitalId) {
    return supabaseQuery.eq('hospital_id', userPermissions.hospitalId)
  }
  return supabaseQuery
}

/**
 * 공지사항 관련 데이터 필터링
 */
export function applyAnnouncementFilter(supabaseQuery: any, userPermissions: UserPermissions) {
  if (!userPermissions.isAdmin && userPermissions.hospitalId) {
    return supabaseQuery.eq('hospital_id', userPermissions.hospitalId)
  }
  return supabaseQuery
}

/**
 * 알림 관련 데이터 필터링
 */
export function applyNotificationFilter(supabaseQuery: any, userPermissions: UserPermissions) {
  if (!userPermissions.isAdmin && userPermissions.hospitalId) {
    return supabaseQuery.eq('hospital_id', userPermissions.hospitalId)
  }
  return supabaseQuery
}