// src/pages/attendance/AttendancePage.tsx
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  Search,
  CheckCircle,
  XCircle,
  Calendar,
  Users,
  AlertCircle,
  Clock,
  CreditCard,
  ChevronRight,
  BookOpen,
  User
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import * as studentService from '../../services/student'
import * as courseService from '../../services/course'
import * as studentCreditService from '../../services/studentCredit'
import * as attendanceService from '../../services/attendance'
import toast from 'react-hot-toast'
import Layout from '../../components/layout/Layout'

const AttendancePage = () => {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [checkingIn, setCheckingIn] = useState<string | null>(null)
  
  // Data
  const [students, setStudents] = useState<studentService.Student[]>([])
  const [courses, setCourses] = useState<courseService.Course[]>([])
  const [todayAttendance, setTodayAttendance] = useState<attendanceService.Attendance[]>([])
  
  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCourse, setSelectedCourse] = useState<courseService.Course | null>(null)
  const [filteredStudents, setFilteredStudents] = useState<studentService.Student[]>([])
  
  // Stats
  const [stats, setStats] = useState({
    totalStudents: 0,
    checkedIn: 0,
    absent: 0
  })

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    filterStudents()
  }, [searchTerm, students])

  useEffect(() => {
    if (selectedCourse) {
      loadTodayAttendance()
    }
  }, [selectedCourse])

  const loadInitialData = async () => {
    if (!user?.schoolId) return
    
    try {
      setLoading(true)
      
      // Load courses
      const coursesData = await courseService.getCourses(user.schoolId, 'active')
      setCourses(coursesData)
      
      // Auto-select if only one course
      if (coursesData.length === 1) {
        setSelectedCourse(coursesData[0])
      }
      
      // Load students
      const studentsData = await studentService.getStudents(user.schoolId, 'active')
      setStudents(studentsData)
      setFilteredStudents(studentsData)
      
      setStats({
        totalStudents: studentsData.length,
        checkedIn: 0,
        absent: studentsData.length
      })
    } catch (error) {
      toast.error('ไม่สามารถโหลดข้อมูลได้')
    } finally {
      setLoading(false)
    }
  }

  const loadTodayAttendance = async () => {
    if (!user?.schoolId || !selectedCourse) return
    
    try {
      const attendance = await attendanceService.getTodayAttendance(
        user.schoolId,
        selectedCourse.id
      )
      setTodayAttendance(attendance)
      
      // Update stats
      const checkedInStudentIds = new Set(attendance.map(a => a.studentId))
      setStats({
        totalStudents: students.length,
        checkedIn: checkedInStudentIds.size,
        absent: students.length - checkedInStudentIds.size
      })
    } catch (error) {
      console.error('Error loading attendance:', error)
    }
  }

  const filterStudents = () => {
    if (!searchTerm.trim()) {
      setFilteredStudents(students)
      return
    }
    
    const search = searchTerm.toLowerCase()
    const filtered = students.filter(student => {
      // Search by student name, nickname
      if (
        student.firstName.toLowerCase().includes(search) ||
        student.lastName.toLowerCase().includes(search) ||
        student.nickname?.toLowerCase().includes(search) ||
        student.studentCode.toLowerCase().includes(search)
      ) {
        return true
      }
      
      // Search by parent name or phone
      if (student.parents && student.parents.length > 0) {
        return student.parents.some(parent => 
          parent.firstName.toLowerCase().includes(search) ||
          parent.lastName.toLowerCase().includes(search) ||
          parent.phone.includes(search)
        )
      }
      
      // Search by student phone
      if (student.phone?.includes(search)) {
        return true
      }
      
      return false
    })
    
    setFilteredStudents(filtered)
  }

  const handleCheckIn = async (student: studentService.Student) => {
    if (!user || !selectedCourse) {
      toast.error('กรุณาเลือกวิชาก่อน')
      return
    }
    
    // Check if already checked in
    const alreadyCheckedIn = todayAttendance.some(a => a.studentId === student.id)
    if (alreadyCheckedIn) {
      toast.error('นักเรียนเช็คชื่อแล้ววันนี้')
      return
    }
    
    try {
      setCheckingIn(student.id)
      
      // Get student's credits for this course
      const credits = await studentCreditService.getStudentCredits(student.id, selectedCourse.id)
      
      // Find active credit with remaining balance
      const activeCredit = credits.find(c => 
        c.status === 'active' && 
        c.remainingCredits > 0 &&
        c.courseId === selectedCourse.id
      )
      
      if (!activeCredit) {
        toast.error('ไม่มีเครดิตสำหรับวิชานี้')
        return
      }
      
      // Check in
      const attendance = await attendanceService.checkInStudent(
        user.schoolId,
        user.id,
        user.displayName,
        user.role,
        {
          studentId: student.id,
          courseId: selectedCourse.id,
          creditId: activeCredit.id,
          checkInMethod: 'manual'
        }
      )
      
      toast.success(`เช็คชื่อ ${student.firstName} สำเร็จ!`)
      
      // Reload attendance
      await loadTodayAttendance()
    } catch (error: any) {
      toast.error(error.message || 'เกิดข้อผิดพลาดในการเช็คชื่อ')
    } finally {
      setCheckingIn(null)
    }
  }

  const isCheckedIn = (studentId: string) => {
    return todayAttendance.some(a => a.studentId === studentId)
  }

  const getStudentCredit = (student: studentService.Student) => {
    // This would need to be loaded separately for each student
    // For now, we'll show a placeholder
    return '?'
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="spinner spinner-primary w-8 h-8"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">เช็คชื่อนักเรียน</h1>
          <p className="mt-1 text-sm text-gray-500">
            วันที่ {new Date().toLocaleDateString('th-TH', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>

        {/* Course Selection */}
        {courses.length > 1 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <BookOpen className="w-5 h-5 mr-2 text-gray-500" />
              เลือกวิชา
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {courses.map(course => (
                <button
                  key={course.id}
                  onClick={() => setSelectedCourse(course)}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    selectedCourse?.id === course.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <h3 className="font-medium text-gray-900">{course.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{course.code}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedCourse ? (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">นักเรียนทั้งหมด</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {stats.totalStudents}
                    </p>
                  </div>
                  <Users className="w-8 h-8 text-gray-400" />
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">เช็คชื่อแล้ว</p>
                    <p className="text-2xl font-semibold text-green-600">
                      {stats.checkedIn}
                    </p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">ยังไม่มา</p>
                    <p className="text-2xl font-semibold text-red-600">
                      {stats.absent}
                    </p>
                  </div>
                  <XCircle className="w-8 h-8 text-red-400" />
                </div>
              </div>
            </div>

            {/* Search */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="ค้นหาด้วยชื่อนักเรียน, ชื่อเล่น, ชื่อผู้ปกครอง, เบอร์โทร..."
                  className="input-base pl-10 text-lg"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            {/* Student List */}
            <div className="space-y-4">
              {filteredStudents.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                  <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">ไม่พบนักเรียนที่ค้นหา</p>
                </div>
              ) : (
                filteredStudents.map(student => {
                  const checkedIn = isCheckedIn(student.id)
                  const attendance = todayAttendance.find(a => a.studentId === student.id)
                  
                  return (
                    <div
                      key={student.id}
                      className={`bg-white rounded-lg shadow-sm p-6 ${
                        checkedIn ? 'opacity-75' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          {/* Student Avatar */}
                          <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                            checkedIn ? 'bg-green-100' : 'bg-primary-100'
                          }`}>
                            {checkedIn ? (
                              <CheckCircle className="w-8 h-8 text-green-600" />
                            ) : (
                              <span className="text-2xl font-semibold text-primary-600">
                                {student.firstName[0]}
                              </span>
                            )}
                          </div>
                          
                          {/* Student Info */}
                          <div>
                            <h3 className="text-lg font-medium text-gray-900">
                              {student.firstName} {student.lastName}
                              {student.nickname && (
                                <span className="text-gray-500 ml-2">({student.nickname})</span>
                              )}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {student.studentCode} • {student.currentGrade}
                            </p>
                            {student.parents && student.parents[0] && (
                              <p className="text-sm text-gray-500">
                                ผู้ปกครอง: {student.parents[0].firstName} - {student.parents[0].phone}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        {/* Action */}
                        <div className="flex items-center space-x-4">
                          {/* Credit Info */}
                          <div className="text-right">
                            <p className="text-sm text-gray-500">เครดิตคงเหลือ</p>
                            <p className="text-lg font-semibold text-primary-600 flex items-center">
                              <CreditCard className="w-4 h-4 mr-1" />
                              {getStudentCredit(student)} ครั้ง
                            </p>
                          </div>
                          
                          {/* Check-in Button/Status */}
                          {checkedIn ? (
                            <div className="text-right">
                              <p className="text-sm text-gray-500">เช็คชื่อแล้ว</p>
                              <p className="text-lg font-medium text-green-600 flex items-center">
                                <Clock className="w-4 h-4 mr-1" />
                                {attendance && formatTime(attendance.checkInTime)}
                              </p>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleCheckIn(student)}
                              disabled={checkingIn === student.id}
                              className="btn-primary inline-flex items-center min-w-[120px]"
                            >
                              {checkingIn === student.id ? (
                                <>
                                  <div className="spinner mr-2"></div>
                                  กำลังเช็คชื่อ...
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="w-5 h-5 mr-2" />
                                  เช็คชื่อ
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Today's Attendance Summary */}
            {todayAttendance.length > 0 && (
              <div className="mt-8">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  รายชื่อนักเรียนที่เช็คชื่อแล้ว
                </h2>
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ลำดับ
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ชื่อ-นามสกุล
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          เวลาเช็คชื่อ
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ผู้เช็คชื่อ
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {todayAttendance.map((attendance, index) => (
                        <tr key={attendance.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {index + 1}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {attendance.studentName}
                              </p>
                              <p className="text-xs text-gray-500">
                                {attendance.studentCode}
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatTime(attendance.checkInTime)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {attendance.checkedByName}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">กรุณาเลือกวิชา</h3>
            <p className="text-gray-500">เลือกวิชาที่ต้องการเช็คชื่อนักเรียน</p>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default AttendancePage