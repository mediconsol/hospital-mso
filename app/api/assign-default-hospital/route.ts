import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // 현재 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    console.log('🔍 Assigning default hospital for user:', user.email)

    // 1. 기본 병원(MediConsol) 조회
    const { data: defaultHospital, error: hospitalError } = await supabase
      .from('hospital_or_mso')
      .select('*')
      .or('name.eq.MediConsol 본사,name.eq.MediConsol(기본)')
      .limit(1)
      .single()

    if (hospitalError || !defaultHospital) {
      console.error('Default hospital not found:', hospitalError)
      return NextResponse.json(
        { error: '기본 병원을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 2. 기본 부서 조회
    const { data: defaultDepartment, error: deptError } = await supabase
      .from('department')
      .select('*')
      .eq('name', '일반부서')
      .eq('hospital_id', defaultHospital.id)
      .single()

    if (deptError || !defaultDepartment) {
      console.error('Default department not found:', deptError)
      return NextResponse.json(
        { error: '기본 부서를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 3. 현재 사용자의 직원 정보 확인
    const { data: existingEmployee, error: empError } = await supabase
      .from('employee')
      .select('*')
      .eq('auth_user_id', user.id)
      .single()

    if (existingEmployee && !empError) {
      // 기존 직원 정보가 있으면 hospital_id 업데이트
      if (!existingEmployee.hospital_id) {
        const { error: updateError } = await supabase
          .from('employee')
          .update({
            hospital_id: defaultHospital.id,
            department_id: existingEmployee.department_id || defaultDepartment.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingEmployee.id)

        if (updateError) {
          console.error('Employee update error:', updateError)
          return NextResponse.json(
            { error: '직원 정보 업데이트 실패' },
            { status: 500 }
          )
        }

        console.log('✅ Employee hospital_id updated')
        return NextResponse.json({
          success: true,
          message: '기본 병원이 할당되었습니다.',
          employee: { ...existingEmployee, hospital_id: defaultHospital.id }
        })
      } else {
        return NextResponse.json({
          success: true,
          message: '이미 병원이 할당되어 있습니다.',
          employee: existingEmployee
        })
      }
    } else {
      // 직원 정보가 없으면 새로 생성
      const userName = user.user_metadata?.name || user.email?.split('@')[0] || 'Unknown'
      
      const { data: newEmployee, error: insertError } = await supabase
        .from('employee')
        .insert([{
          name: userName,
          email: user.email!,
          hospital_id: defaultHospital.id,
          department_id: defaultDepartment.id,
          role: 'employee',
          status: 'active',
          auth_user_id: user.id,
          hire_date: new Date().toISOString().split('T')[0]
        }])
        .select()
        .single()

      if (insertError) {
        console.error('Employee creation error:', insertError)
        return NextResponse.json(
          { error: '직원 정보 생성 실패' },
          { status: 500 }
        )
      }

      console.log('✅ New employee created with default hospital')
      return NextResponse.json({
        success: true,
        message: '새 직원 정보가 생성되고 기본 병원이 할당되었습니다.',
        employee: newEmployee
      })
    }

  } catch (error) {
    console.error('Assign default hospital error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
