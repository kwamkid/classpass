// src/pages/dashboard/Dashboard.tsx
import { useState, useEffect } from 'react'
import { 
  Users, 
  CreditCard, 
  TrendingUp, 
  Calendar,
  BarChart3,
  Clock,
  ArrowRight,
  AlertCircle,
  Loader2,
  ArrowUp,
  ArrowDown
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useSchoolStore } from '../../stores/schoolStore'
import { Link } from 'react-router-dom'
import Layout from '../../components/layout/Layout'
import * as dashboardService from '../../services/dashboard'
import toast from 'react-hot-toast'
import { useOnboardingStore } from '../../stores/onboardingStore'
import OnboardingChecklist from '../../components/onboarding/OnboardingChecklist'

const Dashboard = () => {
  const { user } = useAuthStore()
  const { school } = useSchoolStore()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalStudents: 0,
    newStudentsThisMonth: 0,
    monthlyRevenue: 0,
    revenueGrowth: 0,
    attendanceRate: 0,
    todayClasses: 0
  })
  const [activities, setActivities] = useState<any[]>([])
  const [todayClasses, setTodayClasses] = useState<any[]>([])
  
  // Onboarding
  const { 
    initializeOnboarding, 
    checkStepCompletion
  } = useOnboardingStore()

  useEffect(() => {
    if (school?.id) {
      loadDashboardData()
      initializeOnboarding()
    }
  }, [school?.id])

  const loadDashboardData = async () => {
    if (!school?.id) return
    
    try {
      setLoading(true)
      
      // Load all data in parallel
      const [statsData, activitiesData, classesData] = await Promise.all([
        dashboardService.getDashboardStats(school.id),
        dashboardService.getRecentActivities(school.id, 5),
        dashboardService.getTodayClasses(school.id)
      ])
      
      setStats(statsData)
      setActivities(activitiesData)
      setTodayClasses(classesData)
      
      // Check onboarding completion with more detailed checks
      checkStepCompletion({
        hasSchoolInfo: !!(school.address || school.phone || school.logo),
        hasCourses: statsData.totalCourses > 0 || classesData.length > 0,
        hasPackages: statsData.totalPackages > 0,
        hasStudents: statsData.totalStudents > 0
      })
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0
    }).format(amount)
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto mb-4" />
            <p className="text-gray-600">กำลังโหลดข้อมูล...</p>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            สวัสดี, {user?.firstName || 'Admin'} 👋
          </h2>
          <p className="text-gray-600">
            นี่คือภาพรวมของ{school?.name || 'โรงเรียน'}ในวันนี้
          </p>
        </div>

        {/* Onboarding Checklist - แสดงถ้ายังไม่เสร็จ */}
        <div className="mb-8">
          <OnboardingChecklist />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="นักเรียนทั้งหมด"
            value={stats.totalStudents.toString()}
            change={stats.newStudentsThisMonth > 0 ? `+${stats.newStudentsThisMonth}` : '0'}
            trend={stats.newStudentsThisMonth > 0 ? 'up' : 'neutral'}
            icon={<Users className="w-6 h-6" />}
            color="blue"
            subtitle="เดือนนี้"
          />
          <StatCard
            title="รายได้เดือนนี้"
            value={formatCurrency(stats.monthlyRevenue)}
            change={`${stats.revenueGrowth > 0 ? '+' : ''}${stats.revenueGrowth}%`}
            trend={stats.revenueGrowth > 0 ? 'up' : stats.revenueGrowth < 0 ? 'down' : 'neutral'}
            icon={<CreditCard className="w-6 h-6" />}
            color="green"
            subtitle="เทียบเดือนที่แล้ว"
          />
          <StatCard
            title="อัตราเข้าเรียนวันนี้"
            value={`${stats.attendanceRate}%`}
            change=""
            trend="neutral"
            icon={<TrendingUp className="w-6 h-6" />}
            color="orange"
            subtitle="ของนักเรียนทั้งหมด"
          />
          <StatCard
            title="คลาสวันนี้"
            value={stats.todayClasses.toString()}
            change=""
            trend="neutral"
            icon={<Calendar className="w-6 h-6" />}
            color="purple"
            subtitle="คลาสที่เปิดสอน"
          />
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activities */}
          <div className="lg:col-span-2 card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">กิจกรรมล่าสุด</h3>
              <button 
                onClick={loadDashboardData}
                className="text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                รีเฟรช
              </button>
            </div>
            
            {activities.length > 0 ? (
              <div className="space-y-4">
                {activities.map((activity) => (
                  <ActivityItem
                    key={activity.id}
                    time={dashboardService.formatTimeAgo(activity.timestamp)}
                    title={activity.title}
                    description={activity.description}
                    type={activity.type}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>ยังไม่มีกิจกรรม</p>
              </div>
            )}
          </div>

          {/* Quick Actions & Today Classes */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">ทำอะไรต่อ?</h3>
              <div className="space-y-3">
                <QuickAction
                  icon={<Users className="w-5 h-5" />}
                  title="จัดการนักเรียน"
                  href="/students"
                />
                <QuickAction
                  icon={<Calendar className="w-5 h-5" />}
                  title="เช็คชื่อวันนี้"
                  href="/attendance"
                />
                <QuickAction
                  icon={<CreditCard className="w-5 h-5" />}
                  title="ขายแพ็คเกจ"
                  href="/credits/purchase"
                />
                <QuickAction
                  icon={<BarChart3 className="w-5 h-5" />}
                  title="ดูรายงาน"
                  href="/reports"
                />
              </div>
            </div>

            {/* Today's Classes */}
            {todayClasses.length > 0 && (
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  คลาสวันนี้
                </h3>
                <div className="space-y-3">
                  {todayClasses.slice(0, 3).map((classItem) => (
                    <div key={classItem.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          {classItem.courseName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {classItem.startTime} - {classItem.endTime} • {classItem.room}
                        </p>
                      </div>
                      <Link
                        to={`/attendance?course=${classItem.courseId}`}
                        className="text-primary-600 hover:text-primary-700"
                      >
                        <Calendar className="w-4 h-4" />
                      </Link>
                    </div>
                  ))}
                  {todayClasses.length > 3 && (
                    <Link
                      to="/courses"
                      className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                    >
                      ดูทั้งหมด ({todayClasses.length} คลาส)
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}

// Stat Card Component
const StatCard = ({ title, value, change, trend, icon, color, subtitle }: {
  title: string
  value: string
  change: string
  trend: 'up' | 'down' | 'neutral'
  icon: React.ReactNode
  color: 'blue' | 'green' | 'orange' | 'purple'
  subtitle?: string
}) => {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    orange: 'bg-orange-100 text-orange-600',
    purple: 'bg-purple-100 text-purple-600'
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
        {change && (
          <span className={`text-sm font-medium flex items-center ${
            trend === 'up' ? 'text-green-600' : 
            trend === 'down' ? 'text-red-600' : 
            'text-gray-500'
          }`}>
            {trend === 'up' && <ArrowUp className="w-4 h-4 mr-1" />}
            {trend === 'down' && <ArrowDown className="w-4 h-4 mr-1" />}
            {change}
          </span>
        )}
      </div>
      <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
      <p className="text-sm text-gray-600 mt-1">{title}</p>
      {subtitle && (
        <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
      )}
    </div>
  )
}

// Activity Item Component
const ActivityItem = ({ time, title, description, type }: {
  time: string
  title: string
  description: string
  type: 'student' | 'payment' | 'attendance' | 'warning'
}) => {
  const iconClasses = {
    student: 'bg-blue-100 text-blue-600',
    payment: 'bg-green-100 text-green-600',
    attendance: 'bg-purple-100 text-purple-600',
    warning: 'bg-yellow-100 text-yellow-600'
  }

  const icons = {
    student: <Users className="w-4 h-4" />,
    payment: <CreditCard className="w-4 h-4" />,
    attendance: <Calendar className="w-4 h-4" />,
    warning: <AlertCircle className="w-4 h-4" />
  }

  return (
    <div className="flex items-start space-x-3">
      <div className={`p-2 rounded-lg ${iconClasses[type]}`}>
        {icons[type]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <p className="text-sm text-gray-600 truncate">{description}</p>
      </div>
      <span className="text-xs text-gray-500 flex items-center whitespace-nowrap">
        <Clock className="w-3 h-3 mr-1" />
        {time}
      </span>
    </div>
  )
}

// Quick Action Component
const QuickAction = ({ icon, title, href }: {
  icon: React.ReactNode
  title: string
  href: string
}) => (
  <Link
    to={href}
    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group"
  >
    <div className="flex items-center space-x-3">
      <div className="text-gray-600 group-hover:text-primary-600">
        {icon}
      </div>
      <span className="text-gray-700 group-hover:text-gray-900">{title}</span>
    </div>
    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-primary-600" />
  </Link>
)

export default Dashboard