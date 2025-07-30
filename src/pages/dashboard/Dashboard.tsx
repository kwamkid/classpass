import { 
  Users, 
  CreditCard, 
  TrendingUp, 
  Calendar,
  BarChart3,
  Clock,
  ArrowRight,
  AlertCircle
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useSchoolStore } from '../../stores/schoolStore'
import { Link } from 'react-router-dom'
import Layout from '../../components/layout/Layout'

const Dashboard = () => {
  const { user } = useAuthStore()
  const { school } = useSchoolStore()
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

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="นักเรียนทั้งหมด"
            value="156"
            change="+8"
            trend="up"
            icon={<Users className="w-6 h-6" />}
            color="blue"
          />
          <StatCard
            title="รายได้เดือนนี้"
            value="฿89,500"
            change="+12%"
            trend="up"
            icon={<CreditCard className="w-6 h-6" />}
            color="green"
          />
          <StatCard
            title="อัตราเข้าเรียน"
            value="92%"
            change="-3%"
            trend="down"
            icon={<TrendingUp className="w-6 h-6" />}
            color="orange"
          />
          <StatCard
            title="คลาสวันนี้"
            value="8"
            change="0"
            trend="neutral"
            icon={<Calendar className="w-6 h-6" />}
            color="purple"
          />
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activities */}
          <div className="lg:col-span-2 card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">กิจกรรมล่าสุด</h3>
              <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                ดูทั้งหมด
              </button>
            </div>
            <div className="space-y-4">
              <ActivityItem
                time="10 นาทีที่แล้ว"
                title="นักเรียนใหม่ลงทะเบียน"
                description="สมหญิง ใจดี ลงทะเบียนเรียนคณิตศาสตร์ ม.1"
                type="student"
              />
              <ActivityItem
                time="1 ชั่วโมงที่แล้ว"
                title="ซื้อแพ็คเกจใหม่"
                description="ผู้ปกครองซื้อแพ็คเกจ 16 ครั้ง ฿3,500"
                type="payment"
              />
              <ActivityItem
                time="2 ชั่วโมงที่แล้ว"
                title="เช็คชื่อเข้าเรียน"
                description="คณิตศาสตร์ ม.1 - 12/15 คน"
                type="attendance"
              />
              <ActivityItem
                time="3 ชั่วโมงที่แล้ว"
                title="เครดิตใกล้หมด"
                description="สมชาย ใจดี เหลือเครดิต 2 ครั้ง"
                type="warning"
              />
            </div>
          </div>

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
        </div>
      </div>
    </Layout>
  )
}

// Stat Card Component
const StatCard = ({ title, value, change, trend, icon, color }: {
  title: string
  value: string
  change: string
  trend: 'up' | 'down' | 'neutral'
  icon: React.ReactNode
  color: 'blue' | 'green' | 'orange' | 'purple'
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
        <span className={`text-sm font-medium ${
          trend === 'up' ? 'text-green-600' : 
          trend === 'down' ? 'text-red-600' : 
          'text-gray-500'
        }`}>
          {change}
        </span>
      </div>
      <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
      <p className="text-sm text-gray-600 mt-1">{title}</p>
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
        <p className="text-sm text-gray-600">{description}</p>
      </div>
      <span className="text-xs text-gray-500 flex items-center">
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