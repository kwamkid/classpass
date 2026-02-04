// src/services/package.ts
import { supabase } from './supabase'
import { dbPackageToPackage } from '../types/database.types'
import type { DbCreditPackage } from '../types/database.types'

// Import type from types/models instead of defining here
import type { CreditPackage } from '../types/models'
export type { CreditPackage }

// Type for creating package
export interface CreatePackageData {
  courseId?: string
  courseName?: string
  applicableCourseIds?: string[]
  applicableCourseNames?: string[]
  isUniversal?: boolean
  name: string
  description?: string
  code: string
  credits: number
  price: number
  validityType: 'months' | 'days' | 'unlimited'
  validityValue?: number
  validityDescription?: string
  isPromotion?: boolean
  originalPrice?: number
  discountPercent?: number
  bonusCredits?: number
  popular?: boolean
  recommended?: boolean
  displayOrder?: number
  color?: string
}

// Create package
export const createPackage = async (schoolId: string, data: CreatePackageData): Promise<CreditPackage> => {
  try {
    // Calculate required fields
    const totalCreditsWithBonus = data.credits + (data.bonusCredits || 0)
    const pricePerCredit = data.price / totalCreditsWithBonus

    // Build insert payload (snake_case for DB), omit displayOrder
    const insertData: Record<string, any> = {
      school_id: schoolId,
      course_id: data.courseId || null,
      course_name: data.courseName || null,
      applicable_course_ids: data.applicableCourseIds || [],
      applicable_course_names: data.applicableCourseNames || [],
      is_universal: data.isUniversal || false,
      name: data.name,
      description: data.description || null,
      code: data.code,
      credits: data.credits,
      price: data.price,
      price_per_credit: pricePerCredit,
      validity_type: data.validityType,
      validity_value: data.validityValue || null,
      validity_description: data.validityDescription || null,
      is_promotion: data.isPromotion || false,
      original_price: data.originalPrice || null,
      discount_percent: data.discountPercent || null,
      bonus_credits: data.bonusCredits || 0,
      total_credits_with_bonus: totalCreditsWithBonus,
      popular: data.popular || false,
      recommended: data.recommended || false,
      color: data.color || null,
      status: 'active',
      is_active: true,
    }

    console.log('📝 Creating package with data:', insertData)

    const { data: row, error } = await supabase
      .from('credit_packages')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('❌ Supabase insert error:', error)
      throw error
    }

    console.log('✅ Package created with ID:', row.id)

    return dbPackageToPackage(row as DbCreditPackage) as CreditPackage
  } catch (error) {
    console.error('❌ Error creating package:', error)
    throw error
  }
}

// Get all packages for a school
export const getPackages = async (schoolId: string): Promise<CreditPackage[]> => {
  try {
    console.log('🔍 Getting packages for school:', schoolId)

    const { data: rows, error } = await supabase
      .from('credit_packages')
      .select('*')
      .eq('school_id', schoolId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Supabase query error:', error)
      return []
    }

    const packages = (rows || []).map((row) => dbPackageToPackage(row as DbCreditPackage) as CreditPackage)

    console.log('✅ Final packages:', packages.length)
    return packages
  } catch (error) {
    console.error('❌ Error getting packages:', error)
    return []
  }
}

// Get packages by course
export const getPackagesByCourse = async (schoolId: string, courseId: string): Promise<CreditPackage[]> => {
  try {
    // Fetch all active packages for the school
    const { data: rows, error } = await supabase
      .from('credit_packages')
      .select('*')
      .eq('school_id', schoolId)
      .eq('is_active', true)

    if (error) {
      console.error('❌ Supabase query error:', error)
      return []
    }

    // Filter client-side for packages applicable to this course
    const filtered = (rows || []).filter((row) => {
      return (
        row.is_universal === true ||
        (row.applicable_course_ids && row.applicable_course_ids.includes(courseId)) ||
        (row.course_id && row.course_id === courseId)
      )
    })

    const packages = filtered.map((row) => dbPackageToPackage(row as DbCreditPackage) as CreditPackage)

    // Sort by price ascending
    packages.sort((a, b) => a.price - b.price)

    return packages
  } catch (error) {
    console.error('Error getting packages by course:', error)
    return []
  }
}

