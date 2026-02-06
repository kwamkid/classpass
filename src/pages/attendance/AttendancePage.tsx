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
  User,
  CalendarClock,
  ChevronLeft
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
  const [loadingStudents, setLoadingStudents] = useState(false) // Loading state for student credits
  const [checkingIn, setCheckingIn] = useState<string | null>(null)

  // Data
  const [students, setStudents] = useState<studentService.Student[]>([])
  const [courses, setCourses] = useState<courseService.Course[]>([])
  const [selectedDateAttendance, setSelectedDateAttendance] = useState<attendanceService.Attendance[]>([])
  const [studentCredits, setStudentCredits] = useState<Map<string, studentCreditService.StudentCredit[]>>(new Map())

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('')
  const [courseSearchTerm, setCourseSearchTerm] = useState('')
  const [selectedCourse, setSelectedCourse] = useState<courseService.Course | null>(null)
  const [filteredStudents, setFilteredStudents] = useState<studentService.Student[]>([])
  
  // Date selection
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [showBackdateModal, setShowBackdateModal] = useState(false)
  const [backdateReason, setBackdateReason] = useState('')
  const [pendingCheckIn, setPendingCheckIn] = useState<studentService.Student | null>(null)
  
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
  }, [searchTerm, students, studentCredits, selectedCourse])

  useEffect(() => {
    if (selectedCourse && students.length > 0) {
      loadSelectedDateAttendance()
      loadStudentCredits()
    }
  }, [selectedCourse, students, selectedDate])

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

  const loadSelectedDateAttendance = async () => {
    if (!user?.schoolId || !selectedCourse) return

    try {
      // Get attendance for selected date using service
      const attendances = await attendanceService.getAttendanceByDateAndCourse(
        user.schoolId,
        selectedCourse.id,
        selectedDate
      )

      setSelectedDateAttendance(attendances)
      
      // Update stats to reflect only students with credits
      const checkedInStudentIds = new Set(attendances.map(a => a.studentId))
      const studentsWithCredits = students.filter(student => {
        const credits = studentCredits.get(student.id) || []
        return credits.length > 0
      })
      
      setStats({
        totalStudents: studentsWithCredits.length,
        checkedIn: checkedInStudentIds.size,
        absent: studentsWithCredits.length - checkedInStudentIds.size
      })
    } catch (error) {
      console.error('Error loading attendance:', error)
    }
  }

  const loadStudentCredits = async () => {
    if (!selectedCourse || !user?.schoolId || students.length === 0) return

    try {
      setLoadingStudents(true) // Show loading when switching courses
      // Use batch query (1 query instead of N)
      const studentIds = students.map(s => s.id)
      const creditsMap = await studentCreditService.getStudentsCreditsForCourseBatch(
        studentIds,
        selectedCourse.id,
        user.schoolId
      )

      // Filter out students with no credits
      const filteredMap = new Map<string, studentCreditService.StudentCredit[]>()
      for (const [studentId, credits] of creditsMap) {
        if (credits.length > 0) {
          filteredMap.set(studentId, credits)
        }
      }

      console.log(`Loaded credits for ${filteredMap.size} students (batch)`)
      setStudentCredits(filteredMap)
    } catch (error) {
      console.error('Error loading student credits:', error)
      toast.error('ไม่สามารถโหลดข้อมูลเครดิตได้')
    } finally {
      setLoadingStudents(false)
    }
  }

  const filterStudents = () => {
    let filtered = students
    
    // Filter by search term
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(student => {
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
    }
    
    // Filter out students without credits for this course
    if (selectedCourse) {
      filtered = filtered.filter(student => {
        const credits = studentCredits.get(student.id) || []
        return credits.length > 0
      })
    }
    
    setFilteredStudents(filtered)
  }

  const handleCheckIn = async (student: studentService.Student) => {
    if (!user || !selectedCourse) {
      toast.error('กรุณาเลือกวิชาก่อน')
      return
    }
    
    // ถ้าเป็นการเช็คชื่อย้อนหลัง ให้แสดง modal
    const today = new Date().toISOString().split('T')[0]
    if (selectedDate !== today) {
      setPendingCheckIn(student)
      setShowBackdateModal(true)
      return
    }
    
    // ถ้าเป็นวันนี้ เช็คชื่อได้เลย
    await performCheckIn(student)
  }

  const performCheckIn = async (student: studentService.Student, isBackdate: boolean = false) => {
    if (!user || !selectedCourse) return
    
    try {
      setCheckingIn(student.id)
      
      // Get student's credits for this course
      const credits = studentCredits.get(student.id) || []
      
      // Find active credit with remaining balance
      const activeCredit = credits.find(c => c.remainingCredits > 0)
      
      if (!activeCredit) {
        toast.error('ไม่มีเครดิตสำหรับวิชานี้')
        return
      }
      
      // Check in with selected date
      const checkInData: attendanceService.CheckInData = {
        studentId: student.id,
        courseId: selectedCourse.id,
        creditId: activeCredit.id,
        checkInMethod: 'manual',
        teacherNotes: isBackdate ? `เช็คชื่อย้อนหลัง: ${backdateReason}` : undefined
      }
      
      // For backdate, we need to modify the attendance service
      const attendance = await attendanceService.checkInStudentWithDate(
        user.schoolId,
        user.id,
        user.displayName || `${user.firstName} ${user.lastName}`,
        user.role,
        checkInData,
        selectedDate
      )
      
      toast.success(`เช็คชื่อ ${student.firstName} สำเร็จ!`)
      
      // Reload attendance and credits
      await loadSelectedDateAttendance()
      await loadStudentCredits()
    } catch (error: any) {
      toast.error(error.message || 'เกิดข้อผิดพลาดในการเช็คชื่อ')
    } finally {
      setCheckingIn(null)
      setShowBackdateModal(false)
      setBackdateReason('')
      setPendingCheckIn(null)
    }
  }

  const isCheckedIn = (studentId: string) => {
    return selectedDateAttendance.some(a => a.studentId === studentId)
  }

  const getStudentCredit = (studentId: string): number => {
    const credits = studentCredits.get(studentId) || []
    return credits.reduce((sum, c) => sum + c.remainingCredits, 0)
  }

  const handleCancelAttendance = async (attendance: attendanceService.Attendance) => {
    const confirmCancel = window.confirm(
      `ต้องการยกเลิกการเช็คชื่อของ ${attendance.studentName} หรือไม่?\nเครดิต ${attendance.creditsDeducted} ครั้งจะถูกคืนให้`
    )
    
    if (!confirmCancel) return
    
    try {
      await attendanceService.cancelAttendance(attendance.id, 'ยกเลิกโดยผู้ใช้')
      toast.success(`ยกเลิกการเช็คชื่อและคืนเครดิตให้ ${attendance.studentName} แล้ว`)
      
      // Reload data
      await loadSelectedDateAttendance()
      await loadStudentCredits()
    } catch (error) {
      toast.error('ไม่สามารถยกเลิกการเช็คชื่อได้')
    }
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    if (dateString === today.toISOString().split('T')[0]) {
      return 'วันนี้'
    } else if (dateString === yesterday.toISOString().split('T')[0]) {
      return 'เมื่อวาน'
    } else {
      return date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }
  }

  const changeDate = (direction: 'prev' | 'next') => {
    const currentDate = new Date(selectedDate)
    if (direction === 'prev') {
      currentDate.setDate(currentDate.getDate() - 1)
    } else {
      currentDate.setDate(currentDate.getDate() + 1)
    }
    setSelectedDate(currentDate.toISOString().split('T')[0])
  }

  const isToday = selectedDate === new Date().toISOString().split('T')[0]
  const isPastDate = selectedDate < new Date().toISOString().split('T')[0]

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
        {/* Header */}
        <div className="mb-4 md:mb-6">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">เช็คชื่อนักเรียน</h1>

          {/* Date Selector */}
          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={() => changeDate('prev')}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="input-base text-sm w-auto"
            />

            <button
              onClick={() => changeDate('next')}
              disabled={isToday}
              className={`p-2 rounded-md ${
                isToday
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {isPastDate && (
              <span className="text-sm text-orange-600 flex items-center">
                <CalendarClock className="w-4 h-4 mr-1" />
                เช็คชื่อย้อนหลัง
              </span>
            )}

            {!isToday && (
              <button
                onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 whitespace-nowrap"
              >
                วันนี้
              </button>
            )}
          </div>
        </div>

        {/* 2-Column Layout */}
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* Left Column - Course Selection */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm p-4 lg:sticky lg:top-4">
              <h2 className="text-sm font-medium text-gray-700 mb-3">เลือกวิชา</h2>

              {/* Course Search */}
              {courses.length > 4 && (
                <div className="relative mb-3">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="ค้นหาวิชา..."
                    className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                    value={courseSearchTerm}
                    onChange={(e) => setCourseSearchTerm(e.target.value)}
                  />
                </div>
              )}

              {/* Course List */}
              <div className="space-y-1 max-h-[60vh] overflow-y-auto">
                {courses
                  .filter(course => {
                    if (!courseSearchTerm.trim()) return true
                    const search = courseSearchTerm.toLowerCase()
                    return (
                      course.name.toLowerCase().includes(search) ||
                      course.code.toLowerCase().includes(search)
                    )
                  })
                  .map(course => (
                    <button
                      key={course.id}
                      onClick={() => setSelectedCourse(course)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                        selectedCourse?.id === course.id
                          ? 'bg-primary-600 text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <div className="font-medium truncate">{course.name}</div>
                      <div className={`text-xs ${selectedCourse?.id === course.id ? 'text-primary-200' : 'text-gray-500'}`}>
                        {course.code}
                      </div>
                    </button>
                  ))}

                {courses.filter(course => {
                  if (!courseSearchTerm.trim()) return true
                  const search = courseSearchTerm.toLowerCase()
                  return (
                    course.name.toLowerCase().includes(search) ||
                    course.code.toLowerCase().includes(search)
                  )
                }).length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">ไม่พบวิชาที่ค้นหา</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Students */}
          <div className="flex-1 min-w-0">
            {selectedCourse ? (
              loadingStudents ? (
                /* Loading State */
                <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                  <div className="spinner spinner-primary w-8 h-8 mx-auto mb-4"></div>
                  <p className="text-gray-500">กำลังโหลดข้อมูลนักเรียน...</p>
                </div>
              ) : (
                <>
                  {/* Stats - Compact */}
                  <div className="grid grid-cols-3 gap-2 md:gap-4 mb-4">
                    <div className="bg-white rounded-lg shadow-sm p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-500">ทั้งหมด</p>
                          <p className="text-xl font-semibold text-gray-900">{stats.totalStudents}</p>
                        </div>
                        <Users className="w-5 h-5 text-gray-400" />
                      </div>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-500">เช็คแล้ว</p>
                          <p className="text-xl font-semibold text-green-600">{stats.checkedIn}</p>
                        </div>
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      </div>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-500">ยังไม่มา</p>
                          <p className="text-xl font-semibold text-red-600">{stats.absent}</p>
                        </div>
                        <XCircle className="w-5 h-5 text-red-400" />
                      </div>
                    </div>
                  </div>

                  {/* Search */}
                  <div className="bg-white rounded-lg shadow-sm p-3 mb-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="ค้นหาด้วยชื่อนักเรียน, ชื่อเล่น, เบอร์โทร..."
                        className="input-base pl-9 text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Checked-in Students List */}
                  {selectedDateAttendance.length > 0 && (
                    <div className="mb-4">
                      <h2 className="text-sm font-medium text-green-700 mb-2 flex items-center">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        เช็คชื่อแล้ว ({selectedDateAttendance.length})
                      </h2>
                      <div className="bg-green-50 rounded-lg overflow-hidden border border-green-100">
                        <div className="divide-y divide-green-100">
                          {selectedDateAttendance.map((attendance, index) => {
                            const student = students.find(s => s.id === attendance.studentId)
                            const parentPhone = student?.parents?.[0]?.phone || student?.phone
                            const remainingCredits = getStudentCredit(attendance.studentId)
                            return (
                              <div key={attendance.id} className="px-3 py-2 flex items-center justify-between text-sm">
                                <div className="flex items-center gap-3 min-w-0">
                                  <span className="text-green-600 w-5 text-right font-medium">{index + 1}</span>
                                  <div className="min-w-0">
                                    <span className="font-medium text-gray-900">
                                      {attendance.studentName}
                                      {attendance.studentNickname && (
                                        <span className="text-gray-500 ml-1">({attendance.studentNickname})</span>
                                      )}
                                    </span>
                                    {parentPhone && (
                                      <span className="text-gray-400 ml-2">{parentPhone}</span>
                                    )}
                                    {attendance.teacherNotes && (
                                      <span className="text-xs text-orange-500 ml-2">({attendance.teacherNotes})</span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 flex-shrink-0">
                                  {/* Credit Badge */}
                                  <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                    remainingCredits <= 2 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                                  }`}>
                                    {remainingCredits} ครั้ง
                                  </div>
                                  <span className="text-gray-500 text-xs">{formatTime(attendance.checkInTime)}</span>
                                  <button
                                    onClick={() => handleCancelAttendance(attendance)}
                                    className="text-red-500 hover:text-red-700 text-xs"
                                  >
                                    ยกเลิก
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Pending Students List - Only show students NOT checked in */}
                  <div className="space-y-2">
                    <h2 className="text-sm font-medium text-gray-700 mb-2">
                      รอเช็คชื่อ ({filteredStudents.filter(s => !isCheckedIn(s.id) && getStudentCredit(s.id) > 0).length})
                    </h2>
                    {filteredStudents.filter(s => !isCheckedIn(s.id)).length === 0 ? (
                      <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                        <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
                        <p className="text-sm text-gray-500">เช็คชื่อครบทุกคนแล้ว</p>
                      </div>
                    ) : (
                      filteredStudents
                        .filter(student => !isCheckedIn(student.id)) // Only show NOT checked in
                        .map(student => {
                          const remainingCredits = getStudentCredit(student.id)
                          const parentPhone = student.parents?.[0]?.phone || student.phone

                          if (remainingCredits === 0) return null

                          return (
                            <div
                              key={student.id}
                              className="bg-white rounded-lg shadow-sm p-3"
                            >
                              <div className="flex items-center justify-between gap-3">
                                {/* Student Info */}
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-medium text-sm text-gray-900 truncate">
                                    {student.firstName} {student.lastName}
                                    {student.nickname && (
                                      <span className="text-gray-500 ml-1">({student.nickname})</span>
                                    )}
                                  </h3>
                                  <p className="text-xs text-gray-500">
                                    {student.currentGrade}
                                    {parentPhone && <span> • {parentPhone}</span>}
                                  </p>
                                </div>

                                {/* Credit Badge */}
                                <div className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                                  remainingCredits <= 2 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                                }`}>
                                  {remainingCredits} ครั้ง
                                </div>

                                {/* Check-in Button */}
                                <button
                                  onClick={() => handleCheckIn(student)}
                                  disabled={checkingIn === student.id}
                                  className="btn-primary text-xs px-3 py-1.5 flex-shrink-0"
                                >
                                  {checkingIn === student.id ? (
                                    <div className="spinner w-3 h-3"></div>
                                  ) : (
                                    'เช็คชื่อ'
                                  )}
                                </button>
                              </div>
                            </div>
                          )
                        }).filter(Boolean)
                    )}
                  </div>
                </>
              )
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-8 md:p-12 text-center">
                <BookOpen className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <h3 className="text-base font-medium text-gray-900 mb-2">กรุณาเลือกวิชา</h3>
                <p className="text-sm text-gray-500">เลือกวิชาจากรายการด้านซ้ายเพื่อเช็คชื่อนักเรียน</p>
              </div>
            )}
          </div>
        </div>

        {/* Backdate Modal */}
        {showBackdateModal && pendingCheckIn && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4">
              <div 
                className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
                onClick={() => {
                  setShowBackdateModal(false)
                  setBackdateReason('')
                  setPendingCheckIn(null)
                }}
              />
              
              <div className="bg-white rounded-lg shadow-xl relative z-10 max-w-md w-full p-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <CalendarClock className="w-6 h-6 text-orange-500" />
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className="text-lg font-medium text-gray-900">
                      ยืนยันการเช็คชื่อย้อนหลัง
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        คุณกำลังเช็คชื่อ <strong>{pendingCheckIn.firstName} {pendingCheckIn.lastName}</strong>
                        <br />
                        สำหรับวันที่ <strong>{formatDate(selectedDate)}</strong>
                      </p>
                      
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          เหตุผลในการเช็คชื่อย้อนหลัง <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          value={backdateReason}
                          onChange={(e) => setBackdateReason(e.target.value)}
                          className="input-base text-sm"
                          rows={3}
                          placeholder="เช่น ลืมเช็คชื่อ, ระบบขัดข้อง, อื่นๆ"
                          autoFocus
                        />
                      </div>
                    </div>
                    
                    <div className="mt-5 flex space-x-3">
                      <button
                        onClick={() => {
                          if (!backdateReason.trim()) {
                            toast.error('กรุณาระบุเหตุผล')
                            return
                          }
                          performCheckIn(pendingCheckIn, true)
                        }}
                        disabled={!backdateReason.trim() || checkingIn === pendingCheckIn.id}
                        className="btn-primary flex-1"
                      >
                        {checkingIn === pendingCheckIn.id ? (
                          <>
                            <div className="spinner mr-2"></div>
                            กำลังเช็คชื่อ...
                          </>
                        ) : (
                          'ยืนยันเช็คชื่อ'
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setShowBackdateModal(false)
                          setBackdateReason('')
                          setPendingCheckIn(null)
                        }}
                        className="btn-secondary flex-1"
                      >
                        ยกเลิก
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default AttendancePage