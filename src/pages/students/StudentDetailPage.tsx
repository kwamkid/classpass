import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  Edit, 
  User,
  Phone,
  Mail,
  Calendar,
  MapPin,
  Users,
  CreditCard,
  CheckCircle,
  AlertCircle,
  MoreVertical,
  Trash2,
  ShoppingBag,
  Clock,
  TrendingDown
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import * as studentService from '../../services/student'
import * as creditService from '../../services/studentCredit'
import * as attendanceService from '../../services/attendance'
import Layout from '../../components/layout/Layout'
import toast from 'react-hot-toast'

interface CreditDetail {
  id: string
  courseName: string
  packageName: string
  totalCredits: number
  usedCredits: number
  remainingCredits: number
  purchaseDate: string
  expiryDate?: string
  daysUntilExpiry?: number
  status: string
}

const StudentDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [student, setStudent] = useState<studentService.Student | null>(null)
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  
  // Additional data
  const [creditDetails, setCreditDetails] = useState<CreditDetail[]>([])
  const [totalAttendances, setTotalAttendances] = useState(0)
  const [lastAttendance, setLastAttendance] = useState<string | null>(null)
  const [loadingCredits, setLoadingCredits] = useState(true)

  useEffect(() => {
    if (id) {
      loadStudent()
      loadAdditionalData()
    }
  }, [id])

  const loadStudent = async () => {
    if (!id) return
    
    try {
      setLoading(true)
      const data = await studentService.getStudent(id)
      if (data) {
        setStudent(data)
      } else {
        toast.error('ไม่พบข้อมูลนักเรียน')
        navigate('/students')
      }
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล')
    } finally {
      setLoading(false)
    }
  }

  const loadAdditionalData = async () => {
    if (!id || !user?.schoolId) return
    
    try {
      setLoadingCredits(true)
      
      console.log('Loading additional data for student:', id)
      
      // Use centralized function to get all active credits
      const credits = await creditService.getStudentAllActiveCredits(id, user.schoolId)
      console.log('Active credits found:', credits.length)
      
      // Map to detail format
      setCreditDetails(credits.map(credit => ({
        id: credit.id,
        courseName: credit.courseName,
        packageName: credit.packageName,
        totalCredits: credit.totalCredits,
        usedCredits: credit.usedCredits,
        remainingCredits: credit.remainingCredits,
        purchaseDate: credit.purchaseDate,
        expiryDate: credit.expiryDate,
        daysUntilExpiry: credit.daysUntilExpiry,
        status: credit.status
      })))
      
      // Load attendance
      const attendanceHistory = await attendanceService.getAttendanceHistory(
        user.schoolId,
        { studentId: id }
      )
      console.log('Attendance records found:', attendanceHistory.length)
      
      setTotalAttendances(attendanceHistory.length)
      setLastAttendance(attendanceHistory[0]?.checkInDate || null)
      
    } catch (error) {
      console.error('Error loading additional data:', error)
    } finally {
      setLoadingCredits(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!student) return
    
    try {
      await studentService.updateStudent(student.id, { status: newStatus as 'active' | 'inactive' | 'graduated' | 'suspended' })
      toast.success('อัพเดทสถานะสำเร็จ')
      loadStudent()
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการอัพเดทสถานะ')
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

  const handleDelete = async () => {
    if (!student) return
    
    try {
      setDeleting(true)
      await studentService.deleteStudent(student.id)
      toast.success('ลบข้อมูลนักเรียนสำเร็จ')
      navigate('/students')
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการลบข้อมูล')
      setDeleting(false)
    }
  }

  const calculateAge = (birthDate?: string) => {
    if (!birthDate) return '-'
    
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    
    return `${age} ปี`
  }

  const totalCredits = creditDetails.reduce((sum, credit) => sum + credit.remainingCredits, 0)
  const attendanceRate = totalCredits > 0 ? Math.round((totalAttendances / (totalAttendances + totalCredits)) * 100) : 0

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="spinner spinner-primary w-8 h-8"></div>
        </div>
      </Layout>
    )
  }

  if (!student) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-500">ไม่พบข้อมูลนักเรียน</p>
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
            to="/students"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            กลับไปหน้ารายชื่อนักเรียน
          </Link>
          
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                ข้อมูลนักเรียน
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                รหัสนักเรียน: {student.studentCode}
              </p>
            </div>
            
            {/* Actions */}
            <div className="flex items-center space-x-3">
              <Link
                to={`/students/${student.id}/edit`}
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
                        พักการเรียน
                      </button>
                      <button
                        onClick={() => {
                          handleStatusChange('graduated')
                          setMenuOpen(false)
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        จบการศึกษา
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
                        ลบข้อมูล
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
            {/* Personal Information */}
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
                <User className="w-5 h-5 mr-2 text-gray-500" />
                ข้อมูลส่วนตัว
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-500">ชื่อ-นามสกุล</p>
                  <p className="text-base font-medium text-gray-900">
                    {student.firstName} {student.lastName}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">ชื่อเล่น</p>
                  <p className="text-base font-medium text-gray-900">
                    {student.nickname || '-'}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">วันเกิด</p>
                  <p className="text-base font-medium text-gray-900">
                    {student.birthDate 
                      ? new Date(student.birthDate).toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })
                      : '-'
                    }
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">อายุ</p>
                  <p className="text-base font-medium text-gray-900">
                    {calculateAge(student.birthDate)}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">เพศ</p>
                  <p className="text-base font-medium text-gray-900">
                    {student.gender === 'male' ? 'ชาย' : 
                     student.gender === 'female' ? 'หญิง' : 'อื่นๆ'}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">ระดับชั้น</p>
                  <p className="text-base font-medium text-gray-900">
                    {student.currentGrade}
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
                <Phone className="w-5 h-5 mr-2 text-gray-500" />
                ข้อมูลติดต่อ
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-start">
                  <Phone className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">เบอร์โทรศัพท์</p>
                    <p className="text-base font-medium text-gray-900">
                      {student.phone || '-'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <Mail className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">อีเมล</p>
                    <p className="text-base font-medium text-gray-900">
                      {student.email || '-'}
                    </p>
                  </div>
                </div>
                
                {student.address && (
                  <div className="flex items-start">
                    <MapPin className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">ที่อยู่</p>
                      <p className="text-base font-medium text-gray-900">
                        {student.address.houseNumber} {student.address.street}
                        <br />
                        {student.address.subdistrict} {student.address.district}
                        <br />
                        {student.address.province} {student.address.postalCode}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Parent Information */}
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
                <Users className="w-5 h-5 mr-2 text-gray-500" />
                ข้อมูลผู้ปกครอง
              </h2>
              
              {student.parents && student.parents.length > 0 ? (
                <div className="space-y-4">
                  {student.parents.map((parent, index) => (
                    <div key={index} className="border-l-4 border-primary-200 pl-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-gray-900">
                          {parent.firstName} {parent.lastName}
                        </p>
                        <span className="text-sm text-gray-500">
                          {parent.type === 'father' ? 'บิดา' :
                           parent.type === 'mother' ? 'มารดา' : 'ผู้ปกครอง'}
                        </span>
                      </div>
                      <div className="space-y-1 text-sm">
                        <p className="text-gray-600">
                          <Phone className="w-4 h-4 inline mr-1" />
                          {parent.phone}
                        </p>
                        {parent.email && (
                          <p className="text-gray-600">
                            <Mail className="w-4 h-4 inline mr-1" />
                            {parent.email}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">ไม่มีข้อมูลผู้ปกครอง</p>
              )}
            </div>

            {/* Credit Details */}
            <div className="bg-white shadow-sm rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-medium text-gray-900 flex items-center">
                  <CreditCard className="w-5 h-5 mr-2 text-gray-500" />
                  รายละเอียดเครดิต
                </h2>
                <Link
                  to={`/credits/purchase?studentId=${student.id}`}
                  className="btn-primary text-sm inline-flex items-center"
                >
                  <ShoppingBag className="w-4 h-4 mr-1.5" />
                  ซื้อแพ็คเกจเพิ่ม
                </Link>
              </div>
              
              {loadingCredits ? (
                <div className="flex justify-center py-8">
                  <div className="spinner spinner-primary w-6 h-6"></div>
                </div>
              ) : creditDetails.length > 0 ? (
                <div className="space-y-4">
                  {creditDetails.map((credit) => (
                    <div key={credit.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{credit.courseName}</h4>
                          <p className="text-sm text-gray-600 mt-1">{credit.packageName}</p>
                          
                          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <p className="text-xs text-gray-500">คงเหลือ</p>
                              <p className={`text-lg font-semibold ${
                                credit.remainingCredits < 3 ? 'text-red-600' : 'text-gray-900'
                              }`}>
                                {credit.remainingCredits} ครั้ง
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">ใช้ไปแล้ว</p>
                              <p className="text-lg font-semibold text-gray-900">
                                {credit.usedCredits} ครั้ง
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">ซื้อเมื่อ</p>
                              <p className="text-sm text-gray-900">
                                {new Date(credit.purchaseDate).toLocaleDateString('th-TH', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </p>
                            </div>
                            {credit.expiryDate && (
                              <div>
                                <p className="text-xs text-gray-500">หมดอายุ</p>
                                <p className={`text-sm ${
                                  credit.daysUntilExpiry && credit.daysUntilExpiry < 30 
                                    ? 'text-orange-600 font-medium' 
                                    : 'text-gray-900'
                                }`}>
                                  {new Date(credit.expiryDate).toLocaleDateString('th-TH', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </p>
                              </div>
                            )}
                          </div>
                          
                          {/* Progress bar */}
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                              <span>ใช้ไป {Math.round((credit.usedCredits / credit.totalCredits) * 100)}%</span>
                              <span>{credit.usedCredits}/{credit.totalCredits}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-primary-500 h-2 rounded-full"
                                style={{ width: `${(credit.usedCredits / credit.totalCredits) * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                        
                        {credit.daysUntilExpiry && credit.daysUntilExpiry < 30 && (
                          <div className="ml-4">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                              <Clock className="w-3 h-3 mr-1" />
                              {credit.daysUntilExpiry} วัน
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">ยังไม่มีเครดิต</p>
                  <Link
                    to={`/credits/purchase?studentId=${student.id}`}
                    className="mt-2 text-primary-600 hover:text-primary-700 font-medium"
                  >
                    ซื้อแพ็คเกจ
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status Card */}
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">สถานะ</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">สถานะการเรียน</span>
                  {getStatusBadge(student.status)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">วันที่ลงทะเบียน</span>
                  <span className="text-sm font-medium">
                    {new Date(student.createdAt).toLocaleDateString('th-TH')}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">สถิติ</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <CreditCard className="w-5 h-5 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-500">เครดิตคงเหลือ</span>
                  </div>
                  <span className={`text-lg font-semibold ${
                    totalCredits < 3 ? 'text-red-600' : 'text-primary-600'
                  }`}>
                    {totalCredits}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Calendar className="w-5 h-5 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-500">เข้าเรียนแล้ว</span>
                  </div>
                  <span className="text-lg font-semibold text-green-600">{totalAttendances}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-500">อัตราเข้าเรียน</span>
                  </div>
                  <span className="text-lg font-semibold text-blue-600">{attendanceRate}%</span>
                </div>
                {lastAttendance && (
                  <div className="pt-3 border-t">
                    <p className="text-xs text-gray-500 mb-1">เรียนครั้งสุดท้าย</p>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(lastAttendance).toLocaleDateString('th-TH', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">การดำเนินการ</h3>
              <div className="space-y-3">
                <Link
                  to={`/credits/purchase?studentId=${student.id}`}
                  className="w-full btn-primary text-center"
                >
                  ซื้อแพ็คเกจ
                </Link>
                <Link
                  to={`/attendance?studentId=${student.id}`}
                  className="w-full btn-secondary text-center"
                >
                  ดูประวัติเข้าเรียน
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
                    ยืนยันการลบข้อมูล
                  </h3>
                </div>
                
                <p className="text-gray-500 mb-6">
                  คุณแน่ใจหรือไม่ที่จะลบข้อมูลของ <strong>{student.firstName} {student.lastName}</strong>? 
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
                        ลบข้อมูล
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

export default StudentDetailPage