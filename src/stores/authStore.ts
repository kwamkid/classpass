// src/stores/authStore.ts
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { supabase } from '../services/supabase'
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
  isAuthenticated: boolean
  isInitialized: boolean
  error: string | null

  // Actions
  login: (email: string, password: string) => Promise<void>
  register: (data: authService.RegisterData) => Promise<void>
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  initAuth: () => () => void
  clearError: () => void
  setUser: (user: User | null) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isInitialized: false,
      error: null,

      login: async (email: string, password: string) => {
        authService.setAuthActionInProgress(true)
        set({ error: null })
        try {
          const { user } = await authService.login({ email, password })
          set({
            user: user as User,
            isAuthenticated: true,
            isInitialized: true,
            error: null
          })
        } catch (error: any) {
          set({
            error: error.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ',
            isAuthenticated: false,
            user: null
          })
          throw error
        } finally {
          authService.setAuthActionInProgress(false)
        }
      },

      register: async (data: authService.RegisterData) => {
        // isAuthActionInProgress is set inside registerSchool itself
        set({ error: null })
        try {
          const { user } = await authService.registerSchool(data)
          set({
            user: user as User,
            isAuthenticated: true,
            isInitialized: true,
            error: null
          })
        } catch (error: any) {
          set({
            error: error.message || 'เกิดข้อผิดพลาดในการลงทะเบียน',
            isAuthenticated: false,
            user: null
          })
          throw error
        }
      },

      logout: async () => {
        authService.setAuthActionInProgress(true)
        try {
          await authService.logout()
          set({
            user: null,
            isAuthenticated: false,
            error: null
          })
        } catch (error: any) {
          set({
            error: error.message || 'เกิดข้อผิดพลาดในการออกจากระบบ'
          })
          throw error
        } finally {
          authService.setAuthActionInProgress(false)
        }
      },

      resetPassword: async (email: string) => {
        set({ error: null })
        try {
          await authService.resetPassword(email)
        } catch (error: any) {
          set({
            error: error.message || 'เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน'
          })
          throw error
        }
      },

      initAuth: () => {
        let isFirstEvent = true

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            // Skip if login/logout/register action is in progress — they handle state themselves
            if (authService.isAuthActionInProgress) {
              return
            }

            if (event === 'SIGNED_OUT') {
              set({ user: null, isAuthenticated: false, isInitialized: true, error: null })
              return
            }

            if (session?.user) {
              const currentState = get()

              // On first event (INITIAL_SESSION / SIGNED_IN from persisted session):
              // If we already have cached user data, just mark initialized — no DB query
              if (isFirstEvent && currentState.user && currentState.isAuthenticated) {
                isFirstEvent = false
                set({ isInitialized: true })
                return
              }
              isFirstEvent = false

              // For subsequent events (TOKEN_REFRESHED, etc.)
              // If we already have user data, just mark initialized — no need to re-fetch
              const currentUser = get()
              if (currentUser.user && currentUser.isAuthenticated) {
                set({ isInitialized: true })
                return
              }

              // Only fetch from DB if we don't have user data yet
              const userData = await authService.getUserData(session.user.id)
              if (userData) {
                set({
                  user: userData as User,
                  isAuthenticated: true,
                  isInitialized: true,
                  error: null
                })
              } else {
                // User exists in auth but not in users table
                set({ user: null, isAuthenticated: false, isInitialized: true })
              }
            } else {
              isFirstEvent = false
              // No session
              set({ user: null, isAuthenticated: false, isInitialized: true })
            }
          }
        )

        // Return cleanup function
        return () => {
          subscription.unsubscribe()
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
      },
    }),
    {
      name: 'classpass-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
