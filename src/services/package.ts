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
  serverTimestamp
} from 'firebase/firestore'
import { db } from './firebase'

// Types
export interface CreditPackage {
  id: string
  schoolId: string
  courseId: string
  courseName?: string // Denormalized
  
  // Package Information
  name: string
  description?: string
  code?: string
  
  // Credits & Pricing
  credits: number
  price: number
  pricePerCredit: number
  
  // Validity
  validityType: 'months' | 'days' | 'unlimited'
  validityValue?: number
  validityDescription?: string
  
  // Promotion
  isPromotion: boolean
  originalPrice?: number
  discountPercent?: number
  promotionEndDate?: string
  
  // Bonus
  bonusCredits: number
  totalCreditsWithBonus: number
  
  // Display
  displayOrder: number
  color?: string
  icon?: string
  popular: boolean
  recommended: boolean
  
  // Status
  status: 'active' | 'inactive'
  isActive: boolean
  isDeleted?: boolean
  
  // Timestamps
  createdAt: Date
  updatedAt: Date
}

export interface CreatePackageData {
  courseId: string
  name: string
  description?: string
  credits: number
  price: number
  validityType: 'months' | 'days' | 'unlimited'
  validityValue?: number
  bonusCredits?: number
  popular?: boolean
  recommended?: boolean
  color?: string
}

// Generate package code
const generatePackageCode = async (schoolId: string): Promise<string> => {
  const prefix = 'PKG'
  const timestamp = Date.now().toString().slice(-6)
  return `${prefix}${timestamp}`
}

// Calculate derived fields
const calculateDerivedFields = (data: Partial<CreditPackage>) => {
  const totalCredits = (data.credits || 0) + (data.bonusCredits || 0)
  const pricePerCredit = data.price && totalCredits > 0 
    ? Math.round((data.price / totalCredits) * 100) / 100 
    : 0
    
  let validityDescription = 'ไม่มีกำหนด'
  if (data.validityType === 'months' && data.validityValue) {
    validityDescription = `ใช้ได้ ${data.validityValue} เดือน`
  } else if (data.validityType === 'days' && data.validityValue) {
    validityDescription = `ใช้ได้ ${data.validityValue} วัน`
  }
  
  return {
    totalCreditsWithBonus: totalCredits,
    pricePerCredit,
    validityDescription
  }
}

// Get all packages for a school
export const getPackages = async (
  schoolId: string, 
  courseId?: string,
  activeOnly: boolean = true
): Promise<CreditPackage[]> => {
  try {
    const packagesRef = collection(db, 'credit_packages')
    let conditions = [where('schoolId', '==', schoolId)]
    
    if (courseId) {
      conditions.push(where('courseId', '==', courseId))
    }
    
    if (activeOnly) {
      conditions.push(where('status', '==', 'active'))
    }
    
    const q = query(
      packagesRef,
      ...conditions,
      orderBy('displayOrder', 'asc')
    )
    
    const snapshot = await getDocs(q)
    
    const packages: CreditPackage[] = []
    snapshot.docs.forEach(doc => {
      const data = doc.data() as any
      if (!data.isDeleted) {
        packages.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        })
      }
    })
    
    return packages
  } catch (error) {
    console.error('Error getting packages:', error)
    return []
  }
}

// Get packages by course
export const getPackagesByCourse = async (
  schoolId: string,
  courseId: string
): Promise<CreditPackage[]> => {
  return getPackages(schoolId, courseId, true)
}

// Get single package
export const getPackage = async (packageId: string): Promise<CreditPackage | null> => {
  try {
    const packageDoc = await getDoc(doc(db, 'credit_packages', packageId))
    
    if (packageDoc.exists()) {
      const data = packageDoc.data()
      return {
        id: packageDoc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as CreditPackage
    }
    
    return null
  } catch (error) {
    console.error('Error getting package:', error)
    return null
  }
}

// Create new package
export const createPackage = async (
  schoolId: string,
  data: CreatePackageData
): Promise<CreditPackage> => {
  try {
    // Generate code
    const code = await generatePackageCode(schoolId)
    
    // Calculate derived fields
    const derived = calculateDerivedFields(data)
    
    // Get course name for denormalization
    let courseName = ''
    if (data.courseId) {
      const courseDoc = await getDoc(doc(db, 'courses', data.courseId))
      if (courseDoc.exists()) {
        courseName = courseDoc.data().name
      }
    }
    
    // Prepare package data
    const packageData = {
      schoolId,
      code,
      ...data,
      courseName,
      ...derived,
      displayOrder: 0,
      status: 'active' as const,
      isActive: true,
      isDeleted: false,
      isPromotion: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }
    
    // Create document
    const docRef = await addDoc(collection(db, 'credit_packages'), packageData)
    
    return {
      id: docRef.id,
      ...packageData,
      createdAt: new Date(),
      updatedAt: new Date()
    } as CreditPackage
  } catch (error) {
    console.error('Error creating package:', error)
    throw error
  }
}

// Update package
export const updatePackage = async (
  packageId: string,
  data: Partial<CreditPackage>
): Promise<void> => {
  try {
    // Calculate derived fields if needed
    const derived = calculateDerivedFields(data)
    
    const updateData = {
      ...data,
      ...derived,
      updatedAt: serverTimestamp()
    }
    
    // Remove fields that shouldn't be updated
    delete updateData.id
    delete updateData.schoolId
    delete updateData.code
    delete updateData.createdAt
    
    await updateDoc(doc(db, 'credit_packages', packageId), updateData)
  } catch (error) {
    console.error('Error updating package:', error)
    throw error
  }
}

// Soft delete package
export const deletePackage = async (packageId: string): Promise<void> => {
  try {
    await updateDoc(doc(db, 'credit_packages', packageId), {
      status: 'inactive',
      isActive: false,
      isDeleted: true,
      deletedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
  } catch (error) {
    console.error('Error deleting package:', error)
    throw error
  }
}

// Update display order
export const updatePackageOrder = async (
  packages: { id: string; displayOrder: number }[]
): Promise<void> => {
  try {
    const batch = packages.map(pkg => 
      updateDoc(doc(db, 'credit_packages', pkg.id), {
        displayOrder: pkg.displayOrder,
        updatedAt: serverTimestamp()
      })
    )
    
    await Promise.all(batch)
  } catch (error) {
    console.error('Error updating package order:', error)
    throw error
  }
}