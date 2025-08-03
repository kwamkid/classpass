// src/pages/profile/EditProfilePage.tsx
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { 
  ArrowLeft,
  User,
  Phone,
  Save,
  Mail,
  Shield
} from 'lucide-react'
import Layout from '../../components/layout/Layout'
import UserAvatar from '../../components/common/UserAvatar'
import { useAuthStore } from '../../stores/authStore'
import * as userService from '../../services/user'
import toast from 'react-hot-toast'

// Form validation schema
const profileSchema = z.object({
  firstName: z.string()
    .min(1, 'กรุณากรอกชื่อ')
    .max(50, 'ชื่อต้องไม่เกิน 50 ตัวอักษร'),
  lastName: z.string()
    .min(1, 'กรุณากรอกนามสกุล')
    .max(50, 'นามสกุลต้องไม่เกิน 50 ตัวอักษร'),
  phone: z.string()
    .optional()
    .refine((val) => !val || /^[0-9-\s]+$/.test(val), {
      message: 'รูปแบบเบอร์โทรไม่ถูกต้อง'
    })
})

type ProfileFormData = z.infer<typeof profileSchema>

const EditProfilePage = () => {
  const navigate = useNavigate()
  const { user, setUser } = useAuthStore()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    watch
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      phone: user?.phone || ''
    }
  })

  // Watch form changes for preview
  const watchedData = watch()
  const previewUser = {
    ...user,
    firstName: watchedData.firstName,
    lastName: watchedData.lastName,
    displayName: `${watchedData.firstName} ${watchedData.lastName}`,
    phone: watchedData.phone
  }

  const onSubmit = async (data: ProfileFormData) => {
    if (!user?.id) {
      toast.error('ไม่พบข้อมูลผู้ใช้')
      return
    }

    setIsSubmitting(true)
    try {
      await userService.updateUserProfile(user.id, {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone
      })

      // Update user in auth store
      const updatedUser = {
        ...user,
        firstName: data.firstName,
        lastName: data.lastName,
        displayName: `${data.firstName} ${data.lastName}`,
        phone: data.phone
      }
      setUser(updatedUser)

      toast.success('บันทึกข้อมูลสำเร็จ')
      navigate('/settings')
    } catch (error: any) {
      console.error('Error updating profile:', error)
      toast.error(error.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getRoleDisplay = (role?: string) => {
    switch (role) {
      case 'owner':
        return 'เจ้าของ'
      case 'admin':
        return 'ผู้ดูแลระบบ'
      case 'teacher':
        return 'ครูผู้สอน'
      default:
        return role
    }
  }

  const getRoleBadgeClass = (role?: string) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'admin':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'teacher':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/settings"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            กลับไปหน้าตั้งค่า
          </Link>
          
          <h1 className="text-2xl font-bold text-gray-900">แก้ไขข้อมูลส่วนตัว</h1>
          <p className="mt-1 text-sm text-gray-600">
            อัพเดทข้อมูลส่วนตัวของคุณ
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Preview Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">ตัวอย่าง</h3>
              
              <div className="text-center">
                <UserAvatar 
                  user={previewUser} 
                  size="xl" 
                  showBorder={true}
                  className="mx-auto mb-4"
                />
                
                <h4 className="text-lg font-semibold text-gray-900">
                  {previewUser.displayName}
                </h4>
                
                <p className="text-sm text-gray-600 mb-2">{user?.email}</p>
                
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeClass(user?.role)}`}>
                  <Shield className="w-3 h-3 mr-1" />
                  {getRoleDisplay(user?.role)}
                </span>
                
                {previewUser.phone && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-center text-sm text-gray-600">
                      <Phone className="w-4 h-4 mr-1" />
                      {previewUser.phone}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                {/* Read-only Section */}
                <div className="p-6 border-b border-gray-200 bg-gray-50">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">ข้อมูลที่ไม่สามารถแก้ไขได้</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        อีเมล
                      </label>
                      <div className="flex items-center">
                        <Mail className="w-5 h-5 text-gray-400 mr-3" />
                        <span className="text-gray-900">{user?.email}</span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        หากต้องการเปลี่ยนอีเมล กรุณาติดต่อผู้ดูแลระบบ
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        บทบาท
                      </label>
                      <div className="flex items-center">
                        <Shield className="w-5 h-5 text-gray-400 mr-3" />
                        <span className="text-gray-900">{getRoleDisplay(user?.role)}</span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        บทบาทสามารถเปลี่ยนได้โดยเจ้าของเท่านั้น
                      </p>
                    </div>
                  </div>
                </div>

                {/* Editable Section */}
                <div className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">ข้อมูลที่สามารถแก้ไขได้</h3>
                  
                  <div className="space-y-6">
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
                          className={`pl-10 input-base ${errors.phone ? 'input-error' : ''}`}
                          placeholder="081-234-5678"
                        />
                      </div>
                      {errors.phone && (
                        <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
                      )}
                      <p className="mt-1 text-xs text-gray-500">
                        เบอร์โทรศัพท์สำหรับติดต่อ (ไม่บังคับ)
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 flex items-center justify-between">
                <Link
                  to="/settings"
                  className="btn-secondary"
                >
                  ยกเลิก
                </Link>
                
                <div className="flex items-center space-x-3">
                  {isDirty && (
                    <span className="text-sm text-amber-600">
                      มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก
                    </span>
                  )}
                  
                  <button
                    type="submit"
                    disabled={isSubmitting || !isDirty}
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
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default EditProfilePage