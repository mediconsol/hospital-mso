'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'

const authSchema = z.object({
  email: z.string().email('유효한 이메일을 입력해주세요'),
  password: z.string().min(6, '비밀번호는 최소 6자 이상이어야 합니다'),
  name: z.string().min(2, '이름은 최소 2자 이상이어야 합니다').optional(),
})

type AuthFormData = z.infer<typeof authSchema>

interface AuthFormProps {
  mode: 'login' | 'signup'
}

export function AuthForm({ mode }: AuthFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  // 원래 요청했던 페이지 URL 가져오기
  const redirectTo = searchParams.get('redirectTo') || '/dashboard'

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AuthFormData>({
    resolver: zodResolver(authSchema),
  })

  const onSubmit = async (data: AuthFormData) => {
    setIsLoading(true)
    setError(null)

    try {
      if (mode === 'signup') {
        const { data: authData, error } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            data: {
              name: data.name,
            },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })

        if (error) {
          console.error('Signup error:', error)
          setError(error.message)
        } else {
          console.log('Signup successful:', authData)

          // 회원가입 성공 후 직원 정보 처리
          if (authData.user) {
            try {
              // 1. 기존 직원 정보 확인 및 연결
              const { data: existingEmployee, error: checkError } = await supabase
                .from('employee')
                .select('*')
                .eq('email', data.email)
                .single()

              if (existingEmployee && !checkError) {
                // 기존 직원 정보가 있으면 auth_user_id 연결
                const { error: updateError } = await supabase
                  .from('employee')
                  .update({
                    auth_user_id: authData.user.id,
                    status: 'active'
                  })
                  .eq('email', data.email)

                if (updateError) {
                  console.error('Employee update error:', updateError)
                } else {
                  console.log('Existing employee record updated successfully')
                }
              } else {
                // 2. 기존 직원 정보가 없으면 기본 병원으로 새 직원 생성
                console.log('No existing employee record found, creating new one...')

                // 기본 병원(MediConsol) 조회
                const { data: defaultHospital, error: hospitalError } = await supabase
                  .from('hospital_or_mso')
                  .select('*')
                  .or('name.eq.MediConsol 본사,name.eq.MediConsol(기본)')
                  .limit(1)
                  .single()

                if (defaultHospital && !hospitalError) {
                  // 새 직원 레코드 생성
                  const { error: insertError } = await supabase
                    .from('employee')
                    .insert([{
                      name: data.name,
                      email: data.email,
                      hospital_id: defaultHospital.id,
                      role: 'employee',
                      status: 'active',
                      auth_user_id: authData.user.id,
                      department_id: null,
                      position: null,
                      phone: null,
                      hire_date: new Date().toISOString().split('T')[0]
                    }])

                  if (insertError) {
                    console.error('New employee creation error:', insertError)
                  } else {
                    console.log('New employee record created successfully')
                  }
                } else {
                  console.error('Default hospital not found:', hospitalError)
                }
              }
            } catch (updateErr) {
              console.error('Employee processing exception:', updateErr)
            }
          }

          router.push('/auth/verify-email')
        }
      } else {
        const { data: authData, error } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        })

        if (error) {
          console.error('Login error:', error)
          setError(error.message)
        } else {
          console.log('Login successful:', authData)
          router.push(redirectTo)
        }
      }
    } catch (err) {
      console.error('Auth error:', err)
      setError('인증 처리 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{mode === 'login' ? '로그인' : '회원가입'}</CardTitle>
        <CardDescription>
          {mode === 'login' 
            ? '계정에 로그인하여 인트라넷 포털에 접속하세요.' 
            : '새 계정을 생성하여 인트라넷 포털을 이용하세요.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {mode === 'signup' && (
            <div className="space-y-2">
              <Label htmlFor="name">이름</Label>
              <Input
                id="name"
                type="text"
                placeholder="홍길동"
                {...register('name')}
                disabled={isLoading}
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="email">이메일</Label>
            <Input
              id="email"
              type="email"
              placeholder="example@hospital.com"
              {...register('email')}
              disabled={isLoading}
            />
            {errors.email && (
              <p className="text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">비밀번호</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              {...register('password')}
              disabled={isLoading}
            />
            {errors.password && (
              <p className="text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-600 text-center">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? '처리 중...' : mode === 'login' ? '로그인' : '회원가입'}
          </Button>
        </form>

        <div className="mt-4 text-center text-sm">
          {mode === 'login' ? (
            <>
              계정이 없으신가요?{' '}
              <Button variant="link" className="p-0" onClick={() => router.push('/auth/signup')}>
                회원가입
              </Button>
            </>
          ) : (
            <>
              이미 계정이 있으신가요?{' '}
              <Button variant="link" className="p-0" onClick={() => router.push('/auth/login')}>
                로그인
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}