// src/pages/auth/Login.tsx
import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import toast from 'react-hot-toast'

// Validation schema
const loginSchema = z.object({
  email: z.string()
    .min(1, 'กรุณากรอกอีเมล')
    .email('รูปแบบอีเมลไม่ถูกต้อง'),
  password: z.string()
    .min(1, 'กรุณากรอกรหัสผ่าน'),
  remember: z.boolean().optional()
})

type LoginFormData = z.infer<typeof loginSchema>

const Login = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  
  const from = location.state?.from?.pathname || '/dashboard'
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      remember: false
    }
  })

  const onSubmit = async (data: LoginFormData) => {
    try {
      setLoading(true)
      await login(data.email, data.password)
      toast.success('เข้าสู่ระบบสำเร็จ!')
      navigate(from, { replace: true })
    } catch (error: any) {
      console.error('Login error:', error)
      
      // Set field-specific errors
      if (error.message?.includes('อีเมล') || error.message?.includes('ไม่พบบัญชี')) {
        setError('email', {
          type: 'manual',
          message: error.message
        })
      } else if (error.message?.includes('รหัสผ่าน')) {
        setError('password', {
          type: 'manual',
          message: error.message
        })
      } else {
        toast.error(error.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex items-center justify-center p-4">
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
          <div className="mx-auto h-16 w-16 bg-primary-500 rounded-xl flex items-center justify-center mb-4">
            <span className="text-white font-bold text-2xl">C</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">เข้าสู่ระบบ ClassPass</h1>
          <p className="text-gray-600">จัดการโรงเรียนของคุณได้ง่ายและสะดวก</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {/* Email */}
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
                  autoComplete="email"
                  className={`
                    w-full pl-10 pr-4 py-3 border rounded-lg text-sm
                    focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                    transition-colors
                    ${errors.email ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300'}
                  `}
                  placeholder="your@email.com"
                  disabled={loading}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
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
                  autoComplete="current-password"
                  className={`
                    w-full pl-10 pr-10 py-3 border rounded-lg text-sm
                    focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                    transition-colors
                    ${errors.password ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300'}
                  `}
                  placeholder="••••••••"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            {/* Remember & Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input 
                  {...register('remember')}
                  type="checkbox"
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  disabled={loading}
                />
                <span className="ml-2 text-sm text-gray-600">จดจำฉัน</span>
              </label>
              <Link 
                to="/forgot-password" 
                className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors"
              >
                ลืมรหัสผ่าน?
              </Link>
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              className="w-full bg-primary-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  กำลังเข้าสู่ระบบ...
                </div>
              ) : (
                'เข้าสู่ระบบ'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">หรือ</span>
            </div>
          </div>

          {/* Register Link */}
          <div className="text-center">
            <p className="text-gray-600">
              ยังไม่มีบัญชี?{' '}
              <Link 
                to="/register" 
                className="text-primary-600 hover:text-primary-700 font-medium transition-colors"
              >
                สมัครใช้งานฟรี
              </Link>
            </p>
          </div>
        </div>

        {/* Demo Accounts */}
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">บัญชีทดลอง:</h4>
          <div className="space-y-1 text-xs text-blue-700">
            <div className="flex items-center justify-between">
              <span>Owner:</span>
              <span className="font-mono bg-blue-100 px-2 py-0.5 rounded">
                demo@owner.com / demo1234
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Admin:</span>
              <span className="font-mono bg-blue-100 px-2 py-0.5 rounded">
                demo@admin.com / demo1234
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Teacher:</span>
              <span className="font-mono bg-blue-100 px-2 py-0.5 rounded">
                demo@teacher.com / demo1234
              </span>
            </div>
          </div>
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

export default Login