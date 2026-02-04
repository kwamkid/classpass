// src/services/user.ts
import { supabase, supabaseAdmin } from './supabase'
import { dbUserToUser } from '../types/database.types'
import type { DbUser } from '../types/database.types'

// Types
export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  displayName: string
  profileImage?: string
  phone?: string
  role: 'owner' | 'admin' | 'teacher' | 'superadmin'
  schoolId: string
  isActive: boolean
  isSuperAdmin?: boolean
  isDeleted?: boolean
  createdAt: Date
  updatedAt: Date
  lastLogin?: Date
  deletedAt?: Date
}

export interface CreateUserData {
  email: string
  password: string
  firstName: string
  lastName: string
  phone?: string
  role: 'admin' | 'teacher'
  schoolId?: string
}

export interface UpdateUserData {
  firstName?: string
  lastName?: string
  phone?: string
  role?: 'admin' | 'teacher'
  isActive?: boolean
  profileImage?: string
}

export interface UpdateProfileData {
  firstName?: string
  lastName?: string
  phone?: string
  profileImage?: string
}

// camelCase to snake_case field mapping for User updates
const userFieldMap: Record<string, string> = {
  firstName: 'first_name',
  lastName: 'last_name',
  phone: 'phone',
  role: 'role',
  isActive: 'is_active',
  profileImage: 'profile_image',
  displayName: 'display_name',
}

// Convert camelCase user data to snake_case for DB
function toSnakeCaseUpdate(data: Record<string, any>): Record<string, any> {
  const snakeData: Record<string, any> = {}

  for (const [key, value] of Object.entries(data)) {
    if (key === 'id' || key === 'email' || key === 'createdAt' || key === 'updatedAt') continue

    const snakeKey = userFieldMap[key]
    if (snakeKey) {
      if (value instanceof Date) {
        snakeData[snakeKey] = value.toISOString()
      } else {
        snakeData[snakeKey] = value
      }
    }
  }

  return snakeData
}

// Get all users for a school
export const getUsers = async (schoolId: string): Promise<User[]> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('school_id', schoolId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Supabase error getting users:', error)
      return []
    }

    if (!data) return []

    return data.map((row) => dbUserToUser(row as DbUser) as User)
  } catch (error) {
    console.error('Error getting users:', error)
    return []
  }
}

// Get single user
export const getUser = async (userId: string): Promise<User | null> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error || !data) return null
    return dbUserToUser(data as DbUser) as User
  } catch (error) {
    console.error('Error getting user:', error)
    return null
  }
}

// Create new user with Supabase Auth (admin operation)
// Uses supabaseAdmin (service role client) to create auth user without signing out current user
export const createUser = async (
  schoolId: string,
  currentUserId: string,
  data: CreateUserData
): Promise<User> => {
  let authUserId: string | null = null

  try {
    // Require supabaseAdmin for user creation
    if (!supabaseAdmin) {
      throw new Error(
        'Service role key is not configured. Cannot create users without VITE_SUPABASE_SERVICE_ROLE_KEY.'
      )
    }

    console.log('Creating user with email:', data.email)

    // 1. Create Supabase Auth user via admin API (does NOT affect current session)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        first_name: data.firstName,
        last_name: data.lastName,
        display_name: `${data.firstName} ${data.lastName}`,
      },
    })

    if (authError) {
      console.error('Auth error creating user:', authError)
      if (authError.message.includes('already been registered') || authError.message.includes('already exists')) {
        throw new Error('อีเมลนี้ถูกใช้งานแล้ว')
      }
      throw new Error(authError.message)
    }

    if (!authData.user) {
      throw new Error('ไม่สามารถสร้างบัญชีได้')
    }

    authUserId = authData.user.id
    console.log('Auth user created:', authUserId)

    // 2. Create user record in users table
    const { error: insertError } = await supabase.from('users').insert({
      id: authUserId,
      email: data.email,
      first_name: data.firstName,
      last_name: data.lastName,
      display_name: `${data.firstName} ${data.lastName}`,
      role: data.role,
      school_id: schoolId,
      phone: data.phone || null,
      is_active: true,
      is_deleted: false,
      is_super_admin: false,
    })

    if (insertError) {
      console.error('Error creating user document:', insertError)
      // Rollback: delete auth user if DB insert fails
      try {
        await supabaseAdmin.auth.admin.deleteUser(authUserId)
        console.log('Rolled back auth user')
      } catch (deleteError) {
        console.error('Error rolling back auth user:', deleteError)
      }
      throw new Error('ไม่สามารถสร้างข้อมูลผู้ใช้ได้')
    }

    console.log('User document created in database')

    // Return created user
    return {
      id: authUserId,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      displayName: `${data.firstName} ${data.lastName}`,
      role: data.role,
      schoolId: schoolId,
      phone: data.phone || undefined,
      isActive: true,
      isSuperAdmin: false,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  } catch (error: any) {
    console.error('Error creating user:', error)

    // Rollback: delete auth user if it was created but something else failed
    if (authUserId && supabaseAdmin) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(authUserId)
        console.log('Rolled back auth user')
      } catch (deleteError) {
        console.error('Error deleting auth user during rollback:', deleteError)
      }
    }

    // Re-throw with the original message (already localized if from above)
    throw error.message ? error : new Error('เกิดข้อผิดพลาดในการสร้างผู้ใช้')
  }
}

