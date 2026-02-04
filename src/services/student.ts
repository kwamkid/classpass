// src/services/student.ts
import supabase from './supabase'
import { dbStudentToStudent } from '../types/database.types'
import type { DbStudent } from '../types/database.types'

// Types
export interface Student {
  id: string
  schoolId: string
  studentCode: string
  firstName: string
  lastName: string
  nickname?: string
  birthDate?: string
  age?: number
  gender: 'male' | 'female' | 'other'
  currentGrade: string
  profileImage?: string
  phone?: string
  email?: string
  status: 'active' | 'inactive' | 'graduated' | 'suspended'
  isActive: boolean
  isDeleted?: boolean
  parents?: Parent[]
  address?: Address
  createdAt: Date
  updatedAt: Date
  [key: string]: any
}

export interface Parent {
  id?: string
  type: 'father' | 'mother' | 'guardian'
  firstName: string
  lastName: string
  phone: string
  email?: string
  isPrimaryContact?: boolean
}

export interface Address {
  houseNumber: string
  street: string
  subdistrict: string
  district: string
  province: string
  postalCode: string
}

export interface CreateStudentData {
  firstName: string
  lastName: string
  nickname?: string
  birthDate?: string
  gender: 'male' | 'female' | 'other'
  currentGrade: string
  phone?: string
  email?: string
  parentName?: string
  parentPhone?: string
  parentEmail?: string
}

const calculateAge = (birthDate?: string): number | undefined => {
  if (!birthDate) return undefined

  try {
    const today = new Date()
    const birth = new Date(birthDate)

    if (isNaN(birth.getTime())) {
      return undefined
    }

    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }

    return age
  } catch (error) {
    console.error('Error calculating age:', error)
    return undefined
  }
}

// Get all students for a school
export const getStudents = async (schoolId: string, status?: string): Promise<Student[]> => {
  try {
    let query = supabase
      .from('students')
      .select('*')
      .eq('school_id', schoolId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error getting students:', error)
      return []
    }

    return (data || []).map((row: DbStudent) => dbStudentToStudent(row) as unknown as Student)
  } catch (error) {
    console.error('Error getting students:', error)
    return []
  }
}

// Get single student
export const getStudent = async (studentId: string): Promise<Student | null> => {
  try {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('id', studentId)
      .single()

    if (error || !data) {
      console.error('Error getting student:', error)
      return null
    }

    return dbStudentToStudent(data as DbStudent) as unknown as Student
  } catch (error) {
    console.error('Error getting student:', error)
    return null
  }
}

// Create new student
export const createStudent = async (
  schoolId: string,
  data: CreateStudentData
): Promise<Student> => {
  try {
    // Generate student code via RPC
    const { data: studentCode, error: rpcError } = await supabase.rpc('generate_student_code', {
      p_school_id: schoolId
    })

    if (rpcError) {
      console.error('Error generating student code:', rpcError)
      throw rpcError
    }

    // Calculate age
    const age = data.birthDate ? calculateAge(data.birthDate) : null

    // Prepare parents array
    const parents = data.parentName
      ? [{
          type: 'mother' as const,
          firstName: data.parentName.split(' ')[0] || '',
          lastName: data.parentName.split(' ').slice(1).join(' ') || '',
          phone: data.parentPhone || '',
          email: data.parentEmail || '',
          isPrimaryContact: true
        }]
      : []

    // Prepare insert data (snake_case for DB)
    const insertData = {
      school_id: schoolId,
      student_code: studentCode,
      first_name: data.firstName,
      last_name: data.lastName,
      nickname: data.nickname || '',
      birth_date: data.birthDate || '',
      age: age ?? null,
      gender: data.gender,
      current_grade: data.currentGrade,
      phone: data.phone || '',
      email: data.email || '',
      parents,
      enrolled_courses: [],
      status: 'active' as const,
      is_active: true,
      is_deleted: false,
    }

    const { data: created, error } = await supabase
      .from('students')
      .insert(insertData)
      .select()
      .single()

    if (error || !created) {
      console.error('Error creating student:', error)
      throw error || new Error('Failed to create student')
    }

    return dbStudentToStudent(created as DbStudent) as unknown as Student
  } catch (error) {
    console.error('Error creating student:', error)
    throw error
  }
}

