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
  Trash2
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import * as studentService from '../../services/student'
import Layout from '../../components/layout/Layout'
import toast from 'react-hot-toast'

const StudentDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [student, setStudent] = useState<studentService.Student | null>(null)
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (id) {
      loadStudent()
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

  const calculateAge = (birthDate: string) => {
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    
    return `${age} ปี`
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
                    {new Date(student.birthDate).toLocaleDateString('th-TH', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
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
                  <span className="text-lg font-semibold text-primary-600">24</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Calendar className="w-5 h-5 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-500">เข้าเรียนแล้ว</span>
                  </div>
                  <span className="text-lg font-semibold text-green-600">48</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-500">อัตราเข้าเรียน</span>
                  </div>
                  <span className="text-lg font-semibold text-blue-600">92%</span>
                </div>
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