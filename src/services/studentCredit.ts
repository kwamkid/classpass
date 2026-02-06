// src/services/studentCredit.ts
import { supabase } from './supabase'
import { dbCreditToCredit } from '../types/database.types'
import type { DbStudentCredit } from '../types/database.types'

// Import and re-export type
import type { StudentCredit } from '../types/models'
export type { StudentCredit }

// Interface for credit summary by package
export interface CreditPackageSummary {
  courseName?: string
  packageName: string
  remainingCredits: number
  expiryDate?: string
  applicableCourses?: string[]
}

export interface PurchaseCreditsData {
  studentId: string
  packageId: string
  paymentMethod: 'cash' | 'transfer' | 'credit_card' | 'promptpay'
  paymentAmount: number
  discountAmount?: number
  paymentNote?: string
  paymentReference?: string
}

// Generate receipt number
const generateReceiptNumber = (): string => {
  const year = new Date().getFullYear()
  const month = String(new Date().getMonth() + 1).padStart(2, '0')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `RCP${year}${month}${random}`
}

// Calculate expiry date
const calculateExpiryDate = (
  purchaseDate: Date,
  validityType: 'months' | 'days' | 'unlimited',
  validityValue?: number
): Date | null => {
  if (validityType === 'unlimited') return null

  const expiryDate = new Date(purchaseDate)

  if (validityType === 'months' && validityValue) {
    expiryDate.setMonth(expiryDate.getMonth() + validityValue)
  } else if (validityType === 'days' && validityValue) {
    expiryDate.setDate(expiryDate.getDate() + validityValue)
  }

  return expiryDate
}

// Calculate days until expiry
const calculateDaysUntilExpiry = (expiryDate: string): number => {
  const today = new Date()
  const expiry = new Date(expiryDate)
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

// Purchase credits for student
export const purchaseCredits = async (
  schoolId: string,
  data: PurchaseCreditsData
): Promise<StudentCredit> => {
  try {
    // Get student data
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('first_name, last_name, student_code')
      .eq('id', data.studentId)
      .single()

    if (studentError || !student) {
      throw new Error('Student not found')
    }

    // Get package data
    const { data: creditPackage, error: packageError } = await supabase
      .from('credit_packages')
      .select('*')
      .eq('id', data.packageId)
      .single()

    if (packageError || !creditPackage) {
      throw new Error('Package not found')
    }

    // Calculate dates
    const purchaseDate = new Date()
    const expiryDate = calculateExpiryDate(
      purchaseDate,
      creditPackage.validity_type,
      creditPackage.validity_value
    )

    const totalCredits = creditPackage.total_credits_with_bonus || creditPackage.credits || 0

    // Build insert data
    const insertData: Record<string, any> = {
      school_id: schoolId,
      student_id: data.studentId,
      package_id: data.packageId,

      // Single course (backward compat)
      course_id: creditPackage.course_id || (creditPackage.applicable_course_ids?.[0]) || null,
      course_name: creditPackage.course_name || (creditPackage.applicable_course_names?.[0]) || null,

      // Multi-course
      applicable_course_ids: creditPackage.applicable_course_ids || [creditPackage.course_id].filter(Boolean),
      applicable_course_names: creditPackage.applicable_course_names || [creditPackage.course_name].filter(Boolean),
      is_universal: creditPackage.is_universal || false,

      // Reference info
      student_name: `${student.first_name} ${student.last_name}`,
      student_code: student.student_code || '',
      package_name: creditPackage.name || '',
      package_code: creditPackage.code || '',

      // Credit info
      total_credits: totalCredits,
      bonus_credits: creditPackage.bonus_credits || 0,
      used_credits: 0,
      remaining_credits: totalCredits,

      // Financial info
      original_price: creditPackage.price || 0,
      discount_amount: data.discountAmount || 0,
      final_price: data.paymentAmount || 0,
      price_per_credit: data.paymentAmount / (totalCredits || 1),
      payment_status: 'paid',
      payment_method: data.paymentMethod,
      payment_date: purchaseDate.toISOString(),

      // Validity
      has_expiry: creditPackage.validity_type !== 'unlimited',
      purchase_date: purchaseDate.toISOString().split('T')[0],
      activation_date: purchaseDate.toISOString().split('T')[0],

      // Status
      status: 'active',

      // Receipt
      receipt_number: generateReceiptNumber(),
    }

    // Add optional fields
    if (data.paymentReference) {
      insertData.payment_reference = data.paymentReference
    }
    if (data.paymentNote) {
      insertData.payment_note = data.paymentNote
    }
    if (expiryDate) {
      insertData.expiry_date = expiryDate.toISOString().split('T')[0]
    }

    const { data: row, error } = await supabase
      .from('student_credits')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Error purchasing credits:', error)
      throw error
    }

    return dbCreditToCredit(row as DbStudentCredit) as StudentCredit
  } catch (error) {
    console.error('Error purchasing credits:', error)
    throw error
  }
}

