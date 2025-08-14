// src/services/studentCredit.ts
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
  runTransaction
} from 'firebase/firestore'
import { db } from './firebase'

// Types
export interface StudentCredit {
  id: string
  schoolId: string
  studentId: string
  courseId: string
  packageId: string
  
  // Reference Information (Denormalized)
  studentName: string
  studentCode: string
  courseName: string
  packageName: string
  packageCode?: string
  
  // Credit Information
  totalCredits: number
  bonusCredits: number
  usedCredits: number
  remainingCredits: number
  
  // Financial Information
  originalPrice: number
  discountAmount: number
  finalPrice: number
  pricePerCredit: number
  paymentStatus: 'pending' | 'paid' | 'refunded'
  paymentMethod: 'cash' | 'transfer' | 'credit_card' | 'promptpay'
  paymentReference?: string
  paymentDate?: string
  paymentNote?: string
  
  // Validity Period
  hasExpiry: boolean
  purchaseDate: string
  activationDate: string
  expiryDate?: string
  daysUntilExpiry?: number
  
  // Status
  status: 'active' | 'expired' | 'depleted' | 'suspended'
  
  // Receipt/Invoice
  receiptNumber?: string
  invoiceNumber?: string
  
  // Timestamps
  createdAt: Date
  updatedAt: Date
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

// Interface for credit summary by package
export interface CreditPackageSummary {
  courseName: string
  packageName: string
  remainingCredits: number
  expiryDate?: string
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
    return await runTransaction(db, async (transaction) => {
      // Get student data
      const studentRef = doc(db, 'students', data.studentId)
      const studentDoc = await transaction.get(studentRef)
      if (!studentDoc.exists()) {
        throw new Error('Student not found')
      }
      const student = studentDoc.data()
      
      // Get package data
      const packageRef = doc(db, 'credit_packages', data.packageId)
      const packageDoc = await transaction.get(packageRef)
      if (!packageDoc.exists()) {
        throw new Error('Package not found')
      }
      const creditPackage = packageDoc.data()
      
      console.log('Package data:', creditPackage)
      
      // Get course data
      const courseRef = doc(db, 'courses', creditPackage.courseId)
      const courseDoc = await transaction.get(courseRef)
      if (!courseDoc.exists()) {
        throw new Error('Course not found')
      }
      const course = courseDoc.data()
      
      console.log('Course data:', course)
      
      // Calculate dates
      const purchaseDate = new Date()
      const expiryDate = calculateExpiryDate(
        purchaseDate,
        creditPackage.validityType,
        creditPackage.validityValue
      )
      
      // Prepare credit data
      const creditData: any = {
        schoolId,
        studentId: data.studentId,
        courseId: creditPackage.courseId,
        packageId: data.packageId,
        
        // Reference info - ตรวจสอบและใส่ค่า default ถ้าเป็น undefined
        studentName: `${student.firstName} ${student.lastName}`,
        studentCode: student.studentCode || '',
        courseName: course.name || creditPackage.courseName || '',
        packageName: creditPackage.name || '',
        packageCode: creditPackage.code || '',
        
        // Credit info
        totalCredits: creditPackage.totalCreditsWithBonus || creditPackage.credits || 0,
        bonusCredits: creditPackage.bonusCredits || 0,
        usedCredits: 0,
        remainingCredits: creditPackage.totalCreditsWithBonus || creditPackage.credits || 0,
        
        // Financial info
        originalPrice: creditPackage.price || 0,
        discountAmount: data.discountAmount || 0,
        finalPrice: data.paymentAmount || 0,
        pricePerCredit: data.paymentAmount / (creditPackage.totalCreditsWithBonus || creditPackage.credits || 1),
        paymentStatus: 'paid' as const,
        paymentMethod: data.paymentMethod,
        paymentDate: purchaseDate.toISOString(),
        
        // Validity
        hasExpiry: creditPackage.validityType !== 'unlimited',
        purchaseDate: purchaseDate.toISOString().split('T')[0],
        activationDate: purchaseDate.toISOString().split('T')[0],
        
        // Status - ตรวจสอบให้แน่ใจว่า set เป็น 'active'
        status: 'active' as const,
        
        // Receipt
        receiptNumber: generateReceiptNumber(),
        
        // Timestamps
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }
      
      // Add optional fields
      if (data.paymentReference) {
        creditData.paymentReference = data.paymentReference
      }
      
      if (data.paymentNote) {
        creditData.paymentNote = data.paymentNote
      }
      
      if (expiryDate) {
        creditData.expiryDate = expiryDate.toISOString().split('T')[0]
      }
      
      console.log('Final credit data to be saved:', creditData)
      
      // Validate critical fields
      const requiredFields = ['schoolId', 'studentId', 'courseId', 'packageId', 'studentName', 'courseName', 'packageName']
      for (const field of requiredFields) {
        if (!creditData[field]) {
          throw new Error(`Required field ${field} is missing or undefined`)
        }
      }
      
      // Create credit document
      const creditRef = collection(db, 'student_credits')
      const newCreditRef = doc(creditRef)
      
      transaction.set(newCreditRef, creditData)
      
      console.log('Credit purchased successfully with ID:', newCreditRef.id)
      
      return {
        id: newCreditRef.id,
        ...creditData,
        createdAt: new Date(),
        updatedAt: new Date()
      } as StudentCredit
    })
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
 * Used in: Attendance page for checking available credits for check-in
 */
export const getStudentCreditsForCourse = async (
  studentId: string,
  courseId: string,
  schoolId?: string
): Promise<StudentCredit[]> => {
  try {
    console.log('Getting credits for course:', { studentId, courseId, schoolId })
    
    const creditsRef = collection(db, 'student_credits')
    let conditions = [
      where('studentId', '==', studentId),
      where('courseId', '==', courseId),
      where('status', '==', 'active')
    ]
    
    // Add schoolId if provided
    if (schoolId) {
      conditions.push(where('schoolId', '==', schoolId))
    }
    
    const q = query(creditsRef, ...conditions)
    
    const snapshot = await getDocs(q)
    console.log(`Found ${snapshot.size} credits for course ${courseId}`)
    
    const credits: StudentCredit[] = []
    snapshot.docs.forEach(doc => {
      const data = doc.data() as any
      
      // Only include if has remaining credits
      if (data.remainingCredits > 0) {
        let daysUntilExpiry = null
        if (data.hasExpiry && data.expiryDate) {
          daysUntilExpiry = calculateDaysUntilExpiry(data.expiryDate)
        }
        
        credits.push({
          id: doc.id,
          ...data,
          daysUntilExpiry,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        })
      }
    })
    
    // Sort by purchase date desc
    credits.sort((a, b) => 
      new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime()
    )
    
    console.log(`Returning ${credits.length} active credits with remaining balance`)
    return credits
  } catch (error) {
    console.error('Error getting student credits for course:', error)
    return []
  }
}

/**
 * Get all active credits for a student across all courses
 * Used in: Students list page and Student detail page
 */
export const getStudentAllActiveCredits = async (
  studentId: string,
  schoolId?: string
): Promise<StudentCredit[]> => {
  try {
    console.log('Getting all active credits for student:', studentId, 'schoolId:', schoolId)
    
    const creditsRef = collection(db, 'student_credits')
    let conditions = [
      where('studentId', '==', studentId),
      where('status', '==', 'active')
    ]
    
    // Add schoolId if provided
    if (schoolId) {
      conditions.push(where('schoolId', '==', schoolId))
    }
    
    const q = query(creditsRef, ...conditions)
    
    const snapshot = await getDocs(q)
    console.log(`Found ${snapshot.size} total credits for student`)
    
    const credits: StudentCredit[] = []
    snapshot.docs.forEach(doc => {
      const data = doc.data() as any
      
      // Only include if has remaining credits
      if (data.remainingCredits > 0) {
        let daysUntilExpiry = null
        if (data.hasExpiry && data.expiryDate) {
          daysUntilExpiry = calculateDaysUntilExpiry(data.expiryDate)
        }
        
        credits.push({
          id: doc.id,
          ...data,
          daysUntilExpiry,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        })
      }
    })
    
    // Sort by course name, then by purchase date
    credits.sort((a, b) => {
      if (a.courseName !== b.courseName) {
        return a.courseName.localeCompare(b.courseName)
      }
      return new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime()
    })
    
    console.log(`Returning ${credits.length} active credits with remaining balance`)
    return credits
  } catch (error) {
    console.error('Error getting all student active credits:', error)
    return []
  }
}

/**
 * Get total remaining credits for a student (sum of all courses)
 * Used in: Students list page for quick display
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
 * Used in: Students list page tooltip
 */
export const getStudentCreditsSummary = async (
  studentId: string,
  schoolId?: string
): Promise<CreditPackageSummary[]> => {
  try {
    const credits = await getStudentAllActiveCredits(studentId, schoolId)
    
    return credits.map(credit => ({
      courseName: credit.courseName,
      packageName: credit.packageName,
      remainingCredits: credit.remainingCredits,
      expiryDate: credit.expiryDate
    }))
  } catch (error) {
    console.error('Error getting student credits summary:', error)
    return []
  }
}

// ====================================
// LEGACY FUNCTIONS (kept for backward compatibility)
// ====================================

// Get all credits for a student (simplified version)
export const getStudentCredits = async (
  studentId: string,
  courseId?: string
): Promise<StudentCredit[]> => {
  if (courseId) {
    return getStudentCreditsForCourse(studentId, courseId)
  }
  return getStudentAllActiveCredits(studentId)
}

// Get all student credits (without filtering) - for debugging
export const getAllStudentCreditsDebug = async (
  studentId: string
): Promise<StudentCredit[]> => {
  try {
    console.log('DEBUG: Getting ALL credits for student:', studentId)
    
    const creditsRef = collection(db, 'student_credits')
    const q = query(
      creditsRef,
      where('studentId', '==', studentId)
    )
    
    const snapshot = await getDocs(q)
    console.log('DEBUG: Total credits found:', snapshot.size)
    
    const credits: StudentCredit[] = []
    snapshot.docs.forEach((doc, index) => {
      const data = doc.data() as any
      console.log(`DEBUG: Credit ${index + 1}:`, {
        id: doc.id,
        courseId: data.courseId,
        courseName: data.courseName,
        status: data.status,
        remainingCredits: data.remainingCredits,
        totalCredits: data.totalCredits
      })
      
      credits.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      })
    })
    
