import { create } from 'zustand'
import * as authService from '../services/auth'

// Define User type locally to avoid import issues
interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  displayName: string
  role: 'owner' | 'admin' | 'teacher'
  schoolId: string
  isActive: boolean
  [key: string]: any
}

interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  error: string | null
  
  // Actions
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  checkAuth: () => Promise<void>
  clearError: () => void
  setUser: (user: User | null) => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,
  
  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null })
    try {
      const user = await authService.login({ email, password })
      set({ 
        user, 
        isAuthenticated: true, 
        isLoading: false,
        error: null 
      })
    } catch (error: any) {
      set({ 
        error: error.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ',
        isLoading: false,
        isAuthenticated: false,
        user: null
      })
      throw error
    }
  },
  
  logout: async () => {
    set({ isLoading: true })
    try {
      await authService.logout()
      set({ 
        user: null, 
        isAuthenticated: false, 
        isLoading: false,
        error: null 
      })
    } catch (error: any) {
      set({ 
        error: error.message || 'เกิดข้อผิดพลาดในการออกจากระบบ',
        isLoading: false 
      })
      throw error
    }
  },
  
  resetPassword: async (email: string) => {
    set({ isLoading: true, error: null })
    try {
      await authService.resetPassword(email)
      set({ isLoading: false })
    } catch (error: any) {
      set({ 
        error: error.message || 'เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน',
        isLoading: false 
      })
      throw error
    }
  },
  
  checkAuth: async () => {
    set({ isLoading: true })
    try {
      const user = await authService.getCurrentUser()
      set({ 
        user, 
        isAuthenticated: !!user,
        isLoading: false,
        error: null
      })
    } catch (error) {
      set({ 
        user: null, 
        isAuthenticated: false,
        isLoading: false 
      })
    }
  },
  
  clearError: () => {
    set({ error: null })
  },
  
  setUser: (user: User | null) => {
    set({ 
      user, 
      isAuthenticated: !!user,
      error: null
    })
  }
}))

// Initialize auth state listener
authService.subscribeToAuthState((user) => {
  useAuthStore.getState().setUser(user)
  useAuthStore.setState({ isLoading: false })
})