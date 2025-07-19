'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { createClient } from '@/lib/supabase'
import { getCurrentEmployee } from '@/lib/auth-helpers'
import { uploadFileToStorage } from '@/lib/storage-helpers'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { X, Upload, File, AlertCircle, CheckCircle, Zap } from 'lucide-react'

interface UploadFile {
  file: File
  id: string
  progress: number
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
}

interface QuickFileUploadModalProps {
  onClose: () => void
  onUploaded: () => void
}

export function QuickFileUploadModal({ onClose, onUploaded }: QuickFileUploadModalProps) {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

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
      case 'pdf': return '📄'
      case 'doc': case 'docx': return '📝'
      case 'xls': case 'xlsx': return '📊'
      case 'ppt': case 'pptx': return '📈'
      case 'jpg': case 'jpeg': case 'png': case 'gif': return '🖼️'
      case 'mp4': case 'avi': case 'mov': return '🎥'
      case 'mp3': case 'wav': return '🎵'
      case 'zip': case 'rar': return '📦'
      default: return '📄'
    }
  }

  const uploadFile = async (uploadFile: UploadFile) => {
    try {
      setUploadFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, status: 'uploading' }
          : f
      ))

      const currentEmployee = await getCurrentEmployee()
      if (!currentEmployee) {
        throw new Error('직원 정보를 찾을 수 없습니다')
      }

      // 파일명 생성
      const fileExt = uploadFile.file.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`

      // Storage 업로드 시도
      let fileUrl = ''
      try {
        const uploadResult = await uploadFileToStorage(uploadFile.file, fileName, 'files')
        if (uploadResult.success && uploadResult.url) {
          fileUrl = uploadResult.url
        } else {
          fileUrl = `file-placeholder://${fileName}`
        }
      } catch (storageError) {
        fileUrl = `file-placeholder://${fileName}`
      }
      
      setUploadFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, progress: 100 }
          : f
      ))

      // DB에 파일 정보 저장
      const { error: dbError } = await supabase
        .from('file')
        .insert([{
          filename: fileName,
          original_filename: uploadFile.file.name,
          file_url: fileUrl,
          file_size: uploadFile.file.size,
          mime_type: uploadFile.file.type,
          owner_id: currentEmployee.id,
          hospital_id: currentEmployee.hospital_id,
          department_id: currentEmployee.department_id || null,
          permissions: { public: false, departments: [], employees: [] },
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

  const handleUpload = async () => {
    if (uploadFiles.length === 0) {
      setError('업로드할 파일을 선택해주세요.')
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      await Promise.all(uploadFiles.map(file => uploadFile(file)))
      
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
      <Card className="w-full max-w-lg max-h-[80vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-green-600" />
                빠른 파일 업로드
              </CardTitle>
              <CardDescription>
                파일을 빠르게 업로드하세요
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 드롭 영역 */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-green-500 bg-green-50' : 'border-gray-300'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            {isDragActive ? (
              <p className="text-green-600">파일을 여기에 드롭하세요</p>
            ) : (
              <div>
                <p className="text-gray-600">파일을 드래그하거나 클릭하여 선택</p>
                <p className="text-xs text-gray-500 mt-1">최대 50MB</p>
              </div>
            )}
          </div>

          {/* 파일 목록 */}
          {uploadFiles.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium">선택된 파일 ({uploadFiles.length}개)</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {uploadFiles.map((uploadFile) => (
                  <div key={uploadFile.id} className="flex items-center gap-2 p-2 border rounded text-sm">
                    <div className="text-lg">{getFileIcon(uploadFile.file.name)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate">{uploadFile.file.name}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(uploadFile.file.size)}</p>
                      
                      {uploadFile.status === 'uploading' && (
                        <Progress value={uploadFile.progress} className="mt-1" />
                      )}
                      
                      {uploadFile.status === 'success' && (
                        <div className="flex items-center gap-1 text-green-600 mt-1">
                          <CheckCircle className="h-3 w-3" />
                          <span className="text-xs">완료</span>
                        </div>
                      )}
                      
                      {uploadFile.status === 'error' && (
                        <div className="flex items-center gap-1 text-red-600 mt-1">
                          <AlertCircle className="h-3 w-3" />
                          <span className="text-xs">{uploadFile.error}</span>
                        </div>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(uploadFile.id)}
                      disabled={isUploading}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isUploading}>
              취소
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={isUploading || uploadFiles.length === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              {isUploading ? '업로드 중...' : '업로드'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}