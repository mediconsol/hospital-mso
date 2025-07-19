'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FolderOpen, File, HardDrive, Users, TrendingUp, FileText } from 'lucide-react'
import { Database } from '@/lib/database.types'

type FileRecord = Database['public']['Tables']['file']['Row']

interface FileStatsProps {
  files: FileRecord[]
}

export function FileStats({ files }: FileStatsProps) {
  const totalFiles = files.length
  const totalSize = files.reduce((sum, file) => sum + (file.file_size || 0), 0)
  
  // 파일 타입별 통계
  const fileTypes = files.reduce((acc, file) => {
    if (file.mime_type) {
      const mainType = file.mime_type.split('/')[0]
      acc[mainType] = (acc[mainType] || 0) + 1
    }
    return acc
  }, {} as Record<string, number>)

  // 최근 업로드 (7일 이내)
  const recentFiles = files.filter(file => {
    const uploadDate = new Date(file.uploaded_at)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    return uploadDate >= sevenDaysAgo
  }).length

  // 공개 파일 수
  const publicFiles = files.filter(file => {
    const permissions = file.permissions as any
    return permissions?.public === true
  }).length

  // 업무에 연결된 파일 수
  const taskFiles = files.filter(file => file.task_id).length

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileTypeIcon = (type: string) => {
    switch (type) {
      case 'image':
        return '🖼️'
      case 'video':
        return '🎥'
      case 'audio':
        return '🎵'
      case 'application':
        return '📄'
      case 'text':
        return '📝'
      default:
        return '📄'
    }
  }

  const getFileTypeLabel = (type: string) => {
    switch (type) {
      case 'image':
        return '이미지'
      case 'video':
        return '비디오'
      case 'audio':
        return '오디오'
      case 'application':
        return '문서'
      case 'text':
        return '텍스트'
      default:
        return '기타'
    }
  }

  const stats = [
    {
      title: '전체 파일',
      value: totalFiles,
      description: '업로드된 전체 파일',
      icon: File,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: '총 용량',
      value: formatFileSize(totalSize),
      description: '사용 중인 저장 공간',
      icon: HardDrive,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: '최근 업로드',
      value: recentFiles,
      description: '7일 이내 업로드',
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: '공개 파일',
      value: publicFiles,
      description: '전체 공개 파일',
      icon: Users,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 주요 통계 */}
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <div className={`p-2 rounded-full ${stat.bgColor}`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">{stat.description}</p>
          </CardContent>
        </Card>
      ))}

      {/* 파일 타입별 분포 */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm font-medium">파일 타입별 분포</CardTitle>
          <CardDescription>업로드된 파일의 타입별 현황</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(fileTypes).length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">업로드된 파일이 없습니다</p>
              </div>
            ) : (
              Object.entries(fileTypes)
                .sort(([, a], [, b]) => b - a)
                .map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getFileTypeIcon(type)}</span>
                      <span className="text-sm">{getFileTypeLabel(type)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{count}</Badge>
                      <span className="text-xs text-gray-500">
                        ({totalFiles > 0 ? Math.round((count / totalFiles) * 100) : 0}%)
                      </span>
                    </div>
                  </div>
                ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* 추가 정보 */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm font-medium">추가 정보</CardTitle>
          <CardDescription>파일 관리 현황</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full" />
                <span className="text-sm">업무 연결 파일</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{taskFiles}</Badge>
                <span className="text-xs text-gray-500">
                  ({totalFiles > 0 ? Math.round((taskFiles / totalFiles) * 100) : 0}%)
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full" />
                <span className="text-sm">개인 파일</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{totalFiles - publicFiles}</Badge>
                <span className="text-xs text-gray-500">
                  ({totalFiles > 0 ? Math.round(((totalFiles - publicFiles) / totalFiles) * 100) : 0}%)
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full" />
                <span className="text-sm">이번 주 업로드</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{recentFiles}</Badge>
                <span className="text-xs text-gray-500">
                  ({totalFiles > 0 ? Math.round((recentFiles / totalFiles) * 100) : 0}%)
                </span>
              </div>
            </div>

            {/* 저장 공간 사용률 */}
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">저장 공간 사용률</span>
                <span className="text-sm font-medium">{formatFileSize(totalSize)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${Math.min((totalSize / (1024 * 1024 * 1024)) * 100, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                1GB 중 {((totalSize / (1024 * 1024 * 1024)) * 100).toFixed(1)}% 사용
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}