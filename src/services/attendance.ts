// src/services/attendance.ts
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  query, 
  where, 
  orderBy,
  serverTimestamp,
  runTransaction,
  deleteDoc
} from 'firebase/firestore'
import { db } from './firebase'
import * as studentCreditService from './studentCredit'

// Types
export interface Attendance {
  id: string
  schoolId: string
  studentId: string
  courseId: string
  creditId: string
  
  // Student & Course Info (Denormalized)
  studentCode: string
  studentName: string
  studentNickname?: string
  courseName: string
  courseCode?: string
  
  // Check-in Information
  checkInDate: string
  checkInTime: string
  checkInMethod: 'manual' | 'qr_code' | 'face_recognition'
  
  // Session Information
  sessionDate: string
  sessionStartTime?: string
  sessionEndTime?: string
  sessionRoom?: string
  
  // Credit Deduction
  creditsDeducted: number
  creditsBefore: number
  creditsAfter: number
  
  // Status
  status: 'present' | 'absent' | 'late' | 'excused' | 'holiday'
  isLate: boolean
  lateMinutes?: number
  
  // Checker Information
  checkedBy: string
  checkedByName: string
  checkedByRole: string
  
  // Notes
  teacherNotes?: string
  
  // Timestamps
  createdAt: Date
  updatedAt?: Date
}

export interface CheckInData {
  studentId: string
  courseId: string
  creditId: string
  checkInMethod?: 'manual' | 'qr_code' | 'face_recognition'
  isLate?: boolean
  lateMinutes?: number
  teacherNotes?: string
}

// Check in a student
export const checkInStudent = async (
  schoolId: string,
  userId: string,
  userName: string,
  userRole: string,
  data: CheckInData
): Promise<Attendance> => {
  try {
    return await runTransaction(db, async (transaction) => {
      // Get student data
      const studentRef = doc(db, 'students', data.studentId)
      const studentDoc = await transaction.get(studentRef)
      if (!studentDoc.exists()) {
        throw new Error('Student not found')
      }
      const student = studentDoc.data()
      
      // Get course data
      const courseRef = doc(db, 'courses', data.courseId)
      const courseDoc = await transaction.get(courseRef)
      if (!courseDoc.exists()) {
        throw new Error('Course not found')
      }
      const course = courseDoc.data()
      
      // Get credit data
      const creditRef = doc(db, 'student_credits', data.creditId)
      const creditDoc = await transaction.get(creditRef)
      if (!creditDoc.exists()) {
        throw new Error('Credit not found')
      }
      const credit = creditDoc.data()
      
      // Validate credit
      if (credit.status !== 'active') {
        throw new Error('Credit is not active')
      }
      
      if (credit.remainingCredits < 1) {
        throw new Error('ไม่มีเครดิตเหลือ')
      }
      
      // Check if expired
      if (credit.hasExpiry && credit.expiryDate) {
        const today = new Date().toISOString().split('T')[0]
        if (credit.expiryDate < today) {
          throw new Error('เครดิตหมดอายุแล้ว')
        }
      }
      
      // Create attendance record
      const now = new Date()
      const today = now.toISOString().split('T')[0]
      const attendanceData = {
        schoolId,
        studentId: data.studentId,
        courseId: data.courseId,
        creditId: data.creditId,
        
        // Student & Course Info
        studentCode: student.studentCode,
        studentName: `${student.firstName} ${student.lastName}`,
        studentNickname: student.nickname || '',
        courseName: course.name,
        courseCode: course.code || '',
        
        // Check-in Information
        checkInDate: today,
        checkInTime: now.toISOString(),
        checkInMethod: data.checkInMethod || 'manual',
        
        // Session Information
        sessionDate: today,
        
        // Credit Deduction
        creditsDeducted: 1,
        creditsBefore: credit.remainingCredits,
        creditsAfter: credit.remainingCredits - 1,
        
        // Status
        status: 'present' as const,
        isLate: data.isLate || false,
        lateMinutes: data.lateMinutes || 0,
        
        // Checker Information
        checkedBy: userId,
        checkedByName: userName,
        checkedByRole: userRole,
        
        // Timestamps
        createdAt: serverTimestamp()
      }
      
      // Only add teacherNotes if it exists
      if (data.teacherNotes) {
        (attendanceData as any).teacherNotes = data.teacherNotes
      }
      
      // Create attendance document
      const attendanceRef = doc(collection(db, 'attendance'))
      transaction.set(attendanceRef, attendanceData)
      
      // Update credit balance
      transaction.update(creditRef, {
        usedCredits: credit.usedCredits + 1,
        remainingCredits: credit.remainingCredits - 1,
        lastUsedDate: today,
        status: credit.remainingCredits - 1 === 0 ? 'depleted' : credit.status,
        updatedAt: serverTimestamp()
      })
      
      // Return created attendance
      return {
        id: attendanceRef.id,
        ...attendanceData,
        createdAt: new Date()
      } as Attendance
    })
  } catch (error: any) {
    console.error('Error checking in student:', error)
    throw new Error(error.message || 'เกิดข้อผิดพลาดในการเช็คชื่อ')
  }
}

