// src/services/course.ts
import supabase from './supabase'
import { dbCourseToCourse } from '../types/database.types'
import type { DbCourse } from '../types/database.types'

// Types
export interface Course {
  id: string
  schoolId: string
  code: string // Auto-generated
  name: string
  category: 'academic' | 'sport' | 'art' | 'language' | 'other'
  description?: string
  coverImage?: string
  schedule?: Record<string, any>
  primaryTeacherId?: string
  assistantTeacherIds?: string[]
  maxStudentsPerClass?: number
  defaultCreditsPerSession?: number
  status: 'active' | 'inactive' | 'archived'
  totalEnrolled: number
  tags?: string[]
  isActive: boolean
  isDeleted?: boolean
  createdAt: Date
  updatedAt: Date
}

export interface CreateCourseData {
  name: string
  category: 'academic' | 'sport' | 'art' | 'language' | 'other'
  description?: string
}

// Get all courses for a school
export const getCourses = async (schoolId: string, status?: string): Promise<Course[]> => {
  try {
    let query = supabase
      .from('courses')
      .select('*')
      .eq('school_id', schoolId)
      .eq('is_deleted', false)
      .order('name', { ascending: true })

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error getting courses:', error)
      return []
    }

    return (data || []).map((row: DbCourse) => dbCourseToCourse(row) as Course)
  } catch (error) {
    console.error('Error getting courses:', error)
    return []
  }
}

// Get single course
export const getCourse = async (courseId: string): Promise<Course | null> => {
  try {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single()

    if (error || !data) {
      console.error('Error getting course:', error)
      return null
    }

    return dbCourseToCourse(data as DbCourse) as Course
  } catch (error) {
    console.error('Error getting course:', error)
    return null
  }
}

// Create new course
export const createCourse = async (
  schoolId: string,
  data: CreateCourseData
): Promise<Course> => {
  try {
    // Generate course code via RPC
    const { data: courseCode, error: rpcError } = await supabase.rpc('generate_course_code', {
      p_school_id: schoolId,
      p_category: data.category
    })

    if (rpcError) {
      console.error('Error generating course code:', rpcError)
      throw rpcError
    }

    // Prepare insert data (snake_case for DB)
    const insertData = {
      school_id: schoolId,
      code: courseCode,
      name: data.name,
      category: data.category,
      description: data.description || '',
      status: 'active' as const,
      total_enrolled: 0,
      is_active: true,
      is_deleted: false,
    }

    const { data: created, error } = await supabase
      .from('courses')
      .insert(insertData)
      .select()
      .single()

    if (error || !created) {
      console.error('Error creating course:', error)
      throw error || new Error('Failed to create course')
    }

    return dbCourseToCourse(created as DbCourse) as Course
  } catch (error) {
    console.error('Error creating course:', error)
    throw error
  }
}

// Update course
export const updateCourse = async (
  courseId: string,
  data: Partial<Course>
): Promise<void> => {
  try {
    // Build snake_case update object, skipping immutable fields
    const updateData: Record<string, any> = {}

    if (data.name !== undefined) updateData.name = data.name
    if (data.category !== undefined) updateData.category = data.category
    if (data.description !== undefined) updateData.description = data.description
    if (data.coverImage !== undefined) updateData.cover_image = data.coverImage
    if (data.schedule !== undefined) updateData.schedule = data.schedule
    if (data.primaryTeacherId !== undefined) updateData.primary_teacher_id = data.primaryTeacherId
    if (data.assistantTeacherIds !== undefined) updateData.assistant_teacher_ids = data.assistantTeacherIds
    if (data.maxStudentsPerClass !== undefined) updateData.max_students_per_class = data.maxStudentsPerClass
    if (data.defaultCreditsPerSession !== undefined) updateData.default_credits_per_session = data.defaultCreditsPerSession
    if (data.tags !== undefined) updateData.tags = data.tags
    if (data.status !== undefined) updateData.status = data.status
    if (data.isActive !== undefined) updateData.is_active = data.isActive

    const { error } = await supabase
      .from('courses')
      .update(updateData)
      .eq('id', courseId)

    if (error) {
      console.error('Error updating course:', error)
      throw error
    }
  } catch (error) {
    console.error('Error updating course:', error)
    throw error
  }
}

// Soft delete course
export const deleteCourse = async (courseId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('courses')
      .update({
        status: 'archived',
        is_active: false,
        is_deleted: true,
        deleted_at: new Date().toISOString(),
      })
      .eq('id', courseId)

    if (error) {
      console.error('Error deleting course:', error)
      throw error
    }
  } catch (error) {
    console.error('Error deleting course:', error)
    throw error
  }
}

// Search courses
export const searchCourses = async (
  schoolId: string,
  searchTerm: string
): Promise<Course[]> => {
  try {
    const pattern = `%${searchTerm}%`

    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('school_id', schoolId)
      .eq('is_deleted', false)
      .or(`name.ilike.${pattern},code.ilike.${pattern},description.ilike.${pattern}`)
      .order('name', { ascending: true })

    if (error) {
      console.error('Error searching courses:', error)
      return []
    }

    return (data || []).map((row: DbCourse) => dbCourseToCourse(row) as Course)
  } catch (error) {
    console.error('Error searching courses:', error)
    return []
  }
}
