// src/stores/onboardingStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface OnboardingStep {
  id: string
  title: string
  description: string
  completed: boolean
  path?: string
}

interface OnboardingStore {
  // State
  isOnboardingComplete: boolean
  currentStep: number
  steps: OnboardingStep[]
  showWizard: boolean
  
  // Actions
  initializeOnboarding: () => void
  completeStep: (stepId: string) => void
  nextStep: () => void
  previousStep: () => void
  skipOnboarding: () => void
  resetOnboarding: () => void
  setShowWizard: (show: boolean) => void
  goToIncompleteStep: () => void
  checkStepCompletion: (data: {
    hasSchoolInfo?: boolean
    hasCourses?: boolean
    hasPackages?: boolean
    hasStudents?: boolean
  }) => void
}

const defaultSteps: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'ยินดีต้อนรับสู่ ClassPass! 🎉',
    description: 'เรามาเริ่มตั้งค่าโรงเรียนของคุณกันเถอะ',
    completed: false
  },
  {
    id: 'school-info',
    title: 'ข้อมูลโรงเรียน',
    description: 'กรอกข้อมูลโรงเรียนของคุณให้ครบถ้วน',
    completed: false,
    path: '/settings'
  },
  {
    id: 'create-course',
    title: 'สร้างวิชาเรียน',
    description: 'เพิ่มวิชาเรียนที่โรงเรียนของคุณเปิดสอน',
    completed: false,
    path: '/courses/add'
  },
  {
    id: 'create-package',
    title: 'สร้างแพ็คเกจเครดิต',
    description: 'กำหนดแพ็คเกจและราคาสำหรับแต่ละวิชา',
    completed: false,
    path: '/packages/add'
  },
  {
    id: 'add-student',
    title: 'เพิ่มนักเรียน',
    description: 'เพิ่มข้อมูลนักเรียนคนแรกของคุณ',
    completed: false,
    path: '/students/add'
  },
  {
    id: 'complete',
    title: 'เสร็จสิ้น! 🎊',
    description: 'คุณพร้อมใช้งาน ClassPass แล้ว',
    completed: false
  }
]

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set, get) => ({
      // Initial state
      isOnboardingComplete: false,
      currentStep: 0,
      steps: defaultSteps,
      showWizard: false,

      // Initialize onboarding for new users
      initializeOnboarding: () => {
        const schoolId = localStorage.getItem('schoolId')
        const onboardingKey = `onboarding_${schoolId}_complete`
        const isComplete = localStorage.getItem(onboardingKey) === 'true'
        
        set({
          isOnboardingComplete: isComplete,
          showWizard: !isComplete,
          currentStep: isComplete ? 0 : 0,
          steps: defaultSteps
        })
      },

      // Complete a specific step
      completeStep: (stepId: string) => {
        set((state) => ({
          steps: state.steps.map(step =>
            step.id === stepId ? { ...step, completed: true } : step
          )
        }))
      },

      // Move to next step
      nextStep: () => {
        set((state) => {
          const nextStep = state.currentStep + 1
          const isLastStep = nextStep >= state.steps.length - 1
          
          if (isLastStep) {
            const schoolId = localStorage.getItem('schoolId')
            localStorage.setItem(`onboarding_${schoolId}_complete`, 'true')
          }
          
          return {
            currentStep: nextStep,
            isOnboardingComplete: isLastStep
          }
        })
      },

      // Move to previous step
      previousStep: () => {
        set((state) => ({
          currentStep: Math.max(0, state.currentStep - 1)
        }))
      },

      // Skip onboarding
      skipOnboarding: () => {
        const schoolId = localStorage.getItem('schoolId')
        localStorage.setItem(`onboarding_${schoolId}_complete`, 'true')
        
        set({
          isOnboardingComplete: true,
          showWizard: false
        })
      },

      // Reset onboarding (for testing or re-run)
      resetOnboarding: () => {
        const schoolId = localStorage.getItem('schoolId')
        localStorage.removeItem(`onboarding_${schoolId}_complete`)
        
        set({
          isOnboardingComplete: false,
          currentStep: 0,
          steps: defaultSteps,
          showWizard: true
        })
      },

      // Toggle wizard visibility
      setShowWizard: (show: boolean) => {
        // When showing wizard, go to first incomplete step
        if (show) {
          const state = get()
          const firstIncompleteIndex = state.steps.findIndex(
            s => !s.completed && s.id !== 'welcome' && s.id !== 'complete'
          )
          
          if (firstIncompleteIndex !== -1) {
            set({ 
              showWizard: show,
              currentStep: firstIncompleteIndex
            })
            return
          }
        }
        
        set({ showWizard: show })
      },
      
      // Go to first incomplete step
      goToIncompleteStep: () => {
        const state = get()
        const firstIncompleteIndex = state.steps.findIndex(
          s => !s.completed && s.id !== 'welcome' && s.id !== 'complete'
        )
        
        if (firstIncompleteIndex !== -1) {
          set({ currentStep: firstIncompleteIndex })
        }
      },

      // Check and update step completion based on actual data
      checkStepCompletion: (data) => {
        set((state) => {
          const updatedSteps = [...state.steps]
          
          // Check school info
          if (data.hasSchoolInfo) {
            const schoolStep = updatedSteps.find(s => s.id === 'school-info')
            if (schoolStep) schoolStep.completed = true
          }
          
          // Check courses
          if (data.hasCourses) {
            const courseStep = updatedSteps.find(s => s.id === 'create-course')
            if (courseStep) courseStep.completed = true
          }
          
          // Check packages
          if (data.hasPackages) {
            const packageStep = updatedSteps.find(s => s.id === 'create-package')
            if (packageStep) packageStep.completed = true
          }
          
          // Check students
          if (data.hasStudents) {
            const studentStep = updatedSteps.find(s => s.id === 'add-student')
            if (studentStep) studentStep.completed = true
          }
          
          // Check if all steps are complete
          const allComplete = updatedSteps
            .filter(s => s.id !== 'welcome' && s.id !== 'complete')
            .every(s => s.completed)
          
          if (allComplete) {
            const schoolId = localStorage.getItem('schoolId')
            localStorage.setItem(`onboarding_${schoolId}_complete`, 'true')
            return {
              steps: updatedSteps,
              isOnboardingComplete: true,
              showWizard: false
            }
          }
          
          return { steps: updatedSteps }
        })
      }
    }),
    {
      name: 'onboarding-storage',
      partialize: (state) => ({
        isOnboardingComplete: state.isOnboardingComplete,
        currentStep: state.currentStep,
        steps: state.steps
      })
    }
  )
)