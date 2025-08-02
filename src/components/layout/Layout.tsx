import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { 
  Menu,
  X,
  Home,
  Users,
  BookOpen,
  CreditCard,
  Calendar,
  BarChart3,
  Settings,
  LogOut,
  ChevronDown,
  User,
  Bell,
  Receipt,
  Package
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useSchoolStore } from '../../stores/schoolStore'
import toast from 'react-hot-toast'

interface LayoutProps {
  children: React.ReactNode
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const { school } = useSchoolStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const handleLogout = async () => {
    try {
      await logout()
      toast.success('ออกจากระบบสำเร็จ')
      navigate('/login')
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการออกจากระบบ')
    }
  }

  // Menu items with sections
  const menuSections = [
    {
      title: 'เมนูหลัก',
      items: [
        { 
          path: '/dashboard', 
          icon: Home, 
          label: 'หน้าหลัก',
          roles: ['owner', 'admin', 'teacher'],
          color: 'text-blue-600'
        },
        { 
          path: '/attendance', 
          icon: Calendar, 
          label: 'เช็คชื่อ',
          roles: ['owner', 'admin', 'teacher'],
          color: 'text-green-600'
        }
      ]
    },
    {
      title: 'จัดการข้อมูล',
      items: [
        { 
          path: '/students', 
          icon: Users, 
          label: 'นักเรียน',
          roles: ['owner', 'admin', 'teacher'],
          color: 'text-purple-600'
        },
        { 
          path: '/courses', 
          icon: BookOpen, 
          label: 'วิชาเรียน',
          roles: ['owner', 'admin'],
          color: 'text-indigo-600'
        },
        { 
          path: '/packages', 
          icon: Package, 
          label: 'แพ็คเกจ',
          roles: ['owner', 'admin'],
          color: 'text-orange-600'
        }
      ]
    },
    {
      title: 'การเงิน',
      items: [
        { 
          path: '/credits/history', 
          icon: Receipt, 
          label: 'ประวัติการซื้อ',
          roles: ['owner', 'admin'],
          color: 'text-emerald-600'
        },
        { 
          path: '/reports', 
          icon: BarChart3, 
          label: 'รายงาน',
          roles: ['owner', 'admin'],
          color: 'text-pink-600'
        }
      ]
    },
    {
      title: 'ระบบ',
      items: [
        { 
          path: '/settings', 
          icon: Settings, 
          label: 'ตั้งค่า',
          roles: ['owner', 'admin'],
          color: 'text-gray-600'
        }
      ]
    }
  ]

