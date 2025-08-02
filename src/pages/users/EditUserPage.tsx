// src/pages/users/EditUserPage.tsx
import { useState, useEffect } from 'react'
import { useNavigate, Link, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { 
  ArrowLeft,
  User,
  Mail,
  Phone,
  Shield,
  ShieldCheck,
  Save,
  Info,
  AlertCircle
} from 'lucide-react'
import Layout from '../../components/layout/Layout'
import { useAuthStore } from '../../stores/authStore'
import { useSchoolStore } from '../../stores/schoolStore'
import * as userService from '../../services/user'
import toast from 'react-hot-toast'

// Form validation schema
const userSchema = z.object({
  firstName: z.string()
    .min(1, 'กรุณากรอกชื่อ')
    .max(50, 'ชื่อต้องไม่เกิน 50 ตัวอักษร'),
  lastName: z.string()
    .min(1, 'กรุณากรอกนามสกุล')
    .max(50, 'นามสกุลต้องไม่เกิน 50 ตัวอักษร'),
  role: z.enum(['owner', 'admin', 'teacher'] as const),
  phone: z.string().optional(),
  isActive: z.boolean()
})

type UserFormData = z.infer<typeof userSchema>

const EditUserPage = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { user: currentUser } = useAuthStore()
  const { school } = useSchoolStore()
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [user, setUser] = useState<userService.User | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema)
  })

  const watchedRole = watch('role')

  useEffect(() => {
    if (id) {
      fetchUser()
    }
  }, [id])

  const fetchUser = async () => {
    if (!id) return
    
    setIsLoading(true)
    try {
      const fetchedUser = await userService.getUser(id)
      if (fetchedUser) {
        setUser(fetchedUser)
        reset({
          firstName: fetchedUser.firstName,
          lastName: fetchedUser.lastName,
          role: fetchedUser.role,
          phone: fetchedUser.phone || '',
          isActive: fetchedUser.isActive
        })
      } else {
        toast.error('ไม่พบข้อมูลผู้ใช้')
        navigate('/users')
      }
    } catch (error) {
      console.error('Error fetching user:', error)
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล')
      navigate('/users')
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = async (data: UserFormData) => {
    if (!id || !user) return

    setIsSubmitting(true)
    try {
      // Prepare update data
      const updateData: any = {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        isActive: data.isActive
      }

      // Only update role if not owner and current user has permission
      if (user.role !== 'owner' && currentUser?.role === 'owner') {
        updateData.role = data.role
      }

      await userService.updateUser(id, updateData)
      
      toast.success('บันทึกข้อมูลสำเร็จ')
      navigate('/users')
    } catch (error: any) {
      console.error('Error updating user:', error)
      toast.error(error.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="text-center">
              <div className="inline-flex items-center space-x-2">
                <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-gray-600">กำลังโหลดข้อมูล...</span>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  if (!user) {
    return null
  }

  const isOwnProfile = currentUser?.id === user.id
  const canEditRole = currentUser?.role === 'owner' && user.role !== 'owner'
  const canEditStatus = currentUser?.role === 'owner' && !isOwnProfile

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
          
          <h1 className="text-2xl font-bold text-gray-900">แก้ไขข้อมูลผู้ใช้</h1>
          <p className="mt-1 text-sm text-gray-600">
            แก้ไขข้อมูลส่วนตัวและบทบาทของผู้ใช้
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {/* Account Info (Read-only) */}
            <div className="p-6 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-medium text-gray-900 mb-4">ข้อมูลบัญชี</h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">อีเมล:</span>
                  <span className="text-sm font-medium text-gray-900">{user.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">User ID:</span>
                  <span className="text-sm font-mono text-gray-500">{user.id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">สร้างเมื่อ:</span>
                  <span className="text-sm text-gray-900">
                    {new Date(user.createdAt).toLocaleDateString('th-TH', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
                {user.lastLogin && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">เข้าระบบล่าสุด:</span>
                    <span className="text-sm text-gray-900">
                      {new Date(user.lastLogin).toLocaleDateString('th-TH', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>

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
                <div className="md:col-span-2">
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
              </div>
            </div>

            {/* Role & Status */}
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">บทบาทและสถานะ</h3>
              
              <div className="space-y-6">
                {/* Role */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    บทบาท <span className="text-red-500">*</span>
                  </label>
                  {canEditRole ? (
                    <select
                      {...register('role')}
                      className={`input-base ${errors.role ? 'input-error' : ''}`}
                    >
                      <option value="admin">ผู้ดูแลระบบ</option>
                      <option value="teacher">ครูผู้สอน</option>
                    </select>
                  ) : (
                    <div className="flex items-center">
                      <input
                        type="text"
                        value={getRoleDisplay(user.role)}
                        disabled
                        className="input-base bg-gray-100 cursor-not-allowed"
                      />
                      {user.role === 'owner' && (
                        <div className="ml-3">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            <ShieldCheck className="w-3 h-3 mr-1" />
                            ไม่สามารถเปลี่ยนบทบาทเจ้าของได้
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  {errors.role && (
                    <p className="mt-1 text-sm text-red-600">กรุณาเลือกบทบาท</p>
                  )}
                </div>

                {/* Active Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    สถานะการใช้งาน
                  </label>
                  {canEditStatus ? (
                    <div className="flex items-center space-x-3">
                      <label className="inline-flex items-center">
                        <input
                          type="checkbox"
                          {...register('isActive')}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">เปิดใช้งาน</span>
                      </label>
                      {!watch('isActive') && (
                        <div className="flex items-center text-sm text-yellow-600">
                          <AlertCircle className="w-4 h-4 mr-1" />
                          ผู้ใช้จะไม่สามารถเข้าสู่ระบบได้
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.isActive ? 'เปิดใช้งาน' : 'ระงับการใช้งาน'}
                      </span>
                      {isOwnProfile && (
                        <span className="ml-3 text-sm text-gray-500">
                          ไม่สามารถเปลี่ยนสถานะของตนเองได้
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Role Permissions Info */}
          {watchedRole && watchedRole !== 'owner' && (
            <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">สิทธิ์การใช้งานของบทบาท</h3>
              
              <div className="flex items-start">
                {watchedRole === 'admin' ? (
                  <>
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
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </div>
            </div>
          )}

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

// Helper function
const getRoleDisplay = (role: string) => {
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

export default EditUserPage