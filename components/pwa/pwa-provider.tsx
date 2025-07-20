'use client'

import { useEffect } from 'react'
import { InstallPrompt } from './install-prompt'

export function PWAProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Service Worker 등록
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('PWA: Service Worker registered successfully:', registration.scope)
            
            // 업데이트 확인
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed') {
                    if (navigator.serviceWorker.controller) {
                      // 새 버전 사용 가능
                      console.log('PWA: New version available, please refresh')
                      if (confirm('새 버전이 사용 가능합니다. 새로고침하시겠습니까?')) {
                        window.location.reload()
                      }
                    } else {
                      // 첫 설치
                      console.log('PWA: Content is cached for offline use')
                    }
                  }
                })
              }
            })
          })
          .catch((error) => {
            console.error('PWA: Service Worker registration failed:', error)
          })

        // Service Worker 메시지 수신
        navigator.serviceWorker.addEventListener('message', (event) => {
          console.log('PWA: Message from service worker:', event.data)
        })
      })

      // Service Worker 업데이트 체크
      navigator.serviceWorker.ready.then((registration) => {
        // 주기적으로 업데이트 확인 (1시간마다)
        setInterval(() => {
          registration.update()
        }, 60 * 60 * 1000)
      })
    } else {
      console.log('PWA: Service Worker is not supported')
    }

    // 온라인/오프라인 상태 감지
    const handleOnline = () => {
      console.log('PWA: App is online')
      // 온라인 상태 UI 업데이트 가능
    }

    const handleOffline = () => {
      console.log('PWA: App is offline')
      // 오프라인 상태 UI 업데이트 가능
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return (
    <>
      {children}
      <InstallPrompt />
    </>
  )
}