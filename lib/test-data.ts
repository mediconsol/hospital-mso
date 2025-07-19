// 테스트용 임시 데이터 생성 함수
import { createClient } from '@/lib/supabase'

export async function createTestEmployee() {
  const supabase = createClient()
  
  try {
    // 현재 인증된 사용자 가져오기
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('User not authenticated')
    }

    // 테스트용 병원 생성 (이미 있으면 무시)
    const { data: hospital, error: hospitalError } = await supabase
      .from('hospital_or_mso')
      .upsert([{
        name: '테스트 병원',
        type: 'hospital',
        representative: '관리자',
        contact_email: 'admin@test.com',
      }])
      .select()
      .single()

    if (hospitalError) {
      console.log('Hospital already exists or error:', hospitalError)
      // 기존 병원 가져오기
      const { data: existingHospital } = await supabase
        .from('hospital_or_mso')
        .select('*')
        .limit(1)
        .single()
      
      if (!existingHospital) {
        throw new Error('No hospital found')
      }
      
      // 임시로 직원 레코드 생성 (auth_user_id 없이)
      const { data: employee, error: empError } = await supabase
        .from('employee')
        .upsert([{
          name: user.email?.split('@')[0] || 'Test User',
          email: user.email || 'test@example.com',
          hospital_id: existingHospital.id,
          role: 'admin',
          status: 'active',
        }])
        .select()
        .single()

      if (empError) {
        throw empError
      }

      return employee
    }

    // 직원 레코드 생성
    const { data: employee, error: empError } = await supabase
      .from('employee')
      .upsert([{
        name: user.email?.split('@')[0] || 'Test User',
        email: user.email || 'test@example.com',
        hospital_id: hospital.id,
        role: 'admin',
        status: 'active',
      }])
      .select()
      .single()

    if (empError) {
      throw empError
    }

    return employee
  } catch (error) {
    console.error('Error creating test employee:', error)
    return null
  }
}