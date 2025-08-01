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
  BookOpen,
  Loader2
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useSchoolStore } from '../../stores/schoolStore'
import * as reportService from '../../services/reports'
import Layout from '../../components/layout/Layout'
import toast from 'react-hot-toast'

const ReportsPage = () => {
  const { user } = useAuthStore()
  const { school } = useSchoolStore()
  const [timeRange, setTimeRange] = useState('month') // today, week, month, year
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  
  // Real data states
  const [stats, setStats] = useState({
    revenue: {
      total: 0,
      growth: 0,
      chart: [] as Array<{ date: string; value: number }>
    },
    students: {
      total: 0,
      active: 0,
      new: 0,
      growth: 0
    },
    attendance: {
      rate: 0,
      totalSessions: 0,
      totalCheckins: 0,
      trend: 0
    },
    credits: {
      sold: 0,
      used: 0,
      remaining: 0,
      expiringSoon: 0
    },
    topCourses: [] as Array<{
      id: string
      name: string
      students: number
      revenue: number
    }>
  })

  // Load all statistics
  useEffect(() => {
    if (school?.id) {
      loadStats()
    }
  }, [school?.id, timeRange])

  const loadStats = async () => {
    if (!school?.id) return

    try {
      setLoading(true)
      
      // Load all stats in parallel
      const [revenue, students, attendance, credits, topCourses] = await Promise.all([
        reportService.getRevenueStats(school.id, timeRange),
        reportService.getStudentStats(school.id, timeRange),
        reportService.getAttendanceStats(school.id, timeRange),
        reportService.getCreditStats(school.id, timeRange),
        reportService.getTopCourses(school.id, timeRange, 5)
      ])

      setStats({
        revenue,
        students,
        attendance,
        credits,
        topCourses
      })
    } catch (error) {
      console.error('Error loading stats:', error)
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const exportReport = async () => {
    if (!school?.id) return

    try {
      setExporting(true)
      const data = await reportService.exportReportData(school.id, 'all', timeRange)
      
      // Convert to CSV (simple implementation)
      const csv = convertToCSV(data)
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      
      link.setAttribute('href', url)
      link.setAttribute('download', `report_${school.name}_${timeRange}_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast.success('ส่งออกรายงานสำเร็จ')
    } catch (error) {
      console.error('Error exporting report:', error)
      toast.error('เกิดข้อผิดพลาดในการส่งออกรายงาน')
    } finally {
      setExporting(false)
    }
  }

  const convertToCSV = (data: any) => {
    // Simple CSV conversion
    const rows = [
      ['รายงานสรุป', school?.name || '', getTimeRangeLabel(timeRange)],
      [],
      ['รายได้รวม', data.data.revenue.total],
      ['การเติบโต', `${data.data.revenue.growth}%`],
      [],
      ['จำนวนนักเรียนทั้งหมด', data.data.students.total],
      ['นักเรียนที่ใช้งาน', data.data.students.active],
      ['นักเรียนใหม่', data.data.students.new],
      [],
      ['อัตราเข้าเรียน', `${data.data.attendance.rate}%`],
      ['จำนวนคาบเรียน', data.data.attendance.totalSessions],
      [],
      ['เครดิตที่ขายได้', data.data.credits.sold],
      ['เครดิตที่ใช้ไป', data.data.credits.used],
      ['เครดิตคงเหลือ', data.data.credits.remaining],
      [],
      ['วิชายอดนิยม'],
      ...data.data.topCourses.map((course: any) => [course.name, course.revenue])
    ]
    
    return rows.map(row => row.join(',')).join('\n')
  }

  const getTimeRangeLabel = (range: string) => {
    switch (range) {
      case 'today': return 'วันนี้'
      case 'week': return 'สัปดาห์นี้'
      case 'month': return 'เดือนนี้'
      case 'year': return 'ปีนี้'
      default: return range
    }
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
              disabled={loading}
            >
              <option value="today">วันนี้</option>
              <option value="week">สัปดาห์นี้</option>
              <option value="month">เดือนนี้</option>
              <option value="year">ปีนี้</option>
            </select>
            
            <button
              onClick={exportReport}
              disabled={exporting}
              className="btn-secondary inline-flex items-center"
            >
              {exporting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  กำลังส่งออก...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5 mr-2" />
                  ส่งออก
                </>
              )}
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
              {stats.credits.expiringSoon > 0 && (
                <span className="text-sm font-medium text-yellow-600">
                  {stats.credits.expiringSoon} ใกล้หมดอายุ
                </span>
              )}
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
            {stats.revenue.chart.length > 0 ? (
              <div className="space-y-4">
                {stats.revenue.chart.map((item, index) => {
                  const maxValue = Math.max(...stats.revenue.chart.map(i => i.value))
                  return (
                    <div key={index} className="flex items-center">
                      <span className="text-sm text-gray-500 w-16">{item.date}</span>
                      <div className="flex-1 mx-4">
                        <div className="h-8 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full transition-all duration-500"
                            style={{ width: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-sm font-medium text-gray-900 w-24 text-right">
                        ฿{item.value.toLocaleString()}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">ไม่มีข้อมูลรายได้ในช่วงเวลานี้</p>
            )}
          </div>

          {/* Top Courses */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-medium text-gray-900">วิชายอดนิยม</h2>
              <BookOpen className="w-5 h-5 text-gray-400" />
            </div>
            
            {stats.topCourses.length > 0 ? (
              <div className="space-y-4">
                {stats.topCourses.map((course, index) => (
                  <div key={course.id} className="flex items-center justify-between">
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
            ) : (
              <p className="text-center text-gray-500 py-8">ไม่มีข้อมูลวิชาในช่วงเวลานี้</p>
            )}
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