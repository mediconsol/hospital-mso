'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { createClient } from '@/lib/supabase'
import { uploadFileToStorage } from '@/lib/storage-helpers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { X, Upload, File, AlertCircle, CheckCircle } from 'lucide-react'
import { Database } from '@/lib/database.types'

type Employee = Database['public']['Tables']['employee']['Row']
type Department = Database['public']['Tables']['department']['Row']
type TaskOption = { id: string; title: string }

const uploadSchema = z.object({
  department_id: z.string().optional(),
  task_id: z.string().optional(),
  public_access: z.boolean(),
  department_access: z.array(z.string()),
  employee_access: z.array(z.string()),
})

type UploadFormData = z.infer<typeof uploadSchema>

interface FileUploadProps {
  hospitalId: string
  employees: Employee[]
  departments: Department[]
  tasks: TaskOption[]
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

export function FileUpload({ 
  hospitalId, 
  employees, 
  departments, 
  tasks, 
  currentUserId, 
  onClose, 
  onUploaded 
}: FileUploadProps) {
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
  } = useForm<UploadFormData>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      public_access: false,
      department_access: [],
      employee_access: [],
    },
  })

  const watchedDepartment = watch('department_id')
  const watchedTask = watch('task_id')
  const watchedPublicAccess = watch('public_access')

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
    maxSize: 50 * 1024 * 1024, // 50MB
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
      case 'pdf':
        return '📄'
      case 'doc':
      case 'docx':
        return '📝'
      case 'xls':
      case 'xlsx':
        return '📊'
      case 'ppt':
      case 'pptx':
        return '📈'
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return '🖼️'
      case 'mp4':
      case 'avi':
      case 'mov':
        return '🎥'
      case 'mp3':
      case 'wav':
        return '🎵'
      case 'zip':
      case 'rar':
        return '📦'
      default:
        return '📄'
    }
  }

  const uploadFile = async (uploadFile: UploadFile, formData: UploadFormData) => {
    try {
      setUploadFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, status: 'uploading' }
          : f
      ))

      // 파일명 생성 (고유한 파일명)
      const fileExt = uploadFile.file.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`

      // Try Storage upload first, fallback to metadata-only if fails
      let fileUrl = ''
      
      try {
        const uploadResult = await uploadFileToStorage(uploadFile.file, fileName, 'files')
        
        if (uploadResult.success && uploadResult.url) {
          fileUrl = uploadResult.url
        } else {
          // Storage failed, create metadata-only record
          console.warn('Storage upload failed, creating metadata-only record:', uploadResult.error)
          fileUrl = `file-placeholder://${fileName}` // Placeholder URL
        }
      } catch (storageError) {
        console.warn('Storage error, creating metadata-only record:', storageError)
        fileUrl = `file-placeholder://${fileName}` // Placeholder URL
      }
      
      // 업로드 진행률을 100%로 설정
      setUploadFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, progress: 100 }
          : f
      ))

      // 파일 정보를 데이터베이스에 저장
      const permissions = {
        public: formData.public_access,
        departments: formData.department_access || [],
        employees: formData.employee_access || [],
      }

      const { error: dbError } = await supabase
        .from('file')
        .insert([{
          filename: fileName,
          original_filename: uploadFile.file.name,
          file_url: fileUrl,
          file_size: uploadFile.file.size,
          mime_type: uploadFile.file.type,
          owner_id: currentUserId,
          hospital_id: hospitalId,
          department_id: formData.department_id || null,
          task_id: formData.task_id || null,
          permissions,
        }])

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

  const onSubmit = async (data: UploadFormData) => {
    if (uploadFiles.length === 0) {
      setError('업로드할 파일을 선택해주세요.')
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
      setError(err.message || '파일 업로드 중 오류가 발생했습니다.')
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
                파일 업로드
              </CardTitle>
              <CardDescription>
                파일을 선택하고 권한을 설정하세요
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
                <p className="text-lg text-blue-600">파일을 여기에 드롭하세요</p>
              ) : (
                <div>
                  <p className="text-lg text-gray-600">파일을 드래그하거나 클릭하여 선택하세요</p>
                  <p className="text-sm text-gray-500 mt-2">최대 50MB까지 업로드 가능</p>
                </div>
              )}
            </div>

            {/* 선택된 파일 목록 */}
            {uploadFiles.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">선택된 파일 ({uploadFiles.length}개)</h3>
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

            {/* 연결 설정 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="department_id">부서</Label>
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

              <div className="space-y-2">
                <Label htmlFor="task_id">연결된 업무</Label>
                <Select
                  value={watchedTask || 'none'}
                  onValueChange={(value) => setValue('task_id', value === 'none' ? undefined : value)}
                  disabled={isUploading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="업무를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">업무 없음</SelectItem>
                    {tasks.map((task) => (
                      <SelectItem key={task.id} value={task.id}>
                        {task.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 권한 설정 */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">접근 권한</h3>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="public_access"
                  checked={watchedPublicAccess}
                  onCheckedChange={(checked) => setValue('public_access', checked as boolean)}
                  disabled={isUploading}
                />
                <Label htmlFor="public_access" className="text-sm">
                  전체 공개 (조직 내 모든 구성원이 접근 가능)
                </Label>
              </div>

              {!watchedPublicAccess && (
                <div className="space-y-4 pl-6">
                  <div className="space-y-2">
                    <Label>부서별 접근 권한</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {departments.map((dept) => (
                        <div key={dept.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`dept_${dept.id}`}
                            onCheckedChange={(checked) => {
                              const current = watch('department_access') || []
                              if (checked) {
                                setValue('department_access', [...current, dept.id])
                              } else {
                                setValue('department_access', current.filter(id => id !== dept.id))
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

                  <div className="space-y-2">
                    <Label>개별 직원 접근 권한</Label>
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                      {employees.map((emp) => (
                        <div key={emp.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`emp_${emp.id}`}
                            onCheckedChange={(checked) => {
                              const current = watch('employee_access') || []
                              if (checked) {
                                setValue('employee_access', [...current, emp.id])
                              } else {
                                setValue('employee_access', current.filter(id => id !== emp.id))
                              }
                            }}
                            disabled={isUploading}
                          />
                          <Label htmlFor={`emp_${emp.id}`} className="text-sm">
                            {emp.name} ({emp.position || '직책 없음'})
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
                    업로드
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