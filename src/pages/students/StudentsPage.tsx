import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical,
  Phone,
  Mail,
  Calendar,
  User
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import * as studentService from '../../services/student'
import toast from 'react-hot-toast'
import Layout from '../../components/layout/Layout'

const StudentsPage = () => {
  const { user } = useAuthStore()
  const [students, setStudents] = useState<studentService.Student[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Load students
  useEffect(() => {
    if (user?.schoolId) {
      loadStudents()
    }
  }, [user?.schoolId, statusFilter])

  const loadStudents = async () => {
    if (!user?.schoolId) return
    
    try {
      setLoading(true)
      const data = await studentService.getStudents(
        user.schoolId,
        statusFilter === 'all' ? undefined : statusFilter
      )
      setStudents(data)
    } catch (error) {
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
        const results = await studentService.searchStudents(user.schoolId, searchTerm)
        setStudents(results)
      } catch (error) {
        toast.error('เกิดข้อผิดพลาดในการค้นหา')
      } finally {
        setLoading(false)
      }
    } else {
      loadStudents()
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
                  placeholder="ค้นหาด้วยชื่อ, รหัสนักเรียน..."
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
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      รหัส
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ชื่อ-นามสกุล
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ระดับชั้น
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      เบอร์โทร
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      สถานะ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      การดำเนินการ
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {students.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {student.studentCode}
                      </td>
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
                            </div>
                            <div className="text-sm text-gray-500">
                              {student.nickname && `(${student.nickname})`}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {student.currentGrade}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {student.phone || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(student.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          to={`/students/${student.id}`}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          ดูรายละเอียด
                        </Link>
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