import { AuthForm } from '@/components/auth/auth-form'

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
            병원/MSO 인트라넷 포털
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            새 계정을 만들어 시작하세요
          </p>
        </div>
        <AuthForm mode="signup" />
      </div>
    </div>
  )
}