// ====================================
// CENTRALIZED CREDIT FETCHING FUNCTIONS
// ====================================

/**
 * Get active credits for a specific student and course
 * Returns credits that can be used for the specified course
 * Sorted by purchase date (FIFO) for proper deduction order
 */
export const getStudentCreditsForCourse = async (
  studentId: string,
  courseId: string,
  schoolId?: string
): Promise<StudentCredit[]> => {
  try {
    let query = supabase
      .from('student_credits')
      .select('*')
      .eq('student_id', studentId)
      .eq('status', 'active')

    if (schoolId) {
      query = query.eq('school_id', schoolId)
    }

    const { data: rows, error } = await query

    if (error) {
      console.error('Error getting student credits for course:', error)
      return []
    }

    // Filter client-side for multi-course support
    const credits: StudentCredit[] = []
    for (const row of rows || []) {
      const canUseForCourse =
        row.is_universal ||
        (row.applicable_course_ids && row.applicable_course_ids.includes(courseId)) ||
        (row.course_id && row.course_id === courseId)

      if (row.remaining_credits > 0 && canUseForCourse) {
        const credit = dbCreditToCredit(row as DbStudentCredit) as StudentCredit
        if (credit.hasExpiry && credit.expiryDate) {
          (credit as any).daysUntilExpiry = calculateDaysUntilExpiry(credit.expiryDate)
        }
        credits.push(credit)
      }
    }

    // Sort by purchase date ASC (FIFO - oldest first)
    credits.sort((a, b) =>
      new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime()
    )

    return credits
  } catch (error) {
    console.error('Error getting student credits for course:', error)
    return []
  }
}

/**
 * Get total remaining credits for a specific student and course
 */
export const getStudentTotalCreditsForCourse = async (
  studentId: string,
  courseId: string,
  schoolId?: string
): Promise<number> => {
  try {
    const credits = await getStudentCreditsForCourse(studentId, courseId, schoolId)
    return credits.reduce((sum, credit) => sum + credit.remainingCredits, 0)
  } catch (error) {
    console.error('Error getting total credits for course:', error)
    return 0
  }
}

/**
 * Get all active credits for a student across all courses
 */
export const getStudentAllActiveCredits = async (
  studentId: string,
  schoolId?: string
): Promise<StudentCredit[]> => {
  try {
    let query = supabase
      .from('student_credits')
      .select('*')
      .eq('student_id', studentId)
      .eq('status', 'active')

    if (schoolId) {
      query = query.eq('school_id', schoolId)
    }

    const { data: rows, error } = await query

    if (error) {
      console.error('Error getting all student active credits:', error)
      return []
    }

    const credits: StudentCredit[] = []
    for (const row of rows || []) {
      if (row.remaining_credits > 0) {
        const credit = dbCreditToCredit(row as DbStudentCredit) as StudentCredit
        if (credit.hasExpiry && credit.expiryDate) {
          (credit as any).daysUntilExpiry = calculateDaysUntilExpiry(credit.expiryDate)
        }
        credits.push(credit)
      }
    }

    // Sort by package name, then by purchase date
    credits.sort((a, b) => {
      if (a.packageName !== b.packageName) {
        return a.packageName.localeCompare(b.packageName)
      }
      return new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime()
    })

    return credits
  } catch (error) {
    console.error('Error getting all student active credits:', error)
    return []
  }
}

/**
 * Get total remaining credits for a student (sum of all courses)
 */
export const getStudentTotalCredits = async (
  studentId: string,
  schoolId?: string
): Promise<number> => {
  try {
    const credits = await getStudentAllActiveCredits(studentId, schoolId)
    return credits.reduce((sum, credit) => sum + credit.remainingCredits, 0)
  } catch (error) {
    console.error('Error getting student total credits:', error)
    return 0
  }
}

/**
 * Get credit summary grouped by package
 */
export const getStudentCreditsSummary = async (
  studentId: string,
  schoolId?: string,
  courses?: any[]
): Promise<CreditPackageSummary[]> => {
  try {
    const credits = await getStudentAllActiveCredits(studentId, schoolId)

    return credits.map(credit => {
      let applicableCourses: string[] = []

      if (credit.isUniversal) {
        applicableCourses = ['ใช้ได้ทุกวิชา']
      } else if (credit.applicableCourseIds && courses) {
        applicableCourses = credit.applicableCourseIds
          .map(id => courses.find(c => c.id === id)?.name)
          .filter(Boolean) as string[]
      }

      return {
        courseName: credit.courseName,
        packageName: credit.packageName,
        remainingCredits: credit.remainingCredits,
        expiryDate: credit.expiryDate,
        applicableCourses
      }
    })
  } catch (error) {
    console.error('Error getting student credits summary:', error)
    return []
  }
}