// Update student
export const updateStudent = async (
  studentId: string,
  data: Partial<Student>
): Promise<void> => {
  try {
    // Build snake_case update object
    const updateData: Record<string, any> = {}

    if (data.firstName !== undefined) updateData.first_name = data.firstName
    if (data.lastName !== undefined) updateData.last_name = data.lastName
    if (data.nickname !== undefined) updateData.nickname = data.nickname
    if (data.gender !== undefined) updateData.gender = data.gender
    if (data.currentGrade !== undefined) updateData.current_grade = data.currentGrade
    if (data.profileImage !== undefined) updateData.profile_image = data.profileImage
    if (data.phone !== undefined) updateData.phone = data.phone
    if (data.email !== undefined) updateData.email = data.email
    if (data.status !== undefined) updateData.status = data.status
    if (data.isActive !== undefined) updateData.is_active = data.isActive
    if (data.parents !== undefined) updateData.parents = data.parents
    if (data.address !== undefined) updateData.address = data.address
    if (data.enrolledCourses !== undefined) updateData.enrolled_courses = data.enrolledCourses

    // Handle birthDate and age recalculation
    if ('birthDate' in data) {
      if (data.birthDate && data.birthDate !== '') {
        updateData.birth_date = data.birthDate
        const age = calculateAge(data.birthDate)
        updateData.age = age ?? null
      } else {
        updateData.birth_date = ''
        updateData.age = null
      }
    }

    // Clean parents array - remove undefined values
    if (updateData.parents && Array.isArray(updateData.parents)) {
      updateData.parents = updateData.parents.map((parent: any) => {
        const cleanParent: Record<string, any> = {}
        Object.keys(parent).forEach(key => {
          if (parent[key] !== undefined) {
            cleanParent[key] = parent[key] === '' ? '' : parent[key]
          }
        })
        return cleanParent
      })
    }

    // Clean address object - remove undefined values
    if (updateData.address && typeof updateData.address === 'object') {
      const cleanAddress: Record<string, any> = {}
      Object.keys(updateData.address).forEach(key => {
        const value = updateData.address[key]
        if (value !== undefined) {
          cleanAddress[key] = value === '' ? '' : value
        }
      })
      updateData.address = cleanAddress
    }

    const { error } = await supabase
      .from('students')
      .update(updateData)
      .eq('id', studentId)

    if (error) {
      console.error('Error updating student:', error)
      throw error
    }
  } catch (error) {
    console.error('Error updating student:', error)
    throw error
  }
}

// Soft delete student
export const deleteStudent = async (studentId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('students')
      .update({
        status: 'inactive',
        is_active: false,
        is_deleted: true,
        deleted_at: new Date().toISOString(),
      })
      .eq('id', studentId)

    if (error) {
      console.error('Error deleting student:', error)
      throw error
    }
  } catch (error) {
    console.error('Error deleting student:', error)
    throw error
  }
}

// Search students
export const searchStudents = async (
  schoolId: string,
  searchTerm: string
): Promise<Student[]> => {
  try {
    const pattern = `%${searchTerm}%`

    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('school_id', schoolId)
      .eq('is_deleted', false)
      .or(`first_name.ilike.${pattern},last_name.ilike.${pattern},nickname.ilike.${pattern},student_code.ilike.${pattern}`)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error searching students:', error)
      return []
    }

    return (data || []).map((row: DbStudent) => dbStudentToStudent(row) as unknown as Student)
  } catch (error) {
    console.error('Error searching students:', error)
    return []
  }
}
