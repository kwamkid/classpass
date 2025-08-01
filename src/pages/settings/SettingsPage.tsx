// src/pages/settings/SettingsPage.tsx
import { useState } from 'react'
import { 
  Building,
  User,
  Bell,
  CreditCard,
  Shield,
  Globe,
  Save,
  Upload,
  X
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useSchoolStore } from '../../stores/schoolStore'
import * as schoolService from '../../services/school'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '../../services/firebase'
import toast from 'react-hot-toast'
import Layout from '../../components/layout/Layout'

const SettingsPage = () => {
  const { user } = useAuthStore()
  const { school, loadSchool } = useSchoolStore()
  const [activeTab, setActiveTab] = useState('school')
  const [loading, setLoading] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  
  // School settings
  const [schoolData, setSchoolData] = useState({
    name: school?.name || '',
    address: school?.address || '',
    phone: school?.phone || '',
    email: school?.email || '',
    lineOA: school?.lineOA || '',
    website: school?.website || '',
    taxId: school?.taxId || ''
  })
  
  // Notification settings
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    lineNotifications: false,
    studentAbsent: true,
    lowCredits: true,
    newStudent: true,
    paymentReceived: true
  })

  const handleSchoolDataChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setSchoolData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleNotificationChange = (key: string) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !school) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('กรุณาเลือกไฟล์รูปภาพเท่านั้น')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('ขนาดไฟล์ต้องไม่เกิน 5MB')
      return
    }

    try {
      setUploadingLogo(true)
      
      // Upload to Firebase Storage
      const logoRef = ref(storage, `schools/${school.id}/logo.jpg`)
      const snapshot = await uploadBytes(logoRef, file)
      const downloadURL = await getDownloadURL(snapshot.ref)
      
      // Update school document
      await schoolService.updateSchool(school.id, { logo: downloadURL })
      
      // Reload school data
      await loadSchool(school.id)
      
      toast.success('อัพโหลดโลโก้สำเร็จ')
    } catch (error) {
      console.error('Error uploading logo:', error)
      toast.error('เกิดข้อผิดพลาดในการอัพโหลดโลโก้')
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleSaveSchoolData = async () => {
    if (!school) return
    
    try {
      setLoading(true)
      await schoolService.updateSchool(school.id, schoolData)
      await loadSchool(school.id)
      toast.success('บันทึกข้อมูลสำเร็จ')
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล')
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { id: 'school', label: 'ข้อมูลโรงเรียน', icon: Building },
    { id: 'profile', label: 'โปรไฟล์', icon: User },
    { id: 'notifications', label: 'การแจ้งเตือน', icon: Bell },
    { id: 'billing', label: 'บิลลิ่ง', icon: CreditCard },
    { id: 'security', label: 'ความปลอดภัย', icon: Shield }
  ]

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">ตั้งค่า</h1>
          <p className="mt-1 text-sm text-gray-500">
            จัดการข้อมูลโรงเรียนและการตั้งค่าต่างๆ
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <div className="lg:w-64">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeTab === tab.id
                        ? 'bg-primary-50 text-primary-700 border-l-4 border-primary-500'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mr-3 ${
                      activeTab === tab.id ? 'text-primary-600' : 'text-gray-400'
                    }`} />
                    {tab.label}
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1">
            {/* School Settings */}
            {activeTab === 'school' && (
              <div className="bg-white shadow-sm rounded-lg">
                <div className="p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-6">
                    ข้อมูลโรงเรียน
                  </h2>

                  {/* Logo Upload */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      โลโก้โรงเรียน
                    </label>
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        {school?.logo ? (
                          <img
                            src={school.logo}
                            alt="School Logo"
                            className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                          />
                        ) : (
                          <div className="w-24 h-24 rounded-full bg-primary-100 flex items-center justify-center border-4 border-white shadow-lg">
                            <Building className="w-10 h-10 text-primary-600" />
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <input
                          type="file"
                          id="logo-upload"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          disabled={uploadingLogo}
                          className="hidden"
                        />
                        <label
                          htmlFor="logo-upload"
                          className={`btn-secondary inline-flex items-center cursor-pointer ${
                            uploadingLogo ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          {uploadingLogo ? (
                            <>
                              <div className="spinner mr-2"></div>
                              กำลังอัพโหลด...
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4 mr-2" />
                              เลือกรูปภาพ
                            </>
                          )}
                        </label>
                        <p className="mt-1 text-xs text-gray-500">
                          JPG, PNG หรือ GIF ขนาดไม่เกิน 5MB
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* School Info Form */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ชื่อโรงเรียน
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={schoolData.name}
                        onChange={handleSchoolDataChange}
                        className="input-base"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        เบอร์โทรศัพท์
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={schoolData.phone}
                        onChange={handleSchoolDataChange}
                        className="input-base"
                        placeholder="02-XXX-XXXX"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        อีเมล
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={schoolData.email}
                        onChange={handleSchoolDataChange}
                        className="input-base"
                        placeholder="info@school.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Line OA
                      </label>
                      <input
                        type="text"
                        name="lineOA"
                        value={schoolData.lineOA}
                        onChange={handleSchoolDataChange}
                        className="input-base"
                        placeholder="@school"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        เว็บไซต์
                      </label>
                      <input
                        type="url"
                        name="website"
                        value={schoolData.website}
                        onChange={handleSchoolDataChange}
                        className="input-base"
                        placeholder="https://www.school.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        เลขประจำตัวผู้เสียภาษี
                      </label>
                      <input
                        type="text"
                        name="taxId"
                        value={schoolData.taxId}
                        onChange={handleSchoolDataChange}
                        className="input-base"
                        placeholder="0-0000-00000-00-0"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ที่อยู่
                      </label>
                      <textarea
                        name="address"
                        value={schoolData.address}
                        onChange={handleSchoolDataChange}
                        rows={3}
                        className="input-base"
                        placeholder="เลขที่ ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด รหัสไปรษณีย์"
                      />
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={handleSaveSchoolData}
                      disabled={loading}
                      className="btn-primary inline-flex items-center"
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
                </div>
              </div>
            )}

            {/* Profile Settings */}
            {activeTab === 'profile' && (
              <div className="bg-white shadow-sm rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-6">
                  ข้อมูลส่วนตัว
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">อีเมล</p>
                    <p className="text-base font-medium">{user?.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">ชื่อ-นามสกุล</p>
                    <p className="text-base font-medium">
                      {user?.firstName} {user?.lastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">ตำแหน่ง</p>
                    <p className="text-base font-medium">
                      {user?.role === 'owner' ? 'เจ้าของ' :
                       user?.role === 'admin' ? 'ผู้ดูแลระบบ' : 'ครูผู้สอน'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Notification Settings */}
            {activeTab === 'notifications' && (
              <div className="bg-white shadow-sm rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-6">
                  การแจ้งเตือน
                </h2>
                
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-900">ช่องทางการแจ้งเตือน</h3>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={notifications.emailNotifications}
                      onChange={() => handleNotificationChange('emailNotifications')}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      แจ้งเตือนผ่านอีเมล
                    </span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={notifications.lineNotifications}
                      onChange={() => handleNotificationChange('lineNotifications')}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      แจ้งเตือนผ่าน Line
                    </span>
                  </label>
                  
                  <hr className="my-4" />
                  
                  <h3 className="text-sm font-medium text-gray-900">ประเภทการแจ้งเตือน</h3>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={notifications.studentAbsent}
                      onChange={() => handleNotificationChange('studentAbsent')}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      นักเรียนขาดเรียน
                    </span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={notifications.lowCredits}
                      onChange={() => handleNotificationChange('lowCredits')}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      เครดิตใกล้หมด
                    </span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={notifications.newStudent}
                      onChange={() => handleNotificationChange('newStudent')}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      มีนักเรียนใหม่
                    </span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={notifications.paymentReceived}
                      onChange={() => handleNotificationChange('paymentReceived')}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      ได้รับการชำระเงิน
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* Billing Settings */}
            {activeTab === 'billing' && (
              <div className="bg-white shadow-sm rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-6">
                  ข้อมูลบิลลิ่ง
                </h2>
                
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <Globe className="w-5 h-5 text-blue-600 mr-2" />
                      <div>
                        <p className="font-medium text-blue-900">แพ็คเกจ: {school?.plan || 'Free'}</p>
                        <p className="text-sm text-blue-700">
                          นักเรียนสูงสุด {school?.maxStudents || 50} คน
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-500">
                    ต้องการอัพเกรดแพ็คเกจ? ติดต่อ support@classpass.app
                  </p>
                </div>
              </div>
            )}

            {/* Security Settings */}
            {activeTab === 'security' && (
              <div className="bg-white shadow-sm rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-6">
                  ความปลอดภัย
                </h2>
                
                <div className="space-y-4">
                  <button className="btn-secondary">
                    เปลี่ยนรหัสผ่าน
                  </button>
                  
                  <div className="pt-4">
                    <h3 className="text-sm font-medium text-gray-900 mb-2">
                      การเข้าสู่ระบบล่าสุด
                    </h3>
                    <p className="text-sm text-gray-500">
                      {new Date().toLocaleString('th-TH')}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default SettingsPage