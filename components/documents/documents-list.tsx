'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
  Building2,
  FileText,
  Eye,
  Share2
} from 'lucide-react'
import { Database } from '@/lib/database.types'

type DocumentFile = Database['public']['Tables']['file']['Row'] & {
  owner?: { id: string; name: string; email: string } | null
  department?: { id: string; name: string } | null
}

interface DocumentsListProps {
  documents: DocumentFile[]
  categories: Record<string, { name: string; icon: any; color: string }>
  getDocumentCategory: (document: DocumentFile) => string
  onDownload: (document: DocumentFile) => void
  onDelete: (documentId: string) => void
  viewMode: 'grid' | 'list'
}

export function DocumentsList({ 
  documents, 
  categories, 
  getDocumentCategory, 
  onDownload, 
  onDelete,
  viewMode 
}: DocumentsListProps) {
  
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (mimeType: string) => {
    if (!mimeType) return '📄'
    
    if (mimeType.includes('pdf')) return '📕'
    if (mimeType.includes('word') || mimeType.includes('document')) return '📘'
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📗'
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📙'
    if (mimeType.includes('image')) return '🖼️'
    if (mimeType.includes('video')) return '🎥'
    if (mimeType.includes('audio')) return '🎵'
    if (mimeType.includes('archive') || mimeType.includes('zip')) return '📦'
    
    return '📄'
  }

  const getCategoryBadge = (document: DocumentFile) => {
    const categoryKey = getDocumentCategory(document)
    const category = categories[categoryKey]
    const Icon = category.icon
    
    return (
      <Badge variant="outline" className="flex items-center gap-1">
        <Icon className={`h-3 w-3 ${category.color}`} />
        {category.name}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">문서가 없습니다</h3>
        <p className="text-gray-500">
          새로운 문서를 업로드하여 시작하세요.
        </p>
      </div>
    )
  }

  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {documents.map((document) => (
          <Card key={document.id} className="group hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="space-y-3">
                {/* 파일 아이콘 및 이름 */}
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="text-3xl mb-2">
                      {getFileIcon(document.mime_type || '')}
                    </div>
                    <h3 className="font-medium text-sm leading-tight line-clamp-2">
                      {document.original_filename}
                    </h3>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onDownload(document)}>
                        <Download className="h-4 w-4 mr-2" />
                        다운로드
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Eye className="h-4 w-4 mr-2" />
                        미리보기
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Share2 className="h-4 w-4 mr-2" />
                        공유
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => onDelete(document.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        삭제
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* 카테고리 */}
                <div>
                  {getCategoryBadge(document)}
                </div>

                {/* 메타 정보 */}
                <div className="space-y-1 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {document.owner?.name || '알 수 없음'}
                  </div>
                  <div className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {document.department?.name || '미배정'}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(document.uploaded_at)}
                  </div>
                </div>

                {/* 파일 크기 */}
                <div className="text-xs text-gray-400">
                  {formatFileSize(document.file_size || 0)}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  // List view
  return (
    <div className="space-y-2">
      {documents.map((document) => (
        <Card key={document.id} className="group hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              {/* 파일 아이콘 */}
              <div className="text-2xl">
                {getFileIcon(document.mime_type || '')}
              </div>

              {/* 파일 정보 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium truncate">
                    {document.original_filename}
                  </h3>
                  {getCategoryBadge(document)}
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {document.owner?.name || '알 수 없음'}
                  </div>
                  <div className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {document.department?.name || '미배정'}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(document.uploaded_at)}
                  </div>
                  <div>
                    {formatFileSize(document.file_size || 0)}
                  </div>
                </div>
              </div>

              {/* 액션 버튼 */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDownload(document)}
                  className="opacity-0 group-hover:opacity-100"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onDownload(document)}>
                      <Download className="h-4 w-4 mr-2" />
                      다운로드
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Eye className="h-4 w-4 mr-2" />
                      미리보기
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Share2 className="h-4 w-4 mr-2" />
                      공유
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onDelete(document.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      삭제
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}