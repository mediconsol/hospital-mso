'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Download, X, Smartphone, Monitor } from 'lucide-react'
import { toast } from 'sonner'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // iOS 감지
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    setIsIOS(iOS)

    // 이미 설치된 상태인지 확인 (standalone 모드)
    const standalone = window.matchMedia('(display-mode: standalone)').matches || 
                     (window.navigator as any).standalone || 
                     document.referrer.includes('android-app://')
    setIsStandalone(standalone)

    // PWA가 이미 설치되어 있으면 프롬프트 표시하지 않음
    if (standalone) {
      setIsInstalled(true)
      return
    }

    // beforeinstallprompt 이벤트 리스너
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('PWA: beforeinstallprompt event fired')
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      
      // 사용자가 이전에 설치를 거부했는지 확인
      const installDismissed = localStorage.getItem('pwa-install-dismissed')
      const dismissedTime = installDismissed ? parseInt(installDismissed) : 0
      const oneDayInMs = 24 * 60 * 60 * 1000
      
      // 하루가 지났거나 처음이면 프롬프트 표시
      if (!installDismissed || (Date.now() - dismissedTime) > oneDayInMs) {
        setTimeout(() => setShowInstallPrompt(true), 3000) // 3초 후 표시
      }
    }

    // appinstalled 이벤트 리스너
    const handleAppInstalled = () => {
      console.log('PWA: App was installed')
      setIsInstalled(true)
      setShowInstallPrompt(false)
      setDeferredPrompt(null)
      toast.success('앱이 성공적으로 설치되었습니다! 🎉')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    // iOS에서는 자동으로 프롬프트 표시 (iOS는 beforeinstallprompt 지원 안함)
    if (iOS && !standalone) {
      const installDismissed = localStorage.getItem('pwa-install-dismissed-ios')
      const dismissedTime = installDismissed ? parseInt(installDismissed) : 0
      const oneDayInMs = 24 * 60 * 60 * 1000
      
      if (!installDismissed || (Date.now() - dismissedTime) > oneDayInMs) {
        setTimeout(() => setShowInstallPrompt(true), 3000)
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (isIOS) {
      // iOS 설치 안내 표시
      toast.info('Safari에서 공유 버튼 → "홈 화면에 추가"를 선택해주세요', {
        duration: 8000
      })
      return
    }

    if (!deferredPrompt) {
      toast.error('설치가 지원되지 않는 브라우저입니다.')
      return
    }

    try {
      console.log('PWA: Showing install prompt')
      await deferredPrompt.prompt()
      
      const { outcome } = await deferredPrompt.userChoice
      console.log('PWA: User choice:', outcome)
      
      if (outcome === 'accepted') {
        toast.success('앱 설치가 시작되었습니다!')
      } else {
        toast.info('설치가 취소되었습니다.')
      }
      
      setDeferredPrompt(null)
      setShowInstallPrompt(false)
    } catch (error) {
      console.error('PWA: Error showing install prompt:', error)
      toast.error('설치 중 오류가 발생했습니다.')
    }
  }

  const handleDismiss = () => {
    setShowInstallPrompt(false)
    if (isIOS) {
      localStorage.setItem('pwa-install-dismissed-ios', Date.now().toString())
    } else {
      localStorage.setItem('pwa-install-dismissed', Date.now().toString())
    }
    toast.info('설치 알림을 하루 동안 숨겼습니다.')
  }

  // 설치 프롬프트를 표시하지 않는 경우들
  if (isInstalled || isStandalone || !showInstallPrompt) {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96">
      <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isIOS ? (
                <Smartphone className="h-5 w-5 text-blue-600" />
              ) : (
                <Monitor className="h-5 w-5 text-blue-600" />
              )}
              <CardTitle className="text-lg text-blue-900">
                앱 설치
              </CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription className="text-blue-700">
            {isIOS 
              ? '홈 화면에 추가하여 네이티브 앱처럼 사용하세요!'
              : '바탕화면에 설치하여 빠르게 접근하세요!'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex gap-2">
            <Button 
              onClick={handleInstallClick}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              <Download className="h-4 w-4 mr-2" />
              {isIOS ? '설치 방법 보기' : '지금 설치'}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleDismiss}
              className="border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              나중에
            </Button>
          </div>
          
          {isIOS && (
            <div className="mt-3 p-3 bg-blue-100 rounded-lg">
              <p className="text-sm text-blue-800">
                📱 Safari에서: 공유버튼 → "홈 화면에 추가" 선택
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}