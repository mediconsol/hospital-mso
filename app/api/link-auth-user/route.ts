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

    // 요청 데이터 파싱
    const body = await request.json()
    const { employee_id } = body

    if (!employee_id) {
      return NextResponse.json(
        { error: '직원 ID가 필요합니다.' },
        { status: 400 }
      )
    }

    console.log('🔍 Linking auth user:', { user_id: user.id, email: user.email, employee_id })

    // 해당 직원 정보 조회
    const { data: employee, error: employeeError } = await supabase
      .from('employee')
      .select('*')
      .eq('id', employee_id)
      .single()

    if (employeeError || !employee) {
      console.error('Employee fetch error:', employeeError)
      return NextResponse.json(
        { error: '직원 정보를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 이메일 일치 확인
    if (user.email !== employee.email) {
      return NextResponse.json(
        { error: `현재 로그인된 사용자(${user.email})와 직원 이메일(${employee.email})이 일치하지 않습니다.` },
        { status: 403 }
      )
    }

    // 이미 연결되어 있는지 확인
    if (employee.auth_user_id === user.id) {
      return NextResponse.json({
        success: true,
        message: '이미 연결되어 있습니다.',
        employee: employee
      })
    }

    // auth_user_id 업데이트
    const { data: updatedEmployee, error: updateError } = await supabase
      .from('employee')
      .update({ auth_user_id: user.id })
      .eq('id', employee_id)
      .eq('email', user.email) // 추가 보안을 위한 이메일 확인
      .select()
      .single()

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json(
        { error: `업데이트 실패: ${updateError.message}` },
        { status: 500 }
      )
    }

    console.log('✅ Auth user linked successfully:', updatedEmployee)

    return NextResponse.json({
      success: true,
      message: '인증 사용자와 성공적으로 연결되었습니다.',
      employee: updatedEmployee
    })

  } catch (error) {
    console.error('Link auth user error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