    return credits
  } catch (error) {
    console.error('DEBUG: Error getting all student credits:', error)
    return []
  }
}

// Legacy function - redirects to new centralized function
export const getStudentAllCoursesCredits = async (
  studentId: string
): Promise<StudentCredit[]> => {
  return getStudentAllActiveCredits(studentId)
}

// Use credits (for attendance)
export const useCredits = async (
  creditId: string,
  creditsToUse: number = 1
): Promise<void> => {
  try {
    await runTransaction(db, async (transaction) => {
      const creditRef = doc(db, 'student_credits', creditId)
      const creditDoc = await transaction.get(creditRef)
      
      if (!creditDoc.exists()) {
        throw new Error('Credit not found')
      }
      
      const credit = creditDoc.data()
      
      if (credit.remainingCredits < creditsToUse) {
        throw new Error('Insufficient credits')
      }
      
      const newUsedCredits = credit.usedCredits + creditsToUse
      const newRemainingCredits = credit.remainingCredits - creditsToUse
      const newStatus = newRemainingCredits === 0 ? 'depleted' : credit.status
      
      transaction.update(creditRef, {
        usedCredits: newUsedCredits,
        remainingCredits: newRemainingCredits,
        status: newStatus,
        lastUsedDate: new Date().toISOString().split('T')[0],
        updatedAt: serverTimestamp()
      })
    })
  } catch (error) {
    console.error('Error using credits:', error)
    throw error
  }
}

