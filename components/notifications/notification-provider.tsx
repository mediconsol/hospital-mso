'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { Database } from '@/lib/database.types'

type Notification = Database['public']['Tables']['notification']['Row']

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  markAsRead: (notificationIds: string[]) => Promise<void>
  markAsUnread: (notificationIds: string[]) => Promise<void>
  deleteNotifications: (notificationIds: string[]) => Promise<void>
  createNotification: (notification: Omit<Notification, 'id' | 'created_at'>) => Promise<void>
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

interface NotificationProviderProps {
  userId: string
  children: React.ReactNode
}

export function NotificationProvider({ userId, children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const supabase = createClient()

  // Supabase 연결 상태 테스트
  React.useEffect(() => {
    if (userId) {
      console.log('NotificationProvider: Testing Supabase connection...')
      supabase.auth.getSession().then(({ data, error }) => {
        if (error) {
          console.error('NotificationProvider: Auth session error:', error)
        } else {
          console.log('NotificationProvider: Auth session:', data.session?.user?.id ? 'authenticated' : 'not authenticated')
        }
      })
    }
  }, [userId])

  // userId가 변경되면 즉시 알림 목록 클리어
  React.useEffect(() => {
    if (!userId) {
      setNotifications([])
    }
  }, [userId])

  useEffect(() => {
    // userId가 없으면 구독하지 않음
    if (!userId) {
      console.log('NotificationProvider: No userId, skipping subscription')
      setNotifications([])
      return
    }

    console.log('NotificationProvider: Setting up real-time subscription for userId:', userId)
    fetchNotifications()
    
    // 실시간 알림 구독
    const channelName = `user_notifications_${userId}`
    console.log('NotificationProvider: Creating channel:', channelName)
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notification',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          try {
            console.log('NotificationProvider: Received new notification via real-time:', payload)
            const newNotification = payload.new as Notification
            console.log('NotificationProvider: New notification details:', newNotification)
            
            setNotifications(prev => {
              console.log('NotificationProvider: Adding notification to list, current count:', prev.length)
              return [newNotification, ...prev]
            })
            
            // 브라우저 알림 표시
            if (typeof window !== 'undefined' && 'Notification' in window) {
              if (Notification.permission === 'granted') {
                console.log('NotificationProvider: Showing browser notification')
                new Notification(newNotification.title, {
                  body: newNotification.message,
                  icon: '/favicon.ico',
                  tag: newNotification.id,
                })
              } else {
                console.log('NotificationProvider: Browser notification permission not granted:', Notification.permission)
              }
            }
            
            // 토스트 알림 표시
            console.log('NotificationProvider: Showing toast notification')
            toast(`🔔 ${newNotification.title}`, {
              description: newNotification.message,
              duration: 6000,
              action: {
                label: "확인",
                onClick: () => markAsRead([newNotification.id])
              }
            })
          } catch (error) {
            console.error('NotificationProvider: Error handling new notification:', error)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notification',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          try {
            const updatedNotification = payload.new as Notification
            setNotifications(prev => 
              prev.map(n => n.id === updatedNotification.id ? updatedNotification : n)
            )
          } catch (error) {
            console.error('Error handling notification update:', error)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notification',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          try {
            const deletedNotification = payload.old as Notification
            setNotifications(prev => prev.filter(n => n.id !== deletedNotification.id))
          } catch (error) {
            console.error('Error handling notification deletion:', error)
          }
        }
      )
      .subscribe((status) => {
        console.log('NotificationProvider: Subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('NotificationProvider: Successfully subscribed to real-time notifications')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('NotificationProvider: Error subscribing to real-time notifications')
        }
      })

    // 브라우저 알림 권한 요청
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        console.log('NotificationProvider: Requesting browser notification permission')
        Notification.requestPermission().then(permission => {
          console.log('NotificationProvider: Browser notification permission result:', permission)
        })
      } else {
        console.log('NotificationProvider: Browser notification permission status:', Notification.permission)
      }
    }

    return () => {
      try {
        supabase.removeChannel(channel)
      } catch (error) {
        console.error('Error removing notification channel:', error)
      }
    }
  }, [userId])

  const fetchNotifications = async () => {
    // userId가 없으면 fetch하지 않음
    if (!userId) {
      console.log('NotificationProvider: No userId, clearing notifications')
      setNotifications([])
      return
    }

    try {
      console.log('NotificationProvider: Fetching notifications for userId:', userId)
      const { data, error } = await supabase
        .from('notification')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      console.log('NotificationProvider: Fetched notifications:', data?.length || 0, 'total')
      const unreadCount = data?.filter(n => !n.is_read).length || 0
      console.log('NotificationProvider: Unread notifications:', unreadCount)
      
      setNotifications(data || [])
    } catch (error) {
      console.error('Error fetching notifications:', error)
      setNotifications([])
    }
  }

  const markAsRead = async (notificationIds: string[]) => {
    try {
      const { error } = await supabase
        .from('notification')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .in('id', notificationIds)

      if (error) throw error
      
      setNotifications(prev =>
        prev.map(n => 
          notificationIds.includes(n.id) 
            ? { ...n, is_read: true, read_at: new Date().toISOString() }
            : n
        )
      )
    } catch (error) {
      console.error('Error marking notifications as read:', error)
      throw error
    }
  }

  const markAsUnread = async (notificationIds: string[]) => {
    try {
      const { error } = await supabase
        .from('notification')
        .update({ 
          is_read: false, 
          read_at: null 
        })
        .in('id', notificationIds)

      if (error) throw error
      
      setNotifications(prev =>
        prev.map(n => 
          notificationIds.includes(n.id) 
            ? { ...n, is_read: false, read_at: null }
            : n
        )
      )
    } catch (error) {
      console.error('Error marking notifications as unread:', error)
      throw error
    }
  }

  const deleteNotifications = async (notificationIds: string[]) => {
    try {
      const { error } = await supabase
        .from('notification')
        .delete()
        .in('id', notificationIds)

      if (error) throw error
      
      setNotifications(prev => prev.filter(n => !notificationIds.includes(n.id)))
    } catch (error) {
      console.error('Error deleting notifications:', error)
      throw error
    }
  }

  const createNotification = async (notification: Omit<Notification, 'id' | 'created_at'>) => {
    try {
      const { error } = await supabase
        .from('notification')
        .insert([notification])

      if (error) throw error
    } catch (error) {
      console.error('Error creating notification:', error)
      throw error
    }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    markAsRead,
    markAsUnread,
    deleteNotifications,
    createNotification,
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}