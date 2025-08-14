// src/pages/courses/CourseDetailPage.tsx
import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  Edit, 
  BookOpen,
  Users,
  MoreVertical,
  Trash2,
  AlertCircle,
  User,
  CreditCard,
  Calendar
} from 'lucide-react'
import * as courseService from '../../services/course'
import * as studentService from '../../services/student'
import { useAuthStore } from '../../stores/authStore'
import * as creditService from '../../services/studentCredit'
import * as attendanceService from '../../services/attendance'
import Layout from '../../components/layout/Layout'
import toast from 'react-hot-toast'

const CourseDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
    const { user } = useAuthStore() // <-- เพิ่มบรรทัดนี้

  const [course, setCourse] = useState<courseService.Course | null>(null)
  const [enrolledStudents, setEnrolledStudents] = useState<studentService.Student[]>([])
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [stats, setStats] = useState({
  totalStudents: 0,
  totalClasses: 0,
  totalCreditsUsed: 0
})

  useEffect(() => {
    if (id) {
      loadCourse()
      loadEnrolledStudents()
      loadCourseStats() // เพิ่มบรรทัดนี้

    }
  }, [id])

  const loadCourse = async () => {
    if (!id) return
    
    try {
      setLoading(true)
      const data = await courseService.getCourse(id)
      if (data) {
        setCourse(data)
      } else {
        toast.error('ไม่พบข้อมูลวิชาเรียน')
        navigate('/courses')
      }
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล')
    } finally {
      setLoading(false)
    }
  }

  const loadEnrolledStudents = async () => {
    if (!id || !user?.schoolId) return
    
    try {
      console.log('Loading enrolled students for course:', id)
      
      // Get all active credits for this course
      const courseCredits = await creditService.getSchoolCredits(
        user.schoolId,
        { 
          courseId: id, 
          status: 'active' 
        }
      )
      
      console.log('Found credits:', courseCredits.length)
      
      // Filter only credits with remaining balance
      const activeCredits = courseCredits.filter(credit => credit.remainingCredits > 0)
      
      console.log('Active credits with balance:', activeCredits.length)
      
      // Get unique student IDs
      const uniqueStudentIds = [...new Set(activeCredits.map(credit => credit.studentId))]
      
      console.log('Unique student IDs:', uniqueStudentIds)
      
      // Load student details
      const studentsData = await Promise.all(
        uniqueStudentIds.map(async (studentId) => {
          try {
            const student = await studentService.getStudent(studentId)
            return student
          } catch (error) {
            console.error(`Error loading student ${studentId}:`, error)
            return null
          }
        })
      )
      
      // Filter out null values and set
      const validStudents = studentsData.filter(s => s !== null) as studentService.Student[]
      
      console.log('Valid students loaded:', validStudents.length)
      setEnrolledStudents(validStudents)
      
      // Update total enrolled count on course
      if (course && validStudents.length !== course.totalEnrolled) {
        setCourse({
          ...course,
          totalEnrolled: validStudents.length
        })
      }
    } catch (error) {
      console.error('Error loading enrolled students:', error)
      setEnrolledStudents([])
    }
  }

  const loadCourseStats = async () => {
    if (!id || !user?.schoolId) return
    
    try {
      console.log('Loading course stats...')
      
      // Get all credits for this course (including used ones)
      const allCourseCredits = await creditService.getSchoolCredits(
        user.schoolId,
        { courseId: id }
      )
      
      // Calculate total students (unique)
      const uniqueStudentIds = [...new Set(allCourseCredits.map(credit => credit.studentId))]
      const totalStudents = uniqueStudentIds.length
      
      // Calculate total credits used
      const totalCreditsUsed = allCourseCredits.reduce((sum, credit) => sum + credit.usedCredits, 0)
      
      // Get attendance records for total classes
      const attendanceRecords = await attendanceService.getAttendanceHistory(
        user.schoolId,
        { courseId: id }
      )
      const totalClasses = attendanceRecords.length
      
      setStats({
        totalStudents,
        totalClasses,
        totalCreditsUsed
      })
      
      console.log('Course stats:', {
        totalStudents,
        totalClasses,
        totalCreditsUsed
      })
    } catch (error) {
      console.error('Error loading course stats:', error)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!course) return
    
    try {
      await courseService.updateCourse(course.id, { status: newStatus as 'active' | 'inactive' | 'archived' })
      toast.success('อัพเดทสถานะสำเร็จ')
      loadCourse()
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการอัพเดทสถานะ')
    }
  }

  const handleDelete = async () => {
    if (!course) return
    
    try {
      setDeleting(true)
      await courseService.deleteCourse(course.id)
      toast.success('ลบข้อมูลวิชาเรียนสำเร็จ')
      navigate('/courses')
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการลบข้อมูล')
      setDeleting(false)
    }
  }

  const getCategoryBadge = (category: string) => {
    const categoryConfig = {
      academic: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'วิชาการ', icon: '📚' },
      sport: { bg: 'bg-green-100', text: 'text-green-700', label: 'กีฬา', icon: '⚽' },
      art: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'ศิลปะ', icon: '🎨' },
      language: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'ภาษา', icon: '💬' },
      other: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'อื่นๆ', icon: '📌' }
    }
    
    const config = categoryConfig[category as keyof typeof categoryConfig] || categoryConfig.other
    
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
        <span className="mr-1">{config.icon}</span>
        {config.label}
      </span>
    )
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { bg: 'bg-green-100', text: 'text-green-700', label: 'เปิดสอน' },
      inactive: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'ปิดสอน' },
      archived: { bg: 'bg-red-100', text: 'text-red-700', label: 'เก็บถาวร' }
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    )
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

  if (!course) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-500">ไม่พบข้อมูลวิชาเรียน</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/courses"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            กลับไปหน้าวิชาเรียน
          </Link>
          
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">
                  {course.name}
                </h1>
                {getCategoryBadge(course.category)}
              </div>
              <p className="text-sm text-gray-500">
                รหัสวิชา: {course.code}
              </p>
            </div>
            
            {/* Actions */}
            <div className="flex items-center space-x-3">
              <Link
                to={`/courses/${course.id}/edit`}
                className="btn-secondary inline-flex items-center"
              >
                <Edit className="w-4 h-4 mr-2" />
                แก้ไข
              </Link>
              
              {/* More menu */}
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
                
                {menuOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-20">
                      <button
                        onClick={() => {
                          handleStatusChange('inactive')
                          setMenuOpen(false)
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        ปิดการสอน
                      </button>
                      <button
                        onClick={() => {
                          handleStatusChange('archived')
                          setMenuOpen(false)
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        เก็บถาวร
                      </button>
                      <hr className="my-1" />
                      <button
                        onClick={() => {
                          setMenuOpen(false)
                          setDeleteModalOpen(true)
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 inline mr-2" />
                        ลบวิชา
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Course Information */}
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
                <BookOpen className="w-5 h-5 mr-2 text-gray-500" />
                ข้อมูลวิชาเรียน
              </h2>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">คำอธิบายวิชา</p>
                  <p className="text-gray-900">
                    {course.description || 'ไม่มีคำอธิบาย'}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">ประเภท</p>
                    <p className="text-gray-900">{getCategoryBadge(course.category)}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500 mb-1">สถานะ</p>
                    <p className="text-gray-900">{getStatusBadge(course.status)}</p>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500 mb-1">วันที่สร้าง</p>
                  <p className="text-gray-900">
                    {new Date(course.createdAt).toLocaleDateString('th-TH', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Enrolled Students */}
            <div className="bg-white shadow-sm rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-medium text-gray-900 flex items-center">
                  <Users className="w-5 h-5 mr-2 text-gray-500" />
นักเรียนที่มีเครดิต ({enrolledStudents.length})
                </h2>
                <Link
                  to={`/courses/${course.id}/enroll`}
                  className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                >
                  จัดการนักเรียน
                </Link>
              </div>
              
              {enrolledStudents.length === 0 ? (
                <div className="text-center py-8">
                  <User className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">ยังไม่มีนักเรียนลงทะเบียน</p>
                  <Link
                    to={`/courses/${course.id}/enroll`}
                    className="text-primary-600 hover:text-primary-700 text-sm font-medium mt-2 inline-block"
                  >
                    เพิ่มนักเรียน
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {enrolledStudents.map((student) => (
                    <div key={student.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-primary-600 font-medium">
                            {student.firstName[0]}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {student.firstName} {student.lastName}
                          </p>
                          <p className="text-sm text-gray-500">
                            {student.studentCode} • {student.currentGrade}
                          </p>
                        </div>
                      </div>
                      <Link
                        to={`/students/${student.id}`}
                        className="text-primary-600 hover:text-primary-700 text-sm"
                      >
                        ดูโปรไฟล์
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">สถิติ</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Users className="w-5 h-5 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-500">นักเรียนทั้งหมด</span>
                  </div>
                  <span className="text-lg font-semibold text-primary-600">
                    {stats.totalStudents}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Calendar className="w-5 h-5 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-500">คลาสที่สอนแล้ว</span>
                  </div>
                  <span className="text-lg font-semibold text-green-600">
                    {stats.totalClasses}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <CreditCard className="w-5 h-5 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-500">เครดิตที่ใช้ไป</span>
                  </div>
                  <span className="text-lg font-semibold text-blue-600">
                    {stats.totalCreditsUsed}
                  </span>
                </div>
                
                {/* เพิ่มส่วนนักเรียนที่มีเครดิตคงเหลือ */}
                <div className="pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Users className="w-5 h-5 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-500">นักเรียนที่มีเครดิต</span>
                    </div>
                    <span className="text-lg font-semibold text-orange-600">
                      {enrolledStudents.length}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Note */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex">
                <AlertCircle className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-700">
                  <p className="font-medium mb-1">ระบบเครดิต:</p>
                  <p>ใช้ 1 เครดิตต่อครั้งเรียน นักเรียนมาเรียนจึงจะตัดเครดิต</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">การดำเนินการ</h3>
              <div className="space-y-3">
                <Link
                  to={`/attendance?courseId=${course.id}`}
                  className="w-full btn-primary text-center"
                >
                  เช็คชื่อนักเรียน
                </Link>
                <Link
                  to={`/courses/${course.id}/students`}
                  className="w-full btn-secondary text-center"
                >
                  จัดการนักเรียน
                </Link>
                <Link
                  to={`/reports/course/${course.id}`}
                  className="w-full btn-outline text-center"
                >
                  ดูรายงาน
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {deleteModalOpen && (
          <>
            <div 
              className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75"
              onClick={() => setDeleteModalOpen(false)}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-lg max-w-md w-full p-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  </div>
                  <h3 className="ml-3 text-lg font-medium text-gray-900">
                    ยืนยันการลบวิชา
                  </h3>
                </div>
                
                <p className="text-gray-500 mb-6">
                  คุณแน่ใจหรือไม่ที่จะลบวิชา <strong>{course.name}</strong>? 
                  การดำเนินการนี้ไม่สามารถย้อนกลับได้
                </p>
                
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setDeleteModalOpen(false)}
                    className="btn-secondary"
                    disabled={deleting}
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={handleDelete}
                    className="btn-primary bg-red-600 hover:bg-red-700 focus:ring-red-500"
                    disabled={deleting}
                  >
                    {deleting ? (
                      <>
                        <div className="spinner mr-2"></div>
                        กำลังลบ...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-2" />
                        ลบวิชา
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}

export default CourseDetailPage