// Check and update expired credits
export const updateExpiredCredits = async (schoolId: string): Promise<void> => {
  try {
    const today = new Date().toISOString().split('T')[0]
    
    const creditsRef = collection(db, 'student_credits')
    const q = query(
      creditsRef,
      where('schoolId', '==', schoolId),
      where('status', '==', 'active'),
      where('hasExpiry', '==', true),
      where('expiryDate', '<', today)
    )
    
    const snapshot = await getDocs(q)
    
    const updates = snapshot.docs.map(doc => 
      updateDoc(doc.ref, {
        status: 'expired',
        updatedAt: serverTimestamp()
      })
    )
    
    await Promise.all(updates)
  } catch (error) {
    console.error('Error updating expired credits:', error)
  }
}

/**
 * Get all credits for a school (for admin/reports)
 * Used in: Course detail, Credit history, Reports
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
    console.log('Getting school credits:', { schoolId, filters })
    
    const creditsRef = collection(db, 'student_credits')
    let conditions = [where('schoolId', '==', schoolId)]
    
    // Add filters if provided
    if (filters?.courseId) {
      conditions.push(where('courseId', '==', filters.courseId))
    }
    if (filters?.studentId) {
      conditions.push(where('studentId', '==', filters.studentId))
    }
    if (filters?.status) {
      conditions.push(where('status', '==', filters.status))
    }
    
    const q = query(creditsRef, ...conditions)
    const snapshot = await getDocs(q)
    
    console.log(`Found ${snapshot.size} credits for school`)
    
    let credits: StudentCredit[] = []
    snapshot.docs.forEach(doc => {
      const data = doc.data() as any
      
      // Calculate days until expiry
      let daysUntilExpiry = null
      if (data.hasExpiry && data.expiryDate) {
        daysUntilExpiry = calculateDaysUntilExpiry(data.expiryDate)
      }
      
      credits.push({
        id: doc.id,
        ...data,
        daysUntilExpiry,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      })
    })
    
    // Client-side filtering for date range
    if (filters?.startDate) {
      credits = credits.filter(c => c.purchaseDate >= filters.startDate!)
    }
    if (filters?.endDate) {
      credits = credits.filter(c => c.purchaseDate <= filters.endDate!)
    }
    
    // Sort by purchase date desc
    credits.sort((a, b) => 
      new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime()
    )
    
    return credits
  } catch (error) {
    console.error('Error getting school credits:', error)
    return []
  }
}