// src/pages/reports/ReportsPage.tsx
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  BarChart3,
  TrendingUp,
  Users,
  CreditCard,
  Calendar,
  Download,
  Filter,
  ArrowUp,
  ArrowDown,
  DollarSign,
  UserCheck,
  Clock,
  BookOpen
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useSchoolStore } from '../../stores/schoolStore'
import Layout from '../../components/layout/Layout'

const ReportsPage = () => {
  const { user } = useAuthStore()
  const { school } = useSchoolStore()
  const [timeRange, setTimeRange] = useState('month') // today, week, month, year
  const [loading, setLoading] = useState(false)
  
  // Mock data for demonstration
  const [stats, setStats] = useState({
    revenue: {
      total: 125500,
      growth: 12.5,
      chart: [
        { date: '1 ม.ค.', value: 18500 },
        { date: '8 ม.ค.', value: 22000 },
        { date: '15 ม.ค.', value: 25500 },
        { date: '22 ม.ค.', value: 28000 },
        { date: '29 ม.ค.', value: 31500 }
      ]
    },
    students: {
      total: 156,
      active: 142,
      new: 12,
      growth: 8.3
    },
    attendance: {
      rate: 92.5,
      totalSessions: 450,
      totalCheckins: 416,
      trend: -2.1
    },
    credits: {
      sold: 2450,
      used: 1890,
      remaining: 560,
      expiringSoon: 125
    },
    topCourses: [
      { name: 'คณิตศาสตร์ ม.1', students: 45, revenue: 45000 },
      { name: 'ภาษาอังกฤษพื้นฐาน', students: 38, revenue: 38000 },
      { name: 'ฟิสิกส์ ม.2', students: 32, revenue: 35200 },
      { name: 'เคมี ม.3', students: 28, revenue: 30800 },
      { name: 'ชีววิทยา', students: 25, revenue: 27500 }
    ]
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const exportReport = () => {
    // TODO: Implement export functionality
    alert('กำลังส่งออกรายงาน...')
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">รายงาน</h1>
            <p className="mt-1 text-sm text-gray-500">
              ภาพรวมผลการดำเนินงานของ {school?.name}
            </p>
          </div>
          
          <div className="mt-4 md:mt-0 flex items-center space-x-3">
            {/* Time Range Filter */}
            <select
              className="input-base"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <option value="today">วันนี้</option>
              <option value="week">สัปดาห์นี้</option>
              <option value="month">เดือนนี้</option>
              <option value="year">ปีนี้</option>
            </select>
            
            <button
              onClick={exportReport}
              className="btn-secondary inline-flex items-center"
            >
              <Download className="w-5 h-5 mr-2" />
              ส่งออก
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Revenue Card */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <span className={`text-sm font-medium flex items-center ${
                stats.revenue.growth > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {stats.revenue.growth > 0 ? <ArrowUp className="w-4 h-4 mr-1" /> : <ArrowDown className="w-4 h-4 mr-1" />}
                {Math.abs(stats.revenue.growth)}%
              </span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">
              {formatCurrency(stats.revenue.total)}
            </h3>
            <p className="text-sm text-gray-600 mt-1">รายได้รวม</p>
          </div>

          {/* Students Card */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-sm font-medium text-green-600 flex items-center">
                <ArrowUp className="w-4 h-4 mr-1" />
                +{stats.students.new}
              </span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">
              {stats.students.active}/{stats.students.total}
            </h3>
            <p className="text-sm text-gray-600 mt-1">นักเรียนที่ใช้งาน</p>
          </div>

          {/* Attendance Card */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <UserCheck className="w-6 h-6 text-purple-600" />
              </div>
              <span className={`text-sm font-medium flex items-center ${
                stats.attendance.trend > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {stats.attendance.trend > 0 ? <ArrowUp className="w-4 h-4 mr-1" /> : <ArrowDown className="w-4 h-4 mr-1" />}
                {Math.abs(stats.attendance.trend)}%
              </span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">
              {stats.attendance.rate}%
            </h3>
            <p className="text-sm text-gray-600 mt-1">อัตราเข้าเรียน</p>
          </div>

          {/* Credits Card */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <CreditCard className="w-6 h-6 text-orange-600" />
              </div>
              <span className="text-sm font-medium text-yellow-600">
                {stats.credits.expiringSoon} ใกล้หมดอายุ
              </span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">
              {stats.credits.used}/{stats.credits.sold}
            </h3>
            <p className="text-sm text-gray-600 mt-1">เครดิตที่ใช้ไป</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Chart */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-medium text-gray-900">แนวโน้มรายได้</h2>
              <TrendingUp className="w-5 h-5 text-gray-400" />
            </div>
            
            {/* Simple bar chart visualization */}
            <div className="space-y-4">
              {stats.revenue.chart.map((item, index) => (
                <div key={index} className="flex items-center">
                  <span className="text-sm text-gray-500 w-16">{item.date}</span>
                  <div className="flex-1 mx-4">
                    <div className="h-8 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full"
                        style={{ width: `${(item.value / 35000) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-20 text-right">
                    ฿{item.value.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Courses */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-medium text-gray-900">วิชายอดนิยม</h2>
              <BookOpen className="w-5 h-5 text-gray-400" />
            </div>
            
            <div className="space-y-4">
              {stats.topCourses.map((course, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                      index === 0 ? 'bg-yellow-500' :
                      index === 1 ? 'bg-gray-400' :
                      index === 2 ? 'bg-orange-600' :
                      'bg-gray-300'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{course.name}</p>
                      <p className="text-sm text-gray-500">{course.students} นักเรียน</p>
                    </div>
                  </div>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(course.revenue)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/reports/students"
            className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow group"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">รายงานนักเรียน</h3>
                <p className="text-sm text-gray-500 mt-1">ดูสถิติและประวัติการเรียน</p>
              </div>
              <Users className="w-8 h-8 text-gray-400 group-hover:text-primary-500" />
            </div>
          </Link>

          <Link
            to="/reports/attendance"
            className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow group"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">รายงานการเข้าเรียน</h3>
                <p className="text-sm text-gray-500 mt-1">วิเคราะห์อัตราการเข้าเรียน</p>
              </div>
              <Calendar className="w-8 h-8 text-gray-400 group-hover:text-primary-500" />
            </div>
          </Link>

          <Link
            to="/reports/revenue"
            className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow group"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">รายงานการเงิน</h3>
                <p className="text-sm text-gray-500 mt-1">รายได้และค่าใช้จ่าย</p>
              </div>
              <BarChart3 className="w-8 h-8 text-gray-400 group-hover:text-primary-500" />
            </div>
          </Link>
        </div>
      </div>
    </Layout>
  )
}

export default ReportsPage