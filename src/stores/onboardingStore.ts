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
  steps: OnboardingStep[]
  showWizard: boolean
  currentStep: number
  
  // Actions
  initializeOnboarding: () => void
  completeStep: (stepId: string) => void
  skipOnboarding: () => void
  resetOnboarding: () => void
  checkStepCompletion: (data: {
    hasSchoolInfo?: boolean
    hasCourses?: boolean
    hasPackages?: boolean
    hasStudents?: boolean
  }) => void
  setShowWizard: (show: boolean) => void
  nextStep: () => void
  previousStep: () => void
}

const defaultSteps: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'ยินดีต้อนรับ',
    description: 'เริ่มต้นใช้งาน ClassPass',
    completed: false
  },
  {
    id: 'school-info',
    title: 'ข้อมูลโรงเรียน',
    description: 'กรอกข้อมูลโรงเรียน เช่น ที่อยู่ เบอร์โทร โลโก้',
    completed: false,
    path: '/settings'
  },
  {
    id: 'create-course',
    title: 'สร้างวิชาเรียน',
    description: 'เพิ่มวิชาที่เปิดสอน เช่น คณิต ฟิสิกส์ กีฬา',
    completed: false,
    path: '/courses/add'
  },
  {
    id: 'create-package',
    title: 'สร้างแพ็คเกจเครดิต',
    description: 'กำหนดแพ็คเกจและราคา เช่น 4 ครั้ง 800 บาท',
    completed: false,
    path: '/packages/add'
  },
  {
    id: 'add-student',
    title: 'เพิ่มนักเรียน',
    description: 'เพิ่มข้อมูลนักเรียนคนแรก',
    completed: false,
    path: '/students/add'
  },
  {
    id: 'complete',
    title: 'เสร็จสิ้น',
    description: 'พร้อมเริ่มใช้งาน ClassPass',
    completed: false
  }
]

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set, get) => ({
      // Initial state
      isOnboardingComplete: false,
      steps: defaultSteps,
      showWizard: false,
      currentStep: 0,

      // Initialize onboarding for new users
      initializeOnboarding: () => {
        const schoolId = localStorage.getItem('schoolId')
        const onboardingKey = `onboarding_${schoolId}_complete`
        const isComplete = localStorage.getItem(onboardingKey) === 'true'
        
        set({
          isOnboardingComplete: isComplete,
          steps: defaultSteps,
          showWizard: !isComplete, // Show wizard for new users
          currentStep: 0
        })
      },

      // Complete a specific step
      completeStep: (stepId: string) => {
        set((state) => {
          const updatedSteps = state.steps.map(step =>
            step.id === stepId ? { ...step, completed: true } : step
          )
          
          // Check if all required steps are complete (exclude welcome and complete steps)
          const requiredSteps = updatedSteps.filter(
            s => s.id !== 'welcome' && s.id !== 'complete'
          )
          const allRequiredComplete = requiredSteps.every(s => s.completed)
          
          if (allRequiredComplete) {
            // Mark complete step as done
            const finalSteps = updatedSteps.map(step =>
              step.id === 'complete' ? { ...step, completed: true } : step
            )
            
            const schoolId = localStorage.getItem('schoolId')
            localStorage.setItem(`onboarding_${schoolId}_complete`, 'true')
            
            return {
              steps: finalSteps,
              isOnboardingComplete: true
            }
          }
          
          return {
            steps: updatedSteps,
            isOnboardingComplete: false
          }
        })
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
          steps: defaultSteps.map(s => ({ ...s, completed: false })),
          showWizard: true,
          currentStep: 0
        })
      },

      // Check and update step completion based on actual data
      checkStepCompletion: (data) => {
        set((state) => {
          const updatedSteps = [...state.steps]
          
          // Always mark welcome as completed
          const welcomeStep = updatedSteps.find(s => s.id === 'welcome')
          if (welcomeStep) welcomeStep.completed = true
          
          // Check school info
          if (data.hasSchoolInfo !== undefined) {
            const schoolStep = updatedSteps.find(s => s.id === 'school-info')
            if (schoolStep) schoolStep.completed = data.hasSchoolInfo
          }
          
          // Check courses
          if (data.hasCourses !== undefined) {
            const courseStep = updatedSteps.find(s => s.id === 'create-course')
            if (courseStep) courseStep.completed = data.hasCourses
          }
          
          // Check packages
          if (data.hasPackages !== undefined) {
            const packageStep = updatedSteps.find(s => s.id === 'create-package')
            if (packageStep) packageStep.completed = data.hasPackages
          }
          
          // Check students
          if (data.hasStudents !== undefined) {
            const studentStep = updatedSteps.find(s => s.id === 'add-student')
            if (studentStep) studentStep.completed = data.hasStudents
          }
          
          // Check if all required steps are complete
          const requiredSteps = updatedSteps.filter(
            s => s.id !== 'welcome' && s.id !== 'complete'
          )
          const allRequiredComplete = requiredSteps.every(s => s.completed)
          
          if (allRequiredComplete) {
            // Mark complete step as done
            const completeStep = updatedSteps.find(s => s.id === 'complete')
            if (completeStep) completeStep.completed = true
            
            const schoolId = localStorage.getItem('schoolId')
            localStorage.setItem(`onboarding_${schoolId}_complete`, 'true')
            
            return {
              steps: updatedSteps,
              isOnboardingComplete: true,
              showWizard: false
            }
          }
          
          return {
            steps: updatedSteps,
            isOnboardingComplete: false
          }
        })
      },

      // Set show wizard
      setShowWizard: (show: boolean) => {
        set({ showWizard: show })
      },

      // Next step
      nextStep: () => {
        set((state) => {
          const nextStep = Math.min(state.currentStep + 1, state.steps.length - 1)
          
          // If we're at the complete step, close the wizard
          if (state.steps[nextStep]?.id === 'complete' && state.isOnboardingComplete) {
            return {
              currentStep: nextStep,
              showWizard: false
            }
          }
          
          return {
            currentStep: nextStep
          }
        })
      },

      // Previous step
      previousStep: () => {
        set((state) => ({
          currentStep: Math.max(state.currentStep - 1, 0)
        }))
      }
    }),
    {
      name: 'onboarding-storage',
      partialize: (state) => ({
        isOnboardingComplete: state.isOnboardingComplete,
        steps: state.steps,
        showWizard: state.showWizard,
        currentStep: state.currentStep
      })
    }
  )
)