// src/pages/users/AddUserPage.tsx
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { 
  ArrowLeft,
  User,
  Mail,
  Lock,
  Phone,
  Shield,
  ShieldCheck,
  Save,
  Eye,
  EyeOff,
  Info
} from 'lucide-react'
import Layout from '../../components/layout/Layout'
import { useAuthStore } from '../../stores/authStore'
import { useSchoolStore } from '../../stores/schoolStore'
import * as userService from '../../services/user'
import toast from 'react-hot-toast'

// Form validation schema
const userSchema = z.object({
  email: z.string()
    .min(1, 'กรุณากรอกอีเมล')
    .email('รูปแบบอีเมลไม่ถูกต้อง'),
  password: z.string()
    .min(6, 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร')
    .regex(/[A-Za-z]/, 'รหัสผ่านต้องมีตัวอักษรภาษาอังกฤษ')
    .regex(/[0-9]/, 'รหัสผ่านต้องมีตัวเลข'),
  confirmPassword: z.string()
    .min(1, 'กรุณายืนยันรหัสผ่าน'),
  firstName: z.string()
    .min(1, 'กรุณากรอกชื่อ')
    .max(50, 'ชื่อต้องไม่เกิน 50 ตัวอักษร'),
  lastName: z.string()
    .min(1, 'กรุณากรอกนามสกุล')
    .max(50, 'นามสกุลต้องไม่เกิน 50 ตัวอักษร'),
  role: z.enum(['admin', 'teacher'] as const),
  phone: z.string().optional()
}).refine((data) => data.password === data.confirmPassword, {
  message: "รหัสผ่านไม่ตรงกัน",
  path: ["confirmPassword"],
})

type UserFormData = z.infer<typeof userSchema>

const AddUserPage = () => {
  const navigate = useNavigate()
  const { user: currentUser } = useAuthStore()
  const { school } = useSchoolStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setError
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      role: 'teacher'
    }
  })

  const password = watch('password')

  const onSubmit = async (data: UserFormData) => {
    if (!school?.id || !currentUser?.id) {
      toast.error('ข้อมูลโรงเรียนไม่ถูกต้อง')
      return
    }

    setIsSubmitting(true)
    try {
      // Check if email already exists
      const emailExists = await userService.checkEmailExists(data.email)
      if (emailExists) {
        setError('email', {
          type: 'manual',
          message: 'อีเมลนี้ถูกใช้งานแล้ว'
        })
        setIsSubmitting(false)
        return
      }

      // Create user
      await userService.createUser(school.id, currentUser.id, {
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        phone: data.phone
      })

      toast.success('เพิ่มผู้ใช้สำเร็จ')
      
      // Show note about re-login
      toast('หมายเหตุ: คุณอาจต้องเข้าสู่ระบบใหม่', {
        icon: '⚠️',
        duration: 5000
      })
      
      navigate('/users')
    } catch (error: any) {
      console.error('Error creating user:', error)
      toast.error(error.message || 'เกิดข้อผิดพลาดในการเพิ่มผู้ใช้')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Password strength indicator
  const getPasswordStrength = (password: string) => {
    let strength = 0
    if (password.length >= 6) strength++
    if (password.length >= 8) strength++
    if (/[A-Z]/.test(password)) strength++
    if (/[0-9]/.test(password)) strength++
    if (/[^A-Za-z0-9]/.test(password)) strength++

    if (strength <= 2) return { text: 'อ่อน', color: 'text-red-600', bg: 'bg-red-100' }
    if (strength <= 3) return { text: 'ปานกลาง', color: 'text-yellow-600', bg: 'bg-yellow-100' }
    return { text: 'แข็งแรง', color: 'text-green-600', bg: 'bg-green-100' }
  }

  const passwordStrength = password ? getPasswordStrength(password) : null

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/users"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            กลับไปหน้ารายการผู้ใช้
          </Link>
          
          <h1 className="text-2xl font-bold text-gray-900">เพิ่มผู้ใช้ใหม่</h1>
          <p className="mt-1 text-sm text-gray-600">
            สร้างบัญชีผู้ใช้สำหรับผู้ดูแลระบบหรือครูผู้สอน
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {/* Personal Information */}
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">ข้อมูลส่วนตัว</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* First Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ชื่อ <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      {...register('firstName')}
                      className={`pl-10 input-base ${errors.firstName ? 'input-error' : ''}`}
                      placeholder="ชื่อ"
                    />
                  </div>
                  {errors.firstName && (
                    <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
                  )}
                </div>

                {/* Last Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    นามสกุล <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      {...register('lastName')}
                      className={`pl-10 input-base ${errors.lastName ? 'input-error' : ''}`}
                      placeholder="นามสกุล"
                    />
                  </div>
                  {errors.lastName && (
                    <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    เบอร์โทรศัพท์
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="tel"
                      {...register('phone')}
                      className="pl-10 input-base"
                      placeholder="081-234-5678"
                    />
                  </div>
                </div>

                {/* Role */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    บทบาท <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...register('role')}
                    className={`input-base ${errors.role ? 'input-error' : ''}`}
                  >
                    <option value="">เลือกบทบาท</option>
                    <option value="admin">ผู้ดูแลระบบ</option>
                    <option value="teacher">ครูผู้สอน</option>
                  </select>
                  {errors.role && (
                    <p className="mt-1 text-sm text-red-600">กรุณาเลือกบทบาท</p>
                  )}
                </div>
              </div>
            </div>

            {/* Account Information */}
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">ข้อมูลบัญชี</h3>
              
              <div className="space-y-6">
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    อีเมล <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      {...register('email')}
                      className={`pl-10 input-base ${errors.email ? 'input-error' : ''}`}
                      placeholder="user@example.com"
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                  )}
                  <p className="mt-1 text-sm text-gray-500">
                    อีเมลนี้จะใช้สำหรับเข้าสู่ระบบ
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      รหัสผ่าน <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        {...register('password')}
                        className={`pl-10 pr-10 input-base ${errors.password ? 'input-error' : ''}`}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                    )}
                    {passwordStrength && (
                      <p className={`mt-1 text-sm ${passwordStrength.color}`}>
                        ความแข็งแรง: {passwordStrength.text}
                      </p>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ยืนยันรหัสผ่าน <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        {...register('confirmPassword')}
                        className={`pl-10 pr-10 input-base ${errors.confirmPassword ? 'input-error' : ''}`}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
                    )}
                  </div>
                </div>

                {/* Password Requirements */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex">
                    <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mr-2" />
                    <div className="text-sm text-blue-700">
                      <p className="font-medium mb-1">ข้อกำหนดรหัสผ่าน:</p>
                      <ul className="list-disc list-inside space-y-0.5">
                        <li>ความยาวอย่างน้อย 6 ตัวอักษร</li>
                        <li>มีตัวอักษรภาษาอังกฤษ</li>
                        <li>มีตัวเลขอย่างน้อย 1 ตัว</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Role Permissions Info */}
          <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">สิทธิ์การใช้งานตามบทบาท</h3>
            
            <div className="space-y-4">
              <div className="flex items-start">
                <Shield className="w-5 h-5 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">ผู้ดูแลระบบ (Admin)</p>
                  <ul className="mt-1 text-sm text-gray-600 list-disc list-inside">
                    <li>จัดการข้อมูลนักเรียน วิชา และแพ็คเกจ</li>
                    <li>ซื้อและจัดการเครดิต</li>
                    <li>ดูรายงานและสถิติ</li>
                    <li>จัดการผู้ใช้ (ยกเว้นเจ้าของ)</li>
                  </ul>
                </div>
              </div>
              
              <div className="flex items-start">
                <User className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">ครูผู้สอน (Teacher)</p>
                  <ul className="mt-1 text-sm text-gray-600 list-disc list-inside">
                    <li>ดูข้อมูลนักเรียนและวิชา</li>
                    <li>เช็คชื่อนักเรียน</li>
                    <li>ดูตารางสอนของตนเอง</li>
                    <li>ไม่สามารถแก้ไขข้อมูลหรือซื้อเครดิต</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex items-center justify-end space-x-3">
            <Link
              to="/users"
              className="btn-secondary"
            >
              ยกเลิก
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
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

export default AddUserPage