// ====================================
// LEGACY FUNCTIONS (kept for backward compatibility)
// ====================================

export const getStudentCredits = async (
  studentId: string,
  courseId?: string
): Promise<StudentCredit[]> => {
  if (courseId) {
    return getStudentCreditsForCourse(studentId, courseId)
  }
  return getStudentAllActiveCredits(studentId)
}

export const getStudentAllCoursesCredits = async (
  studentId: string
): Promise<StudentCredit[]> => {
  return getStudentAllActiveCredits(studentId)
}

// Use credits (for attendance) - Uses FIFO
export const useCredits = async (
  creditId: string,
  creditsToUse: number = 1
): Promise<void> => {
  try {
    // Get current credit
    const { data: credit, error: fetchError } = await supabase
      .from('student_credits')
      .select('remaining_credits, used_credits, status')
      .eq('id', creditId)
      .single()

    if (fetchError || !credit) {
      throw new Error('Credit not found')
    }

    if (credit.remaining_credits < creditsToUse) {
      throw new Error('Insufficient credits')
    }

    const newUsedCredits = credit.used_credits + creditsToUse
    const newRemainingCredits = credit.remaining_credits - creditsToUse
    const newStatus = newRemainingCredits === 0 ? 'depleted' : credit.status

    const { error } = await supabase
      .from('student_credits')
      .update({
        used_credits: newUsedCredits,
        remaining_credits: newRemainingCredits,
        status: newStatus,
        last_used_date: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString(),
      })
      .eq('id', creditId)

    if (error) {
      throw error
    }
  } catch (error) {
    console.error('Error using credits:', error)
    throw error
  }
}

// Check and update expired credits
export const updateExpiredCredits = async (schoolId: string): Promise<void> => {
  try {
    const today = new Date().toISOString().split('T')[0]

    const { data: rows, error: fetchError } = await supabase
      .from('student_credits')
      .select('id')
      .eq('school_id', schoolId)
      .eq('status', 'active')
      .eq('has_expiry', true)
      .lt('expiry_date', today)

    if (fetchError || !rows || rows.length === 0) return

    const ids = rows.map(r => r.id)

    const { error } = await supabase
      .from('student_credits')
      .update({
        status: 'expired',
        updated_at: new Date().toISOString(),
      })
      .in('id', ids)

    if (error) {
      console.error('Error updating expired credits:', error)
    }
  } catch (error) {
    console.error('Error updating expired credits:', error)
  }
}

/**
 * Get all credits for a school (for admin/reports)
 */
export const getSchoolCredits = async (
  schoolId: string,
  filters?: {
    courseId?: string
    studentId?: string
    status?: string
    startDate?: string
    endDate?: string
  }
): Promise<StudentCredit[]> => {
  try {
    let query = supabase
      .from('student_credits')
      .select('*')
      .eq('school_id', schoolId)

    if (filters?.studentId) {
      query = query.eq('student_id', filters.studentId)
    }
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }
    if (filters?.startDate) {
      query = query.gte('purchase_date', filters.startDate)
    }
    if (filters?.endDate) {
      query = query.lte('purchase_date', filters.endDate)
    }

    query = query.order('purchase_date', { ascending: false })

    const { data: rows, error } = await query

    if (error) {
      console.error('Error getting school credits:', error)
      return []
    }

    let credits: StudentCredit[] = (rows || []).map(row => {
      const credit = dbCreditToCredit(row as DbStudentCredit) as StudentCredit
      if (credit.hasExpiry && credit.expiryDate) {
        (credit as any).daysUntilExpiry = calculateDaysUntilExpiry(credit.expiryDate)
      }
      return credit
    })

    // Client-side filtering for courseId (multi-course support)
    if (filters?.courseId) {
      credits = credits.filter(c => {
        return c.isUniversal ||
          (c.applicableCourseIds && c.applicableCourseIds.includes(filters.courseId!)) ||
          (c.courseId && c.courseId === filters.courseId)
      })
    }

    return credits
  } catch (error) {
    console.error('Error getting school credits:', error)
    return []
  }
}

// Debug function
export const getAllStudentCreditsDebug = async (
  studentId: string
): Promise<StudentCredit[]> => {
  try {
    const { data: rows, error } = await supabase
      .from('student_credits')
      .select('*')
      .eq('student_id', studentId)

    if (error || !rows) return []

    return rows.map(row => dbCreditToCredit(row as DbStudentCredit) as StudentCredit)
  } catch (error) {
    console.error('Error getting all student credits:', error)
    return []
  }
}

// ====================================
// BATCH QUERY FUNCTIONS (for performance)
// ====================================

export interface StudentCreditSummary {
  studentId: string
  totalCredits: number
  creditsByPackage: CreditPackageSummary[]
}

