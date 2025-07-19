'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Bell, Mail, MessageSquare, Calendar, FileText, Users } from 'lucide-react'
import { Database } from '@/lib/database.types'

type Employee = Database['public']['Tables']['employee']['Row']

interface NotificationPreference {
  type: string
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  email: boolean
  push: boolean
  inApp: boolean
}

interface NotificationSettingsProps {
  userId: string
  employee: Employee
}

export function NotificationSettings({ userId, employee }: NotificationSettingsProps) {
  const [preferences, setPreferences] = useState<NotificationPreference[]>([
    {
      type: 'task',
      label: '업무 알림',
      description: '새로운 업무 할당, 업무 완료, 마감일 알림',
      icon: FileText,
      email: true,
      push: true,
      inApp: true
    },
    {
      type: 'schedule',
      label: '일정 알림',
      description: '회의, 약속, 일정 변경 알림',
      icon: Calendar,
      email: true,
      push: true,
      inApp: true
    },
    {
      type: 'file',
      label: '파일 알림',
      description: '파일 공유, 업로드, 다운로드 알림',
      icon: FileText,
      email: false,
      push: true,
      inApp: true
    },
    {
      type: 'message',
      label: '메시지 알림',
      description: '새로운 메시지, 멘션 알림',
      icon: MessageSquare,
      email: true,
      push: true,
      inApp: true
    },
    {
      type: 'system',
      label: '시스템 알림',
      description: '시스템 업데이트, 점검 알림',
      icon: Bell,
      email: true,
      push: false,
      inApp: true
    },
    {
      type: 'announcement',
      label: '공지사항',
      description: '중요 공지사항, 회사 소식',
      icon: Users,
      email: true,
      push: true,
      inApp: true
    }
  ])

  const [quietHours, setQuietHours] = useState({
    enabled: false,
    startTime: '22:00',
    endTime: '08:00'
  })

  const [emailDigest, setEmailDigest] = useState('daily')
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    loadNotificationSettings()
  }, [userId])

  const loadNotificationSettings = async () => {
    try {
      // 실제 구현에서는 사용자의 알림 설정을 데이터베이스에서 불러옴
      // 현재는 기본값 사용
    } catch (error) {
      console.error('Error loading notification settings:', error)
    }
  }

  const updatePreference = (type: string, field: 'email' | 'push' | 'inApp', value: boolean) => {
    setPreferences(prev => 
      prev.map(pref => 
        pref.type === type 
          ? { ...pref, [field]: value }
          : pref
      )
    )
  }

  const saveSettings = async () => {
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // 실제 구현에서는 설정을 데이터베이스에 저장
      // 현재는 시뮬레이션
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setSuccess('알림 설정이 성공적으로 저장되었습니다.')
    } catch (err: any) {
      setError(err.message || '설정 저장 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 알림 유형별 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            알림 유형별 설정
          </CardTitle>
          <CardDescription>
            각 알림 유형별로 수신 방법을 설정하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* 헤더 */}
            <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-700">
              <div className="col-span-6">알림 유형</div>
              <div className="col-span-2 text-center">이메일</div>
              <div className="col-span-2 text-center">푸시</div>
              <div className="col-span-2 text-center">앱 내</div>
            </div>

            <Separator />

            {/* 알림 설정 목록 */}
            <div className="space-y-4">
              {preferences.map((pref) => {
                const Icon = pref.icon
                return (
                  <div key={pref.type} className="grid grid-cols-12 gap-4 items-center py-3">
                    <div className="col-span-6">
                      <div className="flex items-start gap-3">
                        <Icon className="h-5 w-5 text-gray-500 mt-0.5" />
                        <div>
                          <p className="font-medium">{pref.label}</p>
                          <p className="text-sm text-gray-600">{pref.description}</p>
                        </div>
                      </div>
                    </div>
                    <div className="col-span-2 flex justify-center">
                      <Switch
                        checked={pref.email}
                        onCheckedChange={(checked) => updatePreference(pref.type, 'email', checked)}
                        disabled={isLoading}
                      />
                    </div>
                    <div className="col-span-2 flex justify-center">
                      <Switch
                        checked={pref.push}
                        onCheckedChange={(checked) => updatePreference(pref.type, 'push', checked)}
                        disabled={isLoading}
                      />
                    </div>
                    <div className="col-span-2 flex justify-center">
                      <Switch
                        checked={pref.inApp}
                        onCheckedChange={(checked) => updatePreference(pref.type, 'inApp', checked)}
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 조용한 시간 설정 */}
      <Card>
        <CardHeader>
          <CardTitle>조용한 시간</CardTitle>
          <CardDescription>
            지정된 시간 동안 푸시 알림을 받지 않습니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="quiet-hours">조용한 시간 사용</Label>
              <Switch
                id="quiet-hours"
                checked={quietHours.enabled}
                onCheckedChange={(checked) => 
                  setQuietHours(prev => ({ ...prev, enabled: checked }))
                }
                disabled={isLoading}
              />
            </div>

            {quietHours.enabled && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>시작 시간</Label>
                  <Select 
                    value={quietHours.startTime} 
                    onValueChange={(value) => 
                      setQuietHours(prev => ({ ...prev, startTime: value }))
                    }
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => {
                        const hour = i.toString().padStart(2, '0')
                        return (
                          <SelectItem key={hour} value={`${hour}:00`}>
                            {hour}:00
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>종료 시간</Label>
                  <Select 
                    value={quietHours.endTime} 
                    onValueChange={(value) => 
                      setQuietHours(prev => ({ ...prev, endTime: value }))
                    }
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => {
                        const hour = i.toString().padStart(2, '0')
                        return (
                          <SelectItem key={hour} value={`${hour}:00`}>
                            {hour}:00
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 이메일 요약 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            이메일 요약
          </CardTitle>
          <CardDescription>
            알림을 이메일로 요약해서 받는 주기를 설정하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>요약 주기</Label>
              <Select 
                value={emailDigest} 
                onValueChange={setEmailDigest}
                disabled={isLoading}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">즉시</SelectItem>
                  <SelectItem value="hourly">1시간마다</SelectItem>
                  <SelectItem value="daily">하루에 한 번</SelectItem>
                  <SelectItem value="weekly">일주일에 한 번</SelectItem>
                  <SelectItem value="never">받지 않음</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 상태 메시지 */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-600">{success}</p>
        </div>
      )}

      {/* 저장 버튼 */}
      <div className="flex justify-end">
        <Button onClick={saveSettings} disabled={isLoading}>
          {isLoading ? '저장 중...' : '설정 저장'}
        </Button>
      </div>
    </div>
  )
}