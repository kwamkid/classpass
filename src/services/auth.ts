import { 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  type User as FirebaseUser
} from 'firebase/auth'
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from './firebase'

// Types
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

interface LoginCredentials {
  email: string
  password: string
}

// Get user data from Firestore
export const getUserData = async (uid: string): Promise<User | null> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid))
    if (userDoc.exists()) {
      return {
        id: userDoc.id,
        ...userDoc.data()
      } as User
    }
    return null
  } catch (error) {
    console.error('Error getting user data:', error)
    return null
  }
}

// Wait for auth to be ready
const waitForAuth = (): Promise<FirebaseUser | null> => {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe()
      resolve(user)
    })
  })
}

// Login with email and password
export const login = async ({ email, password }: LoginCredentials): Promise<User> => {
  try {
    // Sign in with Firebase Auth
    const { user: firebaseUser } = await signInWithEmailAndPassword(auth, email, password)
    
    // Get user data from Firestore
    const userData = await getUserData(firebaseUser.uid)
    
    if (!userData) {
      throw new Error('User data not found')
    }
    
    if (!userData.isActive) {
      throw new Error('Account is inactive')
    }
    
    // Update last login
    await updateDoc(doc(db, 'users', firebaseUser.uid), {
      lastLogin: serverTimestamp()
    })
    
    return userData
  } catch (error: any) {
    // Handle specific Firebase errors
    if (error.code === 'auth/user-not-found') {
      throw new Error('ไม่พบบัญชีผู้ใช้นี้')
    } else if (error.code === 'auth/wrong-password') {
      throw new Error('รหัสผ่านไม่ถูกต้อง')
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('อีเมลไม่ถูกต้อง')
    } else if (error.code === 'auth/too-many-requests') {
      throw new Error('พยายามเข้าสู่ระบบหลายครั้งเกินไป กรุณาลองใหม่ภายหลัง')
    }
    
    throw error
  }
}

// Logout
export const logout = async (): Promise<void> => {
  try {
    await signOut(auth)
  } catch (error) {
    console.error('Error signing out:', error)
    throw error
  }
}

// Reset password
export const resetPassword = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email)
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      throw new Error('ไม่พบบัญชีผู้ใช้นี้')
    }
    throw error
  }
}

// Subscribe to auth state changes
export const subscribeToAuthState = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    console.log('🔥 Firebase auth state changed:', firebaseUser?.email || 'null')
    if (firebaseUser) {
      const userData = await getUserData(firebaseUser.uid)
      callback(userData)
    } else {
      callback(null)
    }
  })
}

// Check if user is authenticated (wait for auth to be ready)
export const isAuthenticated = async (): Promise<boolean> => {
  const user = await waitForAuth()
  return !!user
}

// Get current user (wait for auth to be ready)
export const getCurrentUser = async (): Promise<User | null> => {
  const firebaseUser = await waitForAuth()
  console.log('🔥 Firebase current user:', firebaseUser?.email || 'null')
  
  if (firebaseUser) {
    return getUserData(firebaseUser.uid)
  }
  return null
}