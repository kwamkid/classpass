// src/pages/profile/ChangePasswordPage.tsx
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { 
  ArrowLeft,
  Lock,
  Eye,
  EyeOff,
  Save,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react'
import Layout from '../../components/layout/Layout'
import { useAuthStore } from '../../stores/authStore'
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth'
import { auth } from '../../services/firebase'
import toast from 'react-hot-toast'

// Form validation schema
const passwordSchema = z.object({
  currentPassword: z.string()
    .min(1, 'กรุณากรอกรหัสผ่านปัจจุบัน'),
  newPassword: z.string()
    .min(6, 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร')
    .regex(/[A-Za-z]/, 'รหัสผ่านต้องมีตัวอักษรภาษาอังกฤษ')
    .regex(/[0-9]/, 'รหัสผ่านต้องมีตัวเลข'),
  confirmPassword: z.string()
    .min(1, 'กรุณายืนยันรหัสผ่านใหม่')
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "รหัสผ่านใหม่ไม่ตรงกัน",
  path: ["confirmPassword"],
})

type PasswordFormData = z.infer<typeof passwordSchema>

const ChangePasswordPage = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setError
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema)
  })

  const newPassword = watch('newPassword')

  // Password strength indicator
  const getPasswordStrength = (password: string) => {
    let strength = 0
    let checks = {
      length: password.length >= 6,
      length8: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password)
    }

    if (checks.length) strength++
    if (checks.length8) strength++
    if (checks.uppercase) strength++
    if (checks.lowercase) strength++
    if (checks.number) strength++
    if (checks.special) strength++

    return { strength, checks }
  }

  const passwordAnalysis = newPassword ? getPasswordStrength(newPassword) : null

  const getStrengthColor = (strength: number) => {
    if (strength <= 2) return 'text-red-600 bg-red-100'
    if (strength <= 4) return 'text-yellow-600 bg-yellow-100'
    return 'text-green-600 bg-green-100'
  }

  const getStrengthText = (strength: number) => {
    if (strength <= 2) return 'อ่อน'
    if (strength <= 4) return 'ปานกลาง'
    return 'แข็งแรง'
  }

  const onSubmit = async (data: PasswordFormData) => {
    if (!user?.email || !auth.currentUser) {
      toast.error('ไม่พบข้อมูลผู้ใช้')
      return
    }

    setIsSubmitting(true)
    try {
      // Re-authenticate user with current password
      const credential = EmailAuthProvider.credential(user.email, data.currentPassword)
      await reauthenticateWithCredential(auth.currentUser, credential)
      
      // Update password
      await updatePassword(auth.currentUser, data.newPassword)
      
      toast.success('เปลี่ยนรหัสผ่านสำเร็จ')
      navigate('/settings')
    } catch (error: any) {
      console.error('Error changing password:', error)
      
      if (error.code === 'auth/wrong-password') {
        setError('currentPassword', {
          type: 'manual',
          message: 'รหัสผ่านปัจจุบันไม่ถูกต้อง'
        })
      } else if (error.code === 'auth/weak-password') {
        setError('newPassword', {
          type: 'manual',
          message: 'รหัสผ่านใหม่ไม่แข็งแรงพอ'
        })
      } else {
        toast.error(error.message || 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/settings"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            กลับไปหน้าตั้งค่า
          </Link>
          
          <h1 className="text-2xl font-bold text-gray-900">เปลี่ยนรหัสผ่าน</h1>
          <p className="mt-1 text-sm text-gray-600">
            อัพเดทรหัสผ่านของคุณเพื่อความปลอดภัย
          </p>
        </div>

        {/* Security Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mr-2" />
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-1">เคล็ดลับสำหรับรหัสผ่านที่ปลอดภัย:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>ใช้ความยาวอย่างน้อย 8 ตัวอักษร</li>
                <li>ผสมตัวอักษรใหญ่และเล็ก</li>
                <li>รวมตัวเลขและสัญลักษณ์พิเศษ</li>
                <li>หลีกเลี่ยงข้อมูลส่วนตัวที่เดาได้ง่าย</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="space-y-6">
              {/* Current Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  รหัสผ่านปัจจุบัน <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    {...register('currentPassword')}
                    className={`pl-10 pr-10 input-base ${errors.currentPassword ? 'input-error' : ''}`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
                {errors.currentPassword && (
                  <p className="mt-1 text-sm text-red-600">{errors.currentPassword.message}</p>
                )}
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  รหัสผ่านใหม่ <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    {...register('newPassword')}
                    className={`pl-10 pr-10 input-base ${errors.newPassword ? 'input-error' : ''}`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
                {errors.newPassword && (
                  <p className="mt-1 text-sm text-red-600">{errors.newPassword.message}</p>
                )}
                
                {/* Password Strength */}
                {passwordAnalysis && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">ความแข็งแรง:</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStrengthColor(passwordAnalysis.strength)}`}>
                        {getStrengthText(passwordAnalysis.strength)}
                      </span>
                    </div>
                    
                    <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      <div className={`flex items-center ${passwordAnalysis.checks.length ? 'text-green-600' : 'text-gray-400'}`}>
                        {passwordAnalysis.checks.length ? <CheckCircle className="w-3 h-3 mr-1" /> : <div className="w-3 h-3 mr-1 rounded-full border border-gray-300" />}
                        อย่างน้อย 6 ตัวอักษร
                      </div>
                      <div className={`flex items-center ${passwordAnalysis.checks.number ? 'text-green-600' : 'text-gray-400'}`}>
                        {passwordAnalysis.checks.number ? <CheckCircle className="w-3 h-3 mr-1" /> : <div className="w-3 h-3 mr-1 rounded-full border border-gray-300" />}
                        มีตัวเลข
                      </div>
                      <div className={`flex items-center ${passwordAnalysis.checks.lowercase ? 'text-green-600' : 'text-gray-400'}`}>
                        {passwordAnalysis.checks.lowercase ? <CheckCircle className="w-3 h-3 mr-1" /> : <div className="w-3 h-3 mr-1 rounded-full border border-gray-300" />}
                        ตัวอักษรเล็ก
                      </div>
                      <div className={`flex items-center ${passwordAnalysis.checks.uppercase ? 'text-green-600' : 'text-gray-400'}`}>
                        {passwordAnalysis.checks.uppercase ? <CheckCircle className="w-3 h-3 mr-1" /> : <div className="w-3 h-3 mr-1 rounded-full border border-gray-300" />}
                        ตัวอักษรใหญ่
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ยืนยันรหัสผ่านใหม่ <span className="text-red-500">*</span>
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
          </div>

          {/* Warning */}
          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mr-2" />
              <div className="text-sm text-amber-700">
                <p className="font-medium">ข้อควรระวัง:</p>
                <p>หลังจากเปลี่ยนรหัสผ่านแล้ว คุณจะต้องเข้าสู่ระบบใหม่ในอุปกรณ์อื่นๆ ที่เคยล็อกอินไว้</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex items-center justify-end space-x-3">
            <Link
              to="/settings"
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
                  กำลังเปลี่ยน...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  เปลี่ยนรหัสผ่าน
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  )
}

export default ChangePasswordPage