// src/pages/credits/ReceiptPage.tsx
import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  Download,
  Printer,
  CheckCircle,
  Calendar,
  CreditCard,
  User,
  Receipt as ReceiptIcon
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useSchoolStore } from '../../stores/schoolStore'
import * as studentCreditService from '../../services/studentCredit'
import Layout from '../../components/layout/Layout'
import toast from 'react-hot-toast'

const ReceiptPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { school } = useSchoolStore()
  const [credit, setCredit] = useState<studentCreditService.StudentCredit | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      loadCredit()
    }
  }, [id])

  const loadCredit = async () => {
    if (!id || !user?.schoolId) return
    
    try {
      setLoading(true)
      // For now, we'll need to get all credits and find the one
      // In real app, you'd have a getCredit(id) function
      const credits = await studentCreditService.getSchoolCredits(user.schoolId)
      const foundCredit = credits.find(c => c.id === id)
      
      if (foundCredit) {
        setCredit(foundCredit)
      } else {
        toast.error('ไม่พบข้อมูลใบเสร็จ')
        navigate('/credits/history')
      }
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล')
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
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
      month: 'long',
      day: 'numeric'
    })
  }

  const getPaymentMethodText = (method: string) => {
    const methodMap: Record<string, string> = {
      cash: 'เงินสด',
      transfer: 'โอนเงิน',
      credit_card: 'บัตรเครดิต',
      promptpay: 'PromptPay'
    }
    return methodMap[method] || method
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="spinner spinner-primary w-8 h-8"></div>
        </div>
      </Layout>
    )
  }

  if (!credit) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-500">ไม่พบข้อมูลใบเสร็จ</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header - hide on print */}
        <div className="no-print mb-8">
          <Link
            to="/credits/history"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            กลับไปหน้าประวัติ
          </Link>
          
          <div className="flex justify-between items-start">
            <h1 className="text-2xl font-bold text-gray-900">ใบเสร็จรับเงิน</h1>
            <div className="flex space-x-3">
              <button
                onClick={handlePrint}
                className="btn-secondary inline-flex items-center"
              >
                <Printer className="w-5 h-5 mr-2" />
                พิมพ์
              </button>
              <button
                className="btn-primary inline-flex items-center"
              >
                <Download className="w-5 h-5 mr-2" />
                ดาวน์โหลด PDF
              </button>
            </div>
          </div>
        </div>

        {/* Receipt Content */}
        <div className="bg-white shadow-sm rounded-lg p-8 print:shadow-none print:p-0">
          {/* Success Message */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8 flex items-center">
            <CheckCircle className="w-6 h-6 text-green-600 mr-3 flex-shrink-0" />
            <div>
              <p className="font-medium text-green-900">การซื้อแพ็คเกจสำเร็จ!</p>
              <p className="text-sm text-green-700 mt-1">
                เครดิตพร้อมใช้งานแล้ว สามารถเริ่มใช้งานได้ทันที
              </p>
            </div>
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">{school?.name}</h2>
            {school?.address && (
              <p className="text-gray-600">{school.address}</p>
            )}
            {school?.phone && (
              <p className="text-gray-600">โทร: {school.phone}</p>
            )}
          </div>

          {/* Receipt Info */}
          <div className="border-t border-b border-gray-200 py-6 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">เลขที่ใบเสร็จ</p>
                <p className="font-medium text-lg">{credit.receiptNumber}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">วันที่</p>
                <p className="font-medium text-lg">
                  {formatDate(credit.paymentDate || credit.purchaseDate)}
                </p>
              </div>
            </div>
          </div>

          {/* Customer Info */}
          <div className="mb-6">
            <h3 className="font-medium text-gray-900 mb-3 flex items-center">
              <User className="w-5 h-5 mr-2 text-gray-500" />
              ข้อมูลนักเรียน
            </h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="font-medium">{credit.studentName}</p>
              <p className="text-sm text-gray-600">รหัสนักเรียน: {credit.studentCode}</p>
            </div>
          </div>

          {/* Purchase Details */}
          <div className="mb-6">
            <h3 className="font-medium text-gray-900 mb-3 flex items-center">
              <CreditCard className="w-5 h-5 mr-2 text-gray-500" />
              รายละเอียดการซื้อ
            </h3>
            <table className="w-full">
              <thead className="border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 text-sm font-medium text-gray-700">รายการ</th>
                  <th className="text-center py-3 text-sm font-medium text-gray-700">จำนวน</th>
                  <th className="text-right py-3 text-sm font-medium text-gray-700">ราคา</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-4">
                    <p className="font-medium">{credit.packageName}</p>
                    <p className="text-sm text-gray-600">วิชา: {credit.courseName}</p>
                    {credit.expiryDate && (
                      <p className="text-sm text-gray-600">
                        ใช้ได้ถึง: {formatDate(credit.expiryDate)}
                      </p>
                    )}
                  </td>
                  <td className="py-4 text-center">
                    {credit.totalCredits} ครั้ง
                    {credit.bonusCredits > 0 && (
                      <span className="text-sm text-green-600 block">
                        (รวมโบนัส {credit.bonusCredits} ครั้ง)
                      </span>
                    )}
                  </td>
                  <td className="py-4 text-right font-medium">
                    {formatPrice(credit.originalPrice)}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                {credit.discountAmount > 0 && (
                  <tr>
                    <td colSpan={2} className="py-2 text-right text-sm">ส่วนลด:</td>
                    <td className="py-2 text-right text-red-600">
                      -{formatPrice(credit.discountAmount)}
                    </td>
                  </tr>
                )}
                <tr className="border-t border-gray-200">
                  <td colSpan={2} className="py-3 text-right font-medium">
                    ยอดรวมทั้งสิ้น:
                  </td>
                  <td className="py-3 text-right text-xl font-bold text-primary-600">
                    {formatPrice(credit.finalPrice)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Payment Info */}
          <div className="mb-8">
            <h3 className="font-medium text-gray-900 mb-3 flex items-center">
              <ReceiptIcon className="w-5 h-5 mr-2 text-gray-500" />
              การชำระเงิน
            </h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">วิธีการชำระเงิน:</span>
                <span className="font-medium">
                  {getPaymentMethodText(credit.paymentMethod)}
                </span>
              </div>
              {credit.paymentNote && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <p className="text-sm text-gray-600">หมายเหตุ: {credit.paymentNote}</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="text-center pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              ขอบคุณที่ใช้บริการ {school?.name}
            </p>
          </div>
        </div>

        {/* Actions - hide on print */}
        <div className="no-print mt-8 flex justify-center space-x-4">
          <Link
            to="/credits/purchase"
            className="btn-secondary"
          >
            ซื้อแพ็คเกจเพิ่ม
          </Link>
          <Link
            to="/students"
            className="btn-primary"
          >
            ไปยังหน้านักเรียน
          </Link>
        </div>
      </div>
    </Layout>
  )
}

export default ReceiptPage