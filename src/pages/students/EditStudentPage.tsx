// src/pages/students/EditStudentPage.tsx
import { useState, useEffect } from 'react'
import { useNavigate, Link, useParams } from 'react-router-dom'
import { 
  ArrowLeft, 
  Save, 
  User,
  Phone,
  Mail,
  Calendar,
  Users,
  AlertCircle,
  Loader2,
  Plus,
  Trash2,
  MapPin
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import * as studentService from '../../services/student'
import toast from 'react-hot-toast'
import Layout from '../../components/layout/Layout'

const EditStudentPage = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [student, setStudent] = useState<studentService.Student | null>(null)
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    nickname: '',
    birthDate: '',
    gender: 'male' as 'male' | 'female' | 'other',
    currentGrade: '',
    phone: '',
    email: '',
    status: 'active' as 'active' | 'inactive' | 'graduated' | 'suspended',
    // Address
    address: {
      houseNumber: '',
      street: '',
      subdistrict: '',
      district: '',
      province: '',
      postalCode: ''
    },
    // Parents
    parents: [] as Array<{
      type: 'father' | 'mother' | 'guardian',
      firstName: string,
      lastName: string,
      phone: string,
      email?: string,
      isPrimaryContact?: boolean
    }>
  })

  const grades = [
    'อนุบาล 1', 'อนุบาล 2', 'อนุบาล 3',
    'ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6',
    'ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6',
    'อื่นๆ'
  ]

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
        // Set form data - map Parent[] to form structure
        setFormData({
          firstName: data.firstName,
          lastName: data.lastName,
          nickname: data.nickname || '',
          birthDate: data.birthDate,
          gender: data.gender,
          currentGrade: data.currentGrade,
          phone: data.phone || '',
          email: data.email || '',
          status: data.status,
          address: data.address || {
            houseNumber: '',
            street: '',
            subdistrict: '',
            district: '',
            province: '',
            postalCode: ''
          },
          parents: data.parents?.map(parent => ({
            type: parent.type,
            firstName: parent.firstName,
            lastName: parent.lastName,
            phone: parent.phone,
            email: parent.email || '',
            isPrimaryContact: parent.isPrimaryContact || false
          })) || []
        })
      } else {
        toast.error('ไม่พบข้อมูลนักเรียน')
        navigate('/students')
      }
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล')
      navigate('/students')
    } finally {
      setLoading(false)
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

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      address: {
        ...prev.address,
        [name]: value
      }
    }))
  }

  const handleParentChange = (index: number, field: string, value: string | boolean) => {
    const newParents = [...formData.parents]
    newParents[index] = {
      ...newParents[index],
      [field]: value
    }
    
    // If setting as primary contact, unset others
    if (field === 'isPrimaryContact' && value === true) {
      newParents.forEach((parent, i) => {
        if (i !== index) {
          parent.isPrimaryContact = false
        }
      })
    }
    
    setFormData(prev => ({
      ...prev,
      parents: newParents
    }))
  }

  const addParent = () => {
    setFormData(prev => ({
      ...prev,
      parents: [...prev.parents, {
        type: 'mother' as const,
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
        isPrimaryContact: prev.parents.length === 0
      }]
    }))
  }

  const removeParent = (index: number) => {
    const newParents = formData.parents.filter((_, i) => i !== index)
    // If removing primary contact, set first parent as primary
    if (formData.parents[index].isPrimaryContact && newParents.length > 0) {
      newParents[0].isPrimaryContact = true
    }
    setFormData(prev => ({
      ...prev,
      parents: newParents
    }))
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
    
    // Validate parents
    formData.parents.forEach((parent, index) => {
      if (!parent.firstName.trim()) {
        newErrors[`parent_${index}_firstName`] = 'กรุณากรอกชื่อผู้ปกครอง'
      }
      if (!parent.phone.trim()) {
        newErrors[`parent_${index}_phone`] = 'กรุณากรอกเบอร์โทรผู้ปกครอง'
      } else if (!/^0\d{9}$/.test(parent.phone.replace(/-/g, ''))) {
        newErrors[`parent_${index}_phone`] = 'เบอร์โทรไม่ถูกต้อง'
      }
    })
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน')
      return
    }
    
    if (!student || !id) {
      toast.error('ไม่พบข้อมูลนักเรียน')
      return
    }
    
    try {
      setSaving(true)
      
      // Convert form parents to service parents format
      const parentsData: studentService.Parent[] = formData.parents.map(parent => ({
        type: parent.type,
        firstName: parent.firstName,
        lastName: parent.lastName,
        phone: parent.phone,
        email: parent.email || undefined,
        isPrimaryContact: parent.isPrimaryContact || false
      }))
      
      await studentService.updateStudent(id, {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        nickname: formData.nickname.trim(),
        birthDate: formData.birthDate,
        gender: formData.gender,
        currentGrade: formData.currentGrade,
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        status: formData.status,
        address: formData.address,
        parents: parentsData
      })
      
      toast.success('บันทึกข้อมูลสำเร็จ!')
      navigate(`/students/${id}`)
    } catch (error) {
      console.error('Error updating student:', error)
      toast.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto mb-4" />
            <p className="text-gray-600">กำลังโหลดข้อมูล...</p>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <Link
            to="/students"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            กลับไปหน้ารายชื่อนักเรียน
          </Link>
          
          <h1 className="text-2xl font-bold text-gray-900">แก้ไขข้อมูลนักเรียน</h1>
          <p className="mt-1 text-sm text-gray-500">
            รหัสนักเรียน: {student?.studentCode}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Student Information */}
          <div className="bg-white shadow-sm rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
              <User className="w-5 h-5 mr-2 text-gray-500" />
              ข้อมูลนักเรียน
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* First Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ชื่อ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className={`input-base ${errors.firstName ? 'input-error' : ''}`}
                  placeholder="ชื่อจริง"
                />
                {errors.firstName && (
                  <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
                )}
              </div>

              {/* Last Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  นามสกุล <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className={`input-base ${errors.lastName ? 'input-error' : ''}`}
                  placeholder="นามสกุล"
                />
                {errors.lastName && (
                  <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
                )}
              </div>

              {/* Nickname */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ชื่อเล่น
                </label>
                <input
                  type="text"
                  name="nickname"
                  value={formData.nickname}
                  onChange={handleChange}
                  className="input-base"
                  placeholder="ชื่อเล่น"
                />
              </div>

              {/* Birth Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  วันเกิด <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="date"
                    name="birthDate"
                    value={formData.birthDate}
                    onChange={handleChange}
                    className={`input-base pl-10 ${errors.birthDate ? 'input-error' : ''}`}
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
                {errors.birthDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.birthDate}</p>
                )}
              </div>

              {/* Gender */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  เพศ
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="input-base"
                >
                  <option value="male">ชาย</option>
                  <option value="female">หญิง</option>
                  <option value="other">อื่นๆ</option>
                </select>
              </div>

              {/* Grade */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ระดับชั้น <span className="text-red-500">*</span>
                </label>
                <select
                  name="currentGrade"
                  value={formData.currentGrade}
                  onChange={handleChange}
                  className={`input-base ${errors.currentGrade ? 'input-error' : ''}`}
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  เบอร์โทรนักเรียน
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="input-base pl-10"
                    placeholder="08X-XXX-XXXX"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  อีเมลนักเรียน
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="input-base pl-10"
                    placeholder="student@email.com"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  สถานะ
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="input-base"
                >
                  <option value="active">กำลังเรียน</option>
                  <option value="inactive">พักการเรียน</option>
                  <option value="graduated">จบการศึกษา</option>
                  <option value="suspended">พักการเรียน</option>
                </select>
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="bg-white shadow-sm rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
              <MapPin className="w-5 h-5 mr-2 text-gray-500" />
              ที่อยู่
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  บ้านเลขที่
                </label>
                <input
                  type="text"
                  name="houseNumber"
                  value={formData.address.houseNumber}
                  onChange={handleAddressChange}
                  className="input-base"
                  placeholder="123/45"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ถนน
                </label>
                <input
                  type="text"
                  name="street"
                  value={formData.address.street}
                  onChange={handleAddressChange}
                  className="input-base"
                  placeholder="ถนนสุขุมวิท"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  แขวง/ตำบล
                </label>
                <input
                  type="text"
                  name="subdistrict"
                  value={formData.address.subdistrict}
                  onChange={handleAddressChange}
                  className="input-base"
                  placeholder="คลองเตย"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  เขต/อำเภอ
                </label>
                <input
                  type="text"
                  name="district"
                  value={formData.address.district}
                  onChange={handleAddressChange}
                  className="input-base"
                  placeholder="คลองเตย"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  จังหวัด
                </label>
                <input
                  type="text"
                  name="province"
                  value={formData.address.province}
                  onChange={handleAddressChange}
                  className="input-base"
                  placeholder="กรุงเทพมหานคร"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  รหัสไปรษณีย์
                </label>
                <input
                  type="text"
                  name="postalCode"
                  value={formData.address.postalCode}
                  onChange={handleAddressChange}
                  className="input-base"
                  placeholder="10110"
                  maxLength={5}
                />
              </div>
            </div>
          </div>

          {/* Parent Information */}
          <div className="bg-white shadow-sm rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-medium text-gray-900 flex items-center">
                <Users className="w-5 h-5 mr-2 text-gray-500" />
                ข้อมูลผู้ปกครอง
              </h2>
              <button
                type="button"
                onClick={addParent}
                className="btn-secondary text-sm inline-flex items-center"
              >
                <Plus className="w-4 h-4 mr-1" />
                เพิ่มผู้ปกครอง
              </button>
            </div>
            
            {formData.parents.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>ยังไม่มีข้อมูลผู้ปกครอง</p>
                <button
                  type="button"
                  onClick={addParent}
                  className="mt-2 text-primary-600 hover:text-primary-700 font-medium"
                >
                  เพิ่มผู้ปกครอง
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {formData.parents.map((parent, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <select
                          value={parent.type}
                          onChange={(e) => handleParentChange(index, 'type', e.target.value)}
                          className="input-base text-sm w-32"
                        >
                          <option value="father">บิดา</option>
                          <option value="mother">มารดา</option>
                          <option value="guardian">ผู้ปกครอง</option>
                        </select>
                        
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={parent.isPrimaryContact || false}
                            onChange={(e) => handleParentChange(index, 'isPrimaryContact', e.target.checked)}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="ml-2 text-sm text-gray-600">ผู้ติดต่อหลัก</span>
                        </label>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => removeParent(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          ชื่อ <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={parent.firstName}
                          onChange={(e) => handleParentChange(index, 'firstName', e.target.value)}
                          className={`input-base ${errors[`parent_${index}_firstName`] ? 'input-error' : ''}`}
                          placeholder="ชื่อ"
                        />
                        {errors[`parent_${index}_firstName`] && (
                          <p className="mt-1 text-sm text-red-600">{errors[`parent_${index}_firstName`]}</p>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          นามสกุล
                        </label>
                        <input
                          type="text"
                          value={parent.lastName}
                          onChange={(e) => handleParentChange(index, 'lastName', e.target.value)}
                          className="input-base"
                          placeholder="นามสกุล"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          เบอร์โทร <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="tel"
                          value={parent.phone}
                          onChange={(e) => handleParentChange(index, 'phone', e.target.value)}
                          className={`input-base ${errors[`parent_${index}_phone`] ? 'input-error' : ''}`}
                          placeholder="08X-XXX-XXXX"
                        />
                        {errors[`parent_${index}_phone`] && (
                          <p className="mt-1 text-sm text-red-600">{errors[`parent_${index}_phone`]}</p>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          อีเมล
                        </label>
                        <input
                          type="email"
                          value={parent.email || ''}
                          onChange={(e) => handleParentChange(index, 'email', e.target.value)}
                          className="input-base"
                          placeholder="parent@email.com"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-4">
            <Link
              to={`/students/${id}`}
              className="btn-secondary"
            >
              ยกเลิก
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary inline-flex items-center"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
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

export default EditStudentPage