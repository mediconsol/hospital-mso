import { createClient } from '@/lib/supabase'

/**
 * Check if storage bucket exists (simplified version)
 */
export async function ensureStorageBucket(bucketName: string = 'files') {
  const supabase = createClient()
  
  try {
    // Try to upload a test file to check if bucket exists
    const testResult = await supabase.storage
      .from(bucketName)
      .list('', { limit: 1 })
    
    if (testResult.error) {
      console.error(`Bucket '${bucketName}' does not exist or is not accessible:`, testResult.error)
      return false
    }

    console.log(`Bucket '${bucketName}' is accessible`)
    return true
  } catch (error) {
    console.error('Error checking storage bucket:', error)
    return false
  }
}

/**
 * Upload file to storage (simplified version without bucket creation)
 */
export async function uploadFileToStorage(
  file: File, 
  fileName: string, 
  bucketName: string = 'files'
): Promise<{ success: boolean; url?: string; error?: string }> {
  const supabase = createClient()
  
  try {
    // Try to upload file directly
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, file)

    if (uploadError) {
      // If bucket doesn't exist, provide helpful error message
      if (uploadError.message?.includes('Bucket not found')) {
        return { 
          success: false, 
          error: `Storage bucket '${bucketName}' not found. Please create it in Supabase Dashboard.` 
        }
      }
      throw uploadError
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName)

    return { success: true, url: urlData.publicUrl }
  } catch (error: any) {
    console.error('Error uploading file to storage:', error)
    return { success: false, error: error.message }
  }
}