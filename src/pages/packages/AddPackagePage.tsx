// src/pages/packages/AddPackagePage.tsx
import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { 
  ArrowLeft, 
  Save, 
  CreditCard,
  Calendar,
  Tag,
  AlertCircle,
  Plus,
  Star,
  Award,
  Package
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useOnboardingStore } from '../../stores/onboardingStore'
import * as packageService from '../../services/package'
import * as courseService from '../../services/course'
import { CourseMultiSelect } from '../../components/features/courses/CourseMultiSelect'
import toast from 'react-hot-toast'
import Layout from '../../components/layout/Layout'

const AddPackagePage = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { completeStep, steps } = useOnboardingStore()
  const [loading, setLoading] = useState(false)
  const [courses, setCourses] = useState<courseService.Course[]>([])
  const [existingPackages, setExistingPackages] = useState<packageService.CreditPackage[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  const [formData, setFormData] = useState({
    applicableCourseIds: [] as string[],
    isUniversal: true,
    name: '',
    description: '',
    credits: 1,
    price: 100,
    validityType: 'months' as 'months' | 'days' | 'unlimited',
    validityValue: 1,
    bonusCredits: 0,
    popular: false,
    recommended: false,
    color: '#f97316' // Default orange
  })

  // Preset packages for quick setup
  const presetPackages = [
    { credits: 4, price: 1000, validityMonths: 1, name: 'แพ็คเกจทดลองเรียน' },
    { credits: 8, price: 1800, validityMonths: 2, name: 'แพ็คเกจประหยัด' },
    { credits: 16, price: 3200, validityMonths: 3, name: 'แพ็คเกจมาตรฐาน' },
    { credits: 32, price: 5600, validityMonths: 6, name: 'แพ็คเกจพิเศษ' }
  ]

  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    if (!user?.schoolId) return
    
    try {
      // Load courses
      const coursesData = await courseService.getCourses(user.schoolId, 'active')
      setCourses(coursesData)
      
      // Check existing packages
      const packagesData = await packageService.getPackages(user.schoolId)
      setExistingPackages(packagesData)
      
      // If already have packages, complete the step
      if (packagesData.length > 0) {
        const packageStep = steps.find(s => s.id === 'create-package')
        if (packageStep && !packageStep.completed) {
          completeStep('create-package')
        }
      }
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }))
    } else if (type === 'number') {
      setFormData(prev => ({
        ...prev,
        [name]: Math.max(0, parseInt(value) || 0)
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
    }
    
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const applyPreset = (preset: typeof presetPackages[0]) => {
    setFormData(prev => ({
      ...prev,
      name: preset.name,
      credits: preset.credits,
      price: preset.price,
      validityType: 'months',
      validityValue: preset.validityMonths
    }))
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    // ตรวจสอบว่าเลือกวิชาหรือเลือก universal
    if (!formData.isUniversal && formData.applicableCourseIds.length === 0) {
      newErrors.applicableCourseIds = 'กรุณาเลือกวิชาอย่างน้อย 1 วิชา หรือเลือกใช้ได้ทุกวิชา'
    }
    
    if (!formData.name.trim()) {
      newErrors.name = 'กรุณากรอกชื่อแพ็คเกจ'
    }
    if (formData.credits < 1) {
      newErrors.credits = 'จำนวนเครดิตต้องมากกว่า 0'
    }
    if (formData.price < 0) {
      newErrors.price = 'ราคาต้องมากกว่าหรือเท่ากับ 0'
    }
    if (formData.validityType !== 'unlimited' && formData.validityValue < 1) {
      newErrors.validityValue = 'ระยะเวลาต้องมากกว่า 0'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }
  const generatePackageCode = () => {
    const timestamp = Date.now().toString().slice(-6)
    const random = Math.floor(Math.random() * 100).toString().padStart(2, '0')
    return `PKG${timestamp}${random}`
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
    
    const packageData: packageService.CreatePackageData = {
      applicableCourseIds: formData.applicableCourseIds,
      isUniversal: formData.isUniversal,
      name: formData.name.trim(),
      description: formData.description.trim(),
      code: generatePackageCode(), // <-- เพิ่มบรรทัดนี้
      credits: formData.credits,
      price: formData.price,
      validityType: formData.validityType,
      validityValue: formData.validityType === 'unlimited' ? undefined : formData.validityValue,
      bonusCredits: formData.bonusCredits,
      popular: formData.popular,
      recommended: formData.recommended,
      color: formData.color
    }
    
    await packageService.createPackage(user.schoolId, packageData)
      
      // Complete onboarding step if this is the first package
      if (existingPackages.length === 0) {
        completeStep('create-package')
        toast.success('เพิ่มแพ็คเกจแรกสำเร็จ! 🎉')
      } else {
        toast.success('เพิ่มแพ็คเกจสำเร็จ!')
      }
      
      navigate('/packages')
    } catch (error) {
      console.error('Error creating package:', error)
      toast.error('เกิดข้อผิดพลาดในการเพิ่มแพ็คเกจ')
    } finally {
      setLoading(false)
    }
  }

  const calculatePricePerCredit = () => {
    const totalCredits = formData.credits + formData.bonusCredits
    if (totalCredits === 0) return 0
    return Math.round((formData.price / totalCredits) * 100) / 100
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <Link
            to="/packages"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4 text-base"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            กลับไปหน้าแพ็คเกจ
          </Link>
          
          <h1 className="text-3xl font-bold text-gray-900">เพิ่มแพ็คเกจใหม่</h1>
          <p className="mt-2 text-base text-gray-500">
            สร้างแพ็คเกจเครดิตสำหรับวิชาเรียน
          </p>
        </div>

        {/* Show if first package */}
        {existingPackages.length === 0 && (
          <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-lg p-6 mb-8">
            <div className="flex">
              <Package className="w-6 h-6 text-orange-600 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-medium text-orange-900 mb-2">
                  สร้างแพ็คเกจแรกของคุณ! 💳
                </h3>
                <p className="text-base text-orange-700">
                  นี่คือขั้นตอนที่ 3 จาก 4 ในการตั้งค่าเริ่มต้น
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Course Selection */}
          <div className="bg-white shadow-sm rounded-lg p-6">
            <h2 className="text-xl font-medium text-gray-900 mb-6">
              เลือกวิชา
            </h2>
            
            {/* เพิ่มข้อความอธิบาย */}
            <p className="text-sm text-gray-500 mb-4">
              เริ่มต้นแพ็คเกจนี้สามารถใช้ได้กับทุกวิชา คุณสามารถเปลี่ยนเป็นเฉพาะบางวิชาได้ตามต้องการ
            </p>
            
            <CourseMultiSelect
              schoolId={user?.schoolId || ''}
              selectedCourseIds={formData.applicableCourseIds}
              isUniversal={formData.isUniversal}
              onChange={(courseIds, isUniversal) => {
                setFormData(prev => ({
                  ...prev,
                  applicableCourseIds: courseIds,
                  isUniversal: isUniversal
                }))
                // Clear error
                if (errors.applicableCourseIds) {
                  setErrors(prev => ({ ...prev, applicableCourseIds: '' }))
                }
              }}
              error={errors.applicableCourseIds}
            />
          </div>

          {/* Package Details */}
          <div className="bg-white shadow-sm rounded-lg p-6">
            <h2 className="text-xl font-medium text-gray-900 mb-6 flex items-center">
              <CreditCard className="w-6 h-6 mr-2 text-gray-500" />
              รายละเอียดแพ็คเกจ
            </h2>

            {/* Preset Packages */}
            <div className="mb-6">
              <p className="text-base text-gray-600 mb-3">เลือกแพ็คเกจตัวอย่าง:</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {presetPackages.map((preset, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="p-4 border border-gray-200 rounded-md hover:border-primary-500 hover:bg-primary-50 transition-colors text-left"
                  >
                    <p className="font-medium text-base">{preset.credits} ครั้ง</p>
                    <p className="text-sm text-gray-500">฿{preset.price.toLocaleString()}</p>
                  </button>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Package Name */}
              <div className="md:col-span-2">
                <label className="block text-base font-medium text-gray-700 mb-2">
                  ชื่อแพ็คเกจ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`input-base text-base ${errors.name ? 'input-error' : ''}`}
                  placeholder="เช่น แพ็คเกจประหยัด, แพ็คเกจรายเดือน"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                )}
              </div>

              {/* Credits */}
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">
                  จำนวนเครดิต <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="credits"
                  value={formData.credits}
                  onChange={handleChange}
                  min="1"
                  className={`input-base text-base ${errors.credits ? 'input-error' : ''}`}
                />
                {errors.credits && (
                  <p className="mt-1 text-sm text-red-600">{errors.credits}</p>
                )}
              </div>

              {/* Price */}
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">
                  ราคา (บาท) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  min="0"
                  className={`input-base text-base ${errors.price ? 'input-error' : ''}`}
                />
                {errors.price && (
                  <p className="mt-1 text-sm text-red-600">{errors.price}</p>
                )}
              </div>

              {/* Validity Type */}
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">
                  ระยะเวลาใช้งาน
                </label>
                <select
                  name="validityType"
                  value={formData.validityType}
                  onChange={handleChange}
                  className="input-base text-base"
                >
                  <option value="months">จำนวนเดือน</option>
                  <option value="days">จำนวนวัน</option>
                  <option value="unlimited">ไม่มีกำหนด</option>
                </select>
              </div>

              {/* Validity Value */}
              {formData.validityType !== 'unlimited' && (
                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">
                    {formData.validityType === 'months' ? 'จำนวนเดือน' : 'จำนวนวัน'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="validityValue"
                    value={formData.validityValue}
                    onChange={handleChange}
                    min="1"
                    className={`input-base text-base ${errors.validityValue ? 'input-error' : ''}`}
                  />
                  {errors.validityValue && (
                    <p className="mt-1 text-sm text-red-600">{errors.validityValue}</p>
                  )}
                </div>
              )}

              {/* Bonus Credits */}
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">
                  เครดิตโบนัส
                </label>
                <input
                  type="number"
                  name="bonusCredits"
                  value={formData.bonusCredits}
                  onChange={handleChange}
                  min="0"
                  className="input-base text-base"
                  placeholder="0"
                />
                <p className="mt-1 text-sm text-gray-500">
                  เช่น ซื้อ 10 แถม 2
                </p>
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label className="block text-base font-medium text-gray-700 mb-2">
                  คำอธิบายแพ็คเกจ
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  className="input-base text-base"
                  placeholder="อธิบายรายละเอียดของแพ็คเกจ (ไม่บังคับ)"
                />
              </div>
            </div>

            {/* Price Summary */}
            <div className="mt-6 p-5 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base text-gray-600">สรุปแพ็คเกจ</p>
                  <p className="text-xl font-medium text-gray-900 mt-1">
                    {formData.credits + formData.bonusCredits} ครั้ง = ฿{formData.price.toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-base text-gray-600">ราคาต่อครั้ง</p>
                  <p className="text-xl font-medium text-primary-600 mt-1">
                    ฿{calculatePricePerCredit().toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Display Options */}
          <div className="bg-white shadow-sm rounded-lg p-6">
            <h2 className="text-xl font-medium text-gray-900 mb-6 flex items-center">
              <Tag className="w-6 h-6 mr-2 text-gray-500" />
              ตัวเลือกการแสดงผล
            </h2>

            <div className="space-y-4">
              {/* Popular */}
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="popular"
                  checked={formData.popular}
                  onChange={handleChange}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 w-5 h-5"
                />
                <span className="ml-3 text-base text-gray-700">
                  แสดงป้าย "ยอดนิยม"
                </span>
                <Star className="w-5 h-5 ml-2 text-orange-500" />
              </label>

              {/* Recommended */}
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="recommended"
                  checked={formData.recommended}
                  onChange={handleChange}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 w-5 h-5"
                />
                <span className="ml-3 text-base text-gray-700">
                  แสดงป้าย "แนะนำ"
                </span>
                <Award className="w-5 h-5 ml-2 text-blue-500" />
              </label>
            </div>
          </div>

          {/* Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
            <div className="flex">
              <AlertCircle className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
              <div className="text-base text-blue-700">
                <p className="font-medium mb-2">หมายเหตุ:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>แพ็คเกจสามารถใช้ได้กับวิชาที่เลือกเท่านั้น</li>
                  <li>นักเรียนสามารถซื้อแพ็คเกจได้หลายแพ็คเกจ</li>
                  <li>เครดิตจะถูกหักเมื่อเช็คชื่อเข้าเรียน</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-4">
            <Link
              to="/packages"
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
                  บันทึกแพ็คเกจ
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  )
}

export default AddPackagePage