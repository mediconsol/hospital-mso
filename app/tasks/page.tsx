import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { IntranetLayout } from '@/components/layout/intranet-layout'
import { TaskManager } from '@/components/tasks/task-manager'

export default async function TasksPage() {
  const supabase = createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login?redirectTo=/tasks')
  }

  return (
    <IntranetLayout>
      <div className="space-y-6">
        {/* 헤더 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">업무 관리</h1>
            <p className="mt-2 text-gray-600">
              업무를 할당하고 진행 상황을 추적하세요
            </p>
          </div>
        </div>

        {/* 업무 관리 컴포넌트 */}
        <TaskManager />
      </div>
    </IntranetLayout>
  )
}