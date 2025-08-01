// src/pages/credits/CreditHistoryPage.tsx
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  ArrowLeft,
  Filter,
  Download,
  Receipt,
  Calendar,
  CreditCard,
  TrendingUp,
  Search,
  Eye,
  Printer,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import * as studentCreditService from '../../services/studentCredit'
import * as courseService from '../../services/course'
import toast from 'react-hot-toast'
import Layout from '../../components/layout/Layout'

const CreditHistoryPage = () => {
  const { user } = useAuthStore()
  const [credits, setCredits] = useState<studentCreditService.StudentCredit[]>([])
  const [courses, setCourses] = useState<courseService.Course[]>([])
  const [loading, setLoading] = useState(true)
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCourse, setSelectedCourse] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  })
  
  // Summary stats
  const [stats, setStats] = useState({
    totalSales: 0,
    totalAmount: 0,
    activeCredits: 0,
    expiredCredits: 0
  })

  useEffect(() => {
    if (user?.schoolId) {
      loadData()
    }
  }, [user?.schoolId, selectedCourse, selectedStatus, dateRange])

  const loadData = async () => {
    if (!user?.schoolId) return
    
    try {
      setLoading(true)
      
      // Load courses for filter
      const coursesData = await courseService.getCourses(user.schoolId)
      setCourses(coursesData)
      
      // Load credit history
      const filters = {
        courseId: selectedCourse === 'all' ? undefined : selectedCourse,
        status: selectedStatus === 'all' ? undefined : selectedStatus,
        startDate: dateRange.start || undefined,
        endDate: dateRange.end || undefined
      }
      
      const creditsData = await studentCreditService.getSchoolCredits(user.schoolId, filters)
      
      // Apply search filter
      let filteredCredits = creditsData
      if (searchTerm) {
        const search = searchTerm.toLowerCase()
        filteredCredits = creditsData.filter(credit =>
          credit.studentName.toLowerCase().includes(search) ||
          credit.studentCode.toLowerCase().includes(search) ||
          credit.receiptNumber?.toLowerCase().includes(search) ||
          credit.packageName.toLowerCase().includes(search)
        )
      }
      
      setCredits(filteredCredits)
      
      // Calculate stats
      const totalSales = filteredCredits.length
      const totalAmount = filteredCredits.reduce((sum, c) => sum + c.finalPrice, 0)
      const activeCredits = filteredCredits.filter(c => c.status === 'active').length
      const expiredCredits = filteredCredits.filter(c => c.status === 'expired').length
      
      setStats({
        totalSales,
        totalAmount,
        activeCredits,
        expiredCredits
      })
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('ไม่สามารถโหลดข้อมูลได้')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { 
        bg: 'bg-green-100', 
        text: 'text-green-700', 
        icon: CheckCircle,
        label: 'ใช้งานได้' 
      },
      expired: { 
        bg: 'bg-red-100', 
        text: 'text-red-700', 
        icon: XCircle,
        label: 'หมดอายุ' 
      },
      depleted: { 
        bg: 'bg-gray-100', 
        text: 'text-gray-700', 
        icon: XCircle,
        label: 'ใช้หมดแล้ว' 
      },
      suspended: { 
        bg: 'bg-yellow-100', 
        text: 'text-yellow-700', 
        icon: Clock,
        label: 'ระงับ' 
      }
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active
    const Icon = config.icon
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </span>
    )
  }

  const getPaymentMethodBadge = (method: string) => {
    const methodConfig = {
      cash: { label: 'เงินสด', bg: 'bg-green-100', text: 'text-green-700' },
      transfer: { label: 'โอนเงิน', bg: 'bg-blue-100', text: 'text-blue-700' },
      credit_card: { label: 'บัตรเครดิต', bg: 'bg-purple-100', text: 'text-purple-700' },
      promptpay: { label: 'PromptPay', bg: 'bg-orange-100', text: 'text-orange-700' }
    }
    
    const config = methodConfig[method as keyof typeof methodConfig] || methodConfig.cash
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    )
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const exportToExcel = () => {
    // TODO: Implement Excel export
    toast.success('กำลังส่งออกข้อมูล...')
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/packages"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            กลับไปหน้าแพ็คเกจ
          </Link>
          
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">ประวัติการซื้อแพ็คเกจ</h1>
              <p className="mt-1 text-sm text-gray-500">
                ดูประวัติการซื้อและจัดการเครดิตทั้งหมด
              </p>
            </div>
            
            <button
              onClick={exportToExcel}
              className="btn-secondary inline-flex items-center"
            >
              <Download className="w-5 h-5 mr-2" />
              ส่งออก Excel
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">ยอดขายทั้งหมด</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats.totalSales}
                </p>
              </div>
              <Receipt className="w-8 h-8 text-gray-400" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">มูลค่ารวม</p>
                <p className="text-2xl font-semibold text-green-600">
                  {formatPrice(stats.totalAmount)}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-400" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">ใช้งานได้</p>
                <p className="text-2xl font-semibold text-blue-600">
                  {stats.activeCredits}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">หมดอายุ</p>
                <p className="text-2xl font-semibold text-red-600">
                  {stats.expiredCredits}
                </p>
              </div>
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="ค้นหาด้วยชื่อ, รหัสนักเรียน, เลขที่ใบเสร็จ..."
                  className="input-base pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Course Filter */}
            <div>
              <select
                className="input-base"
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
              >
                <option value="all">ทุกวิชา</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <select
                className="input-base"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="all">ทุกสถานะ</option>
                <option value="active">ใช้งานได้</option>
                <option value="expired">หมดอายุ</option>
                <option value="depleted">ใช้หมดแล้ว</option>
              </select>
            </div>

            {/* Date Range */}
            <div className="flex items-center space-x-2">
              <input
                type="date"
                className="input-base"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                placeholder="วันที่เริ่ม"
              />
              <span className="text-gray-500">-</span>
              <input
                type="date"
                className="input-base"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                placeholder="วันที่สิ้นสุด"
              />
            </div>
          </div>
        </div>

        {/* History Table */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="spinner spinner-primary w-8 h-8"></div>
          </div>
        ) : credits.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">ไม่พบประวัติการซื้อ</h3>
            <p className="text-gray-500 mb-4">ยังไม่มีการซื้อแพ็คเกจในช่วงเวลาที่เลือก</p>
            <Link
              to="/credits/purchase"
              className="btn-primary inline-flex items-center"
            >
              <CreditCard className="w-5 h-5 mr-2" />
              ขายแพ็คเกจ
            </Link>
          </div>
        ) : (
          <div className="bg-white shadow-sm rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      เลขที่ใบเสร็จ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      วันที่ซื้อ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      นักเรียน
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      แพ็คเกจ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      เครดิต
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ยอดชำระ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ช่องทาง
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      สถานะ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      การดำเนินการ
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {credits.map((credit) => (
                    <tr key={credit.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {credit.receiptNumber || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(credit.paymentDate || credit.purchaseDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {credit.studentName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {credit.studentCode}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {credit.packageName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {credit.courseName}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <span className="font-medium text-gray-900">
                            {credit.remainingCredits}/{credit.totalCredits}
                          </span>
                          <span className="text-gray-500 ml-1">ครั้ง</span>
                          {credit.daysUntilExpiry !== null && credit.daysUntilExpiry <= 7 && (
                            <p className="text-xs text-red-600 mt-1">
                              หมดอายุใน {credit.daysUntilExpiry} วัน
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {formatPrice(credit.finalPrice)}
                          </p>
                          {credit.discountAmount > 0 && (
                            <p className="text-xs text-green-600">
                              ลด {formatPrice(credit.discountAmount)}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getPaymentMethodBadge(credit.paymentMethod)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(credit.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <Link
                            to={`/credits/receipt/${credit.id}`}
                            className="text-primary-600 hover:text-primary-900"
                            title="ดูใบเสร็จ"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => window.print()}
                            className="text-gray-600 hover:text-gray-900"
                            title="พิมพ์ใบเสร็จ"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default CreditHistoryPage