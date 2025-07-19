'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Database } from '@/lib/database.types'

type FileRecord = Database['public']['Tables']['file']['Row'] & {
  owner?: { id: string; name: string; email: string } | null
  department?: { id: string; name: string } | null
}

interface FileReportsProps {
  organizationId: string
  dateRange: string
}

interface FileStats {
  totalFiles: number
  totalSize: number
  byType: Record<string, { count: number; size: number }>
  byDepartment: Record<string, { count: number; size: number }>
  byOwner: Record<string, { name: string; count: number; size: number }>
  recentUploads: FileRecord[]
  largestFiles: FileRecord[]
  uploadTrend: { period: string; count: number; size: number }[]
}

export function FileReports({ organizationId, dateRange }: FileReportsProps) {
  const [stats, setStats] = useState<FileStats>({
    totalFiles: 0,
    totalSize: 0,
    byType: {},
    byDepartment: {},
    byOwner: {},
    recentUploads: [],
    largestFiles: [],
    uploadTrend: []
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (organizationId) {
      fetchFileStats()
    }
  }, [organizationId, dateRange])

  const getDateFilter = () => {
    const now = new Date()
    let startDate: Date

    switch (dateRange) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
        break
      case 'quarter':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
        break
      case 'year':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
        break
      default:
        return null
    }

    return startDate.toISOString()
  }

  const fetchFileStats = async () => {
    try {
      setLoading(true)
      const dateFilter = getDateFilter()

      let query = supabase
        .from('file')
        .select(`
          *,
          owner:employee!owner_id (
            id,
            name,
            email
          ),
          department:department!department_id (
            id,
            name
          )
        `)
        .eq('hospital_id', organizationId)

      if (dateFilter) {
        query = query.gte('uploaded_at', dateFilter)
      }

      const { data: files, error } = await query

      if (error) throw error

      // 통계 계산
      const totalFiles = files?.length || 0
      const totalSize = files?.reduce((sum, file) => sum + (file.file_size || 0), 0) || 0

      const byType: Record<string, { count: number; size: number }> = {}
      const byDepartment: Record<string, { count: number; size: number }> = {}
      const byOwner: Record<string, { name: string; count: number; size: number }> = {}

      files?.forEach(file => {
        // 파일 타입별 통계
        const fileType = file.mime_type?.split('/')[0] || 'unknown'
        if (!byType[fileType]) {
          byType[fileType] = { count: 0, size: 0 }
        }
        byType[fileType].count += 1
        byType[fileType].size += file.file_size || 0

        // 부서별 통계
        const departmentName = file.department?.name || '미배정'
        if (!byDepartment[departmentName]) {
          byDepartment[departmentName] = { count: 0, size: 0 }
        }
        byDepartment[departmentName].count += 1
        byDepartment[departmentName].size += file.file_size || 0

        // 업로더별 통계
        if (file.owner) {
          if (!byOwner[file.owner.id]) {
            byOwner[file.owner.id] = {
              name: file.owner.name,
              count: 0,
              size: 0
            }
          }
          byOwner[file.owner.id].count += 1
          byOwner[file.owner.id].size += file.file_size || 0
        }
      })

      // 최근 업로드 (최대 10개)
      const recentUploads = files
        ?.sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime())
        ?.slice(0, 10) || []

      // 용량이 큰 파일들 (최대 10개)
      const largestFiles = files
        ?.sort((a, b) => (b.file_size || 0) - (a.file_size || 0))
        ?.slice(0, 10) || []

      setStats({
        totalFiles,
        totalSize,
        byType,
        byDepartment,
        byOwner,
        recentUploads,
        largestFiles,
        uploadTrend: [] // TODO: 업로드 트렌드 구현
      })
    } catch (error) {
      console.error('Error fetching file stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileTypeLabel = (type: string) => {
    switch (type) {
      case 'image': return '이미지'
      case 'video': return '비디오'
      case 'audio': return '오디오'
      case 'text': return '텍스트'
      case 'application': return '문서/앱'
      case 'unknown': return '기타'
      default: return type
    }
  }

  const getFileIcon = (mimeType: string) => {
    const type = mimeType?.split('/')[0]
    switch (type) {
      case 'image': return '🖼️'
      case 'video': return '🎥'
      case 'audio': return '🎵'
      case 'text': return '📄'
      case 'application': return '📊'
      default: return '📄'
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 파일 타입별 분포 */}
        <Card>
          <CardHeader>
            <CardTitle>파일 타입별 분포</CardTitle>
            <CardDescription>파일 타입별 개수와 용량</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(stats.byType).map(([type, data]) => {
              const countPercentage = stats.totalFiles > 0 ? (data.count / stats.totalFiles) * 100 : 0
              const sizePercentage = stats.totalSize > 0 ? (data.size / stats.totalSize) * 100 : 0
              return (
                <div key={type} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{getFileTypeLabel(type)}</span>
                    <div className="text-sm text-gray-600">
                      {data.count}개 • {formatFileSize(data.size)}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>개수 비율</span>
                      <span>{countPercentage.toFixed(0)}%</span>
                    </div>
                    <Progress value={countPercentage} className="h-1" />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>용량 비율</span>
                      <span>{sizePercentage.toFixed(0)}%</span>
                    </div>
                    <Progress value={sizePercentage} className="h-1" />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* 부서별 파일 현황 */}
        <Card>
          <CardHeader>
            <CardTitle>부서별 파일 현황</CardTitle>
            <CardDescription>각 부서의 파일 보유 현황</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(stats.byDepartment).map(([department, data]) => {
              const percentage = stats.totalFiles > 0 ? (data.count / stats.totalFiles) * 100 : 0
              return (
                <div key={department} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{department}</span>
                    <span>{data.count}개 • {formatFileSize(data.size)}</span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      {/* 활발한 업로더 */}
      <Card>
        <CardHeader>
          <CardTitle>활발한 업로더</CardTitle>
          <CardDescription>파일을 많이 업로드한 직원들</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(stats.byOwner)
              .sort(([,a], [,b]) => b.count - a.count)
              .slice(0, 10)
              .map(([ownerId, data], index) => (
                <div key={ownerId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
                      <span className="text-sm font-bold text-blue-800">#{index + 1}</span>
                    </div>
                    <div>
                      <h4 className="font-medium">{data.name}</h4>
                      <p className="text-sm text-gray-600">
                        {data.count}개 파일 • {formatFileSize(data.size)}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">
                    {data.count}개
                  </Badge>
                </div>
              ))}
            {Object.keys(stats.byOwner).length === 0 && (
              <p className="text-center text-gray-500 py-4">
                파일 업로드 데이터가 없습니다.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 최근 업로드 */}
      <Card>
        <CardHeader>
          <CardTitle>최근 업로드</CardTitle>
          <CardDescription>가장 최근에 업로드된 파일들</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.recentUploads.map(file => (
              <div key={file.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                <div className="text-2xl">{getFileIcon(file.mime_type || '')}</div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate">{file.original_filename}</h4>
                  <p className="text-sm text-gray-600">
                    {file.owner?.name || '알 수 없음'} • {formatFileSize(file.file_size || 0)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">
                    {new Date(file.uploaded_at).toLocaleDateString('ko-KR')}
                  </p>
                </div>
              </div>
            ))}
            {stats.recentUploads.length === 0 && (
              <p className="text-center text-gray-500 py-4">
                최근 업로드된 파일이 없습니다.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 용량이 큰 파일들 */}
      <Card>
        <CardHeader>
          <CardTitle>용량이 큰 파일</CardTitle>
          <CardDescription>저장 공간을 많이 차지하는 파일들</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.largestFiles.map(file => (
              <div key={file.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                <div className="text-2xl">{getFileIcon(file.mime_type || '')}</div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate">{file.original_filename}</h4>
                  <p className="text-sm text-gray-600">
                    {file.owner?.name || '알 수 없음'} • {file.department?.name || '미배정'}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-orange-600">
                    {formatFileSize(file.file_size || 0)}
                  </div>
                  <p className="text-sm text-gray-500">
                    {new Date(file.uploaded_at).toLocaleDateString('ko-KR')}
                  </p>
                </div>
              </div>
            ))}
            {stats.largestFiles.length === 0 && (
              <p className="text-center text-gray-500 py-4">
                파일 데이터가 없습니다.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}