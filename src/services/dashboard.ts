// src/services/dashboard.ts
import { supabase } from './supabase'

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
    const startOfThisMonth = getStartOfMonth(now).toISOString()
    const endOfThisMonth = getEndOfMonth(now).toISOString()
    const today = now.toISOString().split('T')[0]

    // Run queries in parallel
    const [
      studentsResult,
      newStudentsResult,
      coursesResult,
      packagesResult,
      creditsResult,
      attendanceResult,
    ] = await Promise.all([
      // Total active students
      supabase.from('students').select('id', { count: 'exact', head: true })
        .eq('school_id', schoolId).eq('is_active', true).eq('is_deleted', false),
      // New students this month
      supabase.from('students').select('id', { count: 'exact', head: true })
        .eq('school_id', schoolId).gte('created_at', startOfThisMonth).lte('created_at', endOfThisMonth),
      // Total active courses
      supabase.from('courses').select('id, schedule', { count: 'exact' })
        .eq('school_id', schoolId).eq('is_active', true).eq('is_deleted', false),
      // Total active packages
      supabase.from('credit_packages').select('id', { count: 'exact', head: true })
        .eq('school_id', schoolId).eq('is_active', true),
      // Monthly revenue from student_credits
      supabase.from('student_credits').select('final_price')
        .eq('school_id', schoolId).eq('payment_status', 'paid')
        .gte('purchase_date', now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-01')
        .lte('purchase_date', today),
      // Today's attendance
      supabase.from('attendance').select('id', { count: 'exact', head: true })
        .eq('school_id', schoolId).eq('check_in_date', today),
    ])

    const totalStudents = studentsResult.count || 0
    const newStudentsThisMonth = newStudentsResult.count || 0
    const totalCourses = coursesResult.count || 0
    const totalPackages = packagesResult.count || 0

    // Calculate monthly revenue
    let monthlyRevenue = 0
    if (creditsResult.data) {
      monthlyRevenue = creditsResult.data.reduce((sum, c) => sum + (Number(c.final_price) || 0), 0)
    }

    // Calculate revenue growth (compare with last month)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
    const { data: lastMonthCredits } = await supabase
      .from('student_credits').select('final_price')
      .eq('school_id', schoolId).eq('payment_status', 'paid')
      .gte('purchase_date', lastMonthStart.toISOString().split('T')[0])
      .lte('purchase_date', lastMonthEnd.toISOString().split('T')[0])

    let lastMonthRevenue = 0
    if (lastMonthCredits) {
      lastMonthRevenue = lastMonthCredits.reduce((sum, c) => sum + (Number(c.final_price) || 0), 0)
    }

    const revenueGrowth = lastMonthRevenue > 0
      ? Math.round(((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
      : 0

    // Calculate attendance rate
    const attendanceRate = totalStudents > 0
      ? Math.round(((attendanceResult.count || 0) / totalStudents) * 100)
      : 0

    // Count today's classes
    const todayDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
    let todayClasses = 0
    if (coursesResult.data) {
      coursesResult.data.forEach((course: any) => {
        if (course.schedule?.sessions) {
          const hasTodaySession = course.schedule.sessions.some(
            (session: any) => session.day === todayDay
          )
          if (hasTodaySession) todayClasses++
        }
      })
    }

    return {
      totalStudents,
      newStudentsThisMonth,
      monthlyRevenue,
      revenueGrowth,
      attendanceRate,
      todayClasses,
      totalCourses,
      totalPackages,
    }
  } catch (error) {
    console.error('Error getting dashboard stats:', error)
    return {
      totalStudents: 0, newStudentsThisMonth: 0, monthlyRevenue: 0,
      revenueGrowth: 0, attendanceRate: 0, todayClasses: 0,
      totalCourses: 0, totalPackages: 0,
    }
  }
}

export const getRecentActivities = async (
  schoolId: string,
  limitCount: number = 10
): Promise<Activity[]> => {
  try {
    const activities: Activity[] = []

    // Run queries in parallel
    const [studentsResult, creditsResult, attendanceResult] = await Promise.all([
      supabase.from('students').select('id, first_name, last_name, created_at')
        .eq('school_id', schoolId).order('created_at', { ascending: false }).limit(3),
      supabase.from('student_credits').select('id, student_name, package_name, created_at')
        .eq('school_id', schoolId).order('created_at', { ascending: false }).limit(3),
      supabase.from('attendance').select('id, student_name, course_name, created_at')
        .eq('school_id', schoolId).order('created_at', { ascending: false }).limit(3),
    ])

    if (studentsResult.data) {
      studentsResult.data.forEach(s => {
        activities.push({
          id: s.id,
          title: 'นักเรียนใหม่',
          description: `เพิ่ม ${s.first_name} ${s.last_name}`,
          type: 'student',
          timestamp: new Date(s.created_at),
        })
      })
    }

    if (creditsResult.data) {
      creditsResult.data.forEach(c => {
        activities.push({
          id: c.id,
          title: 'ซื้อแพ็คเกจ',
          description: `${c.student_name} ซื้อ ${c.package_name}`,
          type: 'payment',
          timestamp: new Date(c.created_at),
        })
      })
    }

    if (attendanceResult.data) {
      attendanceResult.data.forEach(a => {
        activities.push({
          id: a.id,
          title: 'เช็คชื่อ',
          description: `${a.student_name} เข้าเรียน ${a.course_name}`,
          type: 'attendance',
          timestamp: new Date(a.created_at),
        })
      })
    }

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

    const { data: courses } = await supabase
      .from('courses')
      .select('id, name, schedule, primary_teacher_id')
      .eq('school_id', schoolId)
      .eq('is_active', true)
      .eq('is_deleted', false)

    if (!courses) return []

    // Collect teacher IDs
    const teacherIds = courses
      .map(c => c.primary_teacher_id)
      .filter(Boolean) as string[]

    // Fetch teachers in one query
    let teacherMap: Record<string, string> = {}
    if (teacherIds.length > 0) {
      const { data: teachers } = await supabase
        .from('users')
        .select('id, display_name')
        .in('id', teacherIds)

      if (teachers) {
        teachers.forEach(t => { teacherMap[t.id] = t.display_name })
      }
    }

    for (const course of courses) {
      if (course.schedule?.sessions) {
        const todaySessions = course.schedule.sessions.filter(
          (session: any) => session.day === today
        )

        for (const session of todaySessions) {
          classes.push({
            id: `${course.id}-${session.day}-${session.startTime}`,
            courseId: course.id,
            courseName: course.name,
            startTime: session.startTime,
            endTime: session.endTime,
            room: session.room || 'ไม่ระบุ',
            teacherName: course.primary_teacher_id ? (teacherMap[course.primary_teacher_id] || 'ไม่ระบุ') : 'ไม่ระบุ',
          })
        }
      }
    }

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

function getStartOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function getEndOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
}
