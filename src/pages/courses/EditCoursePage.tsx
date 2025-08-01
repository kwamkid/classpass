// src/pages/courses/EditCoursePage.tsx
import { useState, useEffect } from 'react'
import { useNavigate, Link, useParams } from 'react-router-dom'
import { 
  ArrowLeft, 
  Save, 
  BookOpen,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import * as courseService from '../../services/course'
import toast from 'react-hot-toast'
import Layout from '../../components/layout/Layout'

const EditCoursePage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [loadingCourse, setLoadingCourse] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  const [formData, setFormData] = useState({
    name: '',
    category: 'academic' as courseService.Course['category'],
    description: '',
    status: 'active' as courseService.Course['status']
  })

  useEffect(() => {
    if (id) {
      loadCourse()
    }
  }, [id])

  const loadCourse = async () => {
    if (!id) return
    
    try {
      setLoadingCourse(true)
      const course = await courseService.getCourse(id)
      
      if (course) {
        setFormData({
          name: course.name,
          category: course.category,
          description: course.description || '',
          status: course.status
        })
      } else {
        toast.error('ไม่พบข้อมูลวิชาเรียน')
        navigate('/courses')
      }
    } catch (error) {
      console.error('Error loading course:', error)
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล')
      navigate('/courses')
    } finally {
      setLoadingCourse(false)
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
    
    if (!id) {
      toast.error('ไม่พบข้อมูลวิชา')
      return
    }
    
    try {
      setLoading(true)
      
      const updateData: Partial<courseService.Course> = {
        name: formData.name.trim(),
        category: formData.category,
        description: formData.description.trim(),
        status: formData.status
      }
      
      await courseService.updateCourse(id, updateData)
      
      toast.success('แก้ไขข้อมูลวิชาเรียนสำเร็จ!')
      navigate(`/courses/${id}`)
    } catch (error) {
      console.error('Error updating course:', error)
      toast.error('เกิดข้อผิดพลาดในการแก้ไขข้อมูล')
    } finally {
      setLoading(false)
    }
  }

  if (loadingCourse) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <Link
            to={`/courses/${id}`}
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            กลับไปหน้ารายละเอียดวิชา
          </Link>
          
          <h1 className="text-2xl font-bold text-gray-900">แก้ไขข้อมูลวิชาเรียน</h1>
          <p className="mt-1 text-sm text-gray-500">
            แก้ไขข้อมูลวิชาเรียน
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white shadow-sm rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
              <BookOpen className="w-5 h-5 mr-2 text-gray-500" />
              ข้อมูลวิชาเรียน
            </h2>
            
            <div className="space-y-6">
              {/* Course Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ชื่อวิชา <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`input-base ${errors.name ? 'input-error' : ''}`}
                  placeholder="เช่น คณิตศาสตร์ ม.1, ภาษาอังกฤษพื้นฐาน"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                )}
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ประเภทวิชา
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="input-base"
                >
                  <option value="academic">วิชาการ</option>
                  <option value="sport">กีฬา</option>
                  <option value="art">ศิลปะ</option>
                  <option value="language">ภาษา</option>
                  <option value="other">อื่นๆ</option>
                </select>
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
                  <option value="active">เปิดสอน</option>
                  <option value="inactive">ปิดสอน</option>
                  <option value="archived">เก็บถาวร</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  หากเลือก "ปิดสอน" จะไม่สามารถเช็คชื่อหรือขายแพ็คเกจใหม่ได้
                </p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  คำอธิบายวิชา
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  className="input-base"
                  placeholder="อธิบายรายละเอียดของวิชาเรียน... (ไม่บังคับ)"
                />
              </div>
            </div>
          </div>

          {/* Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <AlertCircle className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-700">
                <p className="font-medium mb-1">หมายเหตุ:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>รหัสวิชาไม่สามารถแก้ไขได้</li>
                  <li>หากต้องการลบวิชา ให้เปลี่ยนสถานะเป็น "เก็บถาวร"</li>
                  <li>การเปลี่ยนแปลงจะมีผลทันทีหลังบันทึก</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-4">
            <Link
              to={`/courses/${id}`}
              className="btn-secondary"
            >
              ยกเลิก
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary inline-flex items-center"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  บันทึกการแก้ไข
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  )
}

export default EditCoursePage