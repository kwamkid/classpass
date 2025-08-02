import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { 
  ArrowLeft, 
  Save, 
  User,
  Phone,
  Mail,
  Calendar,
  Users,
  AlertCircle
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useOnboardingStore } from '../../stores/onboardingStore'
import * as studentService from '../../services/student'
import toast from 'react-hot-toast'
import Layout from '../../components/layout/Layout'

const AddStudentPage = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { completeStep, steps } = useOnboardingStore()
  const [loading, setLoading] = useState(false)
  const [existingStudents, setExistingStudents] = useState<studentService.Student[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    nickname: '',
    birthDate: '',
    gender: 'male' as 'male' | 'female' | 'other',
    currentGrade: '',
    phone: '',
    email: '',
    // Parent info
    parentName: '',
    parentPhone: '',
    parentEmail: '',
    parentRelation: 'mother' as 'father' | 'mother' | 'guardian'
  })

  const grades = [
    'อนุบาล 1', 'อนุบาล 2', 'อนุบาล 3',
    'ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6',
    'ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6',
    'อื่นๆ'
  ]

  useEffect(() => {
    checkExistingStudents()
  }, [])

  const checkExistingStudents = async () => {
    if (!user?.schoolId) return
    
    try {
      const students = await studentService.getStudents(user.schoolId)
      setExistingStudents(students)
      
      // If already have students, complete the step
      if (students.length > 0) {
        const studentStep = steps.find(s => s.id === 'add-student')
        if (studentStep && !studentStep.completed) {
          completeStep('add-student')
        }
      }
    } catch (error) {
      console.error('Error checking students:', error)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'กรุณากรอกชื่อ'
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'กรุณากรอกนามสกุล'
    }
    if (!formData.birthDate) {
      newErrors.birthDate = 'กรุณาเลือกวันเกิด'
    }
    if (!formData.currentGrade) {
      newErrors.currentGrade = 'กรุณาเลือกระดับชั้น'
    }
    if (!formData.parentName.trim()) {
      newErrors.parentName = 'กรุณากรอกชื่อผู้ปกครอง'
    }
    if (!formData.parentPhone.trim()) {
      newErrors.parentPhone = 'กรุณากรอกเบอร์โทรผู้ปกครอง'
    } else if (!/^0\d{9}$/.test(formData.parentPhone.replace(/-/g, ''))) {
      newErrors.parentPhone = 'เบอร์โทรไม่ถูกต้อง'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน')
      return
    }
    
    if (!user?.schoolId) {
      toast.error('ไม่พบข้อมูลโรงเรียน')
      return
    }
    
    try {
      setLoading(true)
      
      const studentData: studentService.CreateStudentData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        nickname: formData.nickname.trim(),
        birthDate: formData.birthDate,
        gender: formData.gender,
        currentGrade: formData.currentGrade,
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        parentName: formData.parentName.trim(),
        parentPhone: formData.parentPhone.trim()
      }
      
      const newStudent = await studentService.createStudent(user.schoolId, studentData)
      
      // Complete onboarding step if this is the first student
      if (existingStudents.length === 0) {
        completeStep('add-student')
        toast.success('เพิ่มนักเรียนคนแรกสำเร็จ! 🎉')
      } else {
        toast.success('เพิ่มนักเรียนสำเร็จ!')
      }
      
      navigate('/students')
    } catch (error) {
      console.error('Error creating student:', error)
      toast.error('เกิดข้อผิดพลาดในการเพิ่มนักเรียน')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <Link
            to="/students"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4 text-base"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            กลับไปหน้ารายชื่อนักเรียน
          </Link>
          
          <h1 className="text-3xl font-bold text-gray-900">เพิ่มนักเรียนใหม่</h1>
          <p className="mt-2 text-base text-gray-500">
            กรอกข้อมูลนักเรียนเพื่อเพิ่มเข้าสู่ระบบ
          </p>
        </div>

        {/* Show if first student */}
        {existingStudents.length === 0 && (
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-6 mb-8">
            <div className="flex">
              <Users className="w-6 h-6 text-purple-600 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-medium text-purple-900 mb-2">
                  เพิ่มนักเรียนคนแรกของคุณ! 🎓
                </h3>
                <p className="text-base text-purple-700">
                  นี่คือขั้นตอนสุดท้าย (4 จาก 4) ในการตั้งค่าเริ่มต้น
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Student Information */}
          <div className="bg-white shadow-sm rounded-lg p-6">
            <h2 className="text-xl font-medium text-gray-900 mb-6 flex items-center">
              <User className="w-6 h-6 mr-2 text-gray-500" />
              ข้อมูลนักเรียน
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* First Name */}
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">
                  ชื่อ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className={`input-base text-base ${errors.firstName ? 'input-error' : ''}`}
                  placeholder="ชื่อจริง"
                />
                {errors.firstName && (
                  <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
                )}
              </div>

              {/* Last Name */}
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">
                  นามสกุล <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className={`input-base text-base ${errors.lastName ? 'input-error' : ''}`}
                  placeholder="นามสกุล"
                />
                {errors.lastName && (
                  <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
                )}
              </div>

              {/* Nickname */}
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">
                  ชื่อเล่น
                </label>
                <input
                  type="text"
                  name="nickname"
                  value={formData.nickname}
                  onChange={handleChange}
                  className="input-base text-base"
                  placeholder="ชื่อเล่น"
                />
              </div>

              {/* Birth Date */}
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">
                  วันเกิด <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="date"
                    name="birthDate"
                    value={formData.birthDate}
                    onChange={handleChange}
                    className={`input-base text-base pl-10 ${errors.birthDate ? 'input-error' : ''}`}
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
                {errors.birthDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.birthDate}</p>
                )}
              </div>

              {/* Gender */}
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">
                  เพศ
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="input-base text-base"
                >
                  <option value="male">ชาย</option>
                  <option value="female">หญิง</option>
                  <option value="other">อื่นๆ</option>
                </select>
              </div>

              {/* Grade */}
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">
                  ระดับชั้น <span className="text-red-500">*</span>
                </label>
                <select
                  name="currentGrade"
                  value={formData.currentGrade}
                  onChange={handleChange}
                  className={`input-base text-base ${errors.currentGrade ? 'input-error' : ''}`}
                >
                  <option value="">เลือกระดับชั้น</option>
                  {grades.map(grade => (
                    <option key={grade} value={grade}>{grade}</option>
                  ))}
                </select>
                {errors.currentGrade && (
                  <p className="mt-1 text-sm text-red-600">{errors.currentGrade}</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">
                  เบอร์โทรนักเรียน
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="input-base text-base pl-10"
                    placeholder="08X-XXX-XXXX"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">
                  อีเมลนักเรียน
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="input-base text-base pl-10"
                    placeholder="student@email.com"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Parent Information */}
          <div className="bg-white shadow-sm rounded-lg p-6">
            <h2 className="text-xl font-medium text-gray-900 mb-6 flex items-center">
              <Users className="w-6 h-6 mr-2 text-gray-500" />
              ข้อมูลผู้ปกครอง
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Parent Relation */}
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">
                  ความสัมพันธ์
                </label>
                <select
                  name="parentRelation"
                  value={formData.parentRelation}
                  onChange={handleChange}
                  className="input-base text-base"
                >
                  <option value="father">บิดา</option>
                  <option value="mother">มารดา</option>
                  <option value="guardian">ผู้ปกครอง</option>
                </select>
              </div>

              {/* Parent Name */}
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">
                  ชื่อ-นามสกุล ผู้ปกครอง <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="parentName"
                  value={formData.parentName}
                  onChange={handleChange}
                  className={`input-base text-base ${errors.parentName ? 'input-error' : ''}`}
                  placeholder="ชื่อ-นามสกุล"
                />
                {errors.parentName && (
                  <p className="mt-1 text-sm text-red-600">{errors.parentName}</p>
                )}
              </div>

              {/* Parent Phone */}
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">
                  เบอร์โทรผู้ปกครอง <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    name="parentPhone"
                    value={formData.parentPhone}
                    onChange={handleChange}
                    className={`input-base text-base pl-10 ${errors.parentPhone ? 'input-error' : ''}`}
                    placeholder="08X-XXX-XXXX"
                  />
                </div>
                {errors.parentPhone && (
                  <p className="mt-1 text-sm text-red-600">{errors.parentPhone}</p>
                )}
              </div>

              {/* Parent Email */}
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">
                  อีเมลผู้ปกครอง
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    name="parentEmail"
                    value={formData.parentEmail}
                    onChange={handleChange}
                    className="input-base text-base pl-10"
                    placeholder="parent@email.com"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-4">
            <Link
              to="/students"
              className="btn-secondary text-base"
            >
              ยกเลิก
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary inline-flex items-center text-base"
            >
              {loading ? (
                <>
                  <div className="spinner mr-2"></div>
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  บันทึกข้อมูล
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  )
}

export default AddStudentPage