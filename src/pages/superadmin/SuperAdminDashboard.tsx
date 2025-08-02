// src/pages/superadmin/SuperAdminDashboard.tsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { 
  Building2, 
  Users, 
  GraduationCap, 
  DollarSign,
  Trash2,
  Plus,
  RefreshCw,
  Search,
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity,
  LogOut,
  Shield
} from 'lucide-react'
import { 
  getAllSchoolsWithStats, 
  getSystemStats, 
  getSystemLogs, 
  deleteSchoolCompletely,
  createSchoolWithOwner
} from '../../services/superadmin'
import toast from 'react-hot-toast'

export default function SuperAdminDashboard() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [schools, setSchools] = useState<any[]>([])
  const [stats, setStats] = useState<any>({
    totalSchools: 0,
    totalUsers: 0,
    totalStudents: 0,
    totalRevenue: 0,
    activeSchools: 0,
    storageUsed: 0
  })
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [deletingSchoolId, setDeletingSchoolId] = useState<string | null>(null)

  useEffect(() => {
    // Verify super admin access
    if (!user?.isSuperAdmin && user?.role !== 'superadmin') {
      navigate('/')
      return
    }
    
    loadAllData()
  }, [user, navigate])

  const loadAllData = async () => {
    setLoading(true)
    try {
      const [schoolsData, systemStats, systemLogs] = await Promise.all([
        getAllSchoolsWithStats(),
        getSystemStats(),
        getSystemLogs(20)
      ])
      
      setSchools(schoolsData)
      setStats(systemStats)
      setLogs(systemLogs)
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      toast.success('ออกจากระบบสำเร็จ')
      navigate('/superadmin')
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการออกจากระบบ')
    }
  }

  const handleDeleteSchool = async (schoolId: string, schoolName: string) => {
    const confirmed = window.confirm(
      `⚠️ คำเตือน!\n\nคุณต้องการลบโรงเรียน "${schoolName}" และข้อมูลทั้งหมดที่เกี่ยวข้อง?\n\nการดำเนินการนี้ไม่สามารถย้อนกลับได้!\n\nข้อมูลที่จะถูกลบ:\n- นักเรียนทั้งหมด\n- ผู้ใช้งานทั้งหมด\n- คอร์สเรียนทั้งหมด\n- ประวัติการซื้อและการเงิน\n- ข้อมูลการเข้าเรียน\n- ข้อมูลอื่นๆ ทั้งหมด`
    )
    
    if (!confirmed) return
    
    const secondConfirm = window.prompt(
      `พิมพ์ชื่อโรงเรียน "${schoolName}" เพื่อยืนยันการลบ:`
    )
    
    if (secondConfirm !== schoolName) {
      toast.error('ชื่อโรงเรียนไม่ถูกต้อง ยกเลิกการลบ')
      return
    }
    
    setDeletingSchoolId(schoolId)
    
    try {
      await deleteSchoolCompletely(schoolId, 'superadmin')
      toast.success(`ลบโรงเรียน ${schoolName} และข้อมูลทั้งหมดเรียบร้อยแล้ว`)
      await loadAllData()
    } catch (error: any) {
      console.error('Error deleting school:', error)
      toast.error(error.message || 'เกิดข้อผิดพลาดในการลบโรงเรียน')
    } finally {
      setDeletingSchoolId(null)
    }
  }

  const filteredSchools = schools.filter(school =>
    school.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (date: any) => {
    if (!date) return '-'
    const d = date.toDate ? date.toDate() : new Date(date)
    return d.toLocaleDateString('th-TH')
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Shield className="w-8 h-8 text-red-500 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-white">Super Admin Dashboard</h1>
                <p className="text-gray-400 text-sm mt-1">จัดการระบบ ClassPass ทั้งหมด</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-gray-400 text-sm">
                {user?.email}
              </span>
              <button
                onClick={loadAllData}
                disabled={loading}
                className="flex items-center px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                รีเฟรช
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                สร้างโรงเรียน
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                <LogOut className="w-4 h-4 mr-2" />
                ออกจากระบบ
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="โรงเรียนทั้งหมด"
            value={stats.totalSchools}
            icon={<Building2 className="w-6 h-6" />}
            color="blue"
            subtitle={`Active: ${stats.activeSchools}`}
          />
          <StatCard
            title="ผู้ใช้งานทั้งหมด"
            value={stats.totalUsers}
            icon={<Users className="w-6 h-6" />}
            color="green"
          />
          <StatCard
            title="นักเรียนทั้งหมด"
            value={stats.totalStudents}
            icon={<GraduationCap className="w-6 h-6" />}
            color="purple"
          />
          <StatCard
            title="รายได้รวม"
            value={formatCurrency(stats.totalRevenue)}
            icon={<DollarSign className="w-6 h-6" />}
            color="yellow"
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Schools List */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-lg border border-gray-700">
              <div className="p-4 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">รายการโรงเรียน</h2>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="ค้นหาโรงเรียน..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                    />
                    <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                  </div>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-gray-400 text-sm">
                      <th className="px-4 py-3 font-medium">โรงเรียน</th>
                      <th className="px-4 py-3 font-medium">Plan</th>
                      <th className="px-4 py-3 font-medium text-center">นักเรียน</th>
                      <th className="px-4 py-3 font-medium text-center">ผู้ใช้</th>
                      <th className="px-4 py-3 font-medium text-right">รายได้</th>
                      <th className="px-4 py-3 font-medium">สร้างเมื่อ</th>
                      <th className="px-4 py-3 font-medium text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {filteredSchools.map((school) => (
                      <tr key={school.id} className="hover:bg-gray-700/50">
                        <td className="px-4 py-3">
                          <div className="flex items-center">
                            {school.logo ? (
                              <img 
                                src={school.logo} 
                                alt={school.name}
                                className="w-10 h-10 rounded-lg object-cover mr-3"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center mr-3">
                                <Building2 className="w-5 h-5 text-gray-400" />
                              </div>
                            )}
                            <div>
                              <div className="text-white font-medium">{school.name}</div>
                              <div className="text-gray-400 text-sm">
                                {school.isActive ? (
                                  <span className="flex items-center text-green-400">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Active
                                  </span>
                                ) : (
                                  <span className="flex items-center text-gray-500">
                                    <Clock className="w-3 h-3 mr-1" />
                                    Inactive
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            school.plan === 'pro' ? 'bg-purple-500/20 text-purple-400' :
                            school.plan === 'basic' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {school.plan.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-white">
                          {school.totalStudents}
                        </td>
                        <td className="px-4 py-3 text-center text-white">
                          {school.totalUsers}
                        </td>
                        <td className="px-4 py-3 text-right text-white">
                          {formatCurrency(school.totalRevenue)}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-sm">
                          {formatDate(school.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleDeleteSchool(school.id, school.name)}
                            disabled={deletingSchoolId === school.id}
                            className="text-red-400 hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="ลบโรงเรียน"
                          >
                            {deletingSchoolId === school.id ? (
                              <RefreshCw className="w-5 h-5 animate-spin" />
                            ) : (
                              <Trash2 className="w-5 h-5" />
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {filteredSchools.length === 0 && (
                  <div className="px-4 py-8 text-center text-gray-400">
                    {searchTerm ? 'ไม่พบโรงเรียนที่ค้นหา' : 'ยังไม่มีโรงเรียนในระบบ'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Activity Logs */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-lg border border-gray-700">
              <div className="p-4 border-b border-gray-700">
                <h2 className="text-lg font-semibold text-white flex items-center">
                  <Activity className="w-5 h-5 mr-2" />
                  System Logs
                </h2>
              </div>
              
              <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                {logs.map((log) => (
                  <div key={log.id} className="bg-gray-700/50 rounded-lg p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center">
                          {log.action.includes('delete') ? (
                            <AlertTriangle className="w-4 h-4 text-red-400 mr-2" />
                          ) : (
                            <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                          )}
                          <span className="text-sm text-white font-medium">
                            {log.action}
                          </span>
                        </div>
                        {log.details && (
                          <p className="text-xs text-gray-400 mt-1">
                            {log.details.schoolName || log.schoolId}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatDate(log.timestamp)}
                      </span>
                    </div>
                  </div>
                ))}
                
                {logs.length === 0 && (
                  <p className="text-center text-gray-400 text-sm">
                    ไม่มีประวัติการทำงาน
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create School Modal */}
      {showCreateModal && (
        <CreateSchoolModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            loadAllData()
          }}
        />
      )}
    </div>
  )
}

// Stat Card Component
function StatCard({ title, value, icon, color, subtitle }: any) {
  const colorClasses = {
    blue: 'bg-blue-500/20 text-blue-400',
    green: 'bg-green-500/20 text-green-400',
    purple: 'bg-purple-500/20 text-purple-400',
    yellow: 'bg-yellow-500/20 text-yellow-400'
  }
  
  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
          {subtitle && (
            <p className="text-gray-500 text-xs mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

// Create School Modal Component
function CreateSchoolModal({ onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({
    schoolName: '',
    ownerEmail: '',
    ownerPassword: '',
    ownerFirstName: '',
    ownerLastName: '',
    plan: 'free' as 'free' | 'basic' | 'pro'
  })
  const [creating, setCreating] = useState(false)
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    
    try {
      await createSchoolWithOwner(formData)
      toast.success('สร้างโรงเรียนเรียบร้อยแล้ว')
      onSuccess()
    } catch (error: any) {
      console.error('Error creating school:', error)
      toast.error(error.message || 'เกิดข้อผิดพลาดในการสร้างโรงเรียน')
    } finally {
      setCreating(false)
    }
  }
  
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg max-w-md w-full p-6">
        <h3 className="text-xl font-semibold text-white mb-4">สร้างโรงเรียนใหม่</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              ชื่อโรงเรียน
            </label>
            <input
              type="text"
              required
              value={formData.schoolName}
              onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                ชื่อเจ้าของ
              </label>
              <input
                type="text"
                required
                value={formData.ownerFirstName}
                onChange={(e) => setFormData({ ...formData, ownerFirstName: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                นามสกุล
              </label>
              <input
                type="text"
                required
                value={formData.ownerLastName}
                onChange={(e) => setFormData({ ...formData, ownerLastName: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={formData.ownerEmail}
              onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              รหัสผ่าน
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={formData.ownerPassword}
              onChange={(e) => setFormData({ ...formData, ownerPassword: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Plan
            </label>
            <select
              value={formData.plan}
              onChange={(e) => setFormData({ ...formData, plan: e.target.value as any })}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
            >
              <option value="free">Free</option>
              <option value="basic">Basic</option>
              <option value="pro">Pro</option>
            </select>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {creating ? 'กำลังสร้าง...' : 'สร้างโรงเรียน'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}