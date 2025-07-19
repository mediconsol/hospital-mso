'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  Download, 
  Trash2, 
  MoreVertical, 
  Calendar, 
  User, 
  FolderOpen,
  FileText,
  Image,
  Video,
  Music,
  Archive,
  File,
  ExternalLink,
  Eye,
  Lock,
  Globe
} from 'lucide-react'
import { Database } from '@/lib/database.types'

type FileRecord = Database['public']['Tables']['file']['Row'] & {
  owner?: { id: string; name: string; email: string } | null
  department?: { id: string; name: string } | null
  task?: { id: string; title: string } | null
}
type Employee = Database['public']['Tables']['employee']['Row']
type Department = Database['public']['Tables']['department']['Row']
type TaskOption = { id: string; title: string }

interface FileListProps {
  files: FileRecord[]
  employees: Employee[]
  departments: Department[]
  tasks: TaskOption[]
  viewMode: 'grid' | 'list'
  onDownload: (file: FileRecord) => void
  onDelete: (fileId: string) => void
  isManager?: boolean
}

export function FileList({ 
  files, 
  employees, 
  departments, 
  tasks, 
  viewMode, 
  onDownload, 
  onDelete,
  isManager = false 
}: FileListProps) {
  
  const getInitials = (name: string) => {
    return name.split('').slice(0, 2).join('').toUpperCase()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (mimeType: string | null, size: 'sm' | 'lg' = 'sm') => {
    const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-8 w-8'
    
    if (!mimeType) return <File className={iconSize} />
    
    const [mainType, subType] = mimeType.split('/')
    
    switch (mainType) {
      case 'image':
        return <Image className={`${iconSize} text-green-600`} />
      case 'video':
        return <Video className={`${iconSize} text-red-600`} />
      case 'audio':
        return <Music className={`${iconSize} text-purple-600`} />
      case 'application':
        if (subType?.includes('pdf')) {
          return <FileText className={`${iconSize} text-red-600`} />
        } else if (subType?.includes('zip') || subType?.includes('rar')) {
          return <Archive className={`${iconSize} text-orange-600`} />
        } else if (subType?.includes('word') || subType?.includes('document')) {
          return <FileText className={`${iconSize} text-blue-600`} />
        } else if (subType?.includes('excel') || subType?.includes('sheet')) {
          return <FileText className={`${iconSize} text-green-600`} />
        } else if (subType?.includes('powerpoint') || subType?.includes('presentation')) {
          return <FileText className={`${iconSize} text-orange-600`} />
        }
        return <FileText className={`${iconSize} text-gray-600`} />
      default:
        return <FileText className={`${iconSize} text-gray-600`} />
    }
  }

  const getAccessIcon = (file: FileRecord) => {
    const permissions = file.permissions as any
    if (permissions?.public) {
      return <Globe className="h-3 w-3 text-green-600" />
    }
    return <Lock className="h-3 w-3 text-gray-400" />
  }

  const getEmployee = (employeeId: string | null) => {
    if (!employeeId) return null
    return employees.find(emp => emp.id === employeeId)
  }

  const getDepartment = (departmentId: string | null) => {
    if (!departmentId) return null
    return departments.find(dept => dept.id === departmentId)
  }

  const getTask = (taskId: string | null) => {
    if (!taskId) return null
    return tasks.find(task => task.id === taskId)
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-12">
        <FolderOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 text-lg">파일이 없습니다</p>
        <p className="text-sm text-gray-400 mt-2">
          파일을 업로드하거나 필터를 조정해보세요
        </p>
      </div>
    )
  }

  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {files.map((file) => {
          const owner = getEmployee(file.owner_id)
          const department = getDepartment(file.department_id)
          const task = getTask(file.task_id)

          return (
            <div key={file.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {getFileIcon(file.mime_type, 'lg')}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" title={file.original_filename}>
                      {file.original_filename}
                    </p>
                    <p className="text-xs text-gray-500">{formatFileSize(file.file_size || 0)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {getAccessIcon(file)}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onDownload(file)}>
                        <Download className="h-4 w-4 mr-2" />
                        다운로드
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => window.open(file.file_url, '_blank')}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        새 창에서 열기
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => onDelete(file.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        삭제
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="space-y-2">
                {owner && (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src="" alt={owner.name} />
                      <AvatarFallback className="text-xs">
                        {getInitials(owner.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-gray-600">{owner.name}</span>
                  </div>
                )}

                {department && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    <span className="text-xs text-gray-600">{department.name}</span>
                  </div>
                )}

                {task && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-xs text-gray-600 truncate" title={task.title}>
                      {task.title}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Calendar className="h-3 w-3" />
                  {formatDate(file.uploaded_at)}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 데스크톱 뷰 */}
      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">파일</th>
                <th className="text-left py-3 px-4">업로드자</th>
                <th className="text-left py-3 px-4">부서</th>
                <th className="text-left py-3 px-4">연결된 업무</th>
                <th className="text-left py-3 px-4">크기</th>
                <th className="text-left py-3 px-4">업로드일</th>
                <th className="text-left py-3 px-4">접근</th>
                <th className="text-right py-3 px-4">작업</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => {
                const owner = getEmployee(file.owner_id)
                const department = getDepartment(file.department_id)
                const task = getTask(file.task_id)

                return (
                  <tr key={file.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {getFileIcon(file.mime_type)}
                        <div className="max-w-xs">
                          <div className="font-medium text-sm truncate" title={file.original_filename}>
                            {file.original_filename}
                          </div>
                          <div className="text-xs text-gray-500">{file.mime_type}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {owner ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src="" alt={owner.name} />
                            <AvatarFallback className="text-xs">
                              {getInitials(owner.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="text-sm font-medium">{owner.name}</div>
                            {owner.position && (
                              <div className="text-xs text-gray-500">{owner.position}</div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">알 수 없음</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm">
                        {department ? department.name : '부서 없음'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm">
                        {task ? task.title : '업무 없음'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm">{formatFileSize(file.file_size || 0)}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm">{formatDate(file.uploaded_at)}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        {getAccessIcon(file)}
                        <span className="text-xs text-gray-500">
                          {(file.permissions as any)?.public ? '공개' : '비공개'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onDownload(file)}>
                            <Download className="h-4 w-4 mr-2" />
                            다운로드
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => window.open(file.file_url, '_blank')}>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            새 창에서 열기
                          </DropdownMenuItem>
                          {isManager && (
                            <DropdownMenuItem 
                              onClick={() => onDelete(file.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              삭제
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 모바일 뷰 */}
      <div className="md:hidden space-y-4">
        {files.map((file) => {
          const owner = getEmployee(file.owner_id)
          const department = getDepartment(file.department_id)
          const task = getTask(file.task_id)

          return (
            <div key={file.id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {getFileIcon(file.mime_type, 'lg')}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate" title={file.original_filename}>
                      {file.original_filename}
                    </div>
                    <div className="text-xs text-gray-500">{formatFileSize(file.file_size || 0)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {getAccessIcon(file)}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onDownload(file)}>
                        <Download className="h-4 w-4 mr-2" />
                        다운로드
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => window.open(file.file_url, '_blank')}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        새 창에서 열기
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => onDelete(file.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        삭제
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              
              <div className="space-y-2">
                {owner && (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src="" alt={owner.name} />
                      <AvatarFallback className="text-xs">
                        {getInitials(owner.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-gray-600">
                      {owner.name} {owner.position && `(${owner.position})`}
                    </span>
                  </div>
                )}
                
                {department && (
                  <div className="text-sm text-gray-600">
                    부서: {department.name}
                  </div>
                )}
                
                {task && (
                  <div className="text-sm text-gray-600">
                    업무: {task.title}
                  </div>
                )}
                
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Calendar className="h-3 w-3" />
                  {formatDate(file.uploaded_at)}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}