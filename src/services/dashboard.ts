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

// Get dashboard statistics
export async function getDashboardStats(schoolId: string) {
  try {
    // Get current date info
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    // Get all students
    const studentsQuery = query(
      collection(db, 'students'),
      where('schoolId', '==', schoolId)
    )
    const studentsSnapshot = await getDocs(studentsQuery)
    
    let totalStudents = 0
    let newStudentsThisMonth = 0
    
    studentsSnapshot.forEach((doc) => {
      const data = doc.data()
      if (data.status === 'active') {
        totalStudents++
      }
      
      // Check if student joined this month
      const joinDate = data.joinDate ? new Date(data.joinDate) : null
      if (joinDate && joinDate >= startOfMonth) {
        newStudentsThisMonth++
      }
    })
    
    // Get revenue this month
    const creditsQuery = query(
      collection(db, 'student_credits'),
      where('schoolId', '==', schoolId),
      where('paymentStatus', '==', 'paid'),
      where('purchaseDate', '>=', startOfMonth.toISOString().split('T')[0])
    )
    const creditsSnapshot = await getDocs(creditsQuery)
    
    let monthlyRevenue = 0
    creditsSnapshot.forEach((doc) => {
      monthlyRevenue += doc.data().finalPrice || 0
    })
    
    // Calculate revenue growth (compare with last month)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
    
    const lastMonthQuery = query(
      collection(db, 'student_credits'),
      where('schoolId', '==', schoolId),
      where('paymentStatus', '==', 'paid'),
      where('purchaseDate', '>=', lastMonthStart.toISOString().split('T')[0]),
      where('purchaseDate', '<=', lastMonthEnd.toISOString().split('T')[0])
    )
    const lastMonthSnapshot = await getDocs(lastMonthQuery)
    
    let lastMonthRevenue = 0
    lastMonthSnapshot.forEach((doc) => {
      lastMonthRevenue += doc.data().finalPrice || 0
    })
    
    const revenueGrowth = lastMonthRevenue > 0 
      ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
      : 0
    
    // Get today's attendance rate
    const attendanceQuery = query(
      collection(db, 'attendance'),
      where('schoolId', '==', schoolId),
      where('checkInDate', '==', startOfToday.toISOString().split('T')[0])
    )
    const attendanceSnapshot = await getDocs(attendanceQuery)
    
    let presentCount = 0
    let totalExpected = 0
    
    attendanceSnapshot.forEach((doc) => {
      const data = doc.data()
      totalExpected++
      if (data.status === 'present' || data.status === 'late') {
        presentCount++
      }
    })
    
    const attendanceRate = totalExpected > 0 
      ? (presentCount / totalExpected) * 100 
      : 0
    
    // Get today's classes count
    const coursesQuery = query(
      collection(db, 'courses'),
      where('schoolId', '==', schoolId),
      where('status', '==', 'active')
    )
    const coursesSnapshot = await getDocs(coursesQuery)
    
    let todayClasses = 0
    const today = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
    
    coursesSnapshot.forEach((doc) => {
      const course = doc.data()
      if (course.schedule?.sessions) {
        const hasTodayClass = course.schedule.sessions.some(
          (session: any) => session.day === today
        )
        if (hasTodayClass) {
          todayClasses++
        }
      }
    })
    
    return {
      totalStudents,
      newStudentsThisMonth,
      monthlyRevenue,
      revenueGrowth: Math.round(revenueGrowth * 10) / 10,
      attendanceRate: Math.round(attendanceRate * 10) / 10,
      todayClasses
    }
  } catch (error) {
    console.error('Error getting dashboard stats:', error)
    throw error
  }
}

