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
  deleteDoc,
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
}

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  displayName: string
  role: 'owner' | 'admin' | 'teacher' | 'superadmin'
  schoolId: string
  isActive: boolean
  isSuperAdmin?: boolean
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

// Register new school and owner
export async function registerSchool(data: RegisterData): Promise<void> {
  let firebaseUser = null;
  let schoolId = null;
  
  try {
    console.log('🚀 Starting registration...');
    console.log('📧 Creating user with email:', data.email);
    
    // 1. Create Firebase Auth user first
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      data.email,
      data.password
    )
    firebaseUser = userCredential.user;
    
    console.log('✅ Firebase user created:', firebaseUser.uid);
    
    // 2. Update display name
    await updateProfile(firebaseUser, {
      displayName: `${data.firstName} ${data.lastName}`
    });
    
    console.log('✅ Display name updated');
    
    // 3. Create unique school ID
    schoolId = `school_${firebaseUser.uid}_${Date.now()}`;
    
    // 4. Create school document
    const schoolData = {
      id: schoolId,
      name: data.schoolName,
      timezone: 'Asia/Bangkok',
      currency: 'THB',
      dateFormat: 'DD/MM/YYYY',
      language: 'th',
      plan: 'free',
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
    };
    
    await setDoc(doc(db, 'schools', schoolId), schoolData);
    
    console.log('✅ School document created:', schoolId);
    
    // 5. Create user document
    const userData = {
      id: firebaseUser.uid,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      displayName: `${data.firstName} ${data.lastName}`,
      role: 'owner' as const,
      schoolId: schoolId,
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    await setDoc(doc(db, 'users', firebaseUser.uid), userData);
    
    console.log('✅ User document created');
    console.log('🎉 Registration completed successfully');
    
  } catch (error: any) {
    console.error('❌ Registration error:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    // Rollback: Delete user if created but error occurred
    if (firebaseUser) {
      try {
        await firebaseUser.delete();
        console.log('🔄 Rolled back Firebase user');
      } catch (deleteError) {
        console.error('Error deleting user:', deleteError);
      }
    }
    
    // Rollback: Delete school document if created
    if (schoolId) {
      try {
        await deleteDoc(doc(db, 'schools', schoolId));
        console.log('🔄 Rolled back school document');
      } catch (deleteError) {
        console.error('Error deleting school:', deleteError);
      }
    }
    
    // Handle specific errors
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('อีเมลนี้ถูกใช้งานแล้ว');
    } else if (error.code === 'auth/weak-password') {
      throw new Error('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('รูปแบบอีเมลไม่ถูกต้อง');
    } else if (error.code === 'auth/network-request-failed') {
      throw new Error('เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาตรวจสอบอินเทอร์เน็ต');
    }
    
    throw new Error(error.message || 'เกิดข้อผิดพลาดในการลงทะเบียน');
  }
}