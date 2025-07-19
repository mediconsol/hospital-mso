'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Database } from '@/lib/database.types'

type DocumentFile = Database['public']['Tables']['file']['Row'] & {
  owner?: { id: string; name: string; email: string } | null
  department?: { id: string; name: string } | null
}

interface DocumentStatsProps {
  documents: DocumentFile[]
  categoryStats: Record<string, number>
  categories: Record<string, { name: string; icon: any; color: string }>
}

export function DocumentStats({ documents, categoryStats, categories }: DocumentStatsProps) {
  const totalDocuments = documents.length
  const totalSize = documents.reduce((sum, doc) => sum + (doc.file_size || 0), 0)
  
  // 최근 30일 업로드된 문서
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const recentDocuments = documents.filter(doc => 
    new Date(doc.uploaded_at) > thirtyDaysAgo
  ).length

  // 가장 많이 업로드한 부서
  const departmentCounts = documents.reduce((acc, doc) => {
    const deptName = doc.department?.name || '미배정'
    acc[deptName] = (acc[deptName] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const topDepartment = Object.entries(departmentCounts)
    .sort(([,a], [,b]) => b - a)[0]

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 전체 문서 수 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">전체 문서</CardTitle>
          <Badge variant="outline">{totalDocuments}</Badge>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalDocuments}개</div>
          <p className="text-xs text-muted-foreground">
            총 용량: {formatFileSize(totalSize)}
          </p>
        </CardContent>
      </Card>

      {/* 최근 업로드 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">최근 30일</CardTitle>
          <Badge variant="outline" className="bg-green-50 text-green-700">
            +{recentDocuments}
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{recentDocuments}개</div>
          <p className="text-xs text-muted-foreground">
            새로 추가된 문서
          </p>
        </CardContent>
      </Card>

      {/* 가장 활발한 부서 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">활발한 부서</CardTitle>
          <Badge variant="outline" className="bg-blue-50 text-blue-700">
            {topDepartment?.[1] || 0}개
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="text-lg font-bold truncate">
            {topDepartment?.[0] || '없음'}
          </div>
          <p className="text-xs text-muted-foreground">
            가장 많은 문서 보유
          </p>
        </CardContent>
      </Card>

      {/* 문서 유형별 분포 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">주요 문서 유형</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(categoryStats)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 2)
              .map(([key, count]) => {
                const category = categories[key]
                const percentage = totalDocuments > 0 ? (count / totalDocuments) * 100 : 0
                const Icon = category.icon
                
                return (
                  <div key={key} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${category.color}`} />
                      <span className="text-sm truncate">{category.name}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {count}개
                    </Badge>
                  </div>
                )
              })}
          </div>
        </CardContent>
      </Card>

      {/* 카테고리별 상세 분포 */}
      <Card className="md:col-span-2 lg:col-span-4">
        <CardHeader>
          <CardTitle>카테고리별 문서 분포</CardTitle>
          <CardDescription>각 카테고리별 문서 수와 비율</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(categories).map(([key, category]) => {
              const count = categoryStats[key] || 0
              const percentage = totalDocuments > 0 ? (count / totalDocuments) * 100 : 0
              const Icon = category.icon
              
              return (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${category.color}`} />
                      <span className="text-sm font-medium">{category.name}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {count}개 ({percentage.toFixed(0)}%)
                    </div>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}