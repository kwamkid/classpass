// src/services/reports.ts
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy,
  limit,
  Timestamp,
  startAt,
  endAt
} from 'firebase/firestore'
import { db } from './firebase'

// Helper function to get date range
const getDateRange = (timeRange: string) => {
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
  
  switch (timeRange) {
    case 'today': {
      return { start: startOfDay, end: endOfDay }
    }
    
    case 'week': {
      const startOfWeek = new Date(startOfDay)
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
      return { start: startOfWeek, end: endOfDay }
    }
    
    case 'month': {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      return { start: startOfMonth, end: endOfDay }
    }
    
    case 'year': {
      const startOfYear = new Date(now.getFullYear(), 0, 1)
      return { start: startOfYear, end: endOfDay }
    }
    
    default: {
      return { start: startOfDay, end: endOfDay }
    }
  }
}

// Helper function to get previous date range
function getPreviousDateRange(timeRange: string) {
  const now = new Date()
  
  switch (timeRange) {
    case 'today': {
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      return {
        start: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate()),
        end: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999)
      }
    }
    
    case 'week': {
      const lastWeekEnd = new Date(now)
      lastWeekEnd.setDate(lastWeekEnd.getDate() - lastWeekEnd.getDay() - 1)
      const lastWeekStart = new Date(lastWeekEnd)
      lastWeekStart.setDate(lastWeekStart.getDate() - 6)
      return { start: lastWeekStart, end: lastWeekEnd }
    }
    
    case 'month': {
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      return { start: lastMonthStart, end: lastMonthEnd }
    }
    
    case 'year': {
      const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31)
      const lastYearStart = new Date(now.getFullYear() - 1, 0, 1)
      return { start: lastYearStart, end: lastYearEnd }
    }
    
    default: {
      return getDateRange('today')
    }
  }
}

// Get revenue stats
export async function getRevenueStats(schoolId: string, timeRange: string) {
  const { start, end } = getDateRange(timeRange)
  
  // Get all credit purchases in the time range
  const creditsQuery = query(
    collection(db, 'student_credits'),
    where('schoolId', '==', schoolId),
    where('paymentStatus', '==', 'paid'),
    where('purchaseDate', '>=', start.toISOString().split('T')[0]),
    where('purchaseDate', '<=', end.toISOString().split('T')[0])
  )
  
  const creditsSnapshot = await getDocs(creditsQuery)
  
  let totalRevenue = 0
  const dailyRevenue: { [key: string]: number } = {}
  
  creditsSnapshot.forEach((doc) => {
    const data = doc.data()
    totalRevenue += data.finalPrice || 0
    
    // Group by date
    const date = data.purchaseDate
    if (!dailyRevenue[date]) {
      dailyRevenue[date] = 0
    }
    dailyRevenue[date] += data.finalPrice || 0
  })
  
  // Calculate growth (compare with previous period)
  const previousRange = getPreviousDateRange(timeRange)
  const previousQuery = query(
    collection(db, 'student_credits'),
    where('schoolId', '==', schoolId),
    where('paymentStatus', '==', 'paid'),
    where('purchaseDate', '>=', previousRange.start.toISOString().split('T')[0]),
    where('purchaseDate', '<=', previousRange.end.toISOString().split('T')[0])
  )
  
  const previousSnapshot = await getDocs(previousQuery)
  let previousRevenue = 0
  previousSnapshot.forEach((doc) => {
    previousRevenue += doc.data().finalPrice || 0
  })
  
  const growth = previousRevenue > 0 
    ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 
    : 0
  
  // Format chart data
  const chartData = Object.entries(dailyRevenue)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-5) // Last 5 data points
    .map(([date, value]) => ({
      date: new Date(date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }),
      value
    }))
  
  return {
    total: totalRevenue,
    growth: Math.round(growth * 10) / 10,
    chart: chartData
  }
}

// Get student stats
export async function getStudentStats(schoolId: string, timeRange: string) {
  const { start, end } = getDateRange(timeRange)
  
  // Get all students
  const studentsQuery = query(
    collection(db, 'students'),
    where('schoolId', '==', schoolId)
  )
  
  const studentsSnapshot = await getDocs(studentsQuery)
  
  let totalStudents = 0
  let activeStudents = 0
  let newStudents = 0
  
  studentsSnapshot.forEach((doc) => {
    const data = doc.data()
    totalStudents++
    
    if (data.status === 'active') {
      activeStudents++
    }
    
    // Check if student was created in the time range
    const createdDate = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.joinDate || data.createdAt)
    if (createdDate >= start && createdDate <= end) {
      newStudents++
    }
  })
  
  const growth = totalStudents > 0 ? (newStudents / totalStudents) * 100 : 0
  
  return {
    total: totalStudents,
    active: activeStudents,
    new: newStudents,
    growth: Math.round(growth * 10) / 10
  }
}

// Get attendance stats
export async function getAttendanceStats(schoolId: string, timeRange: string) {
  const { start, end } = getDateRange(timeRange)
  
  // Get attendance records
  const attendanceQuery = query(
    collection(db, 'attendance'),
    where('schoolId', '==', schoolId),
    where('checkInDate', '>=', start.toISOString().split('T')[0]),
    where('checkInDate', '<=', end.toISOString().split('T')[0])
  )
  
  const attendanceSnapshot = await getDocs(attendanceQuery)
  
  let totalSessions = 0
  let totalCheckins = 0
  let presentCount = 0
  
  attendanceSnapshot.forEach((doc) => {
    const data = doc.data()
    totalSessions++
    
    if (data.status === 'present' || data.status === 'late') {
      totalCheckins++
      presentCount++
    }
  })
  
  const rate = totalSessions > 0 ? (presentCount / totalSessions) * 100 : 0
  
  // Calculate trend (compare with previous period)
  const previousRange = getPreviousDateRange(timeRange)
  const previousQuery = query(
    collection(db, 'attendance'),
    where('schoolId', '==', schoolId),
    where('checkInDate', '>=', previousRange.start.toISOString().split('T')[0]),
    where('checkInDate', '<=', previousRange.end.toISOString().split('T')[0])
  )
  
  const previousSnapshot = await getDocs(previousQuery)
  let previousPresent = 0
  let previousTotal = 0
  
  previousSnapshot.forEach((doc) => {
    const data = doc.data()
    previousTotal++
    if (data.status === 'present' || data.status === 'late') {
      previousPresent++
    }
  })
  
  const previousRate = previousTotal > 0 ? (previousPresent / previousTotal) * 100 : 0
  const trend = rate - previousRate
  
  return {
    rate: Math.round(rate * 10) / 10,
    totalSessions,
    totalCheckins,
    trend: Math.round(trend * 10) / 10
  }
}

// Get credit stats
export async function getCreditStats(schoolId: string, timeRange: string) {
  const { start, end } = getDateRange(timeRange)
  
  // Get all student credits
  const creditsQuery = query(
    collection(db, 'student_credits'),
    where('schoolId', '==', schoolId),
    where('status', 'in', ['active', 'expired', 'depleted'])
  )
  
  const creditsSnapshot = await getDocs(creditsQuery)
  
  let totalSold = 0
  let totalUsed = 0
  let totalRemaining = 0
  let expiringSoon = 0
  
  const thirtyDaysFromNow = new Date()
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
  
  creditsSnapshot.forEach((doc) => {
    const data = doc.data()
    
    // Only count credits purchased in the time range for "sold"
    const purchaseDate = new Date(data.purchaseDate)
    if (purchaseDate >= start && purchaseDate <= end) {
      totalSold += data.totalCredits || 0
    }
    
    totalUsed += data.usedCredits || 0
    totalRemaining += data.remainingCredits || 0
    
    // Check if expiring soon
    if (data.hasExpiry && data.expiryDate) {
      const expiryDate = new Date(data.expiryDate)
      if (expiryDate <= thirtyDaysFromNow && data.remainingCredits > 0) {
        expiringSoon += data.remainingCredits
      }
    }
  })
  
  return {
    sold: totalSold,
    used: totalUsed,
    remaining: totalRemaining,
    expiringSoon
  }
}

// Get top courses
export async function getTopCourses(schoolId: string, timeRange: string, topN: number = 5) {
  const { start, end } = getDateRange(timeRange)
  
  // Get all courses first
  const coursesQuery = query(
    collection(db, 'courses'),
    where('schoolId', '==', schoolId),
    where('status', '==', 'active')
  )
  
  const coursesSnapshot = await getDocs(coursesQuery)
  const courseMap: { [key: string]: any } = {}
  
  coursesSnapshot.forEach((doc) => {
    courseMap[doc.id] = {
      id: doc.id,
      name: doc.data().name,
      students: 0,
      revenue: 0
    }
  })
  
  // Get student enrollments and revenue
  const creditsQuery = query(
    collection(db, 'student_credits'),
    where('schoolId', '==', schoolId),
    where('paymentStatus', '==', 'paid'),
    where('purchaseDate', '>=', start.toISOString().split('T')[0]),
    where('purchaseDate', '<=', end.toISOString().split('T')[0])
  )
  
  const creditsSnapshot = await getDocs(creditsQuery)
  const studentsByCourse: { [key: string]: Set<string> } = {}
  
  creditsSnapshot.forEach((doc) => {
    const data = doc.data()
    const courseId = data.courseId
    
    if (courseMap[courseId]) {
      // Count unique students
      if (!studentsByCourse[courseId]) {
        studentsByCourse[courseId] = new Set()
      }
      studentsByCourse[courseId].add(data.studentId)
      
      // Add revenue
      courseMap[courseId].revenue += data.finalPrice || 0
    }
  })
  
  // Update student counts
  Object.entries(studentsByCourse).forEach(([courseId, studentSet]) => {
    if (courseMap[courseId]) {
      courseMap[courseId].students = studentSet.size
    }
  })
  
  // Sort by revenue and get top N
  const topCourses = Object.values(courseMap)
    .filter(course => course.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, topN)
  
  return topCourses
}

// Export report data
export async function exportReportData(schoolId: string, reportType: string, timeRange: string) {
  // This would typically generate CSV or Excel file
  // For now, we'll return the data structure
  
  const revenue = await getRevenueStats(schoolId, timeRange)
  const students = await getStudentStats(schoolId, timeRange)
  const attendance = await getAttendanceStats(schoolId, timeRange)
  const credits = await getCreditStats(schoolId, timeRange)
  const topCourses = await getTopCourses(schoolId, timeRange)
  
  return {
    reportType,
    timeRange,
    generatedAt: new Date().toISOString(),
    data: {
      revenue,
      students,
      attendance,
      credits,
      topCourses
    }
  }
}