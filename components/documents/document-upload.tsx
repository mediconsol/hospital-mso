'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { X, Upload, File, AlertCircle, CheckCircle, FileText, Shield, BookOpen } from 'lucide-react'
import { Database } from '@/lib/database.types'

type Employee = Database['public']['Tables']['employee']['Row']
type Department = Database['public']['Tables']['department']['Row']

const documentSchema = z.object({
  category: z.string().min(1, '카테고리를 선택하세요'),
  department_id: z.string().optional(),
  tags: z.string().optional(),
  description: z.string().optional(),
  is_public: z.boolean(),
  access_departments: z.array(z.string()),
  access_employees: z.array(z.string()),
})

type DocumentFormData = z.infer<typeof documentSchema>

interface DocumentUploadProps {
  hospitalId: string
  employees: Employee[]
  departments: Department[]
  currentUserId: string
  onClose: () => void
  onUploaded: () => void
}

interface UploadFile {
  file: File
  id: string
  progress: number
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
}

const DOCUMENT_CATEGORIES = {
  policy: { name: '정책 문서', icon: Shield, description: '회사 정책, 규정, 지침' },
  manual: { name: '업무 매뉴얼', icon: BookOpen, description: '업무 프로세스, 가이드라인' },
  template: { name: '템플릿', icon: FileText, description: '양식, 서식, 템플릿' },
  form: { name: '신청서/양식', icon: FileText, description: '각종 신청서, 양식' },
  announcement: { name: '공지사항', icon: FileText, description: '공지, 알림, 안내사항' },
  other: { name: '기타 문서', icon: FileText, description: '기타 문서' }
}

