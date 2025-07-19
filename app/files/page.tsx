import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { IntranetLayout } from '@/components/layout/intranet-layout'
import { FileManager } from '@/components/files/file-manager'

export default async function FilesPage() {
  const supabase = createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login?redirectTo=/files')
  }

  return (
    <IntranetLayout>
      <div className="space-y-6">
        {/* 헤더 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">파일 관리</h1>
            <p className="mt-2 text-gray-600">
              문서와 파일을 업로드하고 관리하세요
            </p>
          </div>
        </div>

        {/* 파일 관리 컴포넌트 */}
        <FileManager />
      </div>
    </IntranetLayout>
  )
}