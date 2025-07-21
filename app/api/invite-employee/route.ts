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

    // 현재 사용자의 직원 정보 확인
    const { data: currentEmployee, error: empError } = await supabase
      .from('employee')
      .select('*')
      .eq('auth_user_id', user.id)
      .single()

    if (empError || !currentEmployee) {
      return NextResponse.json(
        { error: '직원 정보를 찾을 수 없습니다.' },
        { status: 403 }
      )
    }

    // 관리자 권한 확인
    if (!['admin', 'super_admin'].includes(currentEmployee.role)) {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      )
    }

    // 요청 데이터 파싱
    const body = await request.json()
    const { name, email, hospital_id, department_id, role, position, message } = body

    // 입력 데이터 검증
    if (!name || !email || !hospital_id || !role) {
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다.' },
        { status: 400 }
      )
    }

    // 이메일 중복 확인
    const { data: existingEmployee } = await supabase
      .from('employee')
      .select('id')
      .eq('email', email)
      .single()

    if (existingEmployee) {
      return NextResponse.json(
        { error: '이미 등록된 이메일입니다.' },
        { status: 400 }
      )
    }

    // 1. 직원 정보를 데이터베이스에 미리 저장 (상태는 inactive로)
    const employeeData = {
      name,
      email,
      hospital_id,
      department_id: department_id || null,
      role,
      position: position || null,
      status: 'inactive' as const, // 초대 상태
      phone: null,
      hire_date: null,
    }

    const { data: newEmployee, error: insertError } = await supabase
      .from('employee')
      .insert([employeeData])
      .select()
      .single()

    if (insertError) {
      console.error('Employee insert error:', insertError)
      return NextResponse.json(
        { error: '직원 정보 저장 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    // 2. 임시로 직원 정보만 저장하고 수동 초대 안내
    // TODO: Service Role Key 설정 후 실제 이메일 초대 기능 활성화
    console.log('Employee created successfully:', newEmployee.id)

    // 실제 이메일 초대는 나중에 구현
    // const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(...)

    const inviteData = {
      user: null,
      message: '직원 정보가 저장되었습니다. 수동으로 회원가입 안내를 해주세요.'
    }

    return NextResponse.json({
      success: true,
      message: '직원 정보가 성공적으로 저장되었습니다. 해당 직원에게 회원가입 안내를 해주세요.',
      employee: newEmployee,
      invite: inviteData
    })

  } catch (error) {
    console.error('Invite employee error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