// Get single package
export const getPackage = async (packageId: string): Promise<CreditPackage | null> => {
  try {
    const { data: row, error } = await supabase
      .from('credit_packages')
      .select('*')
      .eq('id', packageId)
      .single()

    if (error || !row) {
      return null
    }

    return dbPackageToPackage(row as DbCreditPackage) as CreditPackage
  } catch (error) {
    console.error('Error getting package:', error)
    return null
  }
}

// Update package
export const updatePackage = async (packageId: string, data: Partial<CreditPackage>): Promise<void> => {
  try {
    // Convert camelCase app fields to snake_case DB columns
    const updateData: Record<string, any> = {}

    if (data.courseId !== undefined) updateData.course_id = data.courseId
    if (data.courseName !== undefined) updateData.course_name = data.courseName
    if (data.applicableCourseIds !== undefined) updateData.applicable_course_ids = data.applicableCourseIds
    if (data.applicableCourseNames !== undefined) updateData.applicable_course_names = data.applicableCourseNames
    if (data.isUniversal !== undefined) updateData.is_universal = data.isUniversal
    if (data.name !== undefined) updateData.name = data.name
    if (data.description !== undefined) updateData.description = data.description
    if (data.code !== undefined) updateData.code = data.code
    if (data.credits !== undefined) updateData.credits = data.credits
    if (data.price !== undefined) updateData.price = data.price
    if (data.pricePerCredit !== undefined) updateData.price_per_credit = data.pricePerCredit
    if (data.validityType !== undefined) updateData.validity_type = data.validityType
    if (data.validityValue !== undefined) updateData.validity_value = data.validityValue
    if (data.validityDescription !== undefined) updateData.validity_description = data.validityDescription
    if (data.isPromotion !== undefined) updateData.is_promotion = data.isPromotion
    if (data.originalPrice !== undefined) updateData.original_price = data.originalPrice
    if (data.discountPercent !== undefined) updateData.discount_percent = data.discountPercent
    if (data.bonusCredits !== undefined) updateData.bonus_credits = data.bonusCredits
    if (data.totalCreditsWithBonus !== undefined) updateData.total_credits_with_bonus = data.totalCreditsWithBonus
    if (data.popular !== undefined) updateData.popular = data.popular
    if (data.recommended !== undefined) updateData.recommended = data.recommended
    if (data.color !== undefined) updateData.color = data.color
    if (data.status !== undefined) updateData.status = data.status
    if (data.isActive !== undefined) updateData.is_active = data.isActive

    // updated_at is handled by Supabase trigger, but set explicitly for safety
    updateData.updated_at = new Date().toISOString()

    const { error } = await supabase
      .from('credit_packages')
      .update(updateData)
      .eq('id', packageId)

    if (error) {
      console.error('❌ Supabase update error:', error)
      throw error
    }
  } catch (error) {
    console.error('Error updating package:', error)
    throw error
  }
}

// Delete package (soft delete)
export const deletePackage = async (packageId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('credit_packages')
      .update({
        is_active: false,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', packageId)

    if (error) {
      console.error('❌ Supabase soft-delete error:', error)
      throw error
    }
  } catch (error) {
    console.error('Error deleting package:', error)
    throw error
  }
}

// Get packages statistics
export const getPackageStats = async (
  schoolId: string,
  packageId: string
): Promise<{
  totalSold: number
  totalRevenue: number
  activeCredits: number
  totalCreditsIssued: number
}> => {
  try {
    // Query student_credits for this package
    const { data: rows, error } = await supabase
      .from('student_credits')
      .select('total_credits, remaining_credits, final_price, status')
      .eq('school_id', schoolId)
      .eq('package_id', packageId)

    if (error || !rows) {
      return { totalSold: 0, totalRevenue: 0, activeCredits: 0, totalCreditsIssued: 0 }
    }

    const totalSold = rows.length
    const totalRevenue = rows.reduce((sum, r) => sum + Number(r.final_price || 0), 0)
    const activeCredits = rows
      .filter((r) => r.status === 'active')
      .reduce((sum, r) => sum + (r.remaining_credits || 0), 0)
    const totalCreditsIssued = rows.reduce((sum, r) => sum + (r.total_credits || 0), 0)

    return { totalSold, totalRevenue, activeCredits, totalCreditsIssued }
  } catch (error) {
    console.error('Error getting package stats:', error)
    return { totalSold: 0, totalRevenue: 0, activeCredits: 0, totalCreditsIssued: 0 }
  }
}
