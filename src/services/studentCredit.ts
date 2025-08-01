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
      
      // Get course data
      const courseRef = doc(db, 'courses', creditPackage.courseId)
      const courseDoc = await transaction.get(courseRef)
      if (!courseDoc.exists()) {
        throw new Error('Course not found')
      }
      const course = courseDoc.data()
      
      // Calculate dates
      const purchaseDate = new Date()
      const expiryDate = calculateExpiryDate(
        purchaseDate,
        creditPackage.validityType,
        creditPackage.validityValue
      )
      
      // Prepare credit data
      const creditData = {
        schoolId,
        studentId: data.studentId,
        courseId: creditPackage.courseId,
        packageId: data.packageId,
        
        // Reference info
        studentName: `${student.firstName} ${student.lastName}`,
        studentCode: student.studentCode,
        courseName: course.name,
        packageName: creditPackage.name,
        packageCode: creditPackage.code,
        
        // Credit info
        totalCredits: creditPackage.totalCreditsWithBonus,
        bonusCredits: creditPackage.bonusCredits || 0,
        usedCredits: 0,
        remainingCredits: creditPackage.totalCreditsWithBonus,
        
        // Financial info
        originalPrice: creditPackage.price,
        discountAmount: data.discountAmount || 0,
        finalPrice: data.paymentAmount,
        pricePerCredit: data.paymentAmount / creditPackage.totalCreditsWithBonus,
        paymentStatus: 'paid' as const,
        paymentMethod: data.paymentMethod,
        paymentReference: data.paymentReference,
        paymentDate: purchaseDate.toISOString(),
        paymentNote: data.paymentNote,
        
        // Validity
        hasExpiry: creditPackage.validityType !== 'unlimited',
        purchaseDate: purchaseDate.toISOString().split('T')[0],
        activationDate: purchaseDate.toISOString().split('T')[0],
        expiryDate: expiryDate ? expiryDate.toISOString().split('T')[0] : null,
        
        // Status
        status: 'active' as const,
        
        // Receipt
        receiptNumber: generateReceiptNumber(),
        
        // Timestamps
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }
      
      // Create credit document
      const creditRef = collection(db, 'student_credits')
      const newCreditRef = doc(creditRef)
      transaction.set(newCreditRef, creditData)
      
      // Update student's total credits (optional - for quick access)
      // transaction.update(studentRef, {
      //   totalCredits: (student.totalCredits || 0) + creditPackage.totalCreditsWithBonus,
      //   updatedAt: serverTimestamp()
      // })
      
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

// Get all credits for a student
export const getStudentCredits = async (
  studentId: string,
  courseId?: string
): Promise<StudentCredit[]> => {
  try {
    const creditsRef = collection(db, 'student_credits')
    let conditions = [
      where('studentId', '==', studentId),
      where('status', '==', 'active')
    ]
    
    if (courseId) {
      conditions.push(where('courseId', '==', courseId))
    }
    
    const q = query(
      creditsRef,
      ...conditions,
      orderBy('purchaseDate', 'desc')
    )
    
    const snapshot = await getDocs(q)
    
    const credits: StudentCredit[] = []
    snapshot.docs.forEach(doc => {
      const data = doc.data() as any
      
      // Calculate days until expiry
      let daysUntilExpiry = null
      if (data.hasExpiry && data.expiryDate) {
        const today = new Date()
        const expiry = new Date(data.expiryDate)
        daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      }
      
      credits.push({
        id: doc.id,
        ...data,
        daysUntilExpiry,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      })
    })
    
    return credits
  } catch (error) {
    console.error('Error getting student credits:', error)
    return []
  }
}

// Get all credits for a school (for reporting)
export const getSchoolCredits = async (
  schoolId: string,
  filters?: {
    startDate?: string
    endDate?: string
    courseId?: string
    status?: string
  }
): Promise<StudentCredit[]> => {
  try {
    const creditsRef = collection(db, 'student_credits')
    let conditions = [where('schoolId', '==', schoolId)]
    
    if (filters?.courseId) {
      conditions.push(where('courseId', '==', filters.courseId))
    }
    
    if (filters?.status) {
      conditions.push(where('status', '==', filters.status))
    }
    
    const q = query(
      creditsRef,
      ...conditions,
      orderBy('purchaseDate', 'desc')
    )
    
    const snapshot = await getDocs(q)
    
    let credits: StudentCredit[] = []
    snapshot.docs.forEach(doc => {
      const data = doc.data() as any
      credits.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      })
    })
    
    // Filter by date on client side
    if (filters?.startDate) {
      credits = credits.filter(c => c.purchaseDate >= filters.startDate!)
    }
    if (filters?.endDate) {
      credits = credits.filter(c => c.purchaseDate <= filters.endDate!)
    }
    
    return credits
  } catch (error) {
    console.error('Error getting school credits:', error)
    return []
  }
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
        lastUsedDate: serverTimestamp(),
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