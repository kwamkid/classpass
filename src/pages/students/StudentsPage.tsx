import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  Plus, 
  Search, 
  Filter, 
  ShoppingBag,
  CreditCard,
  Calendar,
  User,
  Eye
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
  creditsByPackage?: Array<{
    courseName: string
    packageName: string
    remainingCredits: number
    expiryDate?: string
  }>
}

const StudentsPage = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [students, setStudents] = useState<StudentWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Load students with additional details
  useEffect(() => {
    if (user?.schoolId) {
      loadStudentsWithDetails()
    }
  }, [user?.schoolId, statusFilter])

  const loadStudentsWithDetails = async () => {
  if (!user?.schoolId) return
  
  try {
    setLoading(true)
    console.log('\n=== Starting loadStudentsWithDetails ===')
    console.log('School ID:', user.schoolId)
    
    // Get students
    const studentsData = await studentService.getStudents(
      user.schoolId,
      statusFilter === 'all' ? undefined : statusFilter
    )
    console.log('Total students loaded:', studentsData.length)
    
    // Get additional details for each student
    const studentsWithDetails = await Promise.all(
      studentsData.map(async (student) => {
        try {
          // เพิ่ม log
          console.log(`\n=== Loading data for: ${student.firstName} ${student.lastName} ===`)
          console.log('Student ID:', student.id)
          
          // Get total credits
          const credits = await creditService.getStudentAllCoursesCredits(student.id)
          console.log('Credits found:', credits.length)
          
          if (credits.length > 0) {
            console.log('Credit details:', credits.map(c => ({
              course: c.courseName,
              package: c.packageName,
              remaining: c.remainingCredits,
              status: c.status
            })))
          }
          
          const totalCredits = credits.reduce((sum, credit) => sum + credit.remainingCredits, 0)
          console.log('Total credits calculated:', totalCredits)
          
          const creditsByPackage = credits.map(credit => ({
            courseName: credit.courseName,
            packageName: credit.packageName,
            remainingCredits: credit.remainingCredits,
            expiryDate: credit.expiryDate
          }))
          
          // Get last attendance
          console.log('Loading attendance history...')
          const attendanceHistory = await attendanceService.getAttendanceHistory(
            user.schoolId,
            { studentId: student.id }
          )
          console.log('Attendance records found:', attendanceHistory.length)
          
          const lastAttendance = attendanceHistory[0]?.checkInDate
          const totalAttendances = attendanceHistory.length
          
          if (lastAttendance) {
            console.log('Last attendance date:', lastAttendance)
          }
          
          const result = {
            ...student,
            totalCredits,
            lastAttendance,
            totalAttendances,
            creditsByPackage
          }
          
          console.log('Final student data:', {
            name: `${student.firstName} ${student.lastName}`,
            totalCredits: result.totalCredits,
            totalAttendances: result.totalAttendances,
            packagesCount: result.creditsByPackage?.length || 0
          })
          
          return result
          
        } catch (error) {
          console.error(`Error loading details for student ${student.id}:`, error)
          return {
            ...student,
            totalCredits: 0,
            lastAttendance: undefined,
            totalAttendances: 0,
            creditsByPackage: []
          }
        }
      })
    )
    
    console.log('\n=== Summary ===')
    console.log('Students with details loaded:', studentsWithDetails.length)
    console.log('Students with credits:', studentsWithDetails.filter(s => (s.totalCredits || 0) > 0).length)
    console.log('Students without credits:', studentsWithDetails.filter(s => (s.totalCredits || 0) === 0).length)
    
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
      console.log('\n=== Starting search ===')
      console.log('Search term:', searchTerm)
      
      const results = await studentService.searchStudents(user.schoolId, searchTerm)
      console.log('Search results found:', results.length)
      
      // Get additional details for search results
      const resultsWithDetails = await Promise.all(
        results.map(async (student) => {
          try {
            console.log(`\nLoading details for search result: ${student.firstName} ${student.lastName}`)
            
            const credits = await creditService.getStudentAllCoursesCredits(student.id)
            const totalCredits = credits.reduce((sum, credit) => sum + credit.remainingCredits, 0)
            const creditsByPackage = credits.map(credit => ({
              courseName: credit.courseName,
              packageName: credit.packageName,
              remainingCredits: credit.remainingCredits,
              expiryDate: credit.expiryDate
            }))
            
            const attendanceHistory = await attendanceService.getAttendanceHistory(
              user.schoolId,
              { studentId: student.id }
            )
            const lastAttendance = attendanceHistory[0]?.checkInDate
            const totalAttendances = attendanceHistory.length
            
            return {
              ...student,
              totalCredits,
              lastAttendance,
              totalAttendances,
              creditsByPackage
            }
          } catch (error) {
            console.error(`Error loading details for student ${student.id}:`, error)
            return {
              ...student,
              totalCredits: 0,
              lastAttendance: undefined,
              totalAttendances: 0,
              creditsByPackage: []
            }
          }
        })
      )
      
      console.log('Search results with details:', resultsWithDetails.length)
      setStudents(resultsWithDetails)
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

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { bg: 'bg-green-100', text: 'text-green-700', label: 'กำลังเรียน' },
      inactive: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'พักการเรียน' },
      graduated: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'จบการศึกษา' },
      suspended: { bg: 'bg-red-100', text: 'text-red-700', label: 'พักการเรียน' }
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    )
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      นักเรียน
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ระดับชั้น
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative">
                      เครดิตคงเหลือ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      เรียนครั้งสุดท้าย
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      การดำเนินการ
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {students.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                              <span className="text-primary-600 font-medium">
                                {student.firstName[0]}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {student.firstName} {student.lastName}
                              {student.nickname && ` (${student.nickname})`}
                            </div>
                            <div className="text-sm text-gray-500">
                              {student.phone || '-'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {student.currentGrade}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="relative group">
                          <div className="flex items-center cursor-help">
                            <CreditCard className="w-4 h-4 mr-1.5 text-gray-400" />
                            <span className={`text-sm font-medium ${
                              student.totalCredits === 0 || (student.totalCredits && student.totalCredits < 3) ? 'text-red-600' : 
                              'text-gray-900'
                            }`}>
                              {student.totalCredits || 0} ครั้ง
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            เรียนไปแล้ว {student.totalAttendances || 0} ครั้ง
                          </div>
                          
                          {/* Tooltip */}
                          {student.creditsByPackage && student.creditsByPackage.length > 0 && (
                            <div className="invisible group-hover:visible absolute z-50 left-0 bottom-full mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg">
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
                        <div className="flex items-center text-sm text-gray-500">
                          <Calendar className="w-4 h-4 mr-1.5" />
                          {formatLastAttendance(student.lastAttendance)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-2">
                          <Link
                            to={`/students/${student.id}`}
                            className="p-1.5 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-md transition-colors"
                            title="ดูรายละเอียด"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => navigate(`/credits/purchase?studentId=${student.id}`)}
                            className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-md transition-colors"
                            title="ซื้อแพ็คเกจ"
                          >
                            <ShoppingBag className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default StudentsPage