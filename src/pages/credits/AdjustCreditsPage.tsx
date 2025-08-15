// src/pages/credits/AdjustCreditsPage.tsx
import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { 
  ArrowLeft,
  Search,
  Edit,
  Save,
  AlertCircle,
  History,
  User,
  CreditCard,
  Calendar,
  Plus,
  Minus,
  Clock,
  Shield,
  FileText
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import * as studentService from '../../services/student'
import * as courseService from '../../services/course'
import * as studentCreditService from '../../services/studentCredit'
import { collection, getDocs, query, where, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore'
import { db } from '../../services/firebase'
import toast from 'react-hot-toast'
import Layout from '../../components/layout/Layout'

interface CreditAdjustment {
  id: string
  schoolId: string
  studentId: string
  creditId: string
  studentName: string
  courseName: string
  
  adjustmentType: 'add' | 'subtract' | 'set'
  amount: number
  
  creditsBefore: number
  creditsAfter: number
  
  reason: string
  
  adjustedBy: string
  adjustedByName: string
  adjustedByRole: string
  
  createdAt: Date
}

const AdjustCreditsPage = () => {
  const { user } = useAuthStore()
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState<studentService.Student[]>([])
  const [courses, setCourses] = useState<courseService.Course[]>([])
  const [adjustmentHistory, setAdjustmentHistory] = useState<CreditAdjustment[]>([])
  
  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStudent, setSelectedStudent] = useState<studentService.Student | null>(null)
  const [selectedCourse, setSelectedCourse] = useState<courseService.Course | null>(null)
  const [studentCredits, setStudentCredits] = useState<studentCreditService.StudentCredit[]>([])
  
  // Adjustment Form
  const [selectedCredit, setSelectedCredit] = useState<studentCreditService.StudentCredit | null>(null)
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'subtract' | 'set'>('add')
  const [adjustmentAmount, setAdjustmentAmount] = useState('')
  const [adjustmentReason, setAdjustmentReason] = useState('')
  const [saving, setSaving] = useState(false)
  
  // Modal
  const [showAdjustModal, setShowAdjustModal] = useState(false)

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
    if (selectedStudent) {
      loadStudentCredits()
    }
  }, [selectedStudent, selectedCourse])

  const loadInitialData = async () => {
    if (!user?.schoolId) return
    
    try {
      setLoading(true)
      
      // Load students
      const studentsData = await studentService.getStudents(user.schoolId, 'active')
      setStudents(studentsData)
      
      // Load courses
      const coursesData = await courseService.getCourses(user.schoolId, 'active')
      setCourses(coursesData)
      
      // Load adjustment history
      await loadAdjustmentHistory()
    } catch (error) {
      toast.error('ไม่สามารถโหลดข้อมูลได้')
    } finally {
      setLoading(false)
    }
  }

  const loadStudentCredits = async () => {
    if (!selectedStudent || !user?.schoolId) return
    
    try {
      const creditsRef = collection(db, 'student_credits')
      let q = query(
        creditsRef,
        where('schoolId', '==', user.schoolId),
        where('studentId', '==', selectedStudent.id),
        where('status', '==', 'active')
      )
      
      // Add course filter if selected
      if (selectedCourse) {
        q = query(
          creditsRef,
          where('schoolId', '==', user.schoolId),
          where('studentId', '==', selectedStudent.id),
          where('courseId', '==', selectedCourse.id),
          where('status', '==', 'active')
        )
      }
      
      const snapshot = await getDocs(q)
      const credits: studentCreditService.StudentCredit[] = []
      
      snapshot.docs.forEach(doc => {
        const data = doc.data()
        credits.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as studentCreditService.StudentCredit)
      })
      
      setStudentCredits(credits)
    } catch (error) {
      console.error('Error loading student credits:', error)
    }
  }

  const loadAdjustmentHistory = async () => {
    if (!user?.schoolId) return
    
    try {
      const adjustmentsRef = collection(db, 'credit_adjustments')
      const q = query(
        adjustmentsRef,
        where('schoolId', '==', user.schoolId)
      )
      
      const snapshot = await getDocs(q)
      const adjustments: CreditAdjustment[] = []
      
      snapshot.docs.forEach(doc => {
        const data = doc.data()
        adjustments.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date()
        } as CreditAdjustment)
      })
      
      // Sort by date desc
      adjustments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      
      setAdjustmentHistory(adjustments.slice(0, 20)) // Show last 20 adjustments
    } catch (error) {
      console.error('Error loading adjustment history:', error)
    }
  }

  const handleSelectStudent = (student: studentService.Student) => {
    setSelectedStudent(student)
    setSelectedCourse(null)
    setStudentCredits([])
  }

  const filteredStudents = students.filter(student => {
    if (!searchTerm) return true
    
    const search = searchTerm.toLowerCase()
    return (
      student.firstName.toLowerCase().includes(search) ||
      student.lastName.toLowerCase().includes(search) ||
      student.nickname?.toLowerCase().includes(search) ||
      student.studentCode.toLowerCase().includes(search)
    )
  })

  const openAdjustModal = (credit: studentCreditService.StudentCredit) => {
    setSelectedCredit(credit)
    setAdjustmentType('add')
    setAdjustmentAmount('')
    setAdjustmentReason('')
    setShowAdjustModal(true)
  }

  const calculateNewCredits = (): number => {
    if (!selectedCredit || !adjustmentAmount) return 0
    
    const amount = parseInt(adjustmentAmount) || 0
    
    switch (adjustmentType) {
      case 'add':
        return selectedCredit.remainingCredits + amount
      case 'subtract':
        return Math.max(0, selectedCredit.remainingCredits - amount)
      case 'set':
        return Math.max(0, amount)
      default:
        return selectedCredit.remainingCredits
    }
  }

  const handleSaveAdjustment = async () => {
    if (!selectedCredit || !user || !adjustmentAmount || !adjustmentReason.trim()) {
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน')
      return
    }
    
    try {
      setSaving(true)
      
      const amount = parseInt(adjustmentAmount) || 0
      if (amount <= 0 && adjustmentType !== 'set') {
        toast.error('จำนวนเครดิตต้องมากกว่า 0')
        return
      }
      
      const newCredits = calculateNewCredits()
      const creditsBefore = selectedCredit.remainingCredits
      
      // Update credit balance
      const creditRef = doc(db, 'student_credits', selectedCredit.id)
      await updateDoc(creditRef, {
        remainingCredits: newCredits,
        usedCredits: selectedCredit.totalCredits - newCredits,
        status: newCredits === 0 ? 'depleted' : 'active',
        lastAdjustedAt: serverTimestamp(),
        lastAdjustedBy: user.id,
        updatedAt: serverTimestamp()
      })
      
      // Record adjustment - Fixed: Check for courseName
      const adjustmentData = {
        schoolId: user.schoolId,
        studentId: selectedCredit.studentId,
        creditId: selectedCredit.id,
        studentName: selectedCredit.studentName,
        courseName: selectedCredit.courseName || selectedCredit.applicableCourseNames?.[0] || 'ไม่ระบุวิชา',
        
        adjustmentType,
        amount: adjustmentType === 'set' ? newCredits : amount,
        
        creditsBefore,
        creditsAfter: newCredits,
        
        reason: adjustmentReason.trim(),
        
        adjustedBy: user.id,
        adjustedByName: user.displayName || `${user.firstName} ${user.lastName}`,
        adjustedByRole: user.role,
        
        createdAt: serverTimestamp()
      }
      
      await addDoc(collection(db, 'credit_adjustments'), adjustmentData)
      
      toast.success('ปรับเครดิตสำเร็จ!')
      
      // Reload data
      await loadStudentCredits()
      await loadAdjustmentHistory()
      
      setShowAdjustModal(false)
    } catch (error) {
      console.error('Error adjusting credits:', error)
      toast.error('เกิดข้อผิดพลาดในการปรับเครดิต')
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getCourseName = (credit: studentCreditService.StudentCredit): string => {
    if (credit.courseName) return credit.courseName
    if (credit.isUniversal) return 'ใช้ได้ทุกวิชา'
    if (credit.applicableCourseNames && credit.applicableCourseNames.length > 0) {
      return credit.applicableCourseNames.join(', ')
    }
    return 'ไม่ระบุวิชา'
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

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/credits/history"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            กลับ
          </Link>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">ปรับเครดิต Manual</h1>
              <p className="mt-1 text-sm text-gray-500">
                แก้ไขจำนวนเครดิตคงเหลือของนักเรียน
              </p>
            </div>
            
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Shield className="w-4 h-4" />
              <span>การปรับเครดิตจะถูกบันทึกประวัติทุกครั้ง</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Student Selection */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">เลือกนักเรียน</h2>
              
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="ค้นหานักเรียน..."
                  className="input-base pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              {/* Student List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredStudents.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">ไม่พบนักเรียน</p>
                ) : (
                  filteredStudents.map(student => (
                    <button
                      key={student.id}
                      onClick={() => handleSelectStudent(student)}
                      className={`w-full p-3 rounded-lg text-left transition-colors ${
                        selectedStudent?.id === student.id
                          ? 'bg-primary-50 border-2 border-primary-500'
                          : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                      }`}
                    >
                      <p className="font-medium text-sm text-gray-900">
                        {student.firstName} {student.lastName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {student.studentCode} • {student.currentGrade}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right: Credits & Adjustment */}
          <div className="lg:col-span-2 space-y-6">
            {selectedStudent ? (
              <>
                {/* Student Info */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-primary-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          {selectedStudent.firstName} {selectedStudent.lastName}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {selectedStudent.studentCode} • {selectedStudent.currentGrade}
                        </p>
                      </div>
                    </div>
                    
                    {/* Course Filter */}
                    <select
                      className="input-base text-sm w-48"
                      value={selectedCourse?.id || ''}
                      onChange={(e) => {
                        const course = courses.find(c => c.id === e.target.value)
                        setSelectedCourse(course || null)
                      }}
                    >
                      <option value="">ทุกวิชา</option>
                      {courses.map(course => (
                        <option key={course.id} value={course.id}>
                          {course.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Credits List */}
                  {studentCredits.length === 0 ? (
                    <div className="text-center py-8">
                      <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-500">ไม่พบเครดิตที่ใช้งานได้</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {studentCredits.map(credit => (
                        <div
                          key={credit.id}
                          className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{getCourseName(credit)}</h4>
                              <p className="text-sm text-gray-500 mt-1">
                                {credit.packageName} • ซื้อเมื่อ {new Date(credit.purchaseDate).toLocaleDateString('th-TH')}
                              </p>
                              <div className="flex items-center space-x-4 mt-2">
                                <span className="text-sm text-gray-600">
                                  ใช้ไป: {credit.usedCredits}/{credit.totalCredits}
                                </span>
                                {credit.expiryDate && (
                                  <span className="text-sm text-gray-600">
                                    หมดอายุ: {new Date(credit.expiryDate).toLocaleDateString('th-TH')}
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <div className="text-right ml-4">
                              <p className="text-2xl font-bold text-primary-600">
                                {credit.remainingCredits}
                              </p>
                              <p className="text-sm text-gray-500">คงเหลือ</p>
                              <button
                                onClick={() => openAdjustModal(credit)}
                                className="mt-2 text-sm text-primary-600 hover:text-primary-700 font-medium inline-flex items-center"
                              >
                                <Edit className="w-4 h-4 mr-1" />
                                ปรับเครดิต
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">เลือกนักเรียน</h3>
                <p className="text-gray-500">กรุณาเลือกนักเรียนที่ต้องการปรับเครดิต</p>
              </div>
            )}

            {/* Adjustment History */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <History className="w-5 h-5 mr-2 text-gray-500" />
                ประวัติการปรับเครดิตล่าสุด
              </h3>
              
              {adjustmentHistory.length === 0 ? (
                <p className="text-center text-gray-500 py-4">ยังไม่มีประวัติการปรับเครดิต</p>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {adjustmentHistory.map(adjustment => (
                    <div key={adjustment.id} className="border-l-4 border-gray-200 pl-4 py-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {adjustment.studentName} - {adjustment.courseName}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            {adjustment.adjustmentType === 'add' && `เพิ่ม ${adjustment.amount} เครดิต`}
                            {adjustment.adjustmentType === 'subtract' && `ลด ${adjustment.amount} เครดิต`}
                            {adjustment.adjustmentType === 'set' && `ตั้งค่าเป็น ${adjustment.amount} เครดิต`}
                            {' '}
                            ({adjustment.creditsBefore} → {adjustment.creditsAfter})
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            เหตุผล: {adjustment.reason}
                          </p>
                        </div>
                        <div className="text-right text-xs text-gray-500">
                          <p>{formatDate(adjustment.createdAt)}</p>
                          <p>{adjustment.adjustedByName}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Adjustment Modal */}
        {showAdjustModal && selectedCredit && (
          <>
            <div 
              className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75"
              onClick={() => setShowAdjustModal(false)}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-lg max-w-md w-full p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  ปรับเครดิต
                </h3>
                
                {/* Credit Info */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p className="text-sm font-medium text-gray-900">{getCourseName(selectedCredit)}</p>
                  <p className="text-xs text-gray-500">{selectedCredit.packageName}</p>
                  <p className="text-lg font-bold text-primary-600 mt-2">
                    เครดิตคงเหลือ: {selectedCredit.remainingCredits} ครั้ง
                  </p>
                </div>

                {/* Adjustment Type */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ประเภทการปรับ
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setAdjustmentType('add')}
                      className={`p-2 rounded-lg border-2 transition-colors ${
                        adjustmentType === 'add'
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Plus className="w-4 h-4 mx-auto mb-1" />
                      <span className="text-xs">เพิ่ม</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjustmentType('subtract')}
                      className={`p-2 rounded-lg border-2 transition-colors ${
                        adjustmentType === 'subtract'
                          ? 'border-red-500 bg-red-50 text-red-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Minus className="w-4 h-4 mx-auto mb-1" />
                      <span className="text-xs">ลด</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjustmentType('set')}
                      className={`p-2 rounded-lg border-2 transition-colors ${
                        adjustmentType === 'set'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Edit className="w-4 h-4 mx-auto mb-1" />
                      <span className="text-xs">ตั้งค่า</span>
                    </button>
                  </div>
                </div>

                {/* Amount */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {adjustmentType === 'set' ? 'ตั้งค่าเครดิตเป็น' : 'จำนวนเครดิต'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={adjustmentAmount}
                    onChange={(e) => setAdjustmentAmount(e.target.value)}
                    className="input-base"
                    placeholder="0"
                  />
                  {adjustmentAmount && (
                    <p className="mt-2 text-sm text-gray-600">
                      ผลลัพธ์: {selectedCredit.remainingCredits} → {calculateNewCredits()} ครั้ง
                    </p>
                  )}
                </div>

                {/* Reason */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    เหตุผลในการปรับ <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={adjustmentReason}
                    onChange={(e) => setAdjustmentReason(e.target.value)}
                    className="input-base"
                    placeholder="เช่น นักเรียนมีเครดิตคงเหลือจากเทอมที่แล้ว, แก้ไขข้อผิดพลาด..."
                  />
                </div>

                {/* Warning */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                  <div className="flex">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0" />
                    <div className="text-sm text-yellow-700">
                      <p className="font-medium">โปรดตรวจสอบให้แน่ใจก่อนบันทึก</p>
                      <p className="mt-1">การปรับเครดิตจะถูกบันทึกประวัติและไม่สามารถยกเลิกได้</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowAdjustModal(false)}
                    className="btn-secondary"
                    disabled={saving}
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={handleSaveAdjustment}
                    disabled={saving || !adjustmentAmount || !adjustmentReason.trim()}
                    className="btn-primary inline-flex items-center"
                  >
                    {saving ? (
                      <>
                        <div className="spinner mr-2"></div>
                        กำลังบันทึก...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        บันทึกการปรับเครดิต
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}

export default AdjustCreditsPage