// src/stores/authStore.ts
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import * as authService from '../services/auth'

// Define User type with superadmin role
interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  displayName: string
  role: 'owner' | 'admin' | 'teacher' | 'superadmin'
  schoolId: string
  isActive: boolean
  isSuperAdmin?: boolean
  profileImage?: string
  phone?: string
  createdAt?: any
  updatedAt?: any
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
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,
      
      login: async (email: string, password: string) => {
        console.log('🔐 Login attempt with:', email)
        set({ isLoading: true, error: null })
        try {
          const { user } = await authService.login({ email, password })
          console.log('✅ Login successful:', user)
          set({ 
            user: user as User, 
            isAuthenticated: true, 
            isLoading: false,
            error: null 
          })
        } catch (error: any) {
          console.error('❌ Login failed:', error)
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
        console.log('🚪 Logging out...')
        set({ isLoading: true })
        try {
          await authService.logout()
          console.log('✅ Logout successful')
          set({ 
            user: null, 
            isAuthenticated: false, 
            isLoading: false,
            error: null 
          })
        } catch (error: any) {
          console.error('❌ Logout error:', error)
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
        console.log('🔍 Checking auth state...')
        const currentState = get()
        console.log('📊 Current state:', { 
          hasUser: !!currentState.user, 
          isAuthenticated: currentState.isAuthenticated,
          userId: currentState.user?.id 
        })
        
        set({ isLoading: true })
        try {
          const user = await authService.getCurrentUser()
          console.log('Current user:', user)
          
          set({ 
            user: user as User | null, 
            isAuthenticated: !!user,
            isLoading: false,
            error: null
          })
        } catch (error) {
          console.error('❌ Check auth error:', error)
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
        console.log('👤 Setting user:', user?.email)
        set({ 
          user, 
          isAuthenticated: !!user,
          error: null
        })
      },
      
      setLoading: (loading: boolean) => {
        set({ isLoading: loading })
      }
    }),
    {
      name: 'classpass-auth',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        console.log('💾 Rehydrating from localStorage:', {
          hasUser: !!state?.user,
          isAuthenticated: state?.isAuthenticated,
          userEmail: state?.user?.email
        })
      }
    }
  )
)

// Subscribe to auth state changes
authService.subscribeToAuthState((user) => {
  console.log('🔄 Auth state changed:', user?.email)
  useAuthStore.getState().setUser(user as User | null)
})