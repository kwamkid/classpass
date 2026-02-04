// src/services/auth.ts
import { supabase } from './supabase'
import { dbUserToUser } from '../types/database.types'
import type { DbUser } from '../types/database.types'

// Types
export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  firstName: string
  lastName: string
  schoolName: string
}

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  displayName: string
  role: 'owner' | 'admin' | 'teacher' | 'superadmin'
  schoolId: string
  isActive: boolean
  isSuperAdmin?: boolean
  createdAt?: any
  updatedAt?: any
  lastLogin?: any
}

// Get user data from Supabase
export const getUserData = async (uid: string): Promise<User | null> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', uid)
      .single()

    if (error || !data) return null
    return dbUserToUser(data as DbUser) as User
  } catch (error) {
    console.error('Error getting user data:', error)
    return null
  }
}

// Get user profile
export const getUserProfile = async (userId: string): Promise<User | null> => {
  return getUserData(userId)
}

// Login with email and password
export const login = async ({ email, password }: LoginCredentials): Promise<{ user: User }> => {
  console.log('🔐 Attempting login for:', email)

  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      console.error('❌ Auth error:', authError)
      if (authError.message.includes('Invalid login credentials')) {
        throw new Error('อีเมลหรือรหัสผ่านไม่ถูกต้อง')
      }
      if (authError.message.includes('Email not confirmed')) {
        throw new Error('กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ')
      }
      throw new Error(authError.message)
    }

    if (!authData.user) {
      throw new Error('ไม่พบข้อมูลผู้ใช้')
    }

    console.log('✅ Auth successful:', authData.user.id)

    // Get user data from users table
    const userData = await getUserData(authData.user.id)

    if (!userData) {
      console.error('❌ User document not found')
      throw new Error('ไม่พบข้อมูลผู้ใช้')
    }

    if (!userData.isActive) {
      throw new Error('บัญชีนี้ถูกระงับการใช้งาน')
    }

    // Update last login
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', authData.user.id)

    console.log('✅ User data retrieved:', userData)
    return { user: userData }
  } catch (error: any) {
    console.error('❌ Login error:', error)
    throw error
  }
}

// Logout
export const logout = async (): Promise<void> => {
  try {
    await supabase.auth.signOut()
    console.log('✅ Logged out successfully')
  } catch (error) {
    console.error('❌ Logout error:', error)
    throw error
  }
}

// Reset password
export const resetPassword = async (email: string): Promise<void> => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) {
      if (error.message.includes('User not found')) {
        throw new Error('ไม่พบบัญชีผู้ใช้นี้')
      }
      throw new Error(error.message)
    }
  } catch (error: any) {
    throw error
  }
}

// Get current user
export const getCurrentUser = async (): Promise<User | null> => {
  const { data: { user: authUser } } = await supabase.auth.getUser()
  console.log('🔥 Supabase current user:', authUser?.email || 'null')

  if (authUser) {
    return getUserData(authUser.id)
  }
  return null
}

// Subscribe to auth state changes
export const subscribeToAuthState = (callback: (user: User | null) => void) => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('🔥 Auth state changed:', event, session?.user?.email || 'null')
    if (session?.user) {
      const userData = await getUserData(session.user.id)
      callback(userData)
    } else {
      callback(null)
    }
  })

  // Return unsubscribe function (compatible with existing usage)
  return () => subscription.unsubscribe()
}

// Check if user is authenticated
export const isAuthenticated = async (): Promise<boolean> => {
  const { data: { session } } = await supabase.auth.getSession()
  return !!session
}

// Refresh token (not needed with Supabase auto-refresh, kept for compatibility)
export const refreshToken = async (): Promise<string | null> => {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || null
  } catch (error) {
    console.error('Error refreshing token:', error)
    return null
  }
}

// Register new school and owner
export async function registerSchool(data: RegisterData): Promise<void> {
  let authUserId: string | null = null
  let schoolId: string | null = null

  try {
    console.log('🚀 Starting registration...')
    console.log('📧 Creating user with email:', data.email)

    // 1. Create Supabase Auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          first_name: data.firstName,
          last_name: data.lastName,
          display_name: `${data.firstName} ${data.lastName}`,
        },
      },
    })

    if (authError) {
      if (authError.message.includes('already registered')) {
        throw new Error('อีเมลนี้ถูกใช้งานแล้ว')
      }
      throw new Error(authError.message)
    }

    if (!authData.user) {
      throw new Error('ไม่สามารถสร้างบัญชีได้')
    }

    authUserId = authData.user.id
    console.log('✅ Auth user created:', authUserId)

    // 2. Create unique school ID
    schoolId = `school_${authUserId}_${Date.now()}`

    // 3. Create school document
    const { error: schoolError } = await supabase.from('schools').insert({
      id: schoolId,
      name: data.schoolName,
      timezone: 'Asia/Bangkok',
      currency: 'THB',
      date_format: 'DD/MM/YYYY',
      language: 'th',
      plan: 'free',
      max_students: 50,
      max_teachers: 3,
      max_courses: 5,
      storage_quota: 1073741824,
      features: {
        onlinePayment: false,
        parentApp: false,
        apiAccess: false,
        customDomain: false,
        whiteLabel: false,
      },
      is_active: true,
      is_verified: false,
    })

    if (schoolError) {
      console.error('❌ School creation error:', schoolError)
      throw new Error('ไม่สามารถสร้างโรงเรียนได้')
    }

    console.log('✅ School created:', schoolId)

    // 4. Create user document
    const { error: userError } = await supabase.from('users').insert({
      id: authUserId,
      email: data.email,
      first_name: data.firstName,
      last_name: data.lastName,
      display_name: `${data.firstName} ${data.lastName}`,
      role: 'owner',
      school_id: schoolId,
      is_active: true,
    })

    if (userError) {
      console.error('❌ User document creation error:', userError)
      throw new Error('ไม่สามารถสร้างข้อมูลผู้ใช้ได้')
    }

    console.log('✅ User document created')
    console.log('🎉 Registration completed successfully')
  } catch (error: any) {
    console.error('❌ Registration error:', error)

    // Rollback: Delete school if created
    if (schoolId) {
      try {
        await supabase.from('schools').delete().eq('id', schoolId)
        console.log('🔄 Rolled back school document')
      } catch (deleteError) {
        console.error('Error deleting school:', deleteError)
      }
    }

    throw error.message ? error : new Error('เกิดข้อผิดพลาดในการลงทะเบียน')
  }
}