// Get today's attendance for a course
export const getTodayAttendance = async (
  schoolId: string,
  courseId: string
): Promise<Attendance[]> => {
  try {
    const today = new Date().toISOString().split('T')[0]
    
    const attendanceRef = collection(db, 'attendance')
    const q = query(
      attendanceRef,
      where('schoolId', '==', schoolId),
      where('courseId', '==', courseId),
      where('checkInDate', '==', today),
      orderBy('checkInTime', 'desc')
    )
    
    const snapshot = await getDocs(q)
    
    const attendances: Attendance[] = []
    snapshot.docs.forEach(doc => {
      const data = doc.data() as any
      attendances.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate()
      })
    })
    
    return attendances
  } catch (error) {
    console.error('Error getting today attendance:', error)
    return []
  }
}

// Get attendance history
export const getAttendanceHistory = async (
  schoolId: string,
  filters?: {
    studentId?: string
    courseId?: string
    startDate?: string
    endDate?: string
  }
): Promise<Attendance[]> => {
  try {
    console.log('Getting attendance history with filters:', { schoolId, ...filters })
    
    const attendanceRef = collection(db, 'attendance')
    let conditions = [where('schoolId', '==', schoolId)]
    
    if (filters?.studentId) {
      conditions.push(where('studentId', '==', filters.studentId))
    }
    
    if (filters?.courseId) {
      conditions.push(where('courseId', '==', filters.courseId))
    }
    
    // Simple query without orderBy to avoid index requirement
    const q = query(
      attendanceRef,
      ...conditions
    )
    
    const snapshot = await getDocs(q)
    console.log(`Found ${snapshot.size} attendance records`)
    
    let attendances: Attendance[] = []
    snapshot.docs.forEach(doc => {
      const data = doc.data() as any
      console.log('Attendance record:', { 
        id: doc.id, 
        studentId: data.studentId, 
        checkInDate: data.checkInDate 
      })
      
      attendances.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate()
      })
    })
    
    // Filter by date on client side
    if (filters?.startDate) {
      attendances = attendances.filter(a => a.checkInDate >= filters.startDate!)
    }
    if (filters?.endDate) {
      attendances = attendances.filter(a => a.checkInDate <= filters.endDate!)
    }
    
    // Sort by checkInDate desc on client side
    attendances.sort((a, b) => {
      const dateA = new Date(a.checkInDate).getTime()
      const dateB = new Date(b.checkInDate).getTime()
      return dateB - dateA // desc order
    })
    
    console.log(`Returning ${attendances.length} attendance records after filtering`)
    
    return attendances
  } catch (error) {
    console.error('Error getting attendance history:', error)
    return []
  }
}

// Cancel attendance (undo check-in) - ลบ record และคืนเครดิต
export const cancelAttendance = async (
  attendanceId: string,
  reason: string
): Promise<void> => {
  try {
    await runTransaction(db, async (transaction) => {
      // Get attendance record
      const attendanceRef = doc(db, 'attendance', attendanceId)
      const attendanceDoc = await transaction.get(attendanceRef)
      
      if (!attendanceDoc.exists()) {
        throw new Error('ไม่พบข้อมูลการเช็คชื่อ')
      }
      
      const attendance = attendanceDoc.data()
      
      // Get credit record
      const creditRef = doc(db, 'student_credits', attendance.creditId)
      const creditDoc = await transaction.get(creditRef)
      
      if (!creditDoc.exists()) {
        throw new Error('ไม่พบข้อมูลเครดิต')
      }
      
      const credit = creditDoc.data()
      
      // Delete attendance record (ลบทิ้งเลย ไม่เก็บ status)
      transaction.delete(attendanceRef)
      
      // Refund credit (คืนเครดิต)
      transaction.update(creditRef, {
        usedCredits: Math.max(0, credit.usedCredits - attendance.creditsDeducted),
        remainingCredits: credit.remainingCredits + attendance.creditsDeducted,
        status: credit.remainingCredits + attendance.creditsDeducted > 0 ? 'active' : credit.status,
        updatedAt: serverTimestamp()
      })
    })
  } catch (error: any) {
    console.error('Error cancelling attendance:', error)
    throw new Error(error.message || 'เกิดข้อผิดพลาดในการยกเลิกการเช็คชื่อ')
  }
}