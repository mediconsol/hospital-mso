const CACHE_NAME = 'hospital-intranet-v1';
const urlsToCache = [
  '/',
  '/dashboard',
  '/announcements',
  '/notifications',
  '/manifest.json',
  '/icons/icon-192x192.svg',
  '/icons/icon-512x512.svg'
];

// 설치 이벤트
self.addEventListener('install', (event) => {
  console.log('Service Worker: Install event');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: Cache complete, skipping waiting');
        return self.skipWaiting();
      })
  );
});

// 활성화 이벤트
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activate event');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Claiming clients');
      return self.clients.claim();
    })
  );
});

// 네트워크 요청 가로채기
self.addEventListener('fetch', (event) => {
  // API 요청은 캐시하지 않음
  if (event.request.url.includes('/api/') || 
      event.request.url.includes('supabase.co')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // 캐시에 있으면 캐시에서 반환
        if (response) {
          return response;
        }

        // 네트워크 요청
        return fetch(event.request)
          .then((response) => {
            // 유효한 응답이 아니면 그대로 반환
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // 응답을 복제하여 캐시에 저장
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // 오프라인일 때 기본 페이지 반환
            if (event.request.destination === 'document') {
              return caches.match('/');
            }
          });
      })
  );
});

// 푸시 알림 수신
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push event received');
  
  const options = {
    body: event.data ? event.data.text() : '새로운 알림이 있습니다.',
    icon: '/icons/icon-192x192.svg',
    badge: '/icons/icon-96x96.svg',
    tag: 'notification',
    requireInteraction: true,
    actions: [
      {
        action: 'view',
        title: '확인'
      },
      {
        action: 'dismiss',
        title: '닫기'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('병원 인트라넷', options)
  );
});

// 알림 클릭 처리
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification click event');
  
  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/notifications')
    );
  } else if (event.action === 'dismiss') {
    // 아무것도 하지 않음
  } else {
    // 기본 동작: 앱 열기
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        if (clientList.length > 0) {
          return clientList[0].focus();
        }
        return clients.openWindow('/');
      })
    );
  }
});

// 백그라운드 동기화 (나중에 구현 가능)
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync event');
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // 백그라운드에서 수행할 작업
      console.log('Service Worker: Performing background sync')
    );
  }
});