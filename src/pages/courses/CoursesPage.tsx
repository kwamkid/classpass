// src/pages/courses/CoursesPage.tsx
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical,
  BookOpen,
  Users
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import * as courseService from '../../services/course'
import * as creditService from '../../services/studentCredit'
import toast from 'react-hot-toast'
import Layout from '../../components/layout/Layout'

const CoursesPage = () => {
  const { user } = useAuthStore()
  const [courses, setCourses] = useState<courseService.Course[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('active')
  const [courseStudentCounts, setCourseStudentCounts] = useState<Record<string, number>>({})

  // Load courses
  useEffect(() => {
    if (user?.schoolId) {
      loadCourses()
    }
  }, [user?.schoolId, categoryFilter, statusFilter])

  const loadCourses = async () => {
  if (!user?.schoolId) return
  
  console.log('Loading courses for schoolId:', user.schoolId)
  
  try {
    setLoading(true)
    const data = await courseService.getCourses(
      user.schoolId,
      statusFilter === 'all' ? undefined : statusFilter
    )
    
    // Filter by category if needed
    let filteredData = data
    if (categoryFilter !== 'all') {
      filteredData = data.filter(course => course.category === categoryFilter)
    }
    
    console.log('Courses loaded:', filteredData)
    setCourses(filteredData)
    
    // Load student counts for all courses
    const courseIds = filteredData.map(course => course.id)
    await loadCourseStudentCounts(courseIds)
    
  } catch (error) {
    console.error('Error loading courses:', error)
    toast.error('ไม่สามารถโหลดข้อมูลวิชาเรียนได้')
  } finally {
    setLoading(false)
  }
}

  const loadCourseStudentCounts = async (courseIds: string[]) => {
  if (!user?.schoolId || courseIds.length === 0) return
  
  try {
    const counts: Record<string, number> = {}
    
    // Load student counts for each course
    await Promise.all(
      courseIds.map(async (courseId) => {
        try {
          // Get all active credits for this course
          const courseCredits = await creditService.getSchoolCredits(
            user.schoolId,
            { 
              courseId: courseId, 
              status: 'active' 
            }
          )
          
          // Filter only credits with remaining balance
          const activeCredits = courseCredits.filter(credit => credit.remainingCredits > 0)
          
          // Get unique student IDs
          const uniqueStudentIds = [...new Set(activeCredits.map(credit => credit.studentId))]
          
          counts[courseId] = uniqueStudentIds.length
        } catch (error) {
          console.error(`Error loading student count for course ${courseId}:`, error)
          counts[courseId] = 0
        }
      })
    )
    
    console.log('Course student counts:', counts)
    setCourseStudentCounts(counts)
  } catch (error) {
    console.error('Error loading course student counts:', error)
  }
}

  // Search courses
  const handleSearch = async () => {
  if (!user?.schoolId) return
  
  if (searchTerm.trim()) {
    setLoading(true)
    try {
      const results = await courseService.searchCourses(user.schoolId, searchTerm)
      setCourses(results)
      
      // Load student counts for search results
      const courseIds = results.map(course => course.id)
      await loadCourseStudentCounts(courseIds)
      
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการค้นหา')
    } finally {
      setLoading(false)
    }
  } else {
    loadCourses()
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
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
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

  return (
    <Layout>
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="md:flex md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">วิชาเรียน</h1>
            <p className="mt-1 text-sm text-gray-500">
              จัดการวิชาเรียนทั้งหมด {courses.length} วิชา
            </p>
          </div>
          <div className="mt-4 md:mt-0 md:ml-4">
            <Link
              to="/courses/add"
              className="btn-primary inline-flex items-center"
            >
              <Plus className="w-5 h-5 mr-2" />
              เพิ่มวิชาเรียน
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="ค้นหาด้วยชื่อวิชา, รหัสวิชา..."
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

            {/* Category Filter */}
            <div>
              <select
                className="input-base"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">ทุกประเภท</option>
                <option value="academic">วิชาการ</option>
                <option value="sport">กีฬา</option>
                <option value="art">ศิลปะ</option>
                <option value="language">ภาษา</option>
                <option value="other">อื่นๆ</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <select
                className="input-base"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="active">เปิดสอน</option>
                <option value="inactive">ปิดสอน</option>
                <option value="all">ทั้งหมด</option>
              </select>
            </div>
          </div>
        </div>

        {/* Courses Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="spinner spinner-primary w-8 h-8"></div>
          </div>
        ) : courses.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">ยังไม่มีวิชาเรียน</h3>
            <p className="text-gray-500 mb-4">เริ่มต้นด้วยการเพิ่มวิชาเรียนแรก</p>
            <Link
              to="/courses/add"
              className="btn-primary inline-flex items-center"
            >
              <Plus className="w-5 h-5 mr-2" />
              เพิ่มวิชาเรียน
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <Link
                key={course.id}
                to={`/courses/${course.id}`}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                {/* Course Image */}
                <div className="h-48 bg-gradient-to-br from-primary-100 to-primary-50 relative">
                  {course.coverImage ? (
                    <img 
                      src={course.coverImage} 
                      alt={course.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <BookOpen className="w-16 h-16 text-primary-400" />
                    </div>
                  )}
                  <div className="absolute top-3 right-3">
                    {getCategoryBadge(course.category)}
                  </div>
                </div>

                {/* Course Info */}
                <div className="p-5">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">
                        {course.name}
                      </h3>
                      <p className="text-sm text-gray-500">รหัส: {course.code}</p>
                    </div>
                    {getStatusBadge(course.status)}
                  </div>

                  <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                    {course.description || 'ไม่มีคำอธิบาย'}
                  </p>

                  {/* Course Details */}
                  <div className="flex items-center text-gray-600 text-sm">
                    <Users className="w-4 h-4 mr-2" />
                    <span>นักเรียน {courseStudentCounts[course.id] || 0} คน</span>
                  </div>

                  {/* Action Button */}
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <span className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                      ดูรายละเอียด →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}

export default CoursesPage