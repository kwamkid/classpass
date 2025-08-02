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
}

const defaultSteps: OnboardingStep[] = [
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
  }
]

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set, get) => ({
      // Initial state
      isOnboardingComplete: false,
      steps: defaultSteps,

      // Initialize onboarding for new users
      initializeOnboarding: () => {
        const schoolId = localStorage.getItem('schoolId')
        const onboardingKey = `onboarding_${schoolId}_complete`
        const isComplete = localStorage.getItem(onboardingKey) === 'true'
        
        set({
          isOnboardingComplete: isComplete,
          steps: defaultSteps
        })
      },

      // Complete a specific step
      completeStep: (stepId: string) => {
        set((state) => {
          const updatedSteps = state.steps.map(step =>
            step.id === stepId ? { ...step, completed: !step.completed } : step
          )
          
          // Check if all steps are complete
          const allComplete = updatedSteps.every(s => s.completed)
          
          if (allComplete) {
            const schoolId = localStorage.getItem('schoolId')
            localStorage.setItem(`onboarding_${schoolId}_complete`, 'true')
          } else {
            // If unchecking, remove complete flag
            const schoolId = localStorage.getItem('schoolId')
            localStorage.removeItem(`onboarding_${schoolId}_complete`)
          }
          
          return {
            steps: updatedSteps,
            isOnboardingComplete: allComplete
          }
        })
      },

      // Skip onboarding
      skipOnboarding: () => {
        const schoolId = localStorage.getItem('schoolId')
        localStorage.setItem(`onboarding_${schoolId}_complete`, 'true')
        
        set({
          isOnboardingComplete: true
        })
      },

      // Reset onboarding (for testing or re-run)
      resetOnboarding: () => {
        const schoolId = localStorage.getItem('schoolId')
        localStorage.removeItem(`onboarding_${schoolId}_complete`)
        
        set({
          isOnboardingComplete: false,
          steps: defaultSteps.map(s => ({ ...s, completed: false }))
        })
      },

      // Check and update step completion based on actual data
      checkStepCompletion: (data) => {
        set((state) => {
          const updatedSteps = [...state.steps]
          
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
          
          // Check if all steps are complete
          const allComplete = updatedSteps.every(s => s.completed)
          
          if (allComplete) {
            const schoolId = localStorage.getItem('schoolId')
            localStorage.setItem(`onboarding_${schoolId}_complete`, 'true')
          }
          
          return {
            steps: updatedSteps,
            isOnboardingComplete: allComplete
          }
        })
      }
    }),
    {
      name: 'onboarding-storage',
      partialize: (state) => ({
        isOnboardingComplete: state.isOnboardingComplete,
        steps: state.steps
      })
    }
  )
)