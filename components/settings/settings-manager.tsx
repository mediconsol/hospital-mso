'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { getUserPermissions, UserPermissions } from '@/lib/permission-helpers'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProfileSettings } from './profile-settings'
import { SecuritySettings } from './security-settings'
import { NotificationSettings } from './notification-settings'
import { 
  User, 
  Shield, 
  Bell, 
  Palette, 
  Globe,
  Settings as SettingsIcon
} from 'lucide-react'
import { Database } from '@/lib/database.types'

type Employee = Database['public']['Tables']['employee']['Row']

interface SettingsManagerProps {
  userId: string
}

export function SettingsManager({ userId }: SettingsManagerProps) {
  const [userPermissions, setUserPermissions] = useState<UserPermissions>({
    employee: null,
    isAdmin: false,
    isManager: false,
    hospitalId: null,
    departmentId: null
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    initializeUser()
  }, [userId])

  const initializeUser = async () => {
    try {
      const permissions = await getUserPermissions()
      setUserPermissions(permissions)
    } catch (error) {
      console.error('Error initializing user:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!userPermissions.employee) {
    return (
      <div className="text-center py-8">
        <SettingsIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">사용자 정보를 찾을 수 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            사용자 설정
          </CardTitle>
          <CardDescription>
            프로필, 보안, 알림 등 계정 설정을 관리하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="profile" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">프로필</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">보안</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                <span className="hidden sm:inline">알림</span>
              </TabsTrigger>
              <TabsTrigger value="appearance" className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                <span className="hidden sm:inline">모양</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
              <ProfileSettings 
                employee={userPermissions.employee}
                onUpdate={initializeUser}
              />
            </TabsContent>

            <TabsContent value="security">
              <SecuritySettings userId={userId} />
            </TabsContent>

            <TabsContent value="notifications">
              <NotificationSettings 
                userId={userId}
                employee={userPermissions.employee}
              />
            </TabsContent>

            <TabsContent value="appearance">
              <Card>
                <CardHeader>
                  <CardTitle>테마 설정</CardTitle>
                  <CardDescription>
                    인터페이스 모양과 테마를 설정하세요
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Palette className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">테마 설정 기능은 준비 중입니다.</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}