'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface AuthContextType {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          const newUser = session?.user ?? null
          
          // 상태 업데이트
          setUser(newUser)
          setLoading(false)
          
          // SIGNED_IN 이벤트만 처리 (SIGNED_OUT은 signOut 함수에서 처리)
          if (event === 'SIGNED_IN' && newUser) {
            router.push('/dashboard')
          }
        } catch (error) {
          console.error('Auth state change error:', error)
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [router, supabase.auth])

  const signOut = async () => {
    try {
      setLoading(true)
      
      // 즉시 로컬 상태 클리어 (UI 즉시 업데이트)
      setUser(null)
      
      // Supabase 로그아웃 처리
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Error signing out:', error)
      }
      
      // 브라우저 히스토리 클리어하고 홈페이지로 이동
      window.location.href = '/'
    } catch (error) {
      console.error('Sign out error:', error)
      // 에러가 발생해도 강제로 홈페이지로 이동
      setUser(null)
      window.location.href = '/'
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}