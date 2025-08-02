// src/pages/courses/AddCoursePage.tsx
import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { 
  ArrowLeft, 
  Save, 
  BookOpen,
  AlertCircle
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useOnboardingStore } from '../../stores/onboardingStore'
import * as courseService from '../../services/course'
import toast from 'react-hot-toast'
import Layout from '../../components/layout/Layout'

const AddCoursePage = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { completeStep, steps } = useOnboardingStore()
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [existingCourses, setExistingCourses] = useState<courseService.Course[]>([])
  
  const [formData, setFormData] = useState({
    name: '',
    category: 'academic' as courseService.Course['category'],
    description: ''
  })

  useEffect(() => {
    checkExistingCourses()
  }, [])

  const checkExistingCourses = async () => {
    if (!user?.schoolId) return
    
    try {
      const courses = await courseService.getCourses(user.schoolId)
      setExistingCourses(courses)
      
      // If already have courses, complete the step
      if (courses.length > 0) {
        const courseStep = steps.find(s => s.id === 'create-course')
        if (courseStep && !courseStep.completed) {
          completeStep('create-course')
        }
      }
    } catch (error) {
      console.error('Error checking courses:', error)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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
    
    if (!formData.name.trim()) {
      newErrors.name = 'กรุณากรอกชื่อวิชา'
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
      
      const courseData: courseService.CreateCourseData = {
        name: formData.name.trim(),
        category: formData.category,
        description: formData.description.trim()
      }
      
      const newCourse = await courseService.createCourse(user.schoolId, courseData)
      
      // Complete onboarding step if this is the first course
      if (existingCourses.length === 0) {
        completeStep('create-course')
        toast.success('เพิ่มวิชาเรียนแรกสำเร็จ! 🎉')
      } else {
        toast.success('เพิ่มวิชาเรียนสำเร็จ!')
      }
      
      navigate('/courses')
    } catch (error) {
      console.error('Error creating course:', error)
      toast.error('เกิดข้อผิดพลาดในการเพิ่มวิชาเรียน')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <Link
            to="/courses"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4 text-base"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            กลับไปหน้าวิชาเรียน
          </Link>
          
          <h1 className="text-3xl font-bold text-gray-900">เพิ่มวิชาเรียนใหม่</h1>
          <p className="mt-2 text-base text-gray-500">
            กรอกข้อมูลวิชาเรียนเพื่อเพิ่มเข้าสู่ระบบ
          </p>
        </div>

        {/* Show if first course */}
        {existingCourses.length === 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 mb-8">
            <div className="flex">
              <BookOpen className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-medium text-blue-900 mb-2">
                  สร้างวิชาเรียนแรกของคุณ! 🎓
                </h3>
                <p className="text-base text-blue-700">
                  นี่คือขั้นตอนที่ 2 จาก 4 ในการตั้งค่าเริ่มต้น
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white shadow-sm rounded-lg p-6">
            <h2 className="text-xl font-medium text-gray-900 mb-6 flex items-center">
              <BookOpen className="w-6 h-6 mr-2 text-gray-500" />
              ข้อมูลวิชาเรียน
            </h2>
            
            <div className="space-y-6">
              {/* Course Name */}
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">
                  ชื่อวิชา <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`input-base text-base ${errors.name ? 'input-error' : ''}`}
                  placeholder="เช่น คณิตศาสตร์ ม.1, ภาษาอังกฤษพื้นฐาน"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                )}
              </div>

              {/* Category */}
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">
                  ประเภทวิชา
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="input-base text-base"
                >
                  <option value="academic">วิชาการ</option>
                  <option value="sport">กีฬา</option>
                  <option value="art">ศิลปะ</option>
                  <option value="language">ภาษา</option>
                  <option value="other">อื่นๆ</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">
                  คำอธิบายวิชา
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  className="input-base text-base"
                  placeholder="อธิบายรายละเอียดของวิชาเรียน... (ไม่บังคับ)"
                />
              </div>
            </div>
          </div>

          {/* Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
            <div className="flex">
              <AlertCircle className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
              <div className="text-base text-blue-700">
                <p className="font-medium mb-2">หมายเหตุ:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>รหัสวิชาจะถูกสร้างอัตโนมัติโดยระบบ</li>
                  <li>ใช้ระบบเครดิต 1 เครดิตต่อครั้งเรียน</li>
                  <li>นักเรียนมาเรียนจึงจะตัดเครดิต ไม่มาไม่ตัด</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-4">
            <Link
              to="/courses"
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

export default AddCoursePage