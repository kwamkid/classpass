// src/services/attendance.ts
import { supabase } from './supabase'
import { dbAttendanceToAttendance } from '../types/database.types'
import type { DbAttendance } from '../types/database.types'

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

// Check in a student (uses DB function for atomic transaction)
export const checkInStudent = async (
  schoolId: string,
  userId: string,
  userName: string,
  userRole: string,
  data: CheckInData
): Promise<Attendance> => {
  try {
    const today = new Date().toISOString().split('T')[0]

    const { data: attendanceId, error } = await supabase.rpc('check_in_student', {
      p_school_id: schoolId,
      p_student_id: data.studentId,
      p_course_id: data.courseId,
      p_credit_id: data.creditId,
      p_checked_by: userId,
      p_checked_by_name: userName,
      p_checked_by_role: userRole,
      p_check_in_date: today,
      p_check_in_method: data.checkInMethod || 'manual',
      p_is_late: data.isLate || false,
      p_late_minutes: data.lateMinutes || 0,
      p_teacher_notes: data.teacherNotes || null,
    })

    if (error) {
      console.error('Error checking in student:', error)
      throw new Error(error.message || 'เกิดข้อผิดพลาดในการเช็คชื่อ')
    }

    // Fetch the created attendance record
    const { data: record, error: fetchError } = await supabase
      .from('attendance')
      .select('*')
      .eq('id', attendanceId)
      .single()

    if (fetchError || !record) {
      throw new Error('เช็คชื่อสำเร็จ แต่ไม่สามารถโหลดข้อมูลได้')
    }

    return dbAttendanceToAttendance(record as DbAttendance) as Attendance
  } catch (error: any) {
    console.error('Error checking in student:', error)
    throw new Error(error.message || 'เกิดข้อผิดพลาดในการเช็คชื่อ')
  }
}

// Check in a student with specific date (for backdate check-in)
export const checkInStudentWithDate = async (
  schoolId: string,
  userId: string,
  userName: string,
  userRole: string,
  data: CheckInData,
  checkInDate: string
): Promise<Attendance> => {
  try {
    const { data: attendanceId, error } = await supabase.rpc('check_in_student', {
      p_school_id: schoolId,
      p_student_id: data.studentId,
      p_course_id: data.courseId,
      p_credit_id: data.creditId,
      p_checked_by: userId,
      p_checked_by_name: userName,
      p_checked_by_role: userRole,
      p_check_in_date: checkInDate,
      p_check_in_method: data.checkInMethod || 'manual',
      p_is_late: data.isLate || false,
      p_late_minutes: data.lateMinutes || 0,
      p_teacher_notes: data.teacherNotes || null,
    })

    if (error) {
      console.error('Error checking in student with date:', error)
      throw new Error(error.message || 'เกิดข้อผิดพลาดในการเช็คชื่อ')
    }

    // Fetch the created attendance record
    const { data: record, error: fetchError } = await supabase
      .from('attendance')
      .select('*')
      .eq('id', attendanceId)
      .single()

    if (fetchError || !record) {
      throw new Error('เช็คชื่อสำเร็จ แต่ไม่สามารถโหลดข้อมูลได้')
    }

    return dbAttendanceToAttendance(record as DbAttendance) as Attendance
  } catch (error: any) {
    console.error('Error checking in student with date:', error)
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

    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('school_id', schoolId)
      .eq('course_id', courseId)
      .eq('check_in_date', today)
      .order('check_in_time', { ascending: false })

    if (error) {
      console.error('Error getting today attendance:', error)
      return []
    }

    return (data || []).map(row => dbAttendanceToAttendance(row as DbAttendance) as Attendance)
  } catch (error) {
    console.error('Error getting today attendance:', error)
    return []
  }
}

// Get attendance for a specific date and course
export const getAttendanceByDateAndCourse = async (
  schoolId: string,
  courseId: string,
  date: string
): Promise<Attendance[]> => {
  try {
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('school_id', schoolId)
      .eq('course_id', courseId)
      .eq('check_in_date', date)
      .order('check_in_time', { ascending: false })

    if (error) {
      console.error('Error getting attendance by date and course:', error)
      return []
    }

    return (data || []).map(row => dbAttendanceToAttendance(row as DbAttendance) as Attendance)
  } catch (error) {
    console.error('Error getting attendance by date and course:', error)
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

    let query = supabase
      .from('attendance')
      .select('*')
      .eq('school_id', schoolId)

    if (filters?.studentId) {
      query = query.eq('student_id', filters.studentId)
    }

    if (filters?.courseId) {
      query = query.eq('course_id', filters.courseId)
    }

    if (filters?.startDate) {
      query = query.gte('check_in_date', filters.startDate)
    }

    if (filters?.endDate) {
      query = query.lte('check_in_date', filters.endDate)
    }

    query = query.order('check_in_date', { ascending: false })

    const { data, error } = await query

    if (error) {
      console.error('Error getting attendance history:', error)
      return []
    }

    const attendances = (data || []).map(row => dbAttendanceToAttendance(row as DbAttendance) as Attendance)
    console.log(`Returning ${attendances.length} attendance records`)
    return attendances
  } catch (error) {
    console.error('Error getting attendance history:', error)
    return []
  }
}

// Cancel attendance (undo check-in) - uses DB function for atomic transaction
export const cancelAttendance = async (
  attendanceId: string,
  reason: string
): Promise<void> => {
  try {
    const { error } = await supabase.rpc('cancel_attendance', {
      p_attendance_id: attendanceId,
    })

    if (error) {
      console.error('Error cancelling attendance:', error)
      throw new Error(error.message || 'เกิดข้อผิดพลาดในการยกเลิกการเช็คชื่อ')
    }
  } catch (error: any) {
    console.error('Error cancelling attendance:', error)
    throw new Error(error.message || 'เกิดข้อผิดพลาดในการยกเลิกการเช็คชื่อ')
  }
}

// ====================================
// BATCH QUERY FUNCTIONS (for performance)
// ====================================

export interface StudentAttendanceSummary {
  studentId: string
  totalAttendances: number
  lastAttendance: string | null
}

/**
 * Get attendance summary for multiple students in a single query
 * Much faster than calling getAttendanceHistory for each student
 */
export const getStudentsAttendanceSummaryBatch = async (
  studentIds: string[],
  schoolId: string
): Promise<Map<string, StudentAttendanceSummary>> => {
  try {
    if (studentIds.length === 0) return new Map()

    // Query all attendance for these students
    const { data: rows, error } = await supabase
      .from('attendance')
      .select('student_id, check_in_date')
      .eq('school_id', schoolId)
      .in('student_id', studentIds)
      .order('check_in_date', { ascending: false })

    if (error) {
      console.error('Error getting batch attendance:', error)
      return new Map()
    }

    // Initialize all students
    const summaryMap = new Map<string, StudentAttendanceSummary>()
    for (const studentId of studentIds) {
      summaryMap.set(studentId, {
        studentId,
        totalAttendances: 0,
        lastAttendance: null
      })
    }

    // Process attendance records
    for (const row of rows || []) {
      const studentId = row.student_id
      const summary = summaryMap.get(studentId)
      if (!summary) continue

      summary.totalAttendances += 1
      // First record is the latest (sorted desc)
      if (!summary.lastAttendance) {
        summary.lastAttendance = row.check_in_date
      }
    }

    return summaryMap
  } catch (error) {
    console.error('Error getting batch attendance summary:', error)
    return new Map()
  }
}
