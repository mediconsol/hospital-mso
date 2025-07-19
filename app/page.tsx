import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-12">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              병원/MSO 인트라넷 포털
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              병원 및 의료경영지원회사를 위한 종합 업무 관리 시스템
            </p>
            
            <div className="flex justify-center gap-4 mb-12">
              <Link href="/auth/login">
                <Button size="lg">로그인</Button>
              </Link>
              <Link href="/auth/signup">
                <Button variant="outline" size="lg">회원가입</Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">조직 관리</h3>
                <p className="text-gray-600">병원/MSO 등록, 부서 및 직원 관리</p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">업무 공유</h3>
                <p className="text-gray-600">업무 지시, 진행 상황 추적 및 관리</p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">파일 공유</h3>
                <p className="text-gray-600">문서 및 자료 중앙 관리</p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">일정 관리</h3>
                <p className="text-gray-600">회의, 교육, 마감 일정 공유</p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">AI 알림</h3>
                <p className="text-gray-600">자동화된 업무 알림 시스템</p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">보안 관리</h3>
                <p className="text-gray-600">권한별 접근 제어</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}