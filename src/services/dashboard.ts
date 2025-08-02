// src/services/dashboard.ts
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit,
  Timestamp
} from 'firebase/firestore'
import { db } from './firebase'

export interface DashboardStats {
  totalStudents: number
  newStudentsThisMonth: number
  monthlyRevenue: number
  revenueGrowth: number
  attendanceRate: number
  todayClasses: number
  totalCourses: number
  totalPackages: number
}

export interface Activity {
  id: string
  title: string
  description: string
  type: 'student' | 'payment' | 'attendance' | 'warning'
  timestamp: Date
}

export interface TodayClass {
  id: string
  courseId: string
  courseName: string
  startTime: string
  endTime: string
  room: string
  teacherName?: string
  enrolledStudents?: number
}

export const getDashboardStats = async (schoolId: string): Promise<DashboardStats> => {
  try {
    const now = new Date()
    const startOfThisMonth = getStartOfMonth(now)
    const endOfThisMonth = getEndOfMonth(now)
    
    // Get total students
    const studentsQuery = query(
      collection(db, 'students'),
      where('schoolId', '==', schoolId),
      where('isActive', '==', true)
    )
    const studentsSnapshot = await getDocs(studentsQuery)
    const totalStudents = studentsSnapshot.size
    
    // Get new students this month
    const newStudentsQuery = query(
      collection(db, 'students'),
      where('schoolId', '==', schoolId),
      where('createdAt', '>=', Timestamp.fromDate(startOfThisMonth)),
      where('createdAt', '<=', Timestamp.fromDate(endOfThisMonth))
    )
    const newStudentsSnapshot = await getDocs(newStudentsQuery)
    const newStudentsThisMonth = newStudentsSnapshot.size
    
    // Get total courses
    const coursesQuery = query(
      collection(db, 'courses'),
      where('schoolId', '==', schoolId),
      where('isActive', '==', true)
    )
    const coursesSnapshot = await getDocs(coursesQuery)
    const totalCourses = coursesSnapshot.size
    
    // Get total packages
    const packagesQuery = query(
      collection(db, 'credit_packages'),
      where('schoolId', '==', schoolId),
      where('isActive', '==', true)
    )
    const packagesSnapshot = await getDocs(packagesQuery)
    const totalPackages = packagesSnapshot.size
    
    // Calculate monthly revenue
    const transactionsQuery = query(
      collection(db, 'transactions'),
      where('schoolId', '==', schoolId),
      where('type', '==', 'credit_purchase'),
      where('status', '==', 'completed'),
      where('createdAt', '>=', Timestamp.fromDate(startOfThisMonth)),
      where('createdAt', '<=', Timestamp.fromDate(endOfThisMonth))
    )
    const transactionsSnapshot = await getDocs(transactionsQuery)
    
    let monthlyRevenue = 0
    transactionsSnapshot.forEach(doc => {
      monthlyRevenue += doc.data().amount
    })
    
    // Calculate revenue growth (compare with last month)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
    
    const lastMonthTransactionsQuery = query(
      collection(db, 'transactions'),
      where('schoolId', '==', schoolId),
      where('type', '==', 'credit_purchase'),
      where('status', '==', 'completed'),
      where('createdAt', '>=', Timestamp.fromDate(startOfLastMonth)),
      where('createdAt', '<=', Timestamp.fromDate(endOfLastMonth))
    )
    const lastMonthTransactionsSnapshot = await getDocs(lastMonthTransactionsQuery)
    
    let lastMonthRevenue = 0
    lastMonthTransactionsSnapshot.forEach(doc => {
      lastMonthRevenue += doc.data().amount
    })
    
    const revenueGrowth = lastMonthRevenue > 0 
      ? Math.round(((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
      : 0
    
    // Calculate attendance rate (from today's attendance)
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    
    const attendanceQuery = query(
      collection(db, 'attendance'),
      where('schoolId', '==', schoolId),
      where('checkInDate', '==', todayStart.toISOString().split('T')[0])
    )
    const attendanceSnapshot = await getDocs(attendanceQuery)
    const attendanceRate = totalStudents > 0 
      ? Math.round((attendanceSnapshot.size / totalStudents) * 100)
      : 0
    
    // Count today's classes
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
    let todayClasses = 0
    
    coursesSnapshot.forEach(doc => {
      const course = doc.data()
      if (course.schedule?.sessions) {
        const hasTodaySession = course.schedule.sessions.some(
          (session: any) => session.day === today
        )
        if (hasTodaySession) todayClasses++
      }
    })
    
    return {
      totalStudents,
      newStudentsThisMonth,
      monthlyRevenue,
      revenueGrowth,
      attendanceRate,
      todayClasses,
      totalCourses,
      totalPackages
    }
  } catch (error) {
    console.error('Error getting dashboard stats:', error)
    return {
      totalStudents: 0,
      newStudentsThisMonth: 0,
      monthlyRevenue: 0,
      revenueGrowth: 0,
      attendanceRate: 0,
      todayClasses: 0,
      totalCourses: 0,
      totalPackages: 0
    }
  }
}

export const getRecentActivities = async (
  schoolId: string, 
  limitCount: number = 10
): Promise<Activity[]> => {
  try {
    const activities: Activity[] = []
    
    // Get recent student additions
    const studentsQuery = query(
      collection(db, 'students'),
      where('schoolId', '==', schoolId),
      orderBy('createdAt', 'desc'),
      limit(3)
    )
    const studentsSnapshot = await getDocs(studentsQuery)
    
    studentsSnapshot.forEach(doc => {
      const student = doc.data()
      activities.push({
        id: doc.id,
        title: 'นักเรียนใหม่',
        description: `เพิ่ม ${student.firstName} ${student.lastName}`,
        type: 'student',
        timestamp: student.createdAt.toDate()
      })
    })
    
    // Get recent credit purchases
    const creditsQuery = query(
      collection(db, 'student_credits'),
      where('schoolId', '==', schoolId),
      orderBy('createdAt', 'desc'),
      limit(3)
    )
    const creditsSnapshot = await getDocs(creditsQuery)
    
    creditsSnapshot.forEach(doc => {
      const credit = doc.data()
      activities.push({
        id: doc.id,
        title: 'ซื้อแพ็คเกจ',
        description: `${credit.studentName} ซื้อ ${credit.packageName}`,
        type: 'payment',
        timestamp: credit.createdAt.toDate()
      })
    })
    
    // Get recent attendance
    const attendanceQuery = query(
      collection(db, 'attendance'),
      where('schoolId', '==', schoolId),
      orderBy('createdAt', 'desc'),
      limit(3)
    )
    const attendanceSnapshot = await getDocs(attendanceQuery)
    
    attendanceSnapshot.forEach(doc => {
      const attendance = doc.data()
      activities.push({
        id: doc.id,
        title: 'เช็คชื่อ',
        description: `${attendance.studentName} เข้าเรียน ${attendance.courseName}`,
        type: 'attendance',
        timestamp: attendance.createdAt.toDate()
      })
    })
    
    // Sort all activities by timestamp and limit
    return activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limitCount)
  } catch (error) {
    console.error('Error getting recent activities:', error)
    return []
  }
}

export const getTodayClasses = async (schoolId: string): Promise<TodayClass[]> => {
  try {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
    const classes: TodayClass[] = []
    
    // Get all active courses
    const coursesQuery = query(
      collection(db, 'courses'),
      where('schoolId', '==', schoolId),
      where('isActive', '==', true)
    )
    const coursesSnapshot = await getDocs(coursesQuery)
    
    for (const doc of coursesSnapshot.docs) {
      const course = doc.data()
      
      // Check if course has sessions today
      if (course.schedule?.sessions) {
        const todaySessions = course.schedule.sessions.filter(
          (session: any) => session.day === today
        )
        
        for (const session of todaySessions) {
          // Get teacher name
          let teacherName = 'ไม่ระบุ'
          if (course.primaryTeacherId) {
            const teacherDoc = await getDocs(
              query(
                collection(db, 'users'),
                where('id', '==', course.primaryTeacherId),
                limit(1)
              )
            )
            if (!teacherDoc.empty) {
              teacherName = teacherDoc.docs[0].data().displayName
            }
          }
          
          // Count enrolled students
          const enrolledQuery = query(
            collection(db, 'students'),
            where('schoolId', '==', schoolId),
            where('enrolledCourses', 'array-contains', {
              courseId: doc.id,
              status: 'active'
            })
          )
          const enrolledSnapshot = await getDocs(enrolledQuery)
          
          classes.push({
            id: `${doc.id}-${session.day}-${session.startTime}`,
            courseId: doc.id,
            courseName: course.name,
            startTime: session.startTime,
            endTime: session.endTime,
            room: session.room || 'ไม่ระบุ',
            teacherName,
            enrolledStudents: enrolledSnapshot.size
          })
        }
      }
    }
    
    // Sort by start time
    return classes.sort((a, b) => {
      const timeA = parseInt(a.startTime.replace(':', ''))
      const timeB = parseInt(b.startTime.replace(':', ''))
      return timeA - timeB
    })
  } catch (error) {
    console.error('Error getting today classes:', error)
    return []
  }
}

export const formatTimeAgo = (date: Date): string => {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)
  
  if (seconds < 60) return 'เมื่อสักครู่'
  
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} นาทีที่แล้ว`
  
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`
  
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} วันที่แล้ว`
  
  const weeks = Math.floor(days / 7)
  if (weeks < 4) return `${weeks} สัปดาห์ที่แล้ว`
  
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} เดือนที่แล้ว`
  
  return 'มากกว่า 1 ปีที่แล้ว'
}

// Helper functions for date calculations
function getStartOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function getEndOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
}