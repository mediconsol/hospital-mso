import { createClient } from '@/lib/supabase'

export type NotificationType = 'task' | 'schedule' | 'file' | 'system' | 'announcement'

interface CreateNotificationParams {
  type: NotificationType
  userId: string
  hospitalId: string
  title: string
  message: string
  relatedId?: string
}

export async function createNotification({
  type,
  userId,
  hospitalId,
  title,
  message,
  relatedId
}: CreateNotificationParams) {
  const supabase = createClient()
  
  try {
    const { error } = await supabase
      .from('notification')
      .insert([{
        type,
        user_id: userId,
        hospital_id: hospitalId,
        title,
        message,
        related_id: relatedId,
        is_read: false,
      }])

    if (error) {
      console.error('Error creating notification:', error)
      throw error
    }
  } catch (error) {
    console.error('Failed to create notification:', error)
  }
}

export async function createNotificationForMultipleUsers({
  type,
  userIds,
  hospitalId,
  title,
  message,
  relatedId
}: Omit<CreateNotificationParams, 'userId'> & { userIds: string[] }) {
  const supabase = createClient()
  
  try {
    const notifications = userIds.map(userId => ({
      type,
      user_id: userId,
      hospital_id: hospitalId,
      title,
      message,
      related_id: relatedId,
      is_read: false,
    }))

    const { error } = await supabase
      .from('notification')
      .insert(notifications)

    if (error) {
      console.error('Error creating notifications:', error)
      throw error
    }
  } catch (error) {
    console.error('Failed to create notifications:', error)
  }
}

// 업무 관련 알림 생성
export async function createTaskNotification(
  action: 'created' | 'assigned' | 'completed' | 'updated',
  taskTitle: string,
  assigneeId: string,
  creatorId: string,
  hospitalId: string,
  taskId: string
) {
  const actionLabels = {
    created: '생성되었습니다',
    assigned: '할당되었습니다',
    completed: '완료되었습니다',
    updated: '업데이트되었습니다'
  }

  const title = `새로운 업무 ${actionLabels[action]}`
  const message = `"${taskTitle}" 업무가 ${actionLabels[action]}.`

  // 담당자에게 알림 (생성자가 아닌 경우)
  if (assigneeId && assigneeId !== creatorId) {
    await createNotification({
      type: 'task',
      userId: assigneeId,
      hospitalId,
      title,
      message,
      relatedId: taskId
    })
  }

  // 생성자에게 알림 (완료된 경우)
  if (action === 'completed' && creatorId !== assigneeId) {
    await createNotification({
      type: 'task',
      userId: creatorId,
      hospitalId,
      title: '업무가 완료되었습니다',
      message: `"${taskTitle}" 업무가 완료되었습니다.`,
      relatedId: taskId
    })
  }
}

// 일정 관련 알림 생성
export async function createScheduleNotification(
  action: 'created' | 'updated' | 'reminder',
  scheduleTitle: string,
  participantIds: string[],
  creatorId: string,
  hospitalId: string,
  scheduleId: string,
  startTime?: string
) {
  const actionLabels = {
    created: '일정이 생성되었습니다',
    updated: '일정이 업데이트되었습니다',
    reminder: '일정 알림'
  }

  let title = actionLabels[action]
  let message = `"${scheduleTitle}" ${actionLabels[action]}.`

  if (action === 'reminder' && startTime) {
    const scheduleDate = new Date(startTime)
    title = '일정 알림'
    message = `"${scheduleTitle}" 일정이 ${scheduleDate.toLocaleString('ko-KR')}에 시작됩니다.`
  }

  // 참가자들에게 알림
  const uniqueParticipants = Array.from(new Set(participantIds)).filter(id => id !== creatorId)
  
  if (uniqueParticipants.length > 0) {
    await createNotificationForMultipleUsers({
      type: 'schedule',
      userIds: uniqueParticipants,
      hospitalId,
      title,
      message,
      relatedId: scheduleId
    })
  }
}

// 파일 관련 알림 생성
export async function createFileNotification(
  action: 'uploaded' | 'shared',
  fileName: string,
  uploaderName: string,
  recipientIds: string[],
  uploaderId: string,
  hospitalId: string,
  fileId: string
) {
  const actionLabels = {
    uploaded: '파일이 업로드되었습니다',
    shared: '파일이 공유되었습니다'
  }

  const title = actionLabels[action]
  const message = `${uploaderName}님이 "${fileName}" 파일을 ${action === 'uploaded' ? '업로드' : '공유'}했습니다.`

  // 수신자들에게 알림 (업로더 제외)
  const uniqueRecipients = Array.from(new Set(recipientIds)).filter(id => id !== uploaderId)
  
  if (uniqueRecipients.length > 0) {
    await createNotificationForMultipleUsers({
      type: 'file',
      userIds: uniqueRecipients,
      hospitalId,
      title,
      message,
      relatedId: fileId
    })
  }
}

// 시스템 알림 생성
export async function createSystemNotification(
  title: string,
  message: string,
  userIds: string[],
  hospitalId: string
) {
  await createNotificationForMultipleUsers({
    type: 'system',
    userIds,
    hospitalId,
    title,
    message
  })
}

// 공지사항 알림 생성
export async function createAnnouncementNotification(
  title: string,
  message: string,
  userIds: string[],
  hospitalId: string,
  announcementId?: string
) {
  await createNotificationForMultipleUsers({
    type: 'announcement',
    userIds,
    hospitalId,
    title,
    message,
    relatedId: announcementId
  })
}