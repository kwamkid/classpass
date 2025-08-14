// src/pages/packages/PackagesPage.tsx
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Package,
  CheckCircle,
  Star,
  TrendingUp,
  Award,
  AlertCircle,
  BookOpen,
  Clock
} from 'lucide-react'
import Layout from '../../components/layout/Layout'
import { useAuthStore } from '../../stores/authStore'
import * as packageService from '../../services/package'
import * as courseService from '../../services/course'
import toast from 'react-hot-toast'

interface EditPackageModal {
  isOpen: boolean
  package: packageService.CreditPackage | null
}

const PackagesPage = () => {
  const { user } = useAuthStore()
  const [packages, setPackages] = useState<packageService.CreditPackage[]>([])
  const [courses, setCourses] = useState<courseService.Course[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [editModal, setEditModal] = useState<EditPackageModal>({ isOpen: false, package: null })
  
  // Form state for edit
  const [editForm, setEditForm] = useState({
    courseId: '',
    name: '',
    description: '',
    credits: 0,
    price: 0,
    validityType: 'months' as 'months' | 'days' | 'unlimited',
    validityValue: 0,
    bonusCredits: 0,
    popular: false,
    recommended: false
  })

  useEffect(() => {
    if (user?.schoolId) {
      loadData()
    }
  }, [user?.schoolId])

  const loadData = async () => {
    if (!user?.schoolId) return
    
    try {
      setLoading(true)
      
      // Load courses first
      const coursesData = await courseService.getCourses(user.schoolId)
      setCourses(coursesData)
      
      // Load all packages
      const packagesData = await packageService.getPackages(user.schoolId)
      setPackages(packagesData)
      
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('ไม่สามารถโหลดข้อมูลได้')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await packageService.deletePackage(id)
      toast.success('ลบแพ็คเกจสำเร็จ')
      setShowDeleteConfirm(null)
      loadData()
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการลบแพ็คเกจ')
    }
  }

  const openEditModal = (pkg: packageService.CreditPackage) => {
    setEditForm({
      courseId: pkg.courseId || '',
      name: pkg.name || '',
      description: pkg.description || '',
      credits: pkg.credits || 0,
      price: pkg.price || 0,
      validityType: pkg.validityType || 'months',
      validityValue: pkg.validityValue || 0,
      bonusCredits: pkg.bonusCredits || 0,
      popular: pkg.popular || false,
      recommended: pkg.recommended || false
    })
    
    setEditModal({ isOpen: true, package: pkg })
  }

  const handleUpdatePackage = async () => {
    if (!editModal.package) return
    
    try {
      // Don't need to pass courseName anymore
      const updateData = {
        ...editForm
      }
      
      await packageService.updatePackage(editModal.package.id, updateData)
      toast.success('อัพเดทแพ็คเกจสำเร็จ')
      setEditModal({ isOpen: false, package: null })
      loadData()
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการอัพเดทแพ็คเกจ')
    }
  }

  // Helper function to get course name from courseId
  const getCourseName = (courseId: string) => {
    const course = courses.find(c => c.id === courseId)
    return course?.name || 'ไม่พบวิชา'
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('th-TH').format(price)
  }

  // Filter packages by search term
  const filteredPackages = packages.filter(pkg => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    const courseName = getCourseName(pkg.courseId)
    
    return (
      pkg.name.toLowerCase().includes(search) ||
      pkg.description?.toLowerCase().includes(search) ||
      courseName.toLowerCase().includes(search)
    )
  })

  // Group packages by course
  const groupedPackages = filteredPackages.reduce((groups, pkg) => {
    const courseId = pkg.courseId
    const courseName = getCourseName(courseId)
    
    if (!groups[courseId]) {
      groups[courseId] = {
        courseId,
        courseName,
        packages: []
      }
    }
    
    groups[courseId].packages.push(pkg)
    return groups
  }, {} as Record<string, { courseId: string; courseName: string; packages: packageService.CreditPackage[] }>)

  // Sort groups by course name
  const sortedGroups = Object.values(groupedPackages).sort((a, b) => 
    a.courseName.localeCompare(b.courseName, 'th')
  )

  // Calculate summary stats
  const totalPackages = packages.length
  const activePackages = packages.filter(p => p.status === 'active').length

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
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">แพ็คเกจเครดิต</h1>
              <p className="mt-1 text-sm text-gray-500">
                จัดการแพ็คเกจและราคาสำหรับแต่ละวิชา
              </p>
            </div>
            <div className="flex space-x-3">
              <Link
                to="/credits/history"
                className="btn-secondary inline-flex items-center"
              >
                <TrendingUp className="w-5 h-5 mr-2" />
                ประวัติการขาย
              </Link>
              <Link
                to="/packages/add"
                className="btn-primary inline-flex items-center"
              >
                <Plus className="w-5 h-5 mr-2" />
                สร้างแพ็คเกจ
              </Link>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">แพ็คเกจทั้งหมด</p>
                <p className="text-2xl font-semibold text-gray-900">{totalPackages}</p>
              </div>
              <Package className="w-8 h-8 text-gray-400" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">ใช้งานอยู่</p>
                <p className="text-2xl font-semibold text-green-600">{activePackages}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="ค้นหาแพ็คเกจ หรือวิชา..."
              className="input-base pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Packages List - Grouped by Course */}
        {sortedGroups.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'ไม่พบแพ็คเกจที่ค้นหา' : 'ยังไม่มีแพ็คเกจ'}
            </h3>
            <p className="text-gray-500 mb-4">
              {searchTerm ? 'ลองค้นหาด้วยคำอื่น' : 'เริ่มสร้างแพ็คเกจแรกของคุณ'}
            </p>
            {!searchTerm && (
              <Link
                to="/packages/add"
                className="btn-primary inline-flex items-center"
              >
                <Plus className="w-5 h-5 mr-2" />
                สร้างแพ็คเกจ
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {sortedGroups.map((group) => (
              <div key={group.courseId} className="bg-white rounded-lg shadow-sm overflow-hidden">
                {/* Course Header */}
                <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-3 border-b border-orange-600">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <BookOpen className="w-5 h-5 text-white" />
                      <h3 className="text-lg font-semibold text-white">{group.courseName}</h3>
                      <span className="bg-white/20 text-white px-2.5 py-0.5 rounded-full text-sm font-medium">
                        {group.packages.length} แพ็คเกจ
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Package List */}
                <div className="divide-y divide-gray-100">
                  {group.packages.map((pkg) => (
                    <div key={pkg.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        {/* Left: Package Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <h4 className="text-base font-medium text-gray-900 truncate">
                              {pkg.name}
                            </h4>
                            {pkg.popular && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 flex-shrink-0">
                                <Star className="w-3 h-3 mr-0.5" />
                                ยอดนิยม
                              </span>
                            )}
                            {pkg.recommended && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 flex-shrink-0">
                                <Award className="w-3 h-3 mr-0.5" />
                                แนะนำ
                              </span>
                            )}
                          </div>
                          
                          {pkg.description && (
                            <p className="text-sm text-gray-500 mt-1 truncate">{pkg.description}</p>
                          )}
                        </div>

                        {/* Center: Credits & Price */}
                        <div className="flex items-center gap-8 mx-6">
                          {/* Credits */}
                          <div className="text-center">
                            <div className="text-2xl font-bold text-gray-900">
                              {pkg.credits}
                              {pkg.bonusCredits > 0 && (
                                <span className="text-lg text-green-600 ml-1">+{pkg.bonusCredits}</span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500">ครั้ง</div>
                          </div>
                          
                          {/* Price */}
                          <div className="text-center">
                            <div className="text-2xl font-bold text-primary-600">
                              ฿{formatPrice(pkg.price)}
                            </div>
                            <div className="text-xs text-gray-500">
                              (฿{formatPrice(Math.round(pkg.pricePerCredit))}/ครั้ง)
                            </div>
                          </div>
                          
                          {/* Validity */}
                          <div className="flex items-center text-sm text-gray-500">
                            <Clock className="w-4 h-4 mr-1" />
                            <span>{pkg.validityDescription || 'ไม่มีกำหนด'}</span>
                          </div>
                        </div>

                        {/* Right: Status & Actions */}
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            pkg.status === 'active' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {pkg.status === 'active' ? 'ใช้งาน' : 'ปิด'}
                          </span>
                          
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEditModal(pkg)}
                              className="p-1.5 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded transition-colors"
                              title="แก้ไข"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm(pkg.id)}
                              className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="ลบ"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit Modal */}
        {editModal.isOpen && editModal.package && (
          <>
            <div 
              className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75"
              onClick={() => setEditModal({ isOpen: false, package: null })}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-6">
                    แก้ไขแพ็คเกจ
                  </h3>
                  
                  <div className="space-y-4">
                    {/* Course Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        วิชา
                      </label>
                      <select
                        className="input-base"
                        value={editForm.courseId}
                        onChange={(e) => setEditForm({ ...editForm, courseId: e.target.value })}
                      >
                        <option value="">เลือกวิชา</option>
                        {courses.map(course => (
                          <option key={course.id} value={course.id}>
                            {course.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Package Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ชื่อแพ็คเกจ
                      </label>
                      <input
                        type="text"
                        className="input-base"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        placeholder="เช่น แพ็คเกจประหยัด"
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        รายละเอียด (ไม่บังคับ)
                      </label>
                      <textarea
                        className="input-base"
                        rows={3}
                        value={editForm.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        placeholder="อธิบายรายละเอียดของแพ็คเกจ..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Credits */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          จำนวนเครดิต
                        </label>
                        <input
                          type="number"
                          className="input-base"
                          value={editForm.credits}
                          onChange={(e) => setEditForm({ ...editForm, credits: parseInt(e.target.value) || 0 })}
                          min="1"
                        />
                      </div>

                      {/* Bonus Credits */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          เครดิตโบนัส
                        </label>
                        <input
                          type="number"
                          className="input-base"
                          value={editForm.bonusCredits}
                          onChange={(e) => setEditForm({ ...editForm, bonusCredits: parseInt(e.target.value) || 0 })}
                          min="0"
                        />
                      </div>
                    </div>

                    {/* Price */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ราคา (บาท)
                      </label>
                      <input
                        type="number"
                        className="input-base"
                        value={editForm.price}
                        onChange={(e) => setEditForm({ ...editForm, price: parseInt(e.target.value) || 0 })}
                        min="0"
                      />
                    </div>

                    {/* Validity */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ระยะเวลาใช้งาน
                      </label>
                      <div className="grid grid-cols-2 gap-4">
                        <select
                          className="input-base"
                          value={editForm.validityType}
                          onChange={(e) => setEditForm({ ...editForm, validityType: e.target.value as any })}
                        >
                          <option value="unlimited">ไม่มีกำหนด</option>
                          <option value="days">กำหนดเป็นวัน</option>
                          <option value="months">กำหนดเป็นเดือน</option>
                        </select>
                        
                        {editForm.validityType !== 'unlimited' && (
                          <input
                            type="number"
                            className="input-base"
                            value={editForm.validityValue}
                            onChange={(e) => setEditForm({ ...editForm, validityValue: parseInt(e.target.value) || 0 })}
                            min="1"
                            placeholder={editForm.validityType === 'days' ? 'จำนวนวัน' : 'จำนวนเดือน'}
                          />
                        )}
                      </div>
                    </div>

                    {/* Flags */}
                    <div className="flex items-center space-x-6">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          checked={editForm.popular}
                          onChange={(e) => setEditForm({ ...editForm, popular: e.target.checked })}
                        />
                        <span className="ml-2 text-sm text-gray-700">ยอดนิยม</span>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          checked={editForm.recommended}
                          onChange={(e) => setEditForm({ ...editForm, recommended: e.target.checked })}
                        />
                        <span className="ml-2 text-sm text-gray-700">แนะนำ</span>
                      </label>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      onClick={() => setEditModal({ isOpen: false, package: null })}
                      className="btn-secondary"
                    >
                      ยกเลิก
                    </button>
                    <button
                      onClick={handleUpdatePackage}
                      className="btn-primary"
                    >
                      บันทึกการแก้ไข
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <>
            <div 
              className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75"
              onClick={() => setShowDeleteConfirm(null)}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-lg p-6 max-w-sm w-full">
                <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 text-center mb-2">
                  ยืนยันการลบแพ็คเกจ
                </h3>
                <p className="text-sm text-gray-500 text-center mb-6">
                  คุณแน่ใจหรือไม่ที่จะลบแพ็คเกจนี้? การกระทำนี้ไม่สามารถย้อนกลับได้
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowDeleteConfirm(null)}
                    className="btn-secondary flex-1"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={() => handleDelete(showDeleteConfirm)}
                    className="btn-danger flex-1"
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