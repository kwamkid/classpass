// src/hooks/useOnboardingComplete.ts
import { useEffect } from 'react'
import { useOnboardingStore } from '../stores/onboardingStore'

interface UseOnboardingCompleteProps {
  stepId: string
  onComplete?: () => void
}

export const useOnboardingComplete = ({ stepId, onComplete }: UseOnboardingCompleteProps) => {
  const { completeStep, setShowWizard, steps } = useOnboardingStore()

  useEffect(() => {
    // Check if this step exists and is not completed
    const step = steps.find(s => s.id === stepId)
    if (step && !step.completed) {
      // Complete the step
      completeStep(stepId)
      
      // Show success toast or notification
      if (onComplete) {
        onComplete()
      }
      
      // Show wizard again after a delay to guide to next step
      setTimeout(() => {
        // Find next incomplete step
        const currentIndex = steps.findIndex(s => s.id === stepId)
        const nextStep = steps.slice(currentIndex + 1).find(s => !s.completed && s.id !== 'complete')
        
        if (nextStep) {
          setShowWizard(true)
        }
      }, 1500)
    }
  }, [stepId, completeStep, setShowWizard, steps])
}

// Export helper to check if user is creating their first item
export const useIsFirstItem = (items: any[]) => {
  return items.length === 1 // Just created the first item
}