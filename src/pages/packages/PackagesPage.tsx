// src/pages/packages/PackagesPage.tsx
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical,
  CreditCard,
  Calendar,
  TrendingUp,
  Tag,
  Edit,
  Trash2,
  Star,
  Award
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import * as packageService from '../../services/package'
import * as courseService from '../../services/course'
import toast from 'react-hot-toast'
import Layout from '../../components/layout/Layout'

const PackagesPage = () => {
  const { user } = useAuthStore()
  const [packages, setPackages] = useState<packageService.CreditPackage[]>([])
  const [courses, setCourses] = useState<courseService.Course[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCourse, setSelectedCourse] = useState<string>('all')
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [packageToDelete, setPackageToDelete] = useState<packageService.CreditPackage | null>(null)

  useEffect(() => {
    if (user?.schoolId) {
      loadData()
    }
  }, [user?.schoolId, selectedCourse])

  const loadData = async () => {
    if (!user?.schoolId) return
    
    try {
      setLoading(true)
      
      // Load courses for filter
      const coursesData = await courseService.getCourses(user.schoolId, 'active')
      setCourses(coursesData)
      
      // Load packages
      const packagesData = await packageService.getPackages(
        user.schoolId,
        selectedCourse === 'all' ? undefined : selectedCourse,
        true
      )
      setPackages(packagesData)
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('ไม่สามารถโหลดข้อมูลได้')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!packageToDelete) return
    
    try {
      await packageService.deletePackage(packageToDelete.id)
      toast.success('ลบแพ็คเกจสำเร็จ')
      setDeleteModalOpen(false)
      setPackageToDelete(null)
      loadData()
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการลบแพ็คเกจ')
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price)
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="md:flex md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">แพ็คเกจเครดิต</h1>
            <p className="mt-1 text-sm text-gray-500">
              จัดการแพ็คเกจเครดิตสำหรับแต่ละวิชา
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex space-x-3">
            <Link
              to="/credits/purchase"
              className="btn-secondary inline-flex items-center"
            >
              <CreditCard className="w-5 h-5 mr-2" />
              ขายแพ็คเกจ
            </Link>
            <Link
              to="/packages/add"
              className="btn-primary inline-flex items-center"
            >
              <Plus className="w-5 h-5 mr-2" />
              เพิ่มแพ็คเกจ
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Course Filter */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                กรองตามวิชา
              </label>
              <select
                className="input-base"
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
              >
                <option value="all">ทุกวิชา</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Summary Stats */}
            <div className="flex items-end space-x-6">
              <div>
                <p className="text-sm text-gray-500">แพ็คเกจทั้งหมด</p>
                <p className="text-2xl font-semibold text-gray-900">{packages.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">ขายได้เดือนนี้</p>
                <p className="text-2xl font-semibold text-green-600">฿25,500</p>
              </div>
            </div>
          </div>
        </div>

        {/* Packages Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="spinner spinner-primary w-8 h-8"></div>
          </div>
        ) : packages.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">ยังไม่มีแพ็คเกจ</h3>
            <p className="text-gray-500 mb-4">เริ่มต้นด้วยการสร้างแพ็คเกจแรก</p>
            <Link
              to="/packages/add"
              className="btn-primary inline-flex items-center"
            >
              <Plus className="w-5 h-5 mr-2" />
              เพิ่มแพ็คเกจ
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
              >
                {/* Popular/Recommended Badge */}
                {pkg.popular && (
                  <div className="absolute top-0 right-0 bg-orange-500 text-white px-3 py-1 text-xs font-medium rounded-bl-lg flex items-center">
                    <Star className="w-3 h-3 mr-1" />
                    ยอดนิยม
                  </div>
                )}
                {pkg.recommended && !pkg.popular && (
                  <div className="absolute top-0 right-0 bg-blue-500 text-white px-3 py-1 text-xs font-medium rounded-bl-lg flex items-center">
                    <Award className="w-3 h-3 mr-1" />
                    แนะนำ
                  </div>
                )}

                <div className="p-6">
                  {/* Course Name */}
                  <p className="text-xs text-gray-500 mb-2">{pkg.courseName}</p>

                  {/* Package Name */}
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    {pkg.name}
                  </h3>

                  {/* Credits */}
                  <div className="flex items-baseline mb-4">
                    <span className="text-3xl font-bold text-primary-600">
                      {pkg.credits}
                    </span>
                    <span className="text-sm text-gray-500 ml-2">ครั้ง</span>
                    {pkg.bonusCredits > 0 && (
                      <span className="ml-2 text-sm text-green-600">
                        +{pkg.bonusCredits} โบนัส
                      </span>
                    )}
                  </div>

                  {/* Price */}
                  <div className="mb-4">
                    <p className="text-2xl font-bold text-gray-900">
                      {formatPrice(pkg.price)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatPrice(pkg.pricePerCredit)}/ครั้ง
                    </p>
                  </div>

                  {/* Validity */}
                  <div className="flex items-center text-sm text-gray-600 mb-4">
                    <Calendar className="w-4 h-4 mr-1" />
                    {pkg.validityDescription}
                  </div>

                  {/* Description */}
                  {pkg.description && (
                    <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                      {pkg.description}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <Link
                      to={`/packages/${pkg.id}/edit`}
                      className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      แก้ไข
                    </Link>
                    <button
                      onClick={() => {
                        setPackageToDelete(pkg)
                        setDeleteModalOpen(true)
                      }}
                      className="text-red-600 hover:text-red-700 text-sm font-medium flex items-center"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      ลบ
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Links */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/credits/history"
            className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow flex items-center justify-between group"
          >
            <div>
              <p className="text-sm text-gray-500">ดูประวัติ</p>
              <p className="font-medium text-gray-900">การซื้อแพ็คเกจ</p>
            </div>
            <TrendingUp className="w-8 h-8 text-gray-400 group-hover:text-primary-500" />
          </Link>

          <Link
            to="/credits/report"
            className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow flex items-center justify-between group"
          >
            <div>
              <p className="text-sm text-gray-500">รายงาน</p>
              <p className="font-medium text-gray-900">ยอดขายแพ็คเกจ</p>
            </div>
            <Tag className="w-8 h-8 text-gray-400 group-hover:text-primary-500" />
          </Link>

          <Link
            to="/students"
            className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow flex items-center justify-between group"
          >
            <div>
              <p className="text-sm text-gray-500">จัดการ</p>
              <p className="font-medium text-gray-900">เครดิตนักเรียน</p>
            </div>
            <CreditCard className="w-8 h-8 text-gray-400 group-hover:text-primary-500" />
          </Link>
        </div>

        {/* Delete Confirmation Modal */}
        {deleteModalOpen && packageToDelete && (
          <>
            <div 
              className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75"
              onClick={() => setDeleteModalOpen(false)}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-lg max-w-md w-full p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  ยืนยันการลบแพ็คเกจ
                </h3>
                <p className="text-gray-500 mb-6">
                  คุณแน่ใจหรือไม่ที่จะลบแพ็คเกจ <strong>{packageToDelete.name}</strong>? 
                  การดำเนินการนี้ไม่สามารถย้อนกลับได้
                </p>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setDeleteModalOpen(false)}
                    className="btn-secondary"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={handleDelete}
                    className="btn-primary bg-red-600 hover:bg-red-700 focus:ring-red-500"
                  >
                    ลบแพ็คเกจ
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

export default PackagesPage