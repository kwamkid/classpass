// src/pages/auth/ForgotPassword.tsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail, ArrowLeft, CheckCircle, Loader2 } from 'lucide-react'
import * as authService from '../../services/auth'
import toast from 'react-hot-toast'

// Validation schema
const forgotPasswordSchema = z.object({
  email: z.string()
    .min(1, 'กรุณากรอกอีเมล')
    .email('รูปแบบอีเมลไม่ถูกต้อง')
})

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

const ForgotPasswordPage = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState('')
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema)
  })

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      setLoading(true)
      
      await authService.resetPassword(data.email)
      
      setSubmittedEmail(data.email)
      setEmailSent(true)
      toast.success('ส่งอีเมลรีเซ็ตรหัสผ่านเรียบร้อยแล้ว')
      
    } catch (error: any) {
      console.error('Reset password error:', error)
      
      if (error.message === 'ไม่พบบัญชีผู้ใช้นี้') {
        setError('email', {
          type: 'manual',
          message: 'ไม่พบอีเมลนี้ในระบบ'
        })
      } else {
        toast.error(error.message || 'เกิดข้อผิดพลาดในการส่งอีเมล')
      }
    } finally {
      setLoading(false)
    }
  }

  // If email sent successfully
  if (emailSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-orange-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="bg-white shadow-xl rounded-lg p-8 text-center">
            <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              ส่งอีเมลเรียบร้อยแล้ว!
            </h2>
            
            <p className="text-gray-600 mb-6">
              เราได้ส่งลิงก์สำหรับรีเซ็ตรหัสผ่านไปที่
              <br />
              <span className="font-semibold text-gray-900">{submittedEmail}</span>
            </p>
            
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-blue-900 mb-2">ขั้นตอนถัดไป:</h3>
              <ol className="text-sm text-blue-700 text-left list-decimal list-inside space-y-1">
                <li>ตรวจสอบอีเมลของคุณ</li>
                <li>คลิกลิงก์ในอีเมลเพื่อรีเซ็ตรหัสผ่าน</li>
                <li>ตั้งรหัสผ่านใหม่</li>
                <li>เข้าสู่ระบบด้วยรหัสผ่านใหม่</li>
              </ol>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={() => {
                  setEmailSent(false)
                  setSubmittedEmail('')
                }}
                className="text-sm text-primary-600 hover:text-primary-500"
              >
                ไม่ได้รับอีเมล? ส่งอีกครั้ง
              </button>
              
              <div className="text-sm text-gray-500">
                หากยังไม่ได้รับอีเมล กรุณาตรวจสอบในโฟลเดอร์ Spam/Junk
              </div>
              
              <Link
                to="/login"
                className="block w-full btn-primary"
              >
                กลับไปหน้าเข้าสู่ระบบ
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Reset password form
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-orange-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-16 w-16 bg-primary-500 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-2xl">C</span>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            ลืมรหัสผ่าน?
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            ไม่ต้องกังวล เราจะส่งลิงก์สำหรับรีเซ็ตรหัสผ่านให้คุณ
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="bg-white shadow-xl rounded-lg p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  อีเมลที่ใช้สมัคร
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    {...register('email')}
                    type="email"
                    autoComplete="email"
                    className="input-base pl-10"
                    placeholder="admin@school.com"
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>
            </div>

            <div className="mt-6">
              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary py-3"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin inline" />
                    กำลังส่งอีเมล...
                  </>
                ) : (
                  'ส่งลิงก์รีเซ็ตรหัสผ่าน'
                )}
              </button>
            </div>

            <div className="mt-4 text-center">
              <Link
                to="/login"
                className="text-sm text-gray-600 hover:text-gray-900 inline-flex items-center"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                กลับไปหน้าเข้าสู่ระบบ
              </Link>
            </div>
          </div>
        </form>

        {/* Help text */}
        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">ข้อมูลเพิ่มเติม:</h4>
          <ul className="space-y-1 text-sm text-blue-700">
            <li>• ลิงก์รีเซ็ตรหัสผ่านจะหมดอายุใน 1 ชั่วโมง</li>
            <li>• หากไม่ได้รับอีเมล ให้ตรวจสอบในโฟลเดอร์ Spam</li>
            <li>• ใช้อีเมลเดียวกับที่ใช้สมัครสมาชิก</li>
          </ul>
        </div>

        {/* Contact support */}
        <div className="text-center">
          <p className="text-sm text-gray-500">
            ยังคงมีปัญหา? {' '}
            <a
              href="mailto:support@classpass.app"
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              ติดต่อฝ่ายสนับสนุน
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default ForgotPasswordPage