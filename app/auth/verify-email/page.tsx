import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>이메일 인증</CardTitle>
          <CardDescription>
            회원가입이 완료되었습니다!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <p className="text-sm text-gray-600">
              가입하신 이메일 주소로 인증 링크를 발송했습니다.
              <br />
              이메일을 확인하시고 인증을 완료해주세요.
            </p>
          </div>
          
          <div className="text-center">
            <Link href="/auth/login">
              <Button variant="outline" className="w-full">
                로그인 페이지로 이동
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}