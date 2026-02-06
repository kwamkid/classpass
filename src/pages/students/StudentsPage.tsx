import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Plus,
  Search,
  ShoppingBag,
  CreditCard,
  Calendar,
  User,
  Eye,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import * as studentService from '../../services/student'
import * as creditService from '../../services/studentCredit'
import * as attendanceService from '../../services/attendance'
import toast from 'react-hot-toast'
import Layout from '../../components/layout/Layout'

interface StudentWithDetails extends studentService.Student {
  totalCredits?: number
  lastAttendance?: string
  totalAttendances?: number
  creditsByPackage?: creditService.CreditPackageSummary[]
}

const StudentsPage = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [students, setStudents] = useState<StudentWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 15

  // Load students with additional details using batch queries
  useEffect(() => {
    if (user?.schoolId) {
      loadStudentsWithDetails()
    }
  }, [user?.schoolId, statusFilter])

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, searchTerm])

  const loadStudentsWithDetails = async () => {
    if (!user?.schoolId) return

    try {
      setLoading(true)
      console.log('\n=== Starting loadStudentsWithDetails (Optimized) ===')
      console.log('School ID:', user.schoolId)

      // Step 1: Get students
      const studentsData = await studentService.getStudents(
        user.schoolId,
        statusFilter === 'all' ? undefined : statusFilter
      )
      console.log('Total students loaded:', studentsData.length)

      if (studentsData.length === 0) {
        setStudents([])
        return
      }

      // Step 2: Get all student IDs
      const studentIds = studentsData.map(s => s.id)

      // Step 3: Batch fetch credits and attendance (2 queries instead of N*3)
      const [creditsSummary, attendanceSummary] = await Promise.all([
        creditService.getStudentsCreditsSummaryBatch(studentIds, user.schoolId),
        attendanceService.getStudentsAttendanceSummaryBatch(studentIds, user.schoolId)
      ])

      console.log('Credits summary loaded for', creditsSummary.size, 'students')
      console.log('Attendance summary loaded for', attendanceSummary.size, 'students')

      // Step 4: Merge data
      const studentsWithDetails: StudentWithDetails[] = studentsData.map(student => {
        const credits = creditsSummary.get(student.id)
        const attendance = attendanceSummary.get(student.id)

        return {
          ...student,
          totalCredits: credits?.totalCredits || 0,
          creditsByPackage: credits?.creditsByPackage || [],
          lastAttendance: attendance?.lastAttendance || undefined,
          totalAttendances: attendance?.totalAttendances || 0
        }
      })

      console.log('\n=== Summary ===')
      console.log('Students with details loaded:', studentsWithDetails.length)
      console.log('Students with credits:', studentsWithDetails.filter(s => (s.totalCredits || 0) > 0).length)

      setStudents(studentsWithDetails)
    } catch (error) {
      console.error('Error in loadStudentsWithDetails:', error)
      toast.error('ไม่สามารถโหลดข้อมูลนักเรียนได้')
    } finally {
      setLoading(false)
    }
  }

  // Search students
  const handleSearch = async () => {
    if (!user?.schoolId) return

    if (searchTerm.trim()) {
      setLoading(true)
      try {
        console.log('Searching for:', searchTerm)

        const results = await studentService.searchStudents(user.schoolId, searchTerm)
        console.log('Search results found:', results.length)

        if (results.length === 0) {
          setStudents([])
          return
        }

        // Batch fetch for search results too
        const studentIds = results.map(s => s.id)

        const [creditsSummary, attendanceSummary] = await Promise.all([
          creditService.getStudentsCreditsSummaryBatch(studentIds, user.schoolId),
          attendanceService.getStudentsAttendanceSummaryBatch(studentIds, user.schoolId)
        ])

        const resultsWithDetails: StudentWithDetails[] = results.map(student => {
          const credits = creditsSummary.get(student.id)
          const attendance = attendanceSummary.get(student.id)

          return {
            ...student,
            totalCredits: credits?.totalCredits || 0,
            creditsByPackage: credits?.creditsByPackage || [],
            lastAttendance: attendance?.lastAttendance || undefined,
            totalAttendances: attendance?.totalAttendances || 0
          }
        })

        setStudents(resultsWithDetails)
        setCurrentPage(1)
      } catch (error) {
        console.error('Error in search:', error)
        toast.error('เกิดข้อผิดพลาดในการค้นหา')
      } finally {
        setLoading(false)
      }
    } else {
      loadStudentsWithDetails()
    }
  }

  const formatLastAttendance = (date?: string) => {
    if (!date) return 'ยังไม่เคยเข้าเรียน'

    const attendanceDate = new Date(date)
    const today = new Date()
    const diffTime = Math.abs(today.getTime() - attendanceDate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'วันนี้'
    if (diffDays === 1) return 'เมื่อวาน'
    if (diffDays < 7) return `${diffDays} วันที่แล้ว`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} สัปดาห์ที่แล้ว`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} เดือนที่แล้ว`

    return attendanceDate.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Pagination calculations
  const totalPages = Math.ceil(students.length / itemsPerPage)
  const paginatedStudents = students.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  return (
    <Layout>
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="md:flex md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">นักเรียน</h1>
            <p className="mt-1 text-sm text-gray-500">
              จัดการข้อมูลนักเรียนทั้งหมด {students.length} คน
            </p>
          </div>
          <div className="mt-4 md:mt-0 md:ml-4">
            <Link
              to="/students/add"
              className="btn-primary inline-flex items-center"
            >
              <Plus className="w-5 h-5 mr-2" />
              เพิ่มนักเรียน
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="ค้นหาด้วยชื่อ, ชื่อเล่น..."
                  className="input-base pl-10 pr-24"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <button
                  onClick={handleSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  ค้นหา
                </button>
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <select
                className="input-base"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">สถานะทั้งหมด</option>
                <option value="active">กำลังเรียน</option>
                <option value="inactive">พักการเรียน</option>
                <option value="graduated">จบการศึกษา</option>
              </select>
            </div>
          </div>
        </div>

        {/* Students List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="spinner spinner-primary w-8 h-8"></div>
          </div>
        ) : students.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">ยังไม่มีข้อมูลนักเรียน</h3>
            <p className="text-gray-500 mb-4">เริ่มต้นด้วยการเพิ่มนักเรียนคนแรก</p>
            <Link
              to="/students/add"
              className="btn-primary inline-flex items-center"
            >
              <Plus className="w-5 h-5 mr-2" />
              เพิ่มนักเรียน
            </Link>
          </div>
        ) : (
          <div className="bg-white shadow-sm rounded-lg overflow-hidden">
            <div className="overflow-x-auto overflow-y-visible">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                      นักเรียน
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                      ระดับชั้น
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 relative">
                      เครดิตคงเหลือ
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                      เรียนครั้งสุดท้าย
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-600">
                      การดำเนินการ
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-base font-medium text-gray-900">
                            {student.firstName} {student.lastName}
                            {student.nickname && (
                              <span className="text-gray-500 font-normal"> ({student.nickname})</span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 mt-0.5">
                            {student.phone || '-'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900">
                        {student.currentGrade}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="relative group">
                          <div className="flex items-center cursor-help">
                            <CreditCard className="w-4 h-4 mr-2 text-gray-400" />
                            <span className={`text-base font-semibold ${
                              student.totalCredits === 0 || (student.totalCredits && student.totalCredits < 3) ? 'text-red-600' :
                              'text-gray-900'
                            }`}>
                              {student.totalCredits || 0} ครั้ง
                            </span>
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            เรียนไปแล้ว {student.totalAttendances || 0} ครั้ง
                          </div>

                          {/* Tooltip */}
                          {student.creditsByPackage && student.creditsByPackage.length > 0 && (
                            <div className="invisible group-hover:visible absolute z-50 left-0 bottom-full mb-2 w-64 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-lg">
                              <div className="font-medium mb-2">รายละเอียดเครดิตคงเหลือ:</div>
                              {student.creditsByPackage.map((credit, idx) => (
                                <div key={idx} className="mb-1.5 pb-1.5 border-b border-gray-700 last:border-0">
                                  <div className="font-medium">{credit.courseName}</div>
                                  <div className="text-gray-300">
                                    {credit.packageName} - {credit.remainingCredits} ครั้ง
                                  </div>
                                  {credit.expiryDate && (
                                    <div className="text-gray-400">
                                      หมดอายุ: {new Date(credit.expiryDate).toLocaleDateString('th-TH', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric'
                                      })}
                                    </div>
                                  )}
                                </div>
                              ))}
                              <div className="absolute bottom-[-6px] left-6 w-3 h-3 bg-gray-900 transform rotate-45"></div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-base text-gray-600">
                          <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                          {formatLastAttendance(student.lastAttendance)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-2">
                          <Link
                            to={`/students/${student.id}`}
                            className="p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-md transition-colors"
                            title="ดูรายละเอียด"
                          >
                            <Eye className="w-5 h-5" />
                          </Link>
                          <button
                            onClick={() => navigate(`/credits/purchase?studentId=${student.id}`)}
                            className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-md transition-colors"
                            title="ซื้อแพ็คเกจ"
                          >
                            <ShoppingBag className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200">
                <div className="text-sm text-gray-500">
                  แสดง {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, students.length)} จาก {students.length} คน
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      if (totalPages <= 5) return true
                      if (page === 1 || page === totalPages) return true
                      if (Math.abs(page - currentPage) <= 1) return true
                      return false
                    })
                    .map((page, index, arr) => {
                      const showEllipsis = index > 0 && arr[index - 1] !== page - 1
                      return (
                        <div key={page} className="flex items-center">
                          {showEllipsis && <span className="px-2 text-gray-400">...</span>}
                          <button
                            onClick={() => setCurrentPage(page)}
                            className={`min-w-[36px] h-9 px-3 rounded-md text-sm font-medium transition-colors ${
                              currentPage === page
                                ? 'bg-primary-600 text-white'
                                : 'border border-gray-300 hover:bg-gray-50 text-gray-700'
                            }`}
                          >
                            {page}
                          </button>
                        </div>
                      )
                    })}

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  )
}

export default StudentsPage