/**
 * Get credits summary for multiple students in a single query
 * Much faster than calling getStudentTotalCredits for each student
 */
export const getStudentsCreditsSummaryBatch = async (
  studentIds: string[],
  schoolId: string
): Promise<Map<string, StudentCreditSummary>> => {
  try {
    if (studentIds.length === 0) return new Map()

    const { data: rows, error } = await supabase
      .from('student_credits')
      .select('*')
      .eq('school_id', schoolId)
      .eq('status', 'active')
      .gt('remaining_credits', 0)
      .in('student_id', studentIds)

    if (error) {
      console.error('Error getting batch credits:', error)
      return new Map()
    }

    // Group by student
    const summaryMap = new Map<string, StudentCreditSummary>()

    // Initialize all students with empty data
    for (const studentId of studentIds) {
      summaryMap.set(studentId, {
        studentId,
        totalCredits: 0,
        creditsByPackage: []
      })
    }

    // Process credits
    for (const row of rows || []) {
      const studentId = row.student_id
      const summary = summaryMap.get(studentId)
      if (!summary) continue

      summary.totalCredits += row.remaining_credits || 0
      summary.creditsByPackage.push({
        courseName: row.course_name || (row.is_universal ? 'ใช้ได้ทุกวิชา' : row.applicable_course_names?.[0] || 'ไม่ระบุ'),
        packageName: row.package_name || '',
        remainingCredits: row.remaining_credits || 0,
        expiryDate: row.expiry_date
      })
    }

    return summaryMap
  } catch (error) {
    console.error('Error getting batch credits summary:', error)
    return new Map()
  }
}

/**
 * Get unique student count for each course in a single query
 * Much faster than calling getSchoolCredits for each course
 */
export const getCourseStudentCountsBatch = async (
  courseIds: string[],
  schoolId: string
): Promise<Map<string, number>> => {
  try {
    if (courseIds.length === 0) return new Map()

    const { data: rows, error } = await supabase
      .from('student_credits')
      .select('student_id, course_id, applicable_course_ids, is_universal')
      .eq('school_id', schoolId)
      .eq('status', 'active')
      .gt('remaining_credits', 0)

    if (error) {
      console.error('Error getting batch course student counts:', error)
      return new Map()
    }

    // Initialize counts
    const countsMap = new Map<string, Set<string>>()
    for (const courseId of courseIds) {
      countsMap.set(courseId, new Set())
    }

    // Process credits - check if credit applies to each course
    for (const row of rows || []) {
      const studentId = row.student_id

      for (const courseId of courseIds) {
        const appliesToCourse =
          row.is_universal ||
          row.course_id === courseId ||
          (row.applicable_course_ids && row.applicable_course_ids.includes(courseId))

        if (appliesToCourse) {
          const students = countsMap.get(courseId)
          if (students) {
            students.add(studentId)
          }
        }
      }
    }

    // Convert sets to counts
    const resultMap = new Map<string, number>()
    for (const [courseId, students] of countsMap) {
      resultMap.set(courseId, students.size)
    }

    return resultMap
  } catch (error) {
    console.error('Error getting batch course student counts:', error)
    return new Map()
  }
}

/**
 * Get credits for multiple students for a specific course in a single query
 * Much faster than calling getStudentCreditsForCourse for each student
 */
export const getStudentsCreditsForCourseBatch = async (
  studentIds: string[],
  courseId: string,
  schoolId: string
): Promise<Map<string, StudentCredit[]>> => {
  try {
    if (studentIds.length === 0) return new Map()

    const { data: rows, error } = await supabase
      .from('student_credits')
      .select('*')
      .eq('school_id', schoolId)
      .eq('status', 'active')
      .gt('remaining_credits', 0)
      .in('student_id', studentIds)

    if (error) {
      console.error('Error getting batch student credits for course:', error)
      return new Map()
    }

    // Initialize all students
    const creditsMap = new Map<string, StudentCredit[]>()
    for (const studentId of studentIds) {
      creditsMap.set(studentId, [])
    }

    // Process credits - filter for this course
    for (const row of rows || []) {
      const canUseForCourse =
        row.is_universal ||
        row.course_id === courseId ||
        (row.applicable_course_ids && row.applicable_course_ids.includes(courseId))

      if (canUseForCourse) {
        const studentId = row.student_id
        const credits = creditsMap.get(studentId)
        if (credits) {
          const credit = dbCreditToCredit(row as DbStudentCredit) as StudentCredit
          credits.push(credit)
        }
      }
    }

    // Sort each student's credits by purchase date (FIFO)
    for (const credits of creditsMap.values()) {
      credits.sort((a, b) =>
        new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime()
      )
    }

    return creditsMap
  } catch (error) {
    console.error('Error getting batch student credits for course:', error)
    return new Map()
  }
}
