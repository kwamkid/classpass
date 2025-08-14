import { useEffect, useRef } from 'react'
import { onIdTokenChanged } from 'firebase/auth'
import { auth } from '../services/firebase'
import { useAuthStore } from '../stores/authStore'
import { getUserData } from '../services/auth'

export const useAuthRefresh = () => {
  const { setUser } = useAuthStore()
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null) // แก้ไขบรรทัดนี้

  useEffect(() => {
    // Listen for token changes
    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Get fresh token
          const token = await firebaseUser.getIdToken()
          
          // Store token in localStorage for API calls
          localStorage.setItem('authToken', token)
          
          // Get user data from Firestore
          const userData = await getUserData(firebaseUser.uid)
          if (userData) {
            setUser(userData)
          }
        } catch (error) {
          console.error('Error refreshing auth:', error)
        }
      } else {
        localStorage.removeItem('authToken')
        setUser(null)
      }
    })

    // Force refresh token every 50 minutes (tokens expire after 1 hour)
    refreshIntervalRef.current = setInterval(async () => {
      const currentUser = auth.currentUser
      if (currentUser) {
        try {
          await currentUser.getIdToken(true) // Force refresh
          console.log('Token refreshed successfully')
        } catch (error) {
          console.error('Error refreshing token:', error)
        }
      }
    }, 50 * 60 * 1000) // 50 minutes

    return () => {
      unsubscribe()
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
    }
  }, [setUser])
}