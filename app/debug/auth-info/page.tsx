'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function AuthInfoPage() {
  const [authInfo, setAuthInfo] = useState<any>(null)
  const [employeeInfo, setEmployeeInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [message, setMessage] = useState('')

  const supabase = createClient()

  useEffect(() => {
    async function getAuthInfo() {
      try {
        // 현재 인증된 사용자 정보
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        
        if (authError) {
          console.error('Auth error:', authError)
          setMessage(`인증 오류: ${authError.message}`)
          return
        }

        setAuthInfo(user)

        if (user) {
          // 해당 이메일의 직원 정보 조회
          const { data: employee, error: empError } = await supabase
            .from('employee')
            .select('*')
            .eq('email', user.email)
            .single()

          if (empError) {
            console.error('Employee error:', empError)
            setMessage(`직원 정보 조회 오류: ${empError.message}`)
          } else {
            setEmployeeInfo(employee)
          }
        }
      } catch (error) {
        console.error('Error:', error)
        setMessage(`오류: ${error}`)
      } finally {
        setLoading(false)
      }
    }

    getAuthInfo()
  }, [])

  const updateAuthUserId = async () => {
    if (!authInfo || !employeeInfo) return

    setUpdating(true)
    setMessage('')

    try {
      const { error } = await supabase
        .from('employee')
        .update({ auth_user_id: authInfo.id })
        .eq('email', authInfo.email)

      if (error) {
        setMessage(`업데이트 오류: ${error.message}`)
      } else {
        setMessage('✅ auth_user_id가 성공적으로 업데이트되었습니다!')
        // 직원 정보 다시 조회
        const { data: updatedEmployee } = await supabase
          .from('employee')
          .select('*')
          .eq('email', authInfo.email)
          .single()
        setEmployeeInfo(updatedEmployee)
      }
    } catch (error) {
      setMessage(`오류: ${error}`)
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">인증 정보 로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">인증 정보 디버그</h1>
        
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 인증 사용자 정보 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">🔐 인증 사용자 정보</h2>
            {authInfo ? (
              <div className="space-y-2">
                <p><strong>User ID:</strong> <code className="bg-gray-100 px-2 py-1 rounded">{authInfo.id}</code></p>
                <p><strong>Email:</strong> {authInfo.email}</p>
                <p><strong>Created:</strong> {new Date(authInfo.created_at).toLocaleString()}</p>
                <p><strong>Last Sign In:</strong> {authInfo.last_sign_in_at ? new Date(authInfo.last_sign_in_at).toLocaleString() : 'N/A'}</p>
                <p><strong>Email Confirmed:</strong> {authInfo.email_confirmed_at ? '✅ 확인됨' : '❌ 미확인'}</p>
              </div>
            ) : (
              <p className="text-gray-500">로그인되지 않음</p>
            )}
          </div>

          {/* 직원 정보 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">👤 직원 정보</h2>
            {employeeInfo ? (
              <div className="space-y-2">
                <p><strong>Employee ID:</strong> <code className="bg-gray-100 px-2 py-1 rounded">{employeeInfo.id}</code></p>
                <p><strong>Name:</strong> {employeeInfo.name}</p>
                <p><strong>Email:</strong> {employeeInfo.email}</p>
                <p><strong>Role:</strong> <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">{employeeInfo.role}</span></p>
                <p><strong>Status:</strong> <span className={`px-2 py-1 rounded ${
                  employeeInfo.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>{employeeInfo.status}</span></p>
                <p><strong>Auth User ID:</strong> {employeeInfo.auth_user_id ? (
                  <code className="bg-gray-100 px-2 py-1 rounded">{employeeInfo.auth_user_id}</code>
                ) : (
                  <span className="text-red-600">❌ 설정되지 않음</span>
                )}</p>
                <p><strong>Hospital ID:</strong> <code className="bg-gray-100 px-2 py-1 rounded">{employeeInfo.hospital_id}</code></p>
              </div>
            ) : (
              <p className="text-gray-500">직원 정보 없음</p>
            )}
          </div>
        </div>

        {/* 연결 상태 및 액션 */}
        {authInfo && employeeInfo && (
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">🔗 연결 상태</h2>
            
            <div className="mb-4">
              {employeeInfo.auth_user_id === authInfo.id ? (
                <div className="flex items-center text-green-600">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  ✅ 인증 사용자와 직원 정보가 올바르게 연결되어 있습니다
                </div>
              ) : (
                <div className="flex items-center text-red-600">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  ❌ 인증 사용자와 직원 정보가 연결되지 않음
                </div>
              )}
            </div>

            {employeeInfo.auth_user_id !== authInfo.id && (
              <button
                onClick={updateAuthUserId}
                disabled={updating}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                {updating ? '업데이트 중...' : 'auth_user_id 연결하기'}
              </button>
            )}
          </div>
        )}

        {/* 마이그레이션 SQL */}
        {authInfo && employeeInfo && employeeInfo.auth_user_id !== authInfo.id && (
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">📝 마이그레이션 SQL</h2>
            <p className="text-gray-600 mb-4">다음 SQL을 마이그레이션 파일에 추가할 수 있습니다:</p>
            <div className="bg-gray-100 p-4 rounded-lg">
              <code className="text-sm">
                -- Connect admin@mediconsol.com to auth user<br/>
                UPDATE employee SET auth_user_id = '{authInfo.id}' WHERE email = 'admin@mediconsol.com';
              </code>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
