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
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../../services/firebase'
import toast from 'react-hot-toast'
import Layout from '../../components/layout/Layout'

const AttendancePage = () => {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [checkingIn, setCheckingIn] = useState<string | null>(null)
  
  // Data
  const [students, setStudents] = useState<studentService.Student[]>([])
  const [courses, setCourses] = useState<courseService.Course[]>([])
  const [selectedDateAttendance, setSelectedDateAttendance] = useState<attendanceService.Attendance[]>([])
  const [studentCredits, setStudentCredits] = useState<Map<string, studentCreditService.StudentCredit[]>>(new Map())
  
  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('')
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
      // Get attendance for selected date
      const attendanceRef = collection(db, 'attendance')
      const q = query(
        attendanceRef,
        where('schoolId', '==', user.schoolId),
        where('courseId', '==', selectedCourse.id),
        where('checkInDate', '==', selectedDate)
      )
      
      const snapshot = await getDocs(q)
      const attendances: attendanceService.Attendance[] = []
      
      snapshot.docs.forEach(doc => {
        const data = doc.data() as any
        attendances.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate()
        })
      })
      
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
      const creditsMap = new Map<string, studentCreditService.StudentCredit[]>()
      
      // Use centralized function for each student
      for (const student of students) {
        const credits = await studentCreditService.getStudentCreditsForCourse(
          student.id,
          selectedCourse.id,
          user.schoolId
        )
        
        if (credits.length > 0) {
          creditsMap.set(student.id, credits)
        }
      }
      
      console.log(`Loaded credits for ${creditsMap.size} students`)
      setStudentCredits(creditsMap)
    } catch (error) {
      console.error('Error loading student credits:', error)
      toast.error('ไม่สามารถโหลดข้อมูลเครดิตได้')
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
        <div className="mb-4 md:mb-8">
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

        {/* Course Selection */}
        {courses.length > 1 && (
          <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 mb-4 md:mb-6">
            <h2 className="text-base md:text-lg font-medium text-gray-900 mb-3 md:mb-4 flex items-center">
              <BookOpen className="w-4 h-4 md:w-5 md:h-5 mr-2 text-gray-500" />
              เลือกวิชา
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              {courses.map(course => (
                <button
                  key={course.id}
                  onClick={() => setSelectedCourse(course)}
                  className={`p-3 md:p-4 rounded-lg border-2 transition-colors ${
                    selectedCourse?.id === course.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <h3 className="font-medium text-sm md:text-base text-gray-900">{course.name}</h3>
                  <p className="text-xs md:text-sm text-gray-500 mt-1">{course.code}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedCourse ? (
          <>
            {/* Stats - Mobile optimized */}
            <div className="grid grid-cols-3 gap-2 md:gap-4 mb-4 md:mb-6">
              <div className="bg-white rounded-lg shadow-sm p-3 md:p-4">
                <div className="flex flex-col md:flex-row items-center md:justify-between">
                  <div className="text-center md:text-left">
                    <p className="text-xs md:text-sm text-gray-500">นักเรียนทั้งหมด</p>
                    <p className="text-xl md:text-2xl font-semibold text-gray-900">
                      {stats.totalStudents}
                    </p>
                  </div>
                  <Users className="w-6 h-6 md:w-8 md:h-8 text-gray-400 mt-2 md:mt-0" />
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-3 md:p-4">
                <div className="flex flex-col md:flex-row items-center md:justify-between">
                  <div className="text-center md:text-left">
                    <p className="text-xs md:text-sm text-gray-500">เช็คชื่อแล้ว</p>
                    <p className="text-xl md:text-2xl font-semibold text-green-600">
                      {stats.checkedIn}
                    </p>
                  </div>
                  <CheckCircle className="w-6 h-6 md:w-8 md:h-8 text-green-400 mt-2 md:mt-0" />
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-3 md:p-4">
                <div className="flex flex-col md:flex-row items-center md:justify-between">
                  <div className="text-center md:text-left">
                    <p className="text-xs md:text-sm text-gray-500">ยังไม่มา</p>
                    <p className="text-xl md:text-2xl font-semibold text-red-600">
                      {stats.absent}
                    </p>
                  </div>
                  <XCircle className="w-6 h-6 md:w-8 md:h-8 text-red-400 mt-2 md:mt-0" />
                </div>
              </div>
            </div>

            {/* Search */}
            <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 mb-4 md:mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="ค้นหาด้วยชื่อนักเรียน, ชื่อเล่น, ชื่อผู้ปกครอง, เบอร์โทร..."
                  className="input-base pl-9 md:pl-10 text-sm md:text-base"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            {/* Student List - Mobile optimized */}
            <div className="space-y-3 md:space-y-4">
              {filteredStudents.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm p-8 md:p-12 text-center">
                  <User className="w-10 h-10 md:w-12 md:h-12 text-gray-400 mx-auto mb-3 md:mb-4" />
                  <p className="text-sm md:text-base text-gray-500">ไม่พบนักเรียนที่ค้นหา</p>
                </div>
              ) : (
                filteredStudents.map(student => {
                  const checkedIn = isCheckedIn(student.id)
                  const attendance = selectedDateAttendance.find(a => a.studentId === student.id)
                  const remainingCredits = getStudentCredit(student.id)
                  
                  // Double check - should not happen because of filterStudents
                  if (remainingCredits === 0) return null
                  
                  return (
                    <div
                      key={student.id}
                      className={`bg-white rounded-lg shadow-sm p-4 md:p-6 ${
                        checkedIn ? 'opacity-75' : ''
                      }`}
                    >
                      {/* Mobile Layout */}
                      <div className="md:hidden">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            {/* Student Avatar */}
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                              checkedIn ? 'bg-green-100' : 'bg-primary-100'
                            }`}>
                              {checkedIn ? (
                                <CheckCircle className="w-6 h-6 text-green-600" />
                              ) : (
                                <span className="text-lg font-semibold text-primary-600">
                                  {student.firstName[0]}
                                </span>
                              )}
                            </div>
                            
                            {/* Student Info */}
                            <div className="flex-1">
                              <h3 className="font-medium text-sm text-gray-900">
                                {student.firstName} {student.lastName}
                              </h3>
                              <p className="text-xs text-gray-500">
                                {student.studentCode} • {student.currentGrade}
                              </p>
                            </div>
                          </div>
                          
                          {/* Credit Badge */}
                          <div className="text-right">
                            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              remainingCredits === 0 ? 'bg-red-100 text-red-700' :
                              remainingCredits <= 2 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              <CreditCard className="w-3 h-3 mr-1" />
                              {remainingCredits}
                            </div>
                          </div>
                        </div>
                        
                        {/* Parent Info & Action */}
                        <div className="space-y-2">
                          {student.parents && student.parents[0] && (
                            <p className="text-xs text-gray-500">
                              ผู้ปกครอง: {student.parents[0].firstName} - {student.parents[0].phone}
                            </p>
                          )}
                          
                          {checkedIn ? (
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-green-600">เช็คชื่อแล้ว</span>
                              <span className="text-xs text-gray-500 flex items-center">
                                <Clock className="w-3 h-3 mr-1" />
                                {attendance && formatTime(attendance.checkInTime)}
                              </span>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleCheckIn(student)}
                              disabled={checkingIn === student.id || remainingCredits === 0}
                              className="w-full btn-primary text-sm py-2"
                            >
                              {checkingIn === student.id ? (
                                <>
                                  <div className="spinner mr-2"></div>
                                  กำลังเช็คชื่อ...
                                </>
                              ) : remainingCredits === 0 ? (
                                'ไม่มีเครดิต'
                              ) : (
                                'เช็คชื่อ'
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Desktop Layout */}
                      <div className="hidden md:flex items-center justify-between">
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
                              {remainingCredits} ครั้ง
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
                              disabled={checkingIn === student.id || remainingCredits === 0}
                              className="btn-primary inline-flex items-center min-w-[120px]"
                            >
                              {checkingIn === student.id ? (
                                <>
                                  <div className="spinner mr-2"></div>
                                  กำลังเช็คชื่อ...
                                </>
                              ) : remainingCredits === 0 ? (
                                <>
                                  <XCircle className="w-5 h-5 mr-2" />
                                  ไม่มีเครดิต
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
                }).filter(Boolean)
              )}
            </div>

            {/* Today's Attendance Summary - Mobile optimized */}
            {selectedDateAttendance.length > 0 && (
              <div className="mt-6 md:mt-8">
                <h2 className="text-base md:text-lg font-medium text-gray-900 mb-3 md:mb-4">
                  รายชื่อนักเรียนที่เช็คชื่อแล้ว
                </h2>
                
                {/* Mobile Card View */}
                <div className="md:hidden space-y-3">
                  {selectedDateAttendance.map((attendance, index) => (
                    <div key={attendance.id} className="bg-white rounded-lg shadow-sm p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {attendance.studentName}
                            </p>
                            <p className="text-xs text-gray-500">
                              {attendance.studentCode}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            {formatTime(attendance.checkInTime)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {attendance.checkedByName}
                          </p>
                        </div>
                      </div>
                      {attendance.teacherNotes && (
                        <p className="text-xs text-gray-600 mt-2 italic">
                          หมายเหตุ: {attendance.teacherNotes}
                        </p>
                      )}
                      <button
                        onClick={() => handleCancelAttendance(attendance)}
                        className="w-full mt-2 text-red-600 hover:text-red-900 text-sm font-medium py-1 border border-red-200 rounded hover:bg-red-50"
                      >
                        ยกเลิกการเช็คชื่อ
                      </button>
                    </div>
                  ))}
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block bg-white rounded-lg shadow-sm overflow-hidden">
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
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          หมายเหตุ
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          จัดการ
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedDateAttendance.map((attendance, index) => (
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
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {attendance.teacherNotes || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <button
                              onClick={() => handleCancelAttendance(attendance)}
                              className="text-red-600 hover:text-red-900 text-sm font-medium"
                            >
                              ยกเลิก
                            </button>
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
          <div className="bg-white rounded-lg shadow-sm p-8 md:p-12 text-center">
            <BookOpen className="w-10 h-10 md:w-12 md:h-12 text-gray-400 mx-auto mb-3 md:mb-4" />
            <h3 className="text-base md:text-lg font-medium text-gray-900 mb-2">กรุณาเลือกวิชา</h3>
            <p className="text-sm md:text-base text-gray-500">เลือกวิชาที่ต้องการเช็คชื่อนักเรียน</p>
          </div>
        )}

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