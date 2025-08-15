// src/services/package.ts
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy,
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore'
import { db } from './firebase'

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
    // คำนวณ fields ที่จำเป็น
    const totalCreditsWithBonus = data.credits + (data.bonusCredits || 0)
    const pricePerCredit = data.price / totalCreditsWithBonus
    
    const packageData = {
      ...data,
      schoolId,
      totalCreditsWithBonus,
      pricePerCredit,
      // ลบ displayOrder ออก
      status: 'active',
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }
    
    // ลบ displayOrder ออกจาก packageData ถ้ามี
    delete packageData.displayOrder
    
    console.log('📝 Creating package with data:', packageData)
    
    const docRef = await addDoc(collection(db, 'credit_packages'), packageData)
    
    console.log('✅ Package created with ID:', docRef.id)
    
    return {
      id: docRef.id,
      ...packageData,
      createdAt: new Date(),
      updatedAt: new Date()
    } as CreditPackage
  } catch (error) {
    console.error('❌ Error creating package:', error)
    throw error
  }
}

// Get all packages for a school
export const getPackages = async (schoolId: string): Promise<CreditPackage[]> => {
  try {
    console.log('🔍 Getting packages for school:', schoolId)
    
    const packagesRef = collection(db, 'credit_packages')
    
    // Query แบบง่ายๆ ไม่ต้องใช้ displayOrder
    const q = query(
      packagesRef,
      where('schoolId', '==', schoolId),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc') // เรียงตามวันที่สร้างล่าสุดก่อน
    )
    
    const snapshot = await getDocs(q)
    console.log('📊 Query snapshot size:', snapshot.size)
    
    const packages: CreditPackage[] = []
    
    snapshot.docs.forEach(doc => {
      const data = doc.data() as any
      console.log('📦 Package data:', doc.id, data.name)
      
      packages.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      })
    })
    
    console.log('✅ Final packages:', packages.length)
    return packages
  } catch (error) {
    console.error('❌ Error getting packages:', error)
    
    // ถ้า error เพราะ index ให้ลอง query แบบไม่มี orderBy
    if (error.message?.includes('index')) {
      console.log('🔄 Retrying without orderBy...')
      
      const packagesRef = collection(db, 'credit_packages')
      const q = query(
        packagesRef,
        where('schoolId', '==', schoolId),
        where('isActive', '==', true)
      )
      
      const snapshot = await getDocs(q)
      const packages: CreditPackage[] = []
      
      snapshot.docs.forEach(doc => {
        const data = doc.data() as any
        packages.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        })
      })
      
      // Sort ใน JavaScript แทน (เรียงตามวันที่สร้างล่าสุดก่อน)
      packages.sort((a, b) => {
        const dateA = a.createdAt?.getTime() || 0
        const dateB = b.createdAt?.getTime() || 0
        return dateB - dateA // DESC
      })
      
      return packages
    }
    
    return []
  }
}


// Get packages by course
export const getPackagesByCourse = async (schoolId: string, courseId: string): Promise<CreditPackage[]> => {
  try {
    const packagesRef = collection(db, 'credit_packages')
    const q = query(
      packagesRef,
      where('schoolId', '==', schoolId),
      where('isActive', '==', true)
    )
    
    const snapshot = await getDocs(q)
    const packages: CreditPackage[] = []
    
    snapshot.docs.forEach(doc => {
      const data = doc.data() as any
      
      // Check if package can be used for this course
      const canUseForCourse = data.isUniversal || 
        (data.applicableCourseIds && data.applicableCourseIds.includes(courseId)) ||
        // Fallback for old data
        (data.courseId && data.courseId === courseId)
      
      if (canUseForCourse) {
        packages.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        })
      }
    })
    
    // Sort by display order, then by price
    packages.sort((a, b) => {
      if (a.displayOrder !== b.displayOrder) {
        return a.displayOrder - b.displayOrder
      }
      return a.price - b.price
    })
    
    return packages
  } catch (error) {
    console.error('Error getting packages by course:', error)
    return []
  }
}

// Get single package
export const getPackage = async (packageId: string): Promise<CreditPackage | null> => {
  try {
    const packageDoc = await getDoc(doc(db, 'credit_packages', packageId))
    
    if (packageDoc.exists()) {
      const data = packageDoc.data() as any
      return {
        id: packageDoc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      }
    }
    
    return null
  } catch (error) {
    console.error('Error getting package:', error)
    return null
  }
}

// Update package
export const updatePackage = async (packageId: string, data: Partial<CreditPackage>): Promise<void> => {
  try {
    const updateData = {
      ...data,
      updatedAt: serverTimestamp()
    }
    
    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key as keyof typeof updateData] === undefined) {
        delete updateData[key as keyof typeof updateData]
      }
    })
    
    await updateDoc(doc(db, 'credit_packages', packageId), updateData)
  } catch (error) {
    console.error('Error updating package:', error)
    throw error
  }
}

// Delete package (soft delete)
export const deletePackage = async (packageId: string): Promise<void> => {
  try {
    await updateDoc(doc(db, 'credit_packages', packageId), {
      isActive: false,
      deletedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
  } catch (error) {
    console.error('Error deleting package:', error)
    throw error
  }
}

// Get packages statistics
export const getPackageStats = async (schoolId: string, packageId: string): Promise<{
  totalSold: number
  totalRevenue: number
  activeCredits: number
  totalCreditsIssued: number
}> => {
  try {
    // This would query the student_credits collection
    // For now, return mock data
    return {
      totalSold: 0,
      totalRevenue: 0,
      activeCredits: 0,
      totalCreditsIssued: 0
    }
  } catch (error) {
    console.error('Error getting package stats:', error)
    return {
      totalSold: 0,
      totalRevenue: 0,
      activeCredits: 0,
      totalCreditsIssued: 0
    }
  }
}