  const isActivePath = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  // Render menu section
  const renderMenuSection = (section: typeof menuSections[0], isMobile = false) => {
    const filteredItems = section.items.filter(item => 
      item.roles.includes(user?.role || '')
    )

    if (filteredItems.length === 0) return null

    return (
      <div key={section.title} className="mb-6">
        <h3 className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {section.title}
        </h3>
        <div className="space-y-1">
          {filteredItems.map((item) => {
            const Icon = item.icon
            const isActive = isActivePath(item.path)
            
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => isMobile && setSidebarOpen(false)}
                className={`
                  flex items-center px-3 py-3 text-base font-medium rounded-lg transition-all duration-150
                  ${isActive 
                    ? 'bg-primary-50 text-primary-700 shadow-sm' 
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
              >
                <Icon className={`w-6 h-6 mr-3 ${isActive ? 'text-primary-600' : item.color}`} />
                <span className="text-base font-medium">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar for desktop */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className="flex flex-col w-72">
          <div className="flex flex-col flex-grow bg-white border-r border-gray-200 overflow-y-auto">
            {/* Logo & School Info */}
            <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
              <div className="flex items-center h-16 px-4">
                <Link to="/dashboard" className="flex items-center space-x-3">
                  {school?.logo ? (
                    <img 
                      src={school.logo} 
                      alt={school.name}
                      className="w-10 h-10 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-xl">C</span>
                    </div>
                  )}
                  <span className="text-xl font-bold text-gray-900">ClassPass</span>
                </Link>
              </div>
              
              <div className="px-4 py-3">
                <p className="text-sm font-medium text-gray-900">{school?.name}</p>
                <p className="text-xs text-gray-500">
                  {user?.role === 'owner' ? 'เจ้าของ' : 
                   user?.role === 'admin' ? 'ผู้ดูแลระบบ' : 'ครูผู้สอน'}
                </p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4">
              {menuSections.map(section => renderMenuSection(section))}
            </nav>

            {/* User info */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200">
              <div className="p-4">
                <div className="flex items-center">
                  {user?.profileImage ? (
                    <img 
                      src={user.profileImage} 
                      alt={user.displayName}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="text-primary-600 font-semibold">
                        {user?.firstName?.[0] || 'U'}
                      </span>
                    </div>
                  )}
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-gray-900">{user?.displayName}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="mt-3 w-full flex items-center justify-center px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  ออกจากระบบ
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <>
          <div 
            className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 flex flex-col w-72 bg-white lg:hidden">
            <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
              <Link to="/dashboard" className="flex items-center space-x-3">
                {school?.logo ? (
                  <img 
                    src={school.logo} 
                    alt={school.name}
                    className="w-10 h-10 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-xl">C</span>
                  </div>
                )}
                <span className="text-xl font-bold text-gray-900">ClassPass</span>
              </Link>
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Mobile menu content */}
            <div className="flex-1 overflow-y-auto">
              <div className="px-4 py-3 border-b border-gray-200">
                <p className="text-sm font-medium text-gray-900">{school?.name}</p>
                <p className="text-xs text-gray-500">
                  {user?.role === 'owner' ? 'เจ้าของ' : 
                   user?.role === 'admin' ? 'ผู้ดูแลระบบ' : 'ครูผู้สอน'}
                </p>
              </div>

              <nav className="px-3 py-4">
                {menuSections.map(section => renderMenuSection(section, true))}
              </nav>
            </div>

            <div className="border-t border-gray-200">
              <div className="p-4">
                <div className="flex items-center">
                  {user?.profileImage ? (
                    <img 
                      src={user.profileImage} 
                      alt={user.displayName}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="text-primary-600 font-semibold">
                        {user?.firstName?.[0] || 'U'}
                      </span>
                    </div>
                  )}
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-gray-900">{user?.displayName}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="mt-3 w-full flex items-center justify-center px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  ออกจากระบบ
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Main content area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Mobile menu button */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-gray-500 hover:text-gray-700"
              >
                <Menu className="w-6 h-6" />
              </button>

              {/* Page title - desktop */}
              <div className="hidden lg:block">
                <h1 className="text-xl font-semibold text-gray-900">
                  {menuSections.flatMap(s => s.items).find(item => isActivePath(item.path))?.label || 'ClassPass'}
                </h1>
              </div>

              {/* Mobile logo */}
              <div className="lg:hidden flex items-center">
                {school?.logo ? (
                  <img 
                    src={school.logo} 
                    alt={school.name}
                    className="w-8 h-8 rounded object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 bg-primary-500 rounded flex items-center justify-center">
                    <span className="text-white font-bold">C</span>
                  </div>
                )}
                <span className="ml-2 text-lg font-semibold">ClassPass</span>
              </div>

              {/* Right side actions */}
              <div className="flex items-center space-x-4">
                {/* Notifications */}
                <button className="relative text-gray-500 hover:text-gray-700">
                  <Bell className="w-6 h-6" />
                  <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
                </button>

                {/* User menu - desktop */}
                <div className="hidden lg:block relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center space-x-3 text-gray-700 hover:text-gray-900"
                  >
                    {user?.profileImage ? (
                      <img 
                        src={user.profileImage} 
                        alt={user.displayName}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-primary-600 font-semibold text-sm">
                          {user?.firstName?.[0] || 'U'}
                        </span>
                      </div>
                    )}
                    <span className="text-sm font-medium">{user?.firstName}</span>
                    <ChevronDown className="w-4 h-4" />
                  </button>

                  {/* Dropdown menu */}
                  {userMenuOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setUserMenuOpen(false)}
                      />
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-20">
                        <Link
                          to="/profile"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <User className="w-4 h-4 inline mr-2" />
                          โปรไฟล์
                        </Link>
                        <Link
                          to="/settings"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <Settings className="w-4 h-4 inline mr-2" />
                          ตั้งค่า
                        </Link>
                        <hr className="my-1" />
                        <button
                          onClick={handleLogout}
                          className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          <LogOut className="w-4 h-4 inline mr-2" />
                          ออกจากระบบ
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  )
}

export default Layout