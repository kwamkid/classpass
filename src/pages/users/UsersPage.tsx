// src/pages/users/UsersPage.tsx
import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  Plus,
  Search,
  Filter,
  User,
  Shield,
  ShieldCheck,
  Edit,
  Trash2,
  Mail,
  Phone,
  MoreVertical,
  UserPlus,
  Key,
  Ban,
  CheckCircle
} from 'lucide-react'
import Layout from '../../components/layout/Layout'
import UserAvatar from '../../components/common/UserAvatar'
import { useAuthStore } from '../../stores/authStore'
import { useSchoolStore } from '../../stores/schoolStore'
import * as userService from '../../services/user'
import toast from 'react-hot-toast'
import ConfirmDialog from '../../components/ui/ConfirmDialog'

const UsersPage = () => {
  const navigate = useNavigate()
  const { user: currentUser } = useAuthStore()
  const { school } = useSchoolStore()
  const [users, setUsers] = useState<userService.User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<userService.User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selectedUser, setSelectedUser] = useState<userService.User | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showMenu, setShowMenu] = useState<string | null>(null)

  // Check permissions
  const canManageUsers = currentUser?.role === 'owner' || currentUser?.role === 'admin'

  useEffect(() => {
    if (school?.id) {
      fetchUsers()
    }
  }, [school?.id])

  useEffect(() => {
    filterUsers()
  }, [users, searchTerm, filterRole, filterStatus])

  const fetchUsers = async () => {
    if (!school?.id) return
    
    setIsLoading(true)
    try {
      const fetchedUsers = await userService.getUsers(school.id)
      setUsers(fetchedUsers)
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูลผู้ใช้')
    } finally {
      setIsLoading(false)
    }
  }

  const filterUsers = () => {
    let filtered = [...users]
    
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(user =>
        user.firstName.toLowerCase().includes(search) ||
        user.lastName.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search) ||
        user.phone?.toLowerCase().includes(search)
      )
    }
    
    // Role filter
    if (filterRole !== 'all') {
      filtered = filtered.filter(user => user.role === filterRole)
    }
    
    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(user => 
        filterStatus === 'active' ? user.isActive : !user.isActive
      )
    }
    
    setFilteredUsers(filtered)
  }

  const handleToggleStatus = async (user: userService.User) => {
    try {
      await userService.toggleUserStatus(user.id)
      toast.success(
        user.isActive 
          ? `ระงับการใช้งานของ ${user.displayName} แล้ว`
          : `เปิดใช้งาน ${user.displayName} แล้ว`
      )
      fetchUsers()
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการเปลี่ยนสถานะ')
    }
  }

  const handleSendPasswordReset = async (email: string) => {
    try {
      await userService.sendPasswordReset(email)
      toast.success(`ส่งลิงก์รีเซ็ตรหัสผ่านไปที่ ${email} แล้ว`)
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการส่งอีเมล')
    }
  }

  const handleDeleteUser = async () => {
    if (!selectedUser) return
    
    try {
      await userService.deleteUser(selectedUser.id)
      toast.success('ลบผู้ใช้สำเร็จ')
      setShowDeleteDialog(false)
      setSelectedUser(null)
      fetchUsers()
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการลบผู้ใช้')
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <ShieldCheck className="w-4 h-4" />
      case 'admin':
        return <Shield className="w-4 h-4" />
      default:
        return <User className="w-4 h-4" />
    }
  }

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

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-700 border-purple-200'
      case 'admin':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'teacher':
        return 'bg-green-100 text-green-700 border-green-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">จัดการผู้ใช้</h1>
              <p className="mt-1 text-sm text-gray-600">
                จัดการผู้ใช้และสิทธิ์การเข้าถึงระบบ
              </p>
            </div>
            
            {canManageUsers && (
              <div className="mt-4 sm:mt-0">
                <Link
                  to="/users/add"
                  className="btn-primary"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  เพิ่มผู้ใช้
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="ค้นหาด้วยชื่อ, อีเมล, เบอร์โทร..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Role Filter */}
            <div>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">ทุกบทบาท</option>
                <option value="owner">เจ้าของ</option>
                <option value="admin">ผู้ดูแลระบบ</option>
                <option value="teacher">ครูผู้สอน</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">ทุกสถานะ</option>
                <option value="active">ใช้งานอยู่</option>
                <option value="inactive">ระงับการใช้งาน</option>
              </select>
            </div>
          </div>
        </div>

        {/* Users List */}
        {isLoading ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="text-center">
              <div className="inline-flex items-center space-x-2">
                <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-gray-600">กำลังโหลดข้อมูล...</span>
              </div>
            </div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="text-center">
              <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">ไม่พบข้อมูลผู้ใช้</p>
              {searchTerm || filterRole !== 'all' || filterStatus !== 'all' ? (
                <p className="text-sm text-gray-500 mt-2">
                  ลองปรับเปลี่ยนเงื่อนไขการค้นหา
                </p>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ผู้ใช้
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      บทบาท
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ติดต่อ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      สถานะ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      เข้าระบบล่าสุด
                    </th>
                    {canManageUsers && (
                      <th className="relative px-6 py-3">
                        <span className="sr-only">Actions</span>
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <UserAvatar 
                              user={user} 
                              size="md" 
                              showBorder={true}
                            />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.displayName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeClass(user.role)}`}>
                          {getRoleIcon(user.role)}
                          <span className="ml-1">{getRoleDisplay(user.role)}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {user.phone && (
                            <div className="flex items-center">
                              <Phone className="w-3 h-3 mr-1 text-gray-400" />
                              {user.phone}
                            </div>
                          )}
                          <div className="flex items-center text-gray-500">
                            <Mail className="w-3 h-3 mr-1 text-gray-400" />
                            {user.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.isActive ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            ใช้งานอยู่
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <Ban className="w-3 h-3 mr-1" />
                            ระงับการใช้งาน
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.lastLogin ? (
                          new Date(user.lastLogin).toLocaleDateString('th-TH', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        ) : (
                          'ยังไม่เคยเข้าระบบ'
                        )}
                      </td>
                      {canManageUsers && (
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="relative">
                            <button
                              onClick={() => setShowMenu(showMenu === user.id ? null : user.id)}
                              className="text-gray-400 hover:text-gray-600"
                              disabled={user.id === currentUser?.id}
                            >
                              <MoreVertical className="w-5 h-5" />
                            </button>
                            
                            {showMenu === user.id && (
                              <>
                                <div 
                                  className="fixed inset-0 z-10" 
                                  onClick={() => setShowMenu(null)}
                                />
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                                  <Link
                                    to={`/users/${user.id}/edit`}
                                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    onClick={() => setShowMenu(null)}
                                  >
                                    <Edit className="w-4 h-4 mr-2" />
                                    แก้ไขข้อมูล
                                  </Link>
                                  
                                  <button
                                    onClick={() => {
                                      handleSendPasswordReset(user.email)
                                      setShowMenu(null)
                                    }}
                                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                  >
                                    <Key className="w-4 h-4 mr-2" />
                                    รีเซ็ตรหัสผ่าน
                                  </button>
                                  
                                  <button
                                    onClick={() => {
                                      handleToggleStatus(user)
                                      setShowMenu(null)
                                    }}
                                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                  >
                                    <Ban className="w-4 h-4 mr-2" />
                                    {user.isActive ? 'ระงับการใช้งาน' : 'เปิดใช้งาน'}
                                  </button>
                                  
                                  {user.role !== 'owner' && (
                                    <>
                                      <hr className="my-1" />
                                      <button
                                        onClick={() => {
                                          setSelectedUser(user)
                                          setShowDeleteDialog(true)
                                          setShowMenu(null)
                                        }}
                                        className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                      >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        ลบผู้ใช้
                                      </button>
                                    </>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showDeleteDialog}
          onClose={() => {
            setShowDeleteDialog(false)
            setSelectedUser(null)
          }}
          onConfirm={handleDeleteUser}
          title="ยืนยันการลบผู้ใช้"
          message={`คุณต้องการลบ ${selectedUser?.displayName} ออกจากระบบใช่หรือไม่?`}
          confirmText="ลบผู้ใช้"
          type="danger"
        />
      </div>
    </Layout>
  )
}

export default UsersPage