// Get recent activities
export async function getRecentActivities(schoolId: string, limitCount: number = 10) {
  try {
    const activities: any[] = []
    
    // Get recent student registrations
    const studentsQuery = query(
      collection(db, 'students'),
      where('schoolId', '==', schoolId),
      orderBy('createdAt', 'desc'),
      limit(3)
    )
    const studentsSnapshot = await getDocs(studentsQuery)
    
    studentsSnapshot.forEach((doc) => {
      const data = doc.data()
      activities.push({
        id: doc.id,
        type: 'student',
        title: 'นักเรียนใหม่ลงทะเบียน',
        description: `${data.firstName} ${data.lastName} ลงทะเบียนเข้าเรียน`,
        timestamp: data.createdAt,
        data
      })
    })
    
    // Get recent credit purchases
    const creditsQuery = query(
      collection(db, 'student_credits'),
      where('schoolId', '==', schoolId),
      where('paymentStatus', '==', 'paid'),
      orderBy('createdAt', 'desc'),
      limit(3)
    )
    const creditsSnapshot = await getDocs(creditsQuery)
    
    creditsSnapshot.forEach((doc) => {
      const data = doc.data()
      activities.push({
        id: doc.id,
        type: 'payment',
        title: 'ซื้อแพ็คเกจใหม่',
        description: `${data.studentName} - ${data.packageName} ฿${data.finalPrice?.toLocaleString()}`,
        timestamp: data.createdAt,
        data
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
    
    attendanceSnapshot.forEach((doc) => {
      const data = doc.data()
      activities.push({
        id: doc.id,
        type: 'attendance',
        title: 'เช็คชื่อเข้าเรียน',
        description: `${data.courseName} - ${data.studentName}`,
        timestamp: data.createdAt,
        data
      })
    })
    
    // Get low credit warnings
    const lowCreditsQuery = query(
      collection(db, 'student_credits'),
      where('schoolId', '==', schoolId),
      where('status', '==', 'active'),
      where('remainingCredits', '<=', 3),
      where('remainingCredits', '>', 0),
      limit(3)
    )
    const lowCreditsSnapshot = await getDocs(lowCreditsQuery)
    
    lowCreditsSnapshot.forEach((doc) => {
      const data = doc.data()
      activities.push({
        id: doc.id,
        type: 'warning',
        title: 'เครดิตใกล้หมด',
        description: `${data.studentName} เหลือเครดิต ${data.remainingCredits} ครั้ง`,
        timestamp: data.updatedAt || data.createdAt,
        data
      })
    })
    
    // Sort all activities by timestamp
    activities.sort((a, b) => {
      const timeA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp)
      const timeB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp)
      return timeB.getTime() - timeA.getTime()
    })
    
    // Return only the requested limit
    return activities.slice(0, limitCount)
  } catch (error) {
    console.error('Error getting recent activities:', error)
    throw error
  }
}

// Get upcoming classes for today
export async function getTodayClasses(schoolId: string) {
  try {
    const coursesQuery = query(
      collection(db, 'courses'),
      where('schoolId', '==', schoolId),
      where('status', '==', 'active')
    )
    const coursesSnapshot = await getDocs(coursesQuery)
    
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
    const todayClasses: any[] = []
    
    coursesSnapshot.forEach((doc) => {
      const course = doc.data()
      if (course.schedule?.sessions) {
        const todaySessions = course.schedule.sessions.filter(
          (session: any) => session.day === today
        )
        
        todaySessions.forEach((session: any) => {
          todayClasses.push({
            id: doc.id,
            courseId: doc.id,
            courseName: course.name,
            courseCode: course.code,
            startTime: session.startTime,
            endTime: session.endTime,
            room: session.room,
            teacherName: course.teacherName || 'ไม่ระบุ',
            enrolledCount: course.totalEnrolled || 0
          })
        })
      }
    })
    
    // Sort by start time
    todayClasses.sort((a, b) => {
      const timeA = parseInt(a.startTime.replace(':', ''))
      const timeB = parseInt(b.startTime.replace(':', ''))
      return timeA - timeB
    })
    
    return todayClasses
  } catch (error) {
    console.error('Error getting today classes:', error)
    throw error
  }
}

// Format time ago
export function formatTimeAgo(timestamp: any): string {
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 60) {
    return 'เมื่อสักครู่'
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return `${minutes} นาทีที่แล้ว`
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return `${hours} ชั่วโมงที่แล้ว`
  } else if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400)
    return `${days} วันที่แล้ว`
  } else {
    return date.toLocaleDateString('th-TH')
  }
}