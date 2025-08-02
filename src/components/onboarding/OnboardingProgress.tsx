// src/components/onboarding/OnboardingProgress.tsx
import { useNavigate } from 'react-router-dom'
import { 
  CheckCircle,
  Circle,
  AlertCircle,
  ChevronRight,
  X
} from 'lucide-react'
import { useOnboardingStore } from '../../stores/onboardingStore'

const OnboardingProgress = () => {
  const navigate = useNavigate()
  const { 
    isOnboardingComplete, 
    steps, 
    setShowWizard,
    skipOnboarding 
  } = useOnboardingStore()

  // Don't show if onboarding is complete
  if (isOnboardingComplete) return null

  // Filter out welcome and complete steps
  const actionSteps = steps.filter(s => s.id !== 'welcome' && s.id !== 'complete')
  const completedCount = actionSteps.filter(s => s.completed).length
  const totalSteps = actionSteps.length
  const progress = (completedCount / totalSteps) * 100

  const handleStepClick = (step: typeof steps[0]) => {
    if (step.path) {
      navigate(step.path)
    }
  }

  const handleDismiss = () => {
    if (window.confirm('ซ่อนแถบความคืบหน้า? คุณสามารถดูได้อีกครั้งในเมนูตั้งค่า')) {
      skipOnboarding()
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-30 max-w-sm">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-orange-500 mr-2 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-gray-900">
                ตั้งค่าเริ่มต้น
              </h4>
              <p className="text-xs text-gray-500 mt-0.5">
                {completedCount} จาก {totalSteps} ขั้นตอน
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-gray-200 rounded-full mb-3 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-orange-400 to-orange-600 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Steps List */}
        <div className="space-y-2 mb-3">
          {actionSteps.map((step) => (
            <button
              key={step.id}
              onClick={() => handleStepClick(step)}
              className={`w-full flex items-center justify-between p-2 rounded-md text-left transition-colors ${
                step.completed 
                  ? 'bg-green-50 hover:bg-green-100' 
                  : 'bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center">
                {step.completed ? (
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                ) : (
                  <Circle className="w-4 h-4 text-gray-400 mr-2" />
                )}
                <span className={`text-sm ${
                  step.completed ? 'text-green-700' : 'text-gray-700'
                }`}>
                  {step.title}
                </span>
              </div>
              {!step.completed && (
                <ChevronRight className="w-4 h-4 text-gray-400" />
              )}
            </button>
          ))}
        </div>

        {/* Action Button */}
        <button
          onClick={() => setShowWizard(true)}
          className="w-full btn-primary text-sm py-2"
        >
          ดูคำแนะนำทั้งหมด
        </button>
      </div>
    </div>
  )
}

export default OnboardingProgress