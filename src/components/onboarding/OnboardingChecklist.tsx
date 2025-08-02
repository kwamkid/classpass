// src/components/onboarding/OnboardingChecklist.tsx
import { useNavigate } from 'react-router-dom'
import { 
  CheckCircle2,
  Circle,
  Building,
  BookOpen,
  Package,
  Users,
  ArrowRight,
  Sparkles,
  X
} from 'lucide-react'
import { useOnboardingStore } from '../../stores/onboardingStore'
import { useSchoolStore } from '../../stores/schoolStore'

const OnboardingChecklist = () => {
  const navigate = useNavigate()
  const { school } = useSchoolStore()
  const { 
    isOnboardingComplete, 
    steps, 
    completeStep,
    skipOnboarding 
  } = useOnboardingStore()

  // Don't show if onboarding is complete
  if (isOnboardingComplete) return null

  // Filter out welcome and complete steps for checklist
  const checklistItems = steps.filter(s => s.id !== 'welcome' && s.id !== 'complete')
  const completedCount = checklistItems.filter(s => s.completed).length
  const totalItems = checklistItems.length
  const progress = (completedCount / totalItems) * 100

  const handleItemClick = (step: typeof steps[0]) => {
    if (step.path && !step.completed) {
      navigate(step.path)
    }
  }

  const handleToggleComplete = (e: React.MouseEvent, stepId: string) => {
    e.stopPropagation() // ป้องกันไม่ให้ trigger handleItemClick
    completeStep(stepId)
  }

  const handleDismiss = () => {
    if (window.confirm('ซ่อนรายการตั้งค่าเริ่มต้น? คุณสามารถดูได้อีกครั้งในเมนูตั้งค่า')) {
      skipOnboarding()
    }
  }

  const getStepIcon = (stepId: string, completed: boolean) => {
    const iconClass = completed ? "w-6 h-6 text-green-600" : "w-6 h-6 text-gray-400"
    
    switch (stepId) {
      case 'school-info':
        return <Building className={iconClass} />
      case 'create-course':
        return <BookOpen className={iconClass} />
      case 'create-package':
        return <Package className={iconClass} />
      case 'add-student':
        return <Users className={iconClass} />
      default:
        return completed ? 
          <CheckCircle2 className="w-6 h-6 text-green-600" /> : 
          <Circle className="w-6 h-6 text-gray-400" />
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-50 to-yellow-50 px-6 py-4 border-b border-orange-100">
        <div className="flex items-start justify-between">
          <div className="flex items-start">
            <Sparkles className="w-7 h-7 text-orange-500 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                ยินดีต้อนรับสู่ {school?.name || 'ClassPass'}! 
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                ตั้งค่าพื้นฐาน 4 ขั้นตอนเพื่อเริ่มใช้งาน
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600">
              ความคืบหน้า
            </span>
            <span className="font-medium text-gray-900">
              {completedCount} จาก {totalItems} รายการ
            </span>
          </div>
          <div className="w-full h-2.5 bg-orange-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-orange-400 to-orange-500 transition-all duration-500 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Checklist Items */}
      <div className="p-6">
        <div className="space-y-4">
          {checklistItems.map((step, index) => (
            <div
              key={step.id}
              className={`
                group flex items-center p-4 rounded-lg border-2 transition-all
                ${step.completed 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-gray-50 border-gray-200 hover:border-orange-300 hover:bg-orange-50'
                }
              `}
            >
              {/* Checkbox for manual toggle */}
              <button
                onClick={(e) => handleToggleComplete(e, step.id)}
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center mr-3 transition-all
                  ${step.completed 
                    ? 'bg-green-100 hover:bg-green-200' 
                    : 'bg-white border-2 border-gray-300 hover:border-orange-400'
                  }
                `}
              >
                {step.completed ? (
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-gray-400" />
                )}
              </button>

              {/* Icon */}
              <div className="mr-4">
                {getStepIcon(step.id, step.completed)}
              </div>

              {/* Content - Clickable area */}
              <div 
                className="flex-1 cursor-pointer"
                onClick={() => handleItemClick(step)}
              >
                <h4 className={`
                  text-base font-medium
                  ${step.completed ? 'text-green-900' : 'text-gray-900'}
                `}>
                  {step.title}
                </h4>
                <p className={`
                  text-sm mt-0.5
                  ${step.completed ? 'text-green-700' : 'text-gray-600'}
                `}>
                  {step.description}
                </p>
              </div>

              {/* Action */}
              {!step.completed && (
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-orange-600 transition-colors" />
              )}
            </div>
          ))}
        </div>

        {/* Quick Tips */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-blue-900">
                เคล็ดลับการเริ่มต้น
              </h4>
              <p className="text-sm text-blue-700 mt-1">
                ทำตามลำดับจะช่วยให้ตั้งค่าได้ง่ายขึ้น เริ่มจากข้อมูลโรงเรียน → สร้างวิชา → สร้างแพ็คเกจ → เพิ่มนักเรียน
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OnboardingChecklist