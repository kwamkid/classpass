// src/services/reports.ts
import { supabase } from './supabase'

// Custom date range type
export interface CustomDateRange {
  start: string // YYYY-MM-DD
  end: string   // YYYY-MM-DD
}

// Helper function to get date range
const getDateRange = (timeRange: string, customRange?: CustomDateRange) => {
  if (timeRange === 'custom' && customRange) {
    return {
      start: new Date(customRange.start + 'T00:00:00'),
      end: new Date(customRange.end + 'T23:59:59.999')
    }
  }

  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

  switch (timeRange) {
    case 'today':
      return { start: startOfDay, end: endOfDay }
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
    default:
      return { start: startOfDay, end: endOfDay }
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
    default:
      return getDateRange('today')
  }
}

// Get revenue stats
export async function getRevenueStats(schoolId: string, timeRange: string, customRange?: CustomDateRange) {
  const { start, end } = getDateRange(timeRange, customRange)
  const startDate = start.toISOString().split('T')[0]
  const endDate = end.toISOString().split('T')[0]

  // Get all credit purchases in the time range
  const { data: creditsData } = await supabase
    .from('student_credits')
    .select('final_price, purchase_date')
    .eq('school_id', schoolId)
    .eq('payment_status', 'paid')
    .gte('purchase_date', startDate)
    .lte('purchase_date', endDate)

  let totalRevenue = 0
  const dailyRevenue: { [key: string]: number } = {}

  if (creditsData) {
    creditsData.forEach((row) => {
      totalRevenue += Number(row.final_price) || 0
      const date = row.purchase_date
      if (!dailyRevenue[date]) {
        dailyRevenue[date] = 0
      }
      dailyRevenue[date] += Number(row.final_price) || 0
    })
  }

  // Calculate growth (compare with previous period)
  const previousRange = getPreviousDateRange(timeRange)
  const { data: previousData } = await supabase
    .from('student_credits')
    .select('final_price')
    .eq('school_id', schoolId)
    .eq('payment_status', 'paid')
    .gte('purchase_date', previousRange.start.toISOString().split('T')[0])
    .lte('purchase_date', previousRange.end.toISOString().split('T')[0])

  let previousRevenue = 0
  if (previousData) {
    previousData.forEach((row) => {
      previousRevenue += Number(row.final_price) || 0
    })
  }

  const growth = previousRevenue > 0
    ? ((totalRevenue - previousRevenue) / previousRevenue) * 100
    : 0

  // Format chart data
  const chartData = Object.entries(dailyRevenue)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-5)
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
export async function getStudentStats(schoolId: string, timeRange: string, customRange?: CustomDateRange) {
  const { start, end } = getDateRange(timeRange, customRange)
  const startDate = start.toISOString().split('T')[0]
  const endDate = end.toISOString().split('T')[0]

  // Get all students
  const { data: studentsData } = await supabase
    .from('students')
    .select('id, status, created_at')
    .eq('school_id', schoolId)
    .eq('is_deleted', false)

  let totalStudents = 0
  let activeStudents = 0
  let newStudents = 0

  if (studentsData) {
    studentsData.forEach((row) => {
      totalStudents++
      if (row.status === 'active') activeStudents++

      const createdDate = new Date(row.created_at)
      if (createdDate >= start && createdDate <= end) {
        newStudents++
      }
    })
  }

  const growth = totalStudents > 0 ? (newStudents / totalStudents) * 100 : 0

  return {
    total: totalStudents,
    active: activeStudents,
    new: newStudents,
    growth: Math.round(growth * 10) / 10
  }
}

// Get attendance stats
export async function getAttendanceStats(schoolId: string, timeRange: string, customRange?: CustomDateRange) {
  const { start, end } = getDateRange(timeRange, customRange)
  const startDate = start.toISOString().split('T')[0]
  const endDate = end.toISOString().split('T')[0]

  // Get attendance records
  const { data: attendanceData } = await supabase
    .from('attendance')
    .select('id, status, check_in_date')
    .eq('school_id', schoolId)
    .gte('check_in_date', startDate)
    .lte('check_in_date', endDate)

  let totalSessions = 0
  let presentCount = 0

  if (attendanceData) {
    attendanceData.forEach((row) => {
      totalSessions++
      if (row.status === 'present' || row.status === 'late') {
        presentCount++
      }
    })
  }

  const rate = totalSessions > 0 ? (presentCount / totalSessions) * 100 : 0

  // Calculate trend (compare with previous period)
  const previousRange = getPreviousDateRange(timeRange)
  const { data: previousData } = await supabase
    .from('attendance')
    .select('id, status')
    .eq('school_id', schoolId)
    .gte('check_in_date', previousRange.start.toISOString().split('T')[0])
    .lte('check_in_date', previousRange.end.toISOString().split('T')[0])

  let previousPresent = 0
  let previousTotal = 0

  if (previousData) {
    previousData.forEach((row) => {
      previousTotal++
      if (row.status === 'present' || row.status === 'late') {
        previousPresent++
      }
    })
  }

  const previousRate = previousTotal > 0 ? (previousPresent / previousTotal) * 100 : 0
  const trend = rate - previousRate

  return {
    rate: Math.round(rate * 10) / 10,
    totalSessions,
    totalCheckins: presentCount,
    trend: Math.round(trend * 10) / 10
  }
}

