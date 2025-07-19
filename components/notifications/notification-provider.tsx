'use client'

import { createContext, useContext, useEffect, useState } from 'react'
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

  useEffect(() => {
    fetchNotifications()
    
    // 실시간 알림 구독
    const channel = supabase
      .channel('user_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notification',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification
          setNotifications(prev => [newNotification, ...prev])
          
          // 브라우저 알림 표시
          if (typeof window !== 'undefined' && 'Notification' in window) {
            if (Notification.permission === 'granted') {
              new Notification(newNotification.title, {
                body: newNotification.message,
                icon: '/favicon.ico',
                tag: newNotification.id,
              })
            }
          }
          
          // 토스트 알림 표시
          toast(newNotification.title, {
            description: newNotification.message,
            duration: 5000,
          })
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
          const updatedNotification = payload.new as Notification
          setNotifications(prev => 
            prev.map(n => n.id === updatedNotification.id ? updatedNotification : n)
          )
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
          const deletedNotification = payload.old as Notification
          setNotifications(prev => prev.filter(n => n.id !== deletedNotification.id))
        }
      )
      .subscribe()

    // 브라우저 알림 권한 요청
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission()
      }
    }

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notification')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setNotifications(data || [])
    } catch (error) {
      console.error('Error fetching notifications:', error)
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