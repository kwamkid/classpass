// src/services/storage.ts
import { supabase } from './supabase'

// Upload file to Supabase Storage
export const uploadFile = async (
  bucket: string,
  path: string,
  file: File
): Promise<string> => {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true,
    })

  if (error) {
    console.error('Error uploading file:', error)
    throw error
  }

  // Get public URL
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

// Upload school logo
export const uploadSchoolLogo = async (
  schoolId: string,
  file: File
): Promise<string> => {
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${schoolId}/logo.${ext}`
  return uploadFile('school-assets', path, file)
}

// Upload student photo
export const uploadStudentPhoto = async (
  schoolId: string,
  studentId: string,
  file: File
): Promise<string> => {
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${schoolId}/students/${studentId}.${ext}`
  return uploadFile('school-assets', path, file)
}

// Upload user profile image
export const uploadProfileImage = async (
  userId: string,
  file: File
): Promise<string> => {
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `profiles/${userId}.${ext}`
  return uploadFile('school-assets', path, file)
}

// Delete file from storage
export const deleteFile = async (
  bucket: string,
  path: string
): Promise<void> => {
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path])

  if (error) {
    console.error('Error deleting file:', error)
    throw error
  }
}
