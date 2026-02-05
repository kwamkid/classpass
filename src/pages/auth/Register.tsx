// src/pages/auth/Register.tsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Building, Mail, Lock, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import toast from 'react-hot-toast'

// Validation schema
const registerSchema = z.object({
  schoolName: z.string().min(1, 'กรุณากรอกชื่อโรงเรียน'),
  firstName: z.string().min(1, 'กรุณากรอกชื่อ'),
  lastName: z.string().min(1, 'กรุณากรอกนามสกุล'),
  email: z.string().email('อีเมลไม่ถูกต้อง'),
  password: z.string().min(6, 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'),
  confirmPassword: z.string(),
  acceptTerms: z.boolean().refine(val => val === true, 'กรุณายอมรับข้อตกลงการใช้งาน')
}).refine((data) => data.password === data.confirmPassword, {
  message: "รหัสผ่านไม่ตรงกัน",
  path: ["confirmPassword"],
})

type RegisterFormData = z.infer<typeof registerSchema>

const RegisterPage = () => {
  const navigate = useNavigate()
  const { register: registerUser } = useAuthStore()
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
      
      await registerUser({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        schoolName: data.schoolName
      })

      toast.success('ลงทะเบียนสำเร็จ! กำลังเข้าสู่ระบบ...')
      navigate('/dashboard')
      
    } catch (error: any) {
      console.error('Registration error:', error)

      if (error.message?.includes('อีเมล')) {
        setError('email', {
          type: 'manual',
          message: error.message
        })
      } else if (error.message?.includes('รอสักครู่')) {
        toast.error(error.message, { duration: 6000 })
      } else {
        toast.error(error.message || 'เกิดข้อผิดพลาดในการลงทะเบียน')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh bg-gradient-to-br from-primary-50 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        {/* Back to home */}
        <Link 
          to="/" 
          className="inline-flex items-center text-gray-600 hover:text-primary-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          กลับหน้าหลัก
        </Link>

        {/* Logo & Title */}
        <div className="text-center">
          <img src="/logo.svg" alt="ClassPass" className="mx-auto h-16 w-16 mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">สร้างบัญชี ClassPass ใหม่</h1>
          <p className="text-gray-600">เริ่มต้นใช้งานฟรี ไม่ต้องใช้บัตรเครดิต</p>
        </div>

        {/* Register Card */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {/* School Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">ข้อมูลโรงเรียน</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ชื่อโรงเรียน
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Building className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('schoolName')}
                    type="text"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
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
              <h3 className="text-lg font-semibold text-gray-900 mb-4">ข้อมูลเจ้าของ</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ชื่อ
                    </label>
                    <input
                      {...register('firstName')}
                      type="text"
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                      placeholder="สมชาย"
                    />
                    {errors.firstName && (
                      <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      นามสกุล
                    </label>
                    <input
                      {...register('lastName')}
                      type="text"
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                      placeholder="ใจดี"
                    />
                    {errors.lastName && (
                      <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    อีเมล
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      {...register('email')}
                      type="email"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                      placeholder="admin@school.com"
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    รหัสผ่าน
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      {...register('password')}
                      type={showPassword ? 'text' : 'password'}
                      className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ยืนยันรหัสผ่าน
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      {...register('confirmPassword')}
                      type={showConfirmPassword ? 'text' : 'password'}
                      className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
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
              className="w-full bg-primary-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  กำลังสร้างบัญชี...
                </div>
              ) : (
                'สร้างบัญชี'
              )}
            </button>
          </form>

          {/* Sign in link */}
          <div className="text-center mt-6">
            <span className="text-sm text-gray-600">
              มีบัญชีอยู่แล้ว?{' '}
              <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500">
                เข้าสู่ระบบ
              </Link>
            </span>
          </div>
        </div>

        {/* Features */}
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
          <h4 className="font-medium text-blue-900 mb-2">สิ่งที่คุณจะได้รับ:</h4>
          <ul className="space-y-1 text-sm text-blue-700">
            <li>✓ ใช้งานฟรีตลอดกาล สำหรับนักเรียนไม่เกิน 50 คน</li>
            <li>✓ ระบบจัดการเครดิตการเรียนแบบครบวงจร</li>
            <li>✓ รายงานและสถิติแบบ Real-time</li>
            <li>✓ รองรับการใช้งานบนมือถือ 100%</li>
            <li>✓ ไม่ต้องติดตั้งโปรแกรม ใช้งานผ่านเว็บได้ทันที</li>
          </ul>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          <p>
            &copy; 2024 ClassPass. สงวนลิขสิทธิ์ | {' '}
            <Link to="/terms" className="hover:text-gray-700 transition-colors">
              ข้อตกลงการใช้งาน
            </Link>
            {' '} | {' '}
            <Link to="/privacy" className="hover:text-gray-700 transition-colors">
              นโยบายความเป็นส่วนตัว
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage