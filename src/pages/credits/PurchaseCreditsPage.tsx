// src/pages/credits/PurchaseCreditsPage.tsx
import { useState, useEffect } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { 
  ArrowLeft, 
  CreditCard,
  User,
  Calendar,
  CheckCircle,
  AlertCircle,
  Banknote,
  Smartphone,
  Building,
  Receipt,
  Star,
  Award,
  Search,
  ShoppingBag,
  Clock
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import * as studentService from '../../services/student'
import * as courseService from '../../services/course'
import * as packageService from '../../services/package'
import * as studentCreditService from '../../services/studentCredit'
import toast from 'react-hot-toast'
import Layout from '../../components/layout/Layout'

const PurchaseCreditsPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuthStore()
  
  const [step, setStep] = useState(1) // 1: Select Student, 2: Select Package, 3: Payment
  const [loading, setLoading] = useState(false)
  const [students, setStudents] = useState<studentService.Student[]>([])
  const [courses, setCourses] = useState<courseService.Course[]>([])
  const [packages, setPackages] = useState<packageService.CreditPackage[]>([])
  
  // Form state
  const [selectedStudent, setSelectedStudent] = useState<studentService.Student | null>(null)
  const [selectedCourse, setSelectedCourse] = useState<courseService.Course | null>(null)
  const [selectedPackage, setSelectedPackage] = useState<packageService.CreditPackage | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'credit_card' | 'promptpay'>('cash')
  const [paymentNote, setPaymentNote] = useState('')
  const [discountAmount, setDiscountAmount] = useState(0)
  
  // Search states
  const [studentSearch, setStudentSearch] = useState('')
  const [filteredStudents, setFilteredStudents] = useState<studentService.Student[]>([])

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    // Check if studentId in URL params
    const studentId = searchParams.get('studentId')
    if (studentId && students.length > 0) {
      const student = students.find(s => s.id === studentId)
      if (student) {
        handleSelectStudent(student)
      }
    }
  }, [searchParams, students])

  useEffect(() => {
    // Filter students based on search
    if (studentSearch) {
      const filtered = students.filter(student => 
        student.firstName.toLowerCase().includes(studentSearch.toLowerCase()) ||
        student.lastName.toLowerCase().includes(studentSearch.toLowerCase()) ||
        student.nickname?.toLowerCase().includes(studentSearch.toLowerCase()) ||
        student.studentCode.toLowerCase().includes(studentSearch.toLowerCase())
      )
      setFilteredStudents(filtered)
    } else {
      setFilteredStudents(students)
    }
  }, [studentSearch, students])

  const loadInitialData = async () => {
    if (!user?.schoolId) return
    
    try {
      setLoading(true)
      
      // Load students
      const studentsData = await studentService.getStudents(user.schoolId, 'active')
      setStudents(studentsData)
      setFilteredStudents(studentsData)
      
      // Load courses
      const coursesData = await courseService.getCourses(user.schoolId, 'active')
      setCourses(coursesData)
    } catch (error) {
      toast.error('ไม่สามารถโหลดข้อมูลได้')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectStudent = (student: studentService.Student) => {
    setSelectedStudent(student)
    setStep(2)
  }

  const handleSelectCourse = async (course: courseService.Course) => {
    setSelectedCourse(course)
    
    // Load packages for this course
    try {
      setLoading(true)
      const packagesData = await packageService.getPackagesByCourse(user!.schoolId, course.id)
      
      // Process packages to ensure they have correct course info
      const processedPackages = packagesData.map(pkg => ({
        ...pkg,
        // For backward compatibility - ensure courseId and courseName exist
        courseId: pkg.courseId || course.id,
        courseName: pkg.courseName || course.name,
        // For new multi-course system
        applicableCourseIds: pkg.applicableCourseIds || [course.id],
        applicableCourseNames: pkg.applicableCourseNames || [course.name],
        isUniversal: pkg.isUniversal || false
      }))
      
      setPackages(processedPackages)
    } catch (error) {
      toast.error('ไม่สามารถโหลดแพ็คเกจได้')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectPackage = (pkg: packageService.CreditPackage) => {
    setSelectedPackage(pkg)
    setStep(3)
  }

  const calculateFinalPrice = () => {
    if (!selectedPackage) return 0
    return Math.max(0, selectedPackage.price - discountAmount)
  }

  const handlePurchase = async () => {
    if (!selectedStudent || !selectedPackage || !user?.schoolId || !selectedCourse) return
    
    try {
      setLoading(true)
      
      // Ensure package has course information
      const packageWithCourse = {
        ...selectedPackage,
        courseId: selectedPackage.courseId || selectedCourse.id,
        courseName: selectedPackage.courseName || selectedCourse.name
      }
      
      const purchaseData: studentCreditService.PurchaseCreditsData = {
        studentId: selectedStudent.id,
        packageId: packageWithCourse.id,
        paymentMethod,
        paymentAmount: calculateFinalPrice(),
        discountAmount,
        paymentNote
      }
      
      console.log('=== PURCHASE DEBUG ===')
      console.log('User School ID:', user.schoolId)
      console.log('Purchase Data:', purchaseData)
      console.log('Selected Student:', selectedStudent)
      console.log('Selected Package:', packageWithCourse)
      console.log('Selected Course:', selectedCourse)
      
      const result = await studentCreditService.purchaseCredits(user.schoolId, purchaseData)
      
      console.log('Purchase Result:', result)
      
      toast.success('ซื้อแพ็คเกจสำเร็จ!')
      
      // Navigate to receipt or history
      navigate(`/credits/receipt/${result.id}`)
    } catch (error) {
      console.error('Error purchasing credits:', error)
      toast.error('เกิดข้อผิดพลาดในการซื้อแพ็คเกจ')
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price)
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/students"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4 text-base"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            กลับ
          </Link>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <ShoppingBag className="w-8 h-8 mr-3 text-primary-600" />
                ซื้อแพ็คเกจเครดิต
              </h1>
              <p className="mt-2 text-base text-gray-500">
                เลือกนักเรียน → เลือกวิชาและแพ็คเกจ → ชำระเงิน
              </p>
            </div>
            
            <Link
              to="/credits/history"
              className="btn-secondary inline-flex items-center text-base"
            >
              <Clock className="w-5 h-5 mr-2" />
              ประวัติการซื้อ
            </Link>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className={`flex items-center ${step >= 1 ? 'text-primary-600' : 'text-gray-400'}`}>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${
                step >= 1 ? 'border-primary-600 bg-primary-50' : 'border-gray-300 bg-white'
              }`}>
                {step > 1 ? <CheckCircle className="w-7 h-7" /> : <span className="text-lg font-semibold">1</span>}
              </div>
              <span className="ml-3 text-base font-medium">เลือกนักเรียน</span>
            </div>
            
            <div className={`flex-1 h-0.5 mx-4 ${step > 1 ? 'bg-primary-600' : 'bg-gray-300'}`} />
            
            <div className={`flex items-center ${step >= 2 ? 'text-primary-600' : 'text-gray-400'}`}>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${
                step >= 2 ? 'border-primary-600 bg-primary-50' : 'border-gray-300 bg-white'
              }`}>
                {step > 2 ? <CheckCircle className="w-7 h-7" /> : <span className="text-lg font-semibold">2</span>}
              </div>
              <span className="ml-3 text-base font-medium">เลือกแพ็คเกจ</span>
            </div>
            
            <div className={`flex-1 h-0.5 mx-4 ${step > 2 ? 'bg-primary-600' : 'bg-gray-300'}`} />
            
            <div className={`flex items-center ${step >= 3 ? 'text-primary-600' : 'text-gray-400'}`}>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${
                step >= 3 ? 'border-primary-600 bg-primary-50' : 'border-gray-300 bg-white'
              }`}>
                <span className="text-lg font-semibold">3</span>
              </div>
              <span className="ml-3 text-base font-medium">ชำระเงิน</span>
            </div>
          </div>
        </div>

        {/* Content based on step */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="spinner spinner-primary w-8 h-8"></div>
          </div>
        ) : (
          <>
            {/* Step 1: Select Student */}
            {step === 1 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-medium text-gray-900 mb-6 flex items-center">
                  <User className="w-6 h-6 mr-2 text-gray-500" />
                  เลือกนักเรียนที่ต้องการซื้อแพ็คเกจ
                </h2>
                
                {/* Search */}
                <div className="mb-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="ค้นหาด้วยชื่อ, ชื่อเล่น, รหัสนักเรียน..."
                      className="input-base pl-10 text-base"
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                    />
                  </div>
                </div>
                
                {/* Student List */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto">
                  {filteredStudents.length === 0 ? (
                    <div className="col-span-2 text-center py-12">
                      <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 text-base">ไม่พบนักเรียน</p>
                    </div>
                  ) : (
                    filteredStudents.map(student => (
                      <button
                        key={student.id}
                        onClick={() => handleSelectStudent(student)}
                        className="p-5 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all text-left group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center group-hover:bg-primary-200 transition-colors">
                              <span className="text-primary-600 font-semibold text-lg">
                                {student.firstName[0]}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 text-base">
                                {student.firstName} {student.lastName}
                                {student.nickname && ` (${student.nickname})`}
                              </p>
                              <p className="text-sm text-gray-500 mt-0.5">
                                {student.studentCode} • {student.currentGrade}
                              </p>
                            </div>
                          </div>
                          <CreditCard className="w-5 h-5 text-gray-400 group-hover:text-primary-600" />
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Select Course and Package */}
            {step === 2 && selectedStudent && (
              <div className="space-y-6">
                {/* Selected Student */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <User className="w-6 h-6 text-blue-600" />
                      <div>
                        <p className="text-sm text-blue-600 font-medium">นักเรียนที่เลือก</p>
                        <p className="text-base font-semibold text-gray-900">
                          {selectedStudent.firstName} {selectedStudent.lastName}
                          {selectedStudent.nickname && ` (${selectedStudent.nickname})`}
                        </p>
                        <p className="text-sm text-gray-600 mt-0.5">
                          {selectedStudent.studentCode} • {selectedStudent.currentGrade}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setStep(1)}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      เปลี่ยน
                    </button>
                  </div>
                </div>

                {/* Select Course */}
                {!selectedCourse ? (
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h2 className="text-xl font-medium text-gray-900 mb-6">
                      เลือกวิชาที่ต้องการซื้อแพ็คเกจ
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {courses.map(course => (
                        <button
                          key={course.id}
                          onClick={() => handleSelectCourse(course)}
                          className="p-5 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all text-left group"
                        >
                          <h3 className="font-semibold text-gray-900 text-base group-hover:text-primary-600">
                            {course.name}
                          </h3>
                          <p className="text-sm text-gray-500 mt-1">{course.code}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Selected Course */}
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <CreditCard className="w-6 h-6 text-green-600" />
                          <div>
                            <p className="text-sm text-green-600 font-medium">วิชาที่เลือก</p>
                            <p className="text-base font-semibold text-gray-900">{selectedCourse.name}</p>
                            <p className="text-sm text-gray-600">{selectedCourse.code}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedCourse(null)
                            setPackages([])
                          }}
                          className="text-sm text-green-600 hover:text-green-700 font-medium"
                        >
                          เปลี่ยน
                        </button>
                      </div>
                    </div>

                    {/* Select Package */}
                    <div className="bg-white rounded-lg shadow-sm p-6">
                      <h2 className="text-xl font-medium text-gray-900 mb-6">
                        เลือกแพ็คเกจที่ต้องการ
                      </h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {packages.map(pkg => (
                          <button
                            key={pkg.id}
                            onClick={() => handleSelectPackage(pkg)}
                            className="relative p-6 border-2 border-gray-200 rounded-xl hover:border-primary-500 hover:shadow-lg transition-all text-center group"
                          >
                            {/* Badges */}
                            {pkg.popular && (
                              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white px-4 py-1 rounded-full text-sm font-medium flex items-center">
                                <Star className="w-4 h-4 mr-1" />
                                ยอดนิยม
                              </div>
                            )}
                            {pkg.recommended && !pkg.popular && (
                              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium flex items-center">
                                <Award className="w-4 h-4 mr-1" />
                                แนะนำ
                              </div>
                            )}

                            <h3 className="font-semibold text-gray-900 text-lg mb-4 group-hover:text-primary-600">
                              {pkg.name}
                            </h3>
                            
                            <div className="flex items-baseline justify-center mb-3">
                              <span className="text-4xl font-bold text-primary-600">
                                {pkg.credits}
                              </span>
                              <span className="text-base text-gray-500 ml-2">ครั้ง</span>
                              {pkg.bonusCredits > 0 && (
                                <span className="ml-2 text-sm text-green-600 font-medium">
                                  +{pkg.bonusCredits} โบนัส
                                </span>
                              )}
                            </div>
                            
                            <p className="text-3xl font-bold text-gray-900 mb-3">
                              {formatPrice(pkg.price)}
                            </p>
                            
                            <p className="text-sm text-gray-600">
                              {pkg.validityDescription || 
                                (pkg.validityType === 'unlimited' ? 'ไม่มีกำหนด' : 
                                 `ใช้ได้ ${pkg.validityValue} ${pkg.validityType === 'months' ? 'เดือน' : 'วัน'}`)}
                            </p>
                            
                            <div className="mt-4 text-sm text-gray-500">
                              ครั้งละ {formatPrice(pkg.pricePerCredit)}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Step 3: Payment */}
            {step === 3 && selectedStudent && selectedPackage && (
              <div className="space-y-6">
                {/* Order Summary */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-xl font-medium text-gray-900 mb-6">
                    สรุปคำสั่งซื้อ
                  </h2>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-3 border-b">
                      <span className="text-base text-gray-600">นักเรียน</span>
                      <span className="font-medium text-base">
                        {selectedStudent.firstName} {selectedStudent.lastName}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b">
                      <span className="text-base text-gray-600">วิชา</span>
                      <span className="font-medium text-base">{selectedCourse?.name}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b">
                      <span className="text-base text-gray-600">แพ็คเกจ</span>
                      <span className="font-medium text-base">{selectedPackage.name}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b">
                      <span className="text-base text-gray-600">จำนวนเครดิต</span>
                      <span className="font-medium text-base">
                        {selectedPackage.totalCreditsWithBonus} ครั้ง
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b">
                      <span className="text-base text-gray-600">ระยะเวลา</span>
                      <span className="font-medium text-base">
                        {selectedPackage.validityDescription || 
                         (selectedPackage.validityType === 'unlimited' ? 'ไม่มีกำหนด' : 
                          `ใช้ได้ ${selectedPackage.validityValue} ${selectedPackage.validityType === 'months' ? 'เดือน' : 'วัน'}`)}
                      </span>
                    </div>
                    
                    <div className="pt-4">
                      <div className="flex justify-between items-center">
                        <span className="text-base text-gray-600">ราคาปกติ</span>
                        <span className="font-medium text-base">{formatPrice(selectedPackage.price)}</span>
                      </div>
                      
                      {/* Discount */}
                      <div className="flex justify-between items-center mt-4">
                        <span className="text-base text-gray-600">ส่วนลด</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-500">฿</span>
                          <input
                            type="number"
                            value={discountAmount}
                            onChange={(e) => setDiscountAmount(Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-32 px-3 py-2 border border-gray-300 rounded-md text-right text-base"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="border-t-2 pt-4">
                      <div className="flex justify-between text-xl font-semibold">
                        <span>ยอดชำระ</span>
                        <span className="text-primary-600 text-2xl">
                          {formatPrice(calculateFinalPrice())}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-xl font-medium text-gray-900 mb-6">
                    วิธีการชำระเงิน
                  </h2>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <label className="relative cursor-pointer">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="cash"
                        checked={paymentMethod === 'cash'}
                        onChange={(e) => setPaymentMethod(e.target.value as any)}
                        className="peer sr-only"
                      />
                      <div className="p-6 border-2 border-gray-200 rounded-lg hover:border-primary-500 peer-checked:border-primary-500 peer-checked:bg-primary-50 transition-all text-center">
                        <Banknote className="w-10 h-10 mx-auto mb-3 text-gray-600 peer-checked:text-primary-600" />
                        <p className="text-base font-medium">เงินสด</p>
                      </div>
                    </label>
                    
                    <label className="relative cursor-pointer">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="transfer"
                        checked={paymentMethod === 'transfer'}
                        onChange={(e) => setPaymentMethod(e.target.value as any)}
                        className="peer sr-only"
                      />
                      <div className="p-6 border-2 border-gray-200 rounded-lg hover:border-primary-500 peer-checked:border-primary-500 peer-checked:bg-primary-50 transition-all text-center">
                        <Building className="w-10 h-10 mx-auto mb-3 text-gray-600 peer-checked:text-primary-600" />
                        <p className="text-base font-medium">โอนเงิน</p>
                      </div>
                    </label>
                    
                    <label className="relative cursor-pointer">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="credit_card"
                        checked={paymentMethod === 'credit_card'}
                        onChange={(e) => setPaymentMethod(e.target.value as any)}
                        className="peer sr-only"
                      />
                      <div className="p-6 border-2 border-gray-200 rounded-lg hover:border-primary-500 peer-checked:border-primary-500 peer-checked:bg-primary-50 transition-all text-center">
                        <CreditCard className="w-10 h-10 mx-auto mb-3 text-gray-600 peer-checked:text-primary-600" />
                        <p className="text-base font-medium">บัตรเครดิต</p>
                      </div>
                    </label>
                    
                    <label className="relative cursor-pointer">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="promptpay"
                        checked={paymentMethod === 'promptpay'}
                        onChange={(e) => setPaymentMethod(e.target.value as any)}
                        className="peer sr-only"
                      />
                      <div className="p-6 border-2 border-gray-200 rounded-lg hover:border-primary-500 peer-checked:border-primary-500 peer-checked:bg-primary-50 transition-all text-center">
                        <Smartphone className="w-10 h-10 mx-auto mb-3 text-gray-600 peer-checked:text-primary-600" />
                        <p className="text-base font-medium">PromptPay</p>
                      </div>
                    </label>
                  </div>
                  
                  {/* Payment Note */}
                  <div className="mt-6">
                    <label className="block text-base font-medium text-gray-700 mb-2">
                      หมายเหตุการชำระเงิน
                    </label>
                    <textarea
                      value={paymentNote}
                      onChange={(e) => setPaymentNote(e.target.value)}
                      rows={3}
                      className="input-base text-base"
                      placeholder="เช่น เลขที่อ้างอิงการโอน, หมายเหตุอื่นๆ"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-between">
                  <button
                    onClick={() => setStep(2)}
                    className="btn-secondary text-base"
                  >
                    ย้อนกลับ
                  </button>
                  <button
                    onClick={handlePurchase}
                    disabled={loading}
                    className="btn-primary inline-flex items-center text-base px-8 py-3"
                  >
                    {loading ? (
                      <>
                        <div className="spinner mr-2"></div>
                        กำลังดำเนินการ...
                      </>
                    ) : (
                      <>
                        <Receipt className="w-5 h-5 mr-2" />
                        ยืนยันการซื้อ
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}

export default PurchaseCreditsPage