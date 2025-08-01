// src/services/auth.ts
import { 
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  updateProfile,
  type User as FirebaseUser
} from 'firebase/auth'
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  updateDoc,
  serverTimestamp 
} from 'firebase/firestore'
import { auth, db } from './firebase'

// Types
export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  firstName: string
  lastName: string
  schoolName: string
  subdomain: string
}

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  displayName: string
  role: 'owner' | 'admin' | 'teacher'
  schoolId: string
  isActive: boolean
  createdAt?: any
  updatedAt?: any
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
  console.log('🔐 Attempting login for:', email)
  
  try {
    // Sign in with Firebase Auth
    const { user: firebaseUser } = await signInWithEmailAndPassword(auth, email, password)
    
    console.log('✅ Firebase auth successful:', firebaseUser.uid)
    
    // Get user data from Firestore
    const userData = await getUserData(firebaseUser.uid)
    
    if (!userData) {
      console.error('❌ User document not found in Firestore')
      throw new Error('ไม่พบข้อมูลผู้ใช้')
    }
    
    console.log('✅ User data retrieved:', userData)
    
    if (!userData.isActive) {
      throw new Error('บัญชีนี้ถูกระงับการใช้งาน')
    }
    
    // Update last login
    await updateDoc(doc(db, 'users', firebaseUser.uid), {
      lastLogin: serverTimestamp()
    })
    
    return userData
  } catch (error: any) {
    console.error('❌ Login error:', error)
    
    // Handle specific Firebase errors
    if (error.code === 'auth/user-not-found') {
      throw new Error('ไม่พบบัญชีผู้ใช้นี้')
    } else if (error.code === 'auth/wrong-password') {
      throw new Error('รหัสผ่านไม่ถูกต้อง')
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('รูปแบบอีเมลไม่ถูกต้อง')
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
    console.log('✅ Logged out successfully')
  } catch (error) {
    console.error('❌ Logout error:', error)
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

// Get current user
export const getCurrentUser = async (): Promise<User | null> => {
  const firebaseUser = await waitForAuth()
  console.log('🔥 Firebase current user:', firebaseUser?.email || 'null')
  
  if (firebaseUser) {
    return getUserData(firebaseUser.uid)
  }
  return null
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

// Check subdomain availability
export async function checkSubdomainAvailability(subdomain: string): Promise<boolean> {
  try {
    const schoolsQuery = query(
      collection(db, 'schools'),
      where('subdomain', '==', subdomain.toLowerCase())
    )
    
    const snapshot = await getDocs(schoolsQuery)
    return snapshot.empty // Return true if subdomain is available
  } catch (error) {
    console.error('Error checking subdomain:', error)
    throw error
  }
}

// Register new school and owner
export async function registerSchool(data: RegisterData): Promise<void> {
  try {
    // 1. Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      data.email,
      data.password
    )
    const firebaseUser = userCredential.user
    
    // 2. Update user profile
    await updateProfile(firebaseUser, {
      displayName: `${data.firstName} ${data.lastName}`
    })
    
    // 3. Create school document
    const schoolId = `school_${Date.now()}`
    await setDoc(doc(db, 'schools', schoolId), {
      id: schoolId,
      subdomain: data.subdomain.toLowerCase(),
      name: data.schoolName,
      timezone: 'Asia/Bangkok',
      currency: 'THB',
      dateFormat: 'DD/MM/YYYY',
      language: 'th',
      plan: 'free',
      planExpiry: null,
      maxStudents: 50,
      maxTeachers: 3,
      maxCourses: 5,
      storageQuota: 1073741824, // 1 GB
      features: {
        onlinePayment: false,
        parentApp: false,
        apiAccess: false,
        customDomain: false,
        whiteLabel: false
      },
      isActive: true,
      isVerified: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
    
    // 4. Create user document
    await setDoc(doc(db, 'users', firebaseUser.uid), {
      id: firebaseUser.uid,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      displayName: `${data.firstName} ${data.lastName}`,
      role: 'owner',
      schoolId: schoolId,
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
    
    console.log('✅ School and owner created successfully')
  } catch (error: any) {
    console.error('❌ Registration error:', error)
    
    // Clean up if something went wrong
    if (auth.currentUser) {
      try {
        await auth.currentUser.delete()
      } catch (deleteError) {
        console.error('Error deleting user after failed registration:', deleteError)
      }
    }
    
    // Handle specific errors
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('อีเมลนี้ถูกใช้งานแล้ว')
    } else if (error.code === 'auth/weak-password') {
      throw new Error('รหัสผ่านไม่ปลอดภัย')
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('รูปแบบอีเมลไม่ถูกต้อง')
    }
    
    throw error
  }
}