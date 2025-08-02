// src/components/onboarding/OnboardingWizard.tsx
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  X, 
  ChevronRight, 
  ChevronLeft,
  Building,
  BookOpen,
  Package,
  Users,
  CheckCircle,
  Sparkles,
  ArrowRight
} from 'lucide-react'
import { useOnboardingStore } from '../../stores/onboardingStore'
import { useSchoolStore } from '../../stores/schoolStore'

const OnboardingWizard = () => {
  const navigate = useNavigate()
  const { school } = useSchoolStore()
  const {
    showWizard,
    currentStep,
    steps,
    nextStep,
    previousStep,
    skipOnboarding,
    setShowWizard,
    completeStep
  } = useOnboardingStore()

  const currentStepData = steps[currentStep]
  const progress = ((currentStep + 1) / steps.length) * 100

  // Auto complete welcome step
  useEffect(() => {
    if (currentStep === 0 && currentStepData.id === 'welcome') {
      completeStep('welcome')
    }
  }, [currentStep, currentStepData.id, completeStep])

  // Auto navigate to first incomplete step
  useEffect(() => {
    if (showWizard) {
      const firstIncompleteIndex = steps.findIndex(s => !s.completed && s.id !== 'welcome')
      if (firstIncompleteIndex !== -1 && firstIncompleteIndex !== currentStep) {
        // Jump to first incomplete step
        for (let i = 0; i < firstIncompleteIndex; i++) {
          nextStep()
        }
      }
    }
  }, [showWizard])

  if (!showWizard) return null

  const handleNext = () => {
    if (currentStepData.path && currentStep < steps.length - 2) {
      // Navigate to the step's path
      navigate(currentStepData.path)
      setShowWizard(false)
    } else {
      nextStep()
    }
  }

  const handleSkip = () => {
    if (window.confirm('คุณแน่ใจหรือไม่ที่จะข้ามการตั้งค่าเริ่มต้น? คุณสามารถตั้งค่าเหล่านี้ได้ในภายหลัง')) {
      skipOnboarding()
    }
  }

  const getStepIcon = (stepId: string) => {
    switch (stepId) {
      case 'school-info':
        return <Building className="w-6 h-6" />
      case 'create-course':
        return <BookOpen className="w-6 h-6" />
      case 'create-package':
        return <Package className="w-6 h-6" />
      case 'add-student':
        return <Users className="w-6 h-6" />
      case 'complete':
        return <CheckCircle className="w-6 h-6" />
      default:
        return <Sparkles className="w-6 h-6" />
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-gray-900 bg-opacity-50 z-40" />
      
      {/* Wizard Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="relative px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  เริ่มต้นใช้งาน ClassPass
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  ขั้นตอนที่ {currentStep + 1} จาก {steps.length}
                </p>
              </div>
              <button
                onClick={() => setShowWizard(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Progress Bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200">
              <div 
                className="h-full bg-primary-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Welcome Step */}
            {currentStepData.id === 'welcome' && (
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="w-10 h-10 text-primary-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  ยินดีต้อนรับสู่ ClassPass! 🎉
                </h3>
                <p className="text-gray-600 mb-2">
                  ขอบคุณที่เลือกใช้ {school?.name}
                </p>
                <p className="text-gray-500 mb-8">
                  เรามาเริ่มตั้งค่าระบบให้พร้อมใช้งานกันเถอะ ใช้เวลาเพียง 5 นาที
                </p>
                
                {/* Steps Preview */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  {steps.slice(1, -1).map((step) => (
                    <div key={step.id} className="text-center">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        {getStepIcon(step.id)}
                      </div>
                      <p className="text-xs text-gray-600">{step.title}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step Content */}
            {currentStepData.id !== 'welcome' && currentStepData.id !== 'complete' && (
              <div className="py-8">
                <div className="flex items-center justify-center mb-6">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                    currentStepData.completed ? 'bg-green-100' : 'bg-primary-100'
                  }`}>
                    {currentStepData.completed ? (
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    ) : (
                      <div className={currentStepData.completed ? 'text-green-600' : 'text-primary-600'}>
                        {getStepIcon(currentStepData.id)}
                      </div>
                    )}
                  </div>
                </div>
                
                <h3 className="text-xl font-semibold text-gray-900 text-center mb-2">
                  {currentStepData.title}
                </h3>
                <p className="text-gray-600 text-center mb-8">
                  {currentStepData.description}
                </p>
                
                {/* Step Instructions */}
                <div className="bg-gray-50 rounded-lg p-6">
                  {currentStepData.id === 'school-info' && (
                    <div className="space-y-3">
                      <p className="font-medium text-gray-900">สิ่งที่ต้องทำ:</p>
                      <ul className="space-y-2 text-sm text-gray-600">
                        <li className="flex items-start">
                          <span className="text-primary-500 mr-2">•</span>
                          อัพโหลดโลโก้โรงเรียน (ถ้ามี)
                        </li>
                        <li className="flex items-start">
                          <span className="text-primary-500 mr-2">•</span>
                          กรอกข้อมูลติดต่อ เช่น เบอร์โทร, อีเมล
                        </li>
                        <li className="flex items-start">
                          <span className="text-primary-500 mr-2">•</span>
                          ใส่ที่อยู่โรงเรียน
                        </li>
                      </ul>
                    </div>
                  )}
                  
                  {currentStepData.id === 'create-course' && (
                    <div className="space-y-3">
                      <p className="font-medium text-gray-900">ตัวอย่างวิชา:</p>
                      <ul className="space-y-2 text-sm text-gray-600">
                        <li className="flex items-start">
                          <span className="text-primary-500 mr-2">📚</span>
                          คณิตศาสตร์ ม.1, ฟิสิกส์ ม.2
                        </li>
                        <li className="flex items-start">
                          <span className="text-primary-500 mr-2">⚽</span>
                          ฟุตบอลเยาวชน, ว่ายน้ำเบื้องต้น
                        </li>
                        <li className="flex items-start">
                          <span className="text-primary-500 mr-2">🎨</span>
                          ศิลปะสำหรับเด็ก, เปียโนพื้นฐาน
                        </li>
                      </ul>
                    </div>
                  )}
                  
                  {currentStepData.id === 'create-package' && (
                    <div className="space-y-3">
                      <p className="font-medium text-gray-900">ตัวอย่างแพ็คเกจ:</p>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="text-center p-3 bg-white rounded-lg">
                          <p className="font-semibold text-primary-600">4 ครั้ง</p>
                          <p className="text-xs text-gray-500">฿800</p>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg border-2 border-primary-500">
                          <p className="font-semibold text-primary-600">8 ครั้ง</p>
                          <p className="text-xs text-gray-500">฿1,500</p>
                          <p className="text-xs text-orange-500">ยอดนิยม</p>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg">
                          <p className="font-semibold text-primary-600">16 ครั้ง</p>
                          <p className="text-xs text-gray-500">฿2,800</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {currentStepData.id === 'add-student' && (
                    <div className="space-y-3">
                      <p className="font-medium text-gray-900">ข้อมูลที่ควรเตรียม:</p>
                      <ul className="space-y-2 text-sm text-gray-600">
                        <li className="flex items-start">
                          <span className="text-primary-500 mr-2">•</span>
                          ชื่อ-นามสกุล และชื่อเล่น
                        </li>
                        <li className="flex items-start">
                          <span className="text-primary-500 mr-2">•</span>
                          ระดับชั้น (เช่น ม.1, ป.5)
                        </li>
                        <li className="flex items-start">
                          <span className="text-primary-500 mr-2">•</span>
                          เบอร์ติดต่อผู้ปกครอง
                        </li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Complete Step */}
            {currentStepData.id === 'complete' && (
              <div className="text-center py-8">
                <div className="relative w-20 h-20 mx-auto mb-6">
                  <div className="absolute inset-0 bg-green-100 rounded-full animate-ping"></div>
                  <div className="relative w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-10 h-10 text-green-600" />
                  </div>
                </div>
                
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  ยินดีด้วย! 🎊
                </h3>
                <p className="text-gray-600 mb-8">
                  คุณได้ตั้งค่าพื้นฐานเรียบร้อยแล้ว พร้อมเริ่มใช้งาน ClassPass
                </p>
                
                <div className="bg-green-50 rounded-lg p-6 mb-8">
                  <h4 className="font-medium text-green-900 mb-3">สิ่งที่คุณทำสำเร็จ:</h4>
                  <div className="space-y-2 text-sm text-green-700">
                    {steps.slice(1, -1).map((step) => (
                      <div key={step.id} className="flex items-center">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        {step.title}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="bg-blue-50 rounded-lg p-6">
                  <h4 className="font-medium text-blue-900 mb-3">ขั้นตอนถัดไป:</h4>
                  <ul className="space-y-2 text-sm text-blue-700 text-left">
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">1.</span>
                      ลองเช็คชื่อนักเรียนในเมนู "เช็คชื่อ"
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">2.</span>
                      ขายแพ็คเกจให้นักเรียนในเมนู "ขายแพ็คเกจ"
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">3.</span>
                      ดูรายงานสรุปในเมนู "Dashboard"
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                {currentStep > 0 && currentStep < steps.length - 1 && (
                  <button
                    onClick={handleSkip}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    ข้ามทั้งหมด
                  </button>
                )}
              </div>
              
              <div className="flex items-center space-x-3">
                {currentStep > 0 && currentStepData.id !== 'complete' && (
                  <button
                    onClick={previousStep}
                    className="btn-secondary inline-flex items-center"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    ย้อนกลับ
                  </button>
                )}
                
                <button
                  onClick={handleNext}
                  className="btn-primary inline-flex items-center"
                >
                  {currentStepData.id === 'complete' ? (
                    <>
                      เริ่มใช้งาน
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </>
                  ) : currentStepData.path ? (
                    <>
                      ไปยังหน้า{currentStepData.title}
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </>
                  ) : (
                    <>
                      ถัดไป
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default OnboardingWizard