export function DocumentUpload({ 
  hospitalId, 
  employees, 
  departments, 
  currentUserId, 
  onClose, 
  onUploaded 
}: DocumentUploadProps) {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<DocumentFormData>({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      is_public: false,
      access_departments: [],
      access_employees: [],
    },
  })

  const watchedCategory = watch('category')
  const watchedIsPublic = watch('is_public')
  const watchedDepartment = watch('department_id')

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      progress: 0,
      status: 'pending' as const,
    }))
    setUploadFiles(prev => [...prev, ...newFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    maxSize: 100 * 1024 * 1024, // 100MB
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-powerpoint': ['.ppt'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'text/plain': ['.txt'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
    }
  })

  const removeFile = (id: string) => {
    setUploadFiles(prev => prev.filter(f => f.id !== id))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'pdf': return '📕'
      case 'doc':
      case 'docx': return '📘'
      case 'xls':
      case 'xlsx': return '📗'
      case 'ppt':
      case 'pptx': return '📙'
      case 'txt': return '📄'
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif': return '🖼️'
      default: return '📄'
    }
  }

  const uploadFile = async (uploadFile: UploadFile, formData: DocumentFormData) => {
    try {
      setUploadFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, status: 'uploading' }
          : f
      ))

      // 파일명 생성 (고유한 파일명)
      const fileExt = uploadFile.file.name.split('.').pop()
      const fileName = `documents/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`

      // Supabase Storage에 파일 업로드
      const { error: uploadError } = await supabase.storage
        .from('files')
        .upload(fileName, uploadFile.file)
      
      // 업로드 진행률을 100%로 설정
      setUploadFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, progress: 100 }
          : f
      ))

      if (uploadError) throw uploadError

      // 파일 정보를 데이터베이스에 저장
      const { data: urlData } = supabase.storage
        .from('files')
        .getPublicUrl(fileName)

      // 문서 메타데이터 준비
      const permissions = {
        public: formData.is_public,
        departments: formData.access_departments || [],
        employees: formData.access_employees || [],
      }

      // 태그를 배열로 변환
      const tags = formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : []

      // 파일 레코드 생성 (기존 file 테이블 활용)
      const fileRecord = {
        filename: fileName,
        original_filename: uploadFile.file.name,
        file_url: urlData.publicUrl,
        file_size: uploadFile.file.size,
        mime_type: uploadFile.file.type,
        owner_id: currentUserId,
        hospital_id: hospitalId,
        department_id: formData.department_id || null,
        permissions,
        // 문서 관리를 위한 추가 메타데이터를 permissions에 저장
        metadata: {
          category: formData.category,
          tags: tags,
          description: formData.description,
          document_type: 'document' // 일반 파일과 구분
        }
      }

      const { error: dbError } = await supabase
        .from('file')
        .insert([fileRecord])

      if (dbError) throw dbError

      setUploadFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, status: 'success', progress: 100 }
          : f
      ))
    } catch (err: any) {
      setUploadFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, status: 'error', error: err.message }
          : f
      ))
      throw err
    }
  }

  const onSubmit = async (data: DocumentFormData) => {
    if (uploadFiles.length === 0) {
      setError('업로드할 문서를 선택해주세요.')
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      // 모든 파일 업로드
      await Promise.all(uploadFiles.map(file => uploadFile(file, data)))
      
      // 업로드 완료 후 잠시 대기
      setTimeout(() => {
        onUploaded()
      }, 1000)
    } catch (err: any) {
      setError(err.message || '문서 업로드 중 오류가 발생했습니다.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                문서 업로드
              </CardTitle>
              <CardDescription>
                조직의 문서를 업로드하고 분류하세요
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* 파일 드롭 영역 */}
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              {isDragActive ? (
                <p className="text-lg text-blue-600">문서를 여기에 드롭하세요</p>
              ) : (
                <div>
                  <p className="text-lg text-gray-600">문서를 드래그하거나 클릭하여 선택하세요</p>
                  <p className="text-sm text-gray-500 mt-2">PDF, Word, Excel, PowerPoint 파일을 지원합니다 (최대 100MB)</p>
                </div>
              )}
            </div>

            {/* 선택된 파일 목록 */}
            {uploadFiles.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">선택된 문서 ({uploadFiles.length}개)</h3>
                <div className="space-y-3">
                  {uploadFiles.map((uploadFile) => (
                    <div key={uploadFile.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className="text-2xl">{getFileIcon(uploadFile.file.name)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium truncate">{uploadFile.file.name}</p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(uploadFile.id)}
                            disabled={isUploading}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-xs text-gray-500">{formatFileSize(uploadFile.file.size)}</p>
                        
                        {uploadFile.status === 'uploading' && (
                          <Progress value={uploadFile.progress} className="mt-2" />
                        )}
                        
                        {uploadFile.status === 'success' && (
                          <div className="flex items-center gap-1 mt-2 text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            <span className="text-xs">업로드 완료</span>
                          </div>
                        )}
                        
                        {uploadFile.status === 'error' && (
                          <div className="flex items-center gap-1 mt-2 text-red-600">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-xs">{uploadFile.error}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 문서 분류 및 메타데이터 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 카테고리 선택 */}
              <div className="space-y-2">
                <Label htmlFor="category">문서 카테고리 *</Label>
                <Select
                  value={watchedCategory || 'none'}
                  onValueChange={(value) => setValue('category', value === 'none' ? '' : value)}
                  disabled={isUploading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="카테고리를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">카테고리 없음</SelectItem>
                    {Object.entries(DOCUMENT_CATEGORIES).map(([key, category]) => {
                      const Icon = category.icon
                      return (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {category.name}
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
                {errors.category && (
                  <p className="text-sm text-red-600">{errors.category.message}</p>
                )}
                {watchedCategory && DOCUMENT_CATEGORIES[watchedCategory as keyof typeof DOCUMENT_CATEGORIES] && (
                  <p className="text-xs text-gray-500">
                    {DOCUMENT_CATEGORIES[watchedCategory as keyof typeof DOCUMENT_CATEGORIES].description}
                  </p>
                )}
              </div>

              {/* 부서 선택 */}
              <div className="space-y-2">
                <Label htmlFor="department_id">관련 부서</Label>
                <Select
                  value={watchedDepartment || 'none'}
                  onValueChange={(value) => setValue('department_id', value === 'none' ? undefined : value)}
                  disabled={isUploading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="부서를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">부서 없음</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 태그 및 설명 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="tags">태그</Label>
                <Input
                  id="tags"
                  {...register('tags')}
                  placeholder="태그1, 태그2, 태그3"
                  disabled={isUploading}
                />
                <p className="text-xs text-gray-500">쉼표로 구분하여 입력하세요</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">설명</Label>
                <Textarea
                  id="description"
                  {...register('description')}
                  placeholder="문서에 대한 간단한 설명을 입력하세요"
                  disabled={isUploading}
                  rows={3}
                />
              </div>
            </div>

            {/* 접근 권한 설정 */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">접근 권한 설정</h3>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_public"
                  checked={watchedIsPublic}
                  onCheckedChange={(checked) => setValue('is_public', checked as boolean)}
                  disabled={isUploading}
                />
                <Label htmlFor="is_public" className="text-sm">
                  전체 공개 (조직 내 모든 구성원이 접근 가능)
                </Label>
              </div>

              {!watchedIsPublic && (
                <div className="space-y-4 pl-6">
                  <div className="space-y-2">
                    <Label>부서별 접근 권한</Label>
                    <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                      {departments.map((dept) => (
                        <div key={dept.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`dept_${dept.id}`}
                            onCheckedChange={(checked) => {
                              const current = watch('access_departments') || []
                              if (checked) {
                                setValue('access_departments', [...current, dept.id])
                              } else {
                                setValue('access_departments', current.filter(id => id !== dept.id))
                              }
                            }}
                            disabled={isUploading}
                          />
                          <Label htmlFor={`dept_${dept.id}`} className="text-sm">
                            {dept.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={isUploading}>
                취소
              </Button>
              <Button type="submit" disabled={isUploading || uploadFiles.length === 0}>
                {isUploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    업로드 중...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    문서 업로드
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}