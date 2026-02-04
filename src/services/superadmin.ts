// src/services/superadmin.ts
import { supabase, supabaseAdmin } from './supabase'

// Types
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
}

export interface SystemStats {
  totalSchools: number
  totalUsers: number
  totalStudents: number
  totalRevenue: number
  activeSchools: number
  storageUsed: number
}

export interface SchoolWithStats {
  id: string
  name: string
  logo?: string
  plan: string
  isActive: boolean
  createdAt: any
  totalStudents: number
  totalUsers: number
  totalRevenue: number
  lastActiveAt?: any
}

// Get all schools with stats
export async function getAllSchoolsWithStats(): Promise<SchoolWithStats[]> {
  try {
    const { data: schoolsData, error: schoolsError } = await supabase
      .from('schools')
      .select('*')
      .order('created_at', { ascending: false })

    if (schoolsError || !schoolsData) {
      console.error('Error getting schools:', schoolsError)
      return []
    }

    const schools: SchoolWithStats[] = []

    for (const school of schoolsData) {
      // Run counts in parallel
      const [studentsResult, usersResult, creditsResult] = await Promise.all([
        supabase.from('students').select('id', { count: 'exact', head: true })
          .eq('school_id', school.id),
        supabase.from('users').select('id', { count: 'exact', head: true })
          .eq('school_id', school.id),
        supabase.from('student_credits').select('final_price')
          .eq('school_id', school.id).eq('payment_status', 'paid'),
      ])

      let totalRevenue = 0
      if (creditsResult.data) {
        totalRevenue = creditsResult.data.reduce((sum, c) => sum + (Number(c.final_price) || 0), 0)
      }

      schools.push({
        id: school.id,
        name: school.name,
        logo: school.logo,
        plan: school.plan,
        isActive: school.is_active,
        createdAt: school.created_at ? new Date(school.created_at) : new Date(),
        totalStudents: studentsResult.count || 0,
        totalUsers: usersResult.count || 0,
        totalRevenue,
        lastActiveAt: school.last_active_at ? new Date(school.last_active_at) : undefined
      })
    }

    return schools
  } catch (error) {
    console.error('Error getting schools with stats:', error)
    throw error
  }
}

// Get system-wide statistics
export async function getSystemStats(): Promise<SystemStats> {
  try {
    const [schoolsResult, usersResult, studentsResult, creditsResult] = await Promise.all([
      supabase.from('schools').select('id, is_active', { count: 'exact' }),
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('students').select('id', { count: 'exact', head: true }),
      supabase.from('student_credits').select('final_price')
        .eq('payment_status', 'paid'),
    ])

    let totalRevenue = 0
    let activeSchools = 0

    if (creditsResult.data) {
      totalRevenue = creditsResult.data.reduce((sum, c) => sum + (Number(c.final_price) || 0), 0)
    }

    if (schoolsResult.data) {
      activeSchools = schoolsResult.data.filter(s => s.is_active).length
    }

    return {
      totalSchools: schoolsResult.count || 0,
      totalUsers: usersResult.count || 0,
      totalStudents: studentsResult.count || 0,
      totalRevenue,
      activeSchools,
      storageUsed: 0
    }
  } catch (error) {
    console.error('Error getting system stats:', error)
    throw error
  }
}

// Delete school and all related data
export async function deleteSchoolCompletely(
  schoolId: string,
  deletedBy: string
): Promise<void> {
  try {
    console.log(`Starting complete deletion of school: ${schoolId}`)

    // Delete in order (respecting FK constraints)
    const tables = [
      'attendance',
      'student_credits',
      'credit_packages',
      'students',
      'courses',
      'users',
    ]

    const deletedCounts: Record<string, number> = {}

    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .delete()
        .eq('school_id', schoolId)
        .select('id')

      if (error) {
        console.error(`Error deleting from ${table}:`, error)
      }
      deletedCounts[table] = data?.length || 0
      console.log(`Deleted ${deletedCounts[table]} records from ${table}`)
    }

    // Delete the school itself
    const { error: schoolError } = await supabase
      .from('schools')
      .delete()
      .eq('id', schoolId)

    if (schoolError) {
      console.error('Error deleting school:', schoolError)
      throw schoolError
    }

    console.log(`Successfully deleted school ${schoolId} and all related data`)
  } catch (error) {
    console.error('Error deleting school:', error)
    throw error
  }
}

// Create new school with owner account
export async function createSchoolWithOwner(data: {
  schoolName: string
  ownerEmail: string
  ownerPassword: string
  ownerFirstName: string
  ownerLastName: string
  plan?: 'free' | 'basic' | 'pro' | 'enterprise'
}) {
  if (!supabaseAdmin) {
    throw new Error('Service role key is not configured. Cannot create school without VITE_SUPABASE_SERVICE_ROLE_KEY.')
  }

  let authUserId: string | null = null
  let schoolId: string | null = null

  try {
    // 1. Create auth user via admin API
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: data.ownerEmail,
      password: data.ownerPassword,
      email_confirm: true,
      user_metadata: {
        first_name: data.ownerFirstName,
        last_name: data.ownerLastName,
        display_name: `${data.ownerFirstName} ${data.ownerLastName}`,
      },
    })

    if (authError || !authData.user) {
      throw authError || new Error('Failed to create auth user')
    }

    authUserId = authData.user.id

    // 2. Create school
    schoolId = `school_${authUserId}_${Date.now()}`
    const { error: schoolError } = await supabase.from('schools').insert({
      id: schoolId,
      name: data.schoolName,
      timezone: 'Asia/Bangkok',
      currency: 'THB',
      date_format: 'DD/MM/YYYY',
      language: 'th',
      plan: data.plan || 'free',
      max_students: data.plan === 'pro' ? 999999 : data.plan === 'basic' ? 200 : 50,
      max_teachers: data.plan === 'pro' ? 999999 : data.plan === 'basic' ? 10 : 3,
      max_courses: data.plan === 'pro' ? 999999 : data.plan === 'basic' ? 20 : 5,
      storage_quota: data.plan === 'pro' ? 20 * 1024 * 1024 * 1024 :
                     data.plan === 'basic' ? 5 * 1024 * 1024 * 1024 :
                     1024 * 1024 * 1024,
      features: {
        onlinePayment: data.plan !== 'free',
        parentApp: data.plan === 'pro',
        apiAccess: data.plan === 'pro',
        customDomain: data.plan === 'pro',
        whiteLabel: false
      },
      is_active: true,
      is_verified: false,
    })

    if (schoolError) {
      throw schoolError
    }

    // 3. Create user record
    const { error: userError } = await supabase.from('users').insert({
      id: authUserId,
      email: data.ownerEmail,
      first_name: data.ownerFirstName,
      last_name: data.ownerLastName,
      display_name: `${data.ownerFirstName} ${data.ownerLastName}`,
      role: 'owner',
      school_id: schoolId,
      is_active: true,
      is_deleted: false,
      is_super_admin: false,
    })

    if (userError) {
      throw userError
    }

    return {
      schoolId,
      userId: authUserId,
      message: 'School created successfully'
    }
  } catch (error) {
    // Rollback
    if (authUserId && supabaseAdmin) {
      try { await supabaseAdmin.auth.admin.deleteUser(authUserId) } catch (e) { /* ignore */ }
    }
    if (schoolId) {
      try { await supabase.from('schools').delete().eq('id', schoolId) } catch (e) { /* ignore */ }
    }
    throw error
  }
}

// Get system logs (simplified - no dedicated logs table needed for now)
export async function getSystemLogs(limitCount: number = 50) {
  // In the Supabase version, we don't have a system_logs table yet.
  // Return empty array for now - can add audit logging table later if needed.
  return []
}