// Update user (for admin use)
export const updateUser = async (
  userId: string,
  data: UpdateUserData
): Promise<void> => {
  try {
    const snakeData = toSnakeCaseUpdate(data)

    // Update display name if first/last name changed
    if (data.firstName || data.lastName) {
      const currentUser = await getUser(userId)
      if (currentUser) {
        const firstName = data.firstName || currentUser.firstName
        const lastName = data.lastName || currentUser.lastName
        snakeData.display_name = `${firstName} ${lastName}`
      }
    }

    snakeData.updated_at = new Date().toISOString()

    const { error } = await supabase
      .from('users')
      .update(snakeData)
      .eq('id', userId)

    if (error) {
      console.error('Supabase error updating user:', error)
      throw error
    }
  } catch (error) {
    console.error('Error updating user:', error)
    throw error
  }
}

// Update user profile (for own profile)
export const updateUserProfile = async (
  userId: string,
  data: UpdateProfileData
): Promise<void> => {
  try {
    const snakeData = toSnakeCaseUpdate(data)

    // Update display name if first/last name changed
    if (data.firstName || data.lastName) {
      const currentUser = await getUser(userId)
      if (currentUser) {
        const firstName = data.firstName || currentUser.firstName
        const lastName = data.lastName || currentUser.lastName
        snakeData.display_name = `${firstName} ${lastName}`
      }
    }

    snakeData.updated_at = new Date().toISOString()

    const { error } = await supabase
      .from('users')
      .update(snakeData)
      .eq('id', userId)

    if (error) {
      console.error('Supabase error updating profile:', error)
      throw error
    }
  } catch (error) {
    console.error('Error updating profile:', error)
    throw error
  }
}

// Toggle user active status
export const toggleUserStatus = async (userId: string): Promise<void> => {
  try {
    // Fetch current status
    const { data, error: fetchError } = await supabase
      .from('users')
      .select('is_active')
      .eq('id', userId)
      .single()

    if (fetchError || !data) {
      throw new Error('ไม่พบผู้ใช้')
    }

    const { error } = await supabase
      .from('users')
      .update({
        is_active: !data.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (error) {
      console.error('Supabase error toggling user status:', error)
      throw error
    }
  } catch (error) {
    console.error('Error toggling user status:', error)
    throw error
  }
}

// Send password reset email
export const sendPasswordReset = async (email: string): Promise<void> => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email)

    if (error) {
      if (error.message.includes('User not found')) {
        throw new Error('ไม่พบผู้ใช้ที่ใช้อีเมลนี้')
      }
      throw new Error(error.message)
    }
  } catch (error: any) {
    throw error
  }
}

// Delete user (soft delete)
export const deleteUser = async (userId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('users')
      .update({
        is_active: false,
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (error) {
      console.error('Supabase error deleting user:', error)
      throw error
    }
  } catch (error) {
    console.error('Error deleting user:', error)
    throw error
  }
}

// Check if email exists
export const checkEmailExists = async (email: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .limit(1)

    if (error) {
      console.error('Error checking email:', error)
      return false
    }

    return (data && data.length > 0) || false
  } catch (error) {
    console.error('Error checking email:', error)
    return false
  }
}

// Get user statistics
export const getUserStats = async (
  schoolId: string
): Promise<{ total: number; active: number; inactive: number; byRole: Record<string, number> }> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('is_active, role')
      .eq('school_id', schoolId)
      .eq('is_deleted', false)

    if (error || !data) {
      console.error('Error getting user stats:', error)
      return {
        total: 0,
        active: 0,
        inactive: 0,
        byRole: { owner: 0, admin: 0, teacher: 0 },
      }
    }

    const stats = {
      total: 0,
      active: 0,
      inactive: 0,
      byRole: { owner: 0, admin: 0, teacher: 0 } as Record<string, number>,
    }

    data.forEach((row) => {
      stats.total++

      if (row.is_active) {
        stats.active++
      } else {
        stats.inactive++
      }

      if (row.role && stats.byRole[row.role] !== undefined) {
        stats.byRole[row.role]++
      }
    })

    return stats
  } catch (error) {
    console.error('Error getting user stats:', error)
    return {
      total: 0,
      active: 0,
      inactive: 0,
      byRole: { owner: 0, admin: 0, teacher: 0 },
    }
  }
}
