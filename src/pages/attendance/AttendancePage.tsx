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
  Bug
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

// Credit Debug Panel Component
const CreditDebugPanel = ({ students, selectedCourse, user }) => {
  const [debugInfo, setDebugInfo] = useState({
    studentsInPage: [],
    creditsInDb: [],
    matches: [],
    problems: []
  })
  const [isLoading, setIsLoading] = useState(false)
  
  const runDebug = async () => {
    if (!user?.schoolId || !selectedCourse) return
    
    setIsLoading(true)
    console.log('🔍 Starting Credit Debug...')
    
    try {
      // 1. Get all students in current page
      const pageStudents = students.map(s => ({
        id: s.id,
        name: `${s.firstName} ${s.lastName}`,
        code: s.studentCode
      }))
      
      // 2. Get all credits from database
      const creditsRef = collection(db, 'student_credits')
      const schoolQuery = query(creditsRef, where('schoolId', '==', user.schoolId))
      const creditsSnapshot = await getDocs(schoolQuery)
      
      const dbCredits = []
      creditsSnapshot.docs.forEach(doc => {
        const data = doc.data()
        dbCredits.push({
          docId: doc.id,
          studentId: data.studentId,
          studentName: data.studentName,
          courseId: data.courseId,
          courseName: data.courseName,
          remaining: data.remainingCredits,
          status: data.status
        })
      })
      
      // 3. Check matches
      const matches = []
      const problems = []
      
      // Check each student if they have credits
      pageStudents.forEach(student => {
        const studentCredits = dbCredits.filter(c => c.studentId === student.id)
        
        if (studentCredits.length === 0) {
          problems.push({
            type: 'NO_CREDITS',
            message: `${student.name} (${student.id}) ไม่มีเครดิตเลย`,
            studentId: student.id
          })
        } else {
          // Check if has credits for selected course
          const courseCredits = studentCredits.filter(c => 
            c.courseId === selectedCourse.id && 
            c.status === 'active' && 
            c.remaining > 0
          )
          
          if (courseCredits.length === 0) {
            problems.push({
              type: 'NO_COURSE_CREDITS',
              message: `${student.name} ไม่มีเครดิตสำหรับวิชา ${selectedCourse.name}`,
              studentId: student.id
            })
          } else {
            matches.push({
              student: student.name,
              studentId: student.id,
              credits: courseCredits
            })
          }
        }
      })
      
      // Check orphaned credits (credits without matching students)
      dbCredits.forEach(credit => {
        if (credit.courseId === selectedCourse.id && credit.status === 'active' && credit.remaining > 0) {
          const hasStudent = pageStudents.some(s => s.id === credit.studentId)
          if (!hasStudent) {
            problems.push({
              type: 'ORPHANED_CREDIT',
              message: `เครดิตของ ${credit.studentName} (${credit.studentId}) ไม่มีนักเรียนในหน้านี้`,
              credit: credit
            })
          }
        }
      })
      
      setDebugInfo({
        studentsInPage: pageStudents,
        creditsInDb: dbCredits,
        matches,
        problems
      })
      
      // Log to console
      console.log('📊 Debug Results:', {
        studentsInPage: pageStudents,
        creditsInDb: dbCredits.filter(c => c.courseId === selectedCourse.id),
        matches,
        problems
      })
    } catch (error) {
      console.error('Error in debug:', error)
      toast.error('เกิดข้อผิดพลาดในการตรวจสอบ')
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 mb-4">
      <h3 className="font-semibold text-yellow-800 mb-3 flex items-center">
        <Bug className="w-5 h-5 mr-2" />
        Credit Debug Panel
      </h3>
      
      <button
        onClick={runDebug}
        disabled={isLoading}
        className="btn-primary mb-4 inline-flex items-center"
      >
        {isLoading ? (
          <>
            <div className="spinner mr-2"></div>
            กำลังตรวจสอบ...
          </>
        ) : (
          <>
            <Search className="w-4 h-4 mr-2" />
            ตรวจสอบปัญหาเครดิต
          </>
        )}
      </button>
      
      {debugInfo.problems.length > 0 && (
        <div className="mt-4 space-y-2">
          <h4 className="font-medium text-red-700">❌ พบปัญหา:</h4>
          {debugInfo.problems.map((problem, idx) => (
            <div key={idx} className="text-sm bg-red-50 border border-red-200 p-3 rounded">
              <p className="text-red-700 font-medium">{problem.type}</p>
              <p className="text-red-600">{problem.message}</p>
              {problem.type === 'NO_CREDITS' && (
                <Link 
                  to={`/credits/purchase?studentId=${problem.studentId}`}
                  className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                >
                  → ซื้อเครดิตให้นักเรียนนี้
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
      
      {debugInfo.matches.length > 0 && (
        <div className="mt-4">
          <h4 className="font-medium text-green-700">✅ เครดิตที่พบ:</h4>
          <div className="space-y-1 mt-2">
            {debugInfo.matches.map((match, idx) => (
              <div key={idx} className="text-sm bg-green-50 border border-green-200 p-2 rounded">
                <span className="text-green-700 font-medium">{match.student}:</span>
                <span className="text-green-600 ml-2">
                  {match.credits.map(c => `${c.remaining} ครั้ง`).join(', ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="mt-4 text-xs text-gray-600 bg-gray-50 p-2 rounded">
        <p className="font-medium mb-1">📌 หมายเหตุ:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>ตรวจสอบว่า Student ID ในเครดิตตรงกับนักเรียนในระบบ</li>
          <li>ตรวจสอบว่าเครดิตผูกกับ Course ID ที่ถูกต้อง</li>
          <li>เครดิตต้องมี status = 'active' และ remainingCredits มากกว่า 0</li>
        </ul>
      </div>
    </div>
  )
}

const AttendancePage = () => {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [checkingIn, setCheckingIn] = useState<string | null>(null)
  
  // Data
  const [students, setStudents] = useState<studentService.Student[]>([])
  const [courses, setCourses] = useState<courseService.Course[]>([])
  const [todayAttendance, setTodayAttendance] = useState<attendanceService.Attendance[]>([])
  const [studentCredits, setStudentCredits] = useState<Map<string, studentCreditService.StudentCredit[]>>(new Map())
  
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

  // Debug state
  const [showDebug, setShowDebug] = useState(false)

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    filterStudents()
  }, [searchTerm, students])

  useEffect(() => {
    if (selectedCourse && students.length > 0) {
      loadTodayAttendance()
      loadStudentCredits()
    }
  }, [selectedCourse, students])

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

  const loadStudentCredits = async () => {
    if (!selectedCourse || !user?.schoolId || students.length === 0) return
    
    try {
      console.log('🔄 Loading student credits (Optimized with Index)...')
      console.log('Number of students:', students.length)
      
      const creditsMap = new Map<string, studentCreditService.StudentCredit[]>()
      
      // Single optimized query using index
      const creditsRef = collection(db, 'student_credits')
      const creditsQuery = query(
        creditsRef,
        where('schoolId', '==', user.schoolId),
        where('courseId', '==', selectedCourse.id),
        where('status', '==', 'active')
      )
      
      const snapshot = await getDocs(creditsQuery)
      console.log(`📊 Found ${snapshot.size} active credits for ${selectedCourse.name}`)
      
      // Create Set for O(1) lookup performance
      const studentIdSet = new Set(students.map(s => s.id))
      
      // Process all credits in one pass
      snapshot.docs.forEach(doc => {
        const data = doc.data()
        
        // Only process if student is in current page and has remaining credits
        if (studentIdSet.has(data.studentId) && data.remainingCredits > 0) {
          const credit: studentCreditService.StudentCredit = {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date()
          } as studentCreditService.StudentCredit
          
          // Group credits by studentId
          const existingCredits = creditsMap.get(data.studentId) || []
          existingCredits.push(credit)
          creditsMap.set(data.studentId, existingCredits)
        }
      })
      
      console.log(`✅ Loaded credits for ${creditsMap.size} students`)
      
      // Log summary for debugging
      creditsMap.forEach((credits, studentId) => {
        const student = students.find(s => s.id === studentId)
        const total = credits.reduce((sum, c) => sum + c.remainingCredits, 0)
        console.log(`  - ${student?.firstName || 'Unknown'}: ${credits.length} packages, ${total} total credits`)
      })
      
      setStudentCredits(creditsMap)
    } catch (error) {
      console.error('Error loading student credits:', error)
      toast.error('ไม่สามารถโหลดข้อมูลเครดิตได้')
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
      const credits = studentCredits.get(student.id) || []
      
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
      const checkInData: attendanceService.CheckInData = {
        studentId: student.id,
        courseId: selectedCourse.id,
        creditId: activeCredit.id,
        checkInMethod: 'manual'
      }
      
      const attendance = await attendanceService.checkInStudent(
        user.schoolId,
        user.id,
        user.displayName || `${user.firstName} ${user.lastName}`,
        user.role,
        checkInData
      )
      
      toast.success(`เช็คชื่อ ${student.firstName} สำเร็จ!`)
      
      // Reload attendance and credits
      await loadTodayAttendance()
      await loadStudentCredits()
    } catch (error: any) {
      toast.error(error.message || 'เกิดข้อผิดพลาดในการเช็คชื่อ')
    } finally {
      setCheckingIn(null)
    }
  }

  const isCheckedIn = (studentId: string) => {
    return todayAttendance.some(a => a.studentId === studentId)
  }

  const getStudentCredit = (studentId: string): number => {
    const credits = studentCredits.get(studentId) || []
    const totalRemaining = credits
      .filter(c => c.status === 'active' && c.courseId === selectedCourse?.id)
      .reduce((sum, c) => sum + c.remainingCredits, 0)
    
    return totalRemaining
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
        {/* Header */}
        <div className="mb-4 md:mb-8">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">เช็คชื่อนักเรียน</h1>
          <p className="mt-1 text-xs md:text-sm text-gray-500">
            วันที่ {new Date().toLocaleDateString('th-TH', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>

        {/* Debug Toggle */}
        <div className="mb-4">
          <button
            onClick={() => setShowDebug(!showDebug)}
            className="text-sm text-gray-600 hover:text-gray-900 inline-flex items-center"
          >
            <Bug className="w-4 h-4 mr-1" />
            {showDebug ? 'ซ่อน' : 'แสดง'} Debug Panel
          </button>
        </div>

        {/* Debug Panel */}
        {showDebug && selectedCourse && (
          <CreditDebugPanel 
            students={filteredStudents}
            selectedCourse={selectedCourse}
            user={user}
          />
        )}

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
                  className="input-base pl-9 md:pl-10 text-sm md:text-lg"
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
                  const attendance = todayAttendance.find(a => a.studentId === student.id)
                  const remainingCredits = getStudentCredit(student.id)
                  
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
                })
              )}
            </div>

            {/* Today's Attendance Summary - Mobile optimized */}
            {todayAttendance.length > 0 && (
              <div className="mt-6 md:mt-8">
                <h2 className="text-base md:text-lg font-medium text-gray-900 mb-3 md:mb-4">
                  รายชื่อนักเรียนที่เช็คชื่อแล้ว
                </h2>
                
                {/* Mobile Card View */}
                <div className="md:hidden space-y-3">
                  {todayAttendance.map((attendance, index) => (
                    <div key={attendance.id} className="bg-white rounded-lg shadow-sm p-4">
                      <div className="flex items-center justify-between">
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
          <div className="bg-white rounded-lg shadow-sm p-8 md:p-12 text-center">
            <BookOpen className="w-10 h-10 md:w-12 md:h-12 text-gray-400 mx-auto mb-3 md:mb-4" />
            <h3 className="text-base md:text-lg font-medium text-gray-900 mb-2">กรุณาเลือกวิชา</h3>
            <p className="text-sm md:text-base text-gray-500">เลือกวิชาที่ต้องการเช็คชื่อนักเรียน</p>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default AttendancePage