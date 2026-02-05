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

// Shared AbortController — allows cancelling any in-flight getUserData query
let activeGetUserController: AbortController | null = null

// Cancel any in-flight getUserData query
export const cancelPendingUserQuery = () => {
  if (activeGetUserController) {
    activeGetUserController.abort()
    activeGetUserController = null
  }
}

// Get user data from Supabase with AbortController timeout
export const getUserData = async (uid: string, signal?: AbortSignal): Promise<User | null> => {
  try {
    // Create a new controller for timeout, but also respect external signal
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    // If external signal aborts, also abort this controller
    if (signal) {
      signal.addEventListener('abort', () => controller.abort(), { once: true })
    }

    // Track this as the active query
    activeGetUserController = controller

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', uid)
      .abortSignal(controller.signal)
      .single()

    clearTimeout(timeoutId)
    if (activeGetUserController === controller) {
      activeGetUserController = null
    }

    if (error || !data) return null
    return dbUserToUser(data as DbUser) as User
  } catch (error: any) {
    if (error.name !== 'AbortError') {
      console.error('Error getting user data:', error)
    }
    return null
  }
}

// Login with email and password
export const login = async ({ email, password }: LoginCredentials): Promise<{ user: User }> => {
  // Cancel any in-flight getUserData from initAuth listener
  cancelPendingUserQuery()

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (authError) {
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

  // Force session sync — ensures JWT is propagated before querying
  await supabase.auth.getSession()

  // Get user data from users table
  const userData = await getUserData(authData.user.id)

  if (!userData) {
    throw new Error('ไม่พบข้อมูลผู้ใช้')
  }

  if (!userData.isActive) {
    throw new Error('บัญชีนี้ถูกระงับการใช้งาน')
  }

  // Update last login (fire-and-forget)
  supabase
    .from('users')
    .update({ last_login: new Date().toISOString() })
    .eq('id', authData.user.id)
    .then(({ error }) => {
      if (error) console.warn('Failed to update last_login:', error.message)
    })

  return { user: userData }
}

// Logout
export const logout = async (): Promise<void> => {
  await supabase.auth.signOut()
}

// Reset password
export const resetPassword = async (email: string): Promise<void> => {
  const { error } = await supabase.auth.resetPasswordForEmail(email)
  if (error) {
    if (error.message.includes('User not found')) {
      throw new Error('ไม่พบบัญชีผู้ใช้นี้')
    }
    throw new Error(error.message)
  }
}

// Flag shared with authStore to prevent onAuthStateChange interference
export let isAuthActionInProgress = false
export const setAuthActionInProgress = (value: boolean) => { isAuthActionInProgress = value }

// Register new school and owner
export async function registerSchool(data: RegisterData): Promise<{ user: User }> {
  let authUserId: string | null = null
  let schoolId: string | null = null

  isAuthActionInProgress = true

  try {
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
      if (authError.message.toLowerCase().includes('rate') || authError.message.toLowerCase().includes('limit')) {
        throw new Error('ส่งอีเมลบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่')
      }
      throw new Error(authError.message)
    }

    if (!authData.user) {
      throw new Error('ไม่สามารถสร้างบัญชีได้')
    }

    authUserId = authData.user.id

    // Force session sync — ensures JWT is ready before inserting data
    await supabase.auth.getSession()

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
      console.error('School creation error:', schoolError)
      throw new Error('ไม่สามารถสร้างโรงเรียนได้')
    }

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
      console.error('User document creation error:', userError)
      throw new Error('ไม่สามารถสร้างข้อมูลผู้ใช้ได้')
    }

    // 5. Fetch the newly created user data and return it
    const userData = await getUserData(authUserId)
    if (!userData) {
      throw new Error('ไม่สามารถดึงข้อมูลผู้ใช้ได้')
    }

    return { user: userData }
  } catch (error: any) {
    console.error('Registration error:', error)

    // Rollback: Delete school if created
    if (schoolId) {
      try {
        await supabase.from('schools').delete().eq('id', schoolId)
      } catch (deleteError) {
        console.error('Error deleting school during rollback:', deleteError)
      }
    }

    throw error.message ? error : new Error('เกิดข้อผิดพลาดในการลงทะเบียน')
  } finally {
    isAuthActionInProgress = false
  }
}
