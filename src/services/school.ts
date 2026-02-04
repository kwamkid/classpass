// src/services/school.ts
import { supabase } from './supabase'
import { dbSchoolToSchool } from '../types/database.types'
import type { DbSchool } from '../types/database.types'
import type { School } from '../types/models'

// Re-export School type for consumers that import from this file
export type { School } from '../types/models'

// SchoolStats type
export interface SchoolStats {
  school: School
  stats: {
    totalUsers: number
    totalStudents: number
    totalCourses: number
    activeCredits: number
  }
}

// camelCase to snake_case field mapping for School
const schoolFieldMap: Record<string, string> = {
  name: 'name',
  logo: 'logo',
  address: 'address',
  phone: 'phone',
  email: 'email',
  lineOA: 'line_oa',
  website: 'website',
  taxId: 'tax_id',
  timezone: 'timezone',
  currency: 'currency',
  dateFormat: 'date_format',
  language: 'language',
  businessHours: 'business_hours',
  plan: 'plan',
  planExpiry: 'plan_expiry',
  maxStudents: 'max_students',
  maxTeachers: 'max_teachers',
  maxCourses: 'max_courses',
  storageQuota: 'storage_quota',
  features: 'features',
  billingEmail: 'billing_email',
  isActive: 'is_active',
  isVerified: 'is_verified',
  lastActiveAt: 'last_active_at',
}

// Convert camelCase partial school data to snake_case for DB update
function toSnakeCaseUpdate(data: Partial<School>): Record<string, any> {
  const snakeData: Record<string, any> = {}

  for (const [key, value] of Object.entries(data)) {
    // Skip fields that should not be updated directly
    if (key === 'id' || key === 'createdAt' || key === 'updatedAt') continue

    const snakeKey = schoolFieldMap[key]
    if (snakeKey) {
      // Convert Date values to ISO strings
      if (value instanceof Date) {
        snakeData[snakeKey] = value.toISOString()
      } else {
        snakeData[snakeKey] = value
      }
    }
  }

  return snakeData
}

// Get school by ID
export const getSchoolById = async (schoolId: string): Promise<School | null> => {
  try {
    const { data, error } = await supabase
      .from('schools')
      .select('*')
      .eq('id', schoolId)
      .single()

    if (error || !data) return null
    return dbSchoolToSchool(data as DbSchool) as School
  } catch (error) {
    console.error('Error getting school:', error)
    return null
  }
}

// Get school by subdomain
export const getSchoolBySubdomain = async (subdomain: string): Promise<School | null> => {
  try {
    const { data, error } = await supabase
      .from('schools')
      .select('*')
      .eq('subdomain', subdomain)
      .limit(1)
      .single()

    if (error || !data) return null
    return dbSchoolToSchool(data as DbSchool) as School
  } catch (error) {
    console.error('Error getting school by subdomain:', error)
    return null
  }
}

// Update school
export const updateSchool = async (schoolId: string, data: Partial<School>): Promise<void> => {
  try {
    const updateData = {
      ...toSnakeCaseUpdate(data),
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('schools')
      .update(updateData)
      .eq('id', schoolId)

    if (error) {
      console.error('Supabase error updating school:', error)
      throw error
    }
  } catch (error) {
    console.error('Error updating school:', error)
    throw error
  }
}

// Check if subdomain is available
export const isSubdomainAvailable = async (subdomain: string): Promise<boolean> => {
  try {
    const school = await getSchoolBySubdomain(subdomain)
    return !school
  } catch (error) {
    console.error('Error checking subdomain availability:', error)
    return false
  }
}

// Get school statistics
export const getSchoolStats = async (schoolId: string): Promise<SchoolStats | null> => {
  try {
    const school = await getSchoolById(schoolId)

    if (!school) {
      return null
    }

    // Count users for this school
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('is_deleted', false)

    // Count students for this school
    const { count: totalStudents } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('is_deleted', false)

    // Count courses for this school
    const { count: totalCourses } = await supabase
      .from('courses')
      .select('*', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('is_deleted', false)

    // Count active credits for this school
    const { count: activeCredits } = await supabase
      .from('student_credits')
      .select('*', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('status', 'active')

    return {
      school,
      stats: {
        totalUsers: totalUsers || 0,
        totalStudents: totalStudents || 0,
        totalCourses: totalCourses || 0,
        activeCredits: activeCredits || 0,
      },
    }
  } catch (error) {
    console.error('Error getting school stats:', error)
    return null
  }
}
