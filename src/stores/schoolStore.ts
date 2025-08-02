// src/stores/schoolStore.ts
import { create } from 'zustand'
import * as schoolService from '../services/school'

// Types
interface School {
  id: string
  name: string
  logo?: string
  address?: string
  phone?: string
  email?: string
  plan: 'free' | 'basic' | 'pro' | 'enterprise'
  isActive: boolean
  [key: string]: any
}

interface SchoolState {
  school: School | null
  isLoading: boolean
  error: string | null
  
  // Actions
  loadSchool: (schoolId: string) => Promise<void>
  setSchool: (school: School | null) => void
  clearError: () => void
}

export const useSchoolStore = create<SchoolState>((set) => ({
  school: null,
  isLoading: false,
  error: null,
  
  loadSchool: async (schoolId: string) => {
    set({ isLoading: true, error: null })
    try {
      const school = await schoolService.getSchoolById(schoolId)
      if (school) {
        set({ school: school as School, isLoading: false })
      } else {
        set({ 
          error: 'ไม่พบข้อมูลโรงเรียน', 
          isLoading: false 
        })
      }
    } catch (error: any) {
      set({ 
        error: error.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูลโรงเรียน',
        isLoading: false 
      })
    }
  },
  
  setSchool: (school: School | null) => {
    set({ school })
  },
  
  clearError: () => {
    set({ error: null })
  }
}))