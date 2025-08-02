// src/pages/auth/Register.tsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Building, Mail, Lock, User, Loader2, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import * as authService from '../../services/auth'
import toast from 'react-hot-toast'

// Validation schema - removed subdomain
const registerSchema = z.object({
  // School info
  schoolName: z.string().min(1, 'กรุณากรอกชื่อโรงเรียน'),
  
  // Owner info
  firstName: z.string().min(1, 'กรุณากรอกชื่อ'),
  lastName: z.string().min(1, 'กรุณากรอกนามสกุล'),
  email: z.string().email('อีเมลไม่ถูกต้อง'),
  password: z.string()
    .min(6, 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'),
  confirmPassword: z.string(),
  
  // Terms
  acceptTerms: z.boolean().refine(val => val === true, 'กรุณายอมรับข้อตกลงการใช้งาน')
}).refine((data) => data.password === data.confirmPassword, {
  message: "รหัสผ่านไม่ตรงกัน",
  path: ["confirmPassword"],
})

type RegisterFormData = z.infer<typeof registerSchema>

const RegisterPage = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      acceptTerms: false
    }
  })

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setLoading(true)
      
      console.log('📝 Form submitted:', { ...data, password: '***' })
      
      // Register new school and owner
      await authService.registerSchool({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        schoolName: data.schoolName
      })
      
      toast.success('ลงทะเบียนสำเร็จ! กำลังเข้าสู่ระบบ...')
      
      // Navigate to dashboard after successful registration
      setTimeout(() => {
        navigate('/dashboard')
      }, 1500)
      
    } catch (error: any) {
      console.error('Registration error:', error)
      
      if (error.message?.includes('อีเมล')) {
        setError('email', {
          type: 'manual',
          message: error.message
        })
      } else {
        toast.error(error.message || 'เกิดข้อผิดพลาดในการลงทะเบียน')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-orange-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Back to home */}
        <Link 
          to="/" 
          className="inline-flex items-center text-gray-600 hover:text-primary-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          กลับหน้าหลัก
        </Link>

        <div>
          <div className="mx-auto h-16 w-16 bg-primary-500 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-2xl">C</span>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            สร้างบัญชี ClassPass ใหม่
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            เริ่มต้นใช้งานฟรี ไม่ต้องใช้บัตรเครดิต
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="bg-white shadow-xl rounded-lg p-6 space-y-6">
            {/* School Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">ข้อมูลโรงเรียน</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ชื่อโรงเรียน
                </label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    {...register('schoolName')}
                    type="text"
                    className="input-base pl-10"
                    placeholder="โรงเรียนสอนคณิตศาสตร์ ABC"
                  />
                </div>
                {errors.schoolName && (
                  <p className="mt-1 text-sm text-red-600">{errors.schoolName.message}</p>
                )}
              </div>
            </div>

            <hr className="border-gray-200" />

            {/* Owner Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">ข้อมูลเจ้าของ</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ชื่อ
                    </label>
                    <input
                      {...register('firstName')}
                      type="text"
                      className="input-base"
                      placeholder="สมชาย"
                    />
                    {errors.firstName && (
                      <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      นามสกุล
                    </label>
                    <input
                      {...register('lastName')}
                      type="text"
                      className="input-base"
                      placeholder="ใจดี"
                    />
                    {errors.lastName && (
                      <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    อีเมล
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      {...register('email')}
                      type="email"
                      className="input-base pl-10"
                      placeholder="admin@school.com"
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    รหัสผ่าน
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      {...register('password')}
                      type={showPassword ? 'text' : 'password'}
                      className="input-base pl-10 pr-10"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ยืนยันรหัสผ่าน
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      {...register('confirmPassword')}
                      type={showConfirmPassword ? 'text' : 'password'}
                      className="input-base pl-10 pr-10"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
                  )}
                </div>
              </div>
            </div>

            <hr className="border-gray-200" />

            {/* Terms and Conditions */}
            <div>
              <label className="flex items-start">
                <input
                  {...register('acceptTerms')}
                  type="checkbox"
                  className="mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="ml-2 text-sm text-gray-600">
                  ฉันยอมรับ{' '}
                  <Link to="/terms" className="text-primary-600 hover:text-primary-500">
                    ข้อตกลงการใช้งาน
                  </Link>
                  {' '}และ{' '}
                  <Link to="/privacy" className="text-primary-600 hover:text-primary-500">
                    นโยบายความเป็นส่วนตัว
                  </Link>
                </span>
              </label>
              {errors.acceptTerms && (
                <p className="mt-1 text-sm text-red-600">{errors.acceptTerms.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin inline" />
                  กำลังสร้างบัญชี...
                </>
              ) : (
                'สร้างบัญชี'
              )}
            </button>
          </div>

          {/* Features */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">สิ่งที่คุณจะได้รับ:</h4>
            <ul className="space-y-1 text-sm text-blue-700">
              <li>✓ ใช้งานฟรีตลอดกาล สำหรับนักเรียนไม่เกิน 50 คน</li>
              <li>✓ ระบบจัดการเครดิตการเรียนแบบครบวงจร</li>
              <li>✓ รายงานและสถิติแบบ Real-time</li>
              <li>✓ รองรับการใช้งานบนมือถือ 100%</li>
              <li>✓ ไม่ต้องติดตั้งโปรแกรม ใช้งานผ่านเว็บได้ทันที</li>
            </ul>
          </div>

          {/* Sign in link */}
          <div className="text-center">
            <span className="text-sm text-gray-600">
              มีบัญชีอยู่แล้ว?{' '}
              <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500">
                เข้าสู่ระบบ
              </Link>
            </span>
          </div>
        </form>
      </div>
    </div>
  )
}

export default RegisterPage