// Get credit stats
export async function getCreditStats(schoolId: string, timeRange: string, customRange?: CustomDateRange) {
  const { start, end } = getDateRange(timeRange, customRange)

  // Get all student credits
  const { data: creditsData } = await supabase
    .from('student_credits')
    .select('total_credits, used_credits, remaining_credits, has_expiry, expiry_date, purchase_date, status')
    .eq('school_id', schoolId)
    .in('status', ['active', 'expired', 'depleted'])

  let totalSold = 0
  let totalUsed = 0
  let totalRemaining = 0
  let expiringSoon = 0

  const thirtyDaysFromNow = new Date()
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

  if (creditsData) {
    creditsData.forEach((row) => {
      const purchaseDate = new Date(row.purchase_date)
      if (purchaseDate >= start && purchaseDate <= end) {
        totalSold += row.total_credits || 0
      }

      totalUsed += row.used_credits || 0
      totalRemaining += row.remaining_credits || 0

      if (row.has_expiry && row.expiry_date) {
        const expiryDate = new Date(row.expiry_date)
        if (expiryDate <= thirtyDaysFromNow && row.remaining_credits > 0) {
          expiringSoon += row.remaining_credits
        }
      }
    })
  }

  return {
    sold: totalSold,
    used: totalUsed,
    remaining: totalRemaining,
    expiringSoon
  }
}

// Get top courses
export async function getTopCourses(schoolId: string, timeRange: string, topN: number = 5, customRange?: CustomDateRange) {
  const { start, end } = getDateRange(timeRange, customRange)
  const startDate = start.toISOString().split('T')[0]
  const endDate = end.toISOString().split('T')[0]

  // Get all active courses
  const { data: coursesData } = await supabase
    .from('courses')
    .select('id, name')
    .eq('school_id', schoolId)
    .eq('status', 'active')
    .eq('is_deleted', false)

  const courseMap: { [key: string]: any } = {}
  if (coursesData) {
    coursesData.forEach((c) => {
      courseMap[c.id] = { id: c.id, name: c.name, students: 0, revenue: 0 }
    })
  }

  // Get student credits for revenue
  const { data: creditsData } = await supabase
    .from('student_credits')
    .select('course_id, student_id, final_price')
    .eq('school_id', schoolId)
    .eq('payment_status', 'paid')
    .gte('purchase_date', startDate)
    .lte('purchase_date', endDate)

  const studentsByCourse: { [key: string]: Set<string> } = {}

  if (creditsData) {
    creditsData.forEach((row) => {
      const courseId = row.course_id
      if (courseId && courseMap[courseId]) {
        if (!studentsByCourse[courseId]) {
          studentsByCourse[courseId] = new Set()
        }
        studentsByCourse[courseId].add(row.student_id)
        courseMap[courseId].revenue += Number(row.final_price) || 0
      }
    })
  }

  Object.entries(studentsByCourse).forEach(([courseId, studentSet]) => {
    if (courseMap[courseId]) {
      courseMap[courseId].students = studentSet.size
    }
  })

  return Object.values(courseMap)
    .filter(course => course.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, topN)
}

// Export report data
export async function exportReportData(schoolId: string, reportType: string, timeRange: string, customRange?: CustomDateRange) {
  const revenue = await getRevenueStats(schoolId, timeRange, customRange)
  const students = await getStudentStats(schoolId, timeRange, customRange)
  const attendance = await getAttendanceStats(schoolId, timeRange, customRange)
  const credits = await getCreditStats(schoolId, timeRange, customRange)
  const topCourses = await getTopCourses(schoolId, timeRange, 5, customRange)

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
