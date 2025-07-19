// 테스트용 employee 레코드 생성
import { createClient } from '@/lib/supabase'

export async function createTestEmployeeForCurrentUser() {
  const supabase = createClient()
  
  try {
    // 현재 인증된 사용자 가져오기
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('User not authenticated')
    }

    console.log('Current user:', user.email)

    // 기존 employee 레코드 확인
    if (!user.email) {
      throw new Error('User email not available')
    }
    
    const { data: existingEmployee } = await supabase
      .from('employee')
      .select('*')
      .eq('email', user.email)
      .single()

    if (existingEmployee) {
      console.log('Employee already exists:', existingEmployee)
      return existingEmployee
    }

    // 병원 조직 가져오기 (첫 번째)
    const { data: hospitals, error: hospitalError } = await supabase
      .from('hospital_or_mso')
      .select('*')
      .limit(1)

    if (hospitalError || !hospitals || hospitals.length === 0) {
      // 테스트용 병원 생성
      const { data: newHospital, error: createHospitalError } = await supabase
        .from('hospital_or_mso')
        .insert([{
          name: '테스트 병원',
          type: 'hospital',
          representative: '관리자',
          contact_email: 'admin@test.com',
        }])
        .select()
        .single()

      if (createHospitalError) {
        throw createHospitalError
      }

      // 새 employee 생성
      const { data: newEmployee, error: empError } = await supabase
        .from('employee')
        .insert([{
          name: user.email?.split('@')[0] || 'Test User',
          email: user.email || 'test@example.com',
          hospital_id: newHospital.id,
          role: 'admin',
          status: 'active',
        }])
        .select()
        .single()

      if (empError) {
        throw empError
      }

      console.log('Created new employee:', newEmployee)
      return newEmployee
    }

    // 기존 병원에 employee 생성
    const { data: newEmployee, error: empError } = await supabase
      .from('employee')
      .insert([{
        name: user.email?.split('@')[0] || 'Test User',
        email: user.email || 'test@example.com',
        hospital_id: hospitals[0].id,
        role: 'admin',
        status: 'active',
      }])
      .select()
      .single()

    if (empError) {
      throw empError
    }

    console.log('Created new employee:', newEmployee)
    return newEmployee
  } catch (error) {
    console.error('Error creating test employee:', error)
    return null
  }
}