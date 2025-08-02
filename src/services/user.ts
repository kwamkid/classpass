// src/services/user.ts
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy,
  serverTimestamp,
  setDoc,
  runTransaction,
  deleteDoc
} from 'firebase/firestore'
import { 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  deleteUser as deleteAuthUser,
  signOut,
  signInWithEmailAndPassword
} from 'firebase/auth'
import { db, auth } from './firebase'

// Types
export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  displayName: string
  role: 'owner' | 'admin' | 'teacher'
  schoolId: string
  phone?: string
  profileImage?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  lastLogin?: Date
}

export interface CreateUserData {
  email: string
  password: string
  firstName: string
  lastName: string
  role: 'admin' | 'teacher'
  phone?: string
}

export interface UpdateUserData {
  firstName?: string
  lastName?: string
  phone?: string
  role?: 'admin' | 'teacher'
  isActive?: boolean
}

// Get all users for a school
export const getUsers = async (schoolId: string): Promise<User[]> => {
  try {
    const usersRef = collection(db, 'users')
    const q = query(
      usersRef,
      where('schoolId', '==', schoolId),
      orderBy('createdAt', 'desc')
    )
    
    const snapshot = await getDocs(q)
    
    const users: User[] = []
    snapshot.docs.forEach(doc => {
      const data = doc.data() as any
      users.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        lastLogin: data.lastLogin?.toDate()
      })
    })
    
    return users
  } catch (error) {
    console.error('Error getting users:', error)
    return []
  }
}

// Get single user
export const getUser = async (userId: string): Promise<User | null> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId))
    
    if (userDoc.exists()) {
      const data = userDoc.data()
      return {
        id: userDoc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        lastLogin: data.lastLogin?.toDate()
      } as User
    }
    
    return null
  } catch (error) {
    console.error('Error getting user:', error)
    return null
  }
}

// Create new user with Firebase Auth
export const createUser = async (
  schoolId: string,
  currentUserId: string,
  data: CreateUserData
): Promise<User> => {
  let firebaseUser = null
  
  try {
    console.log('Creating user with email:', data.email)
    
    // Get current user info before creating new user
    const currentUser = auth.currentUser
    const currentUserDoc = await getDoc(doc(db, 'users', currentUserId))
    const currentUserData = currentUserDoc.data()
    
    // 1. Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      data.email,
      data.password
    )
    firebaseUser = userCredential.user
    
    console.log('Firebase Auth user created:', firebaseUser.uid)
    
    // 2. Update display name
    await updateProfile(firebaseUser, {
      displayName: `${data.firstName} ${data.lastName}`
    })
    
    // 3. Create user document in Firestore
    const userData = {
      id: firebaseUser.uid,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      displayName: `${data.firstName} ${data.lastName}`,
      role: data.role,
      schoolId: schoolId,
      phone: data.phone || '',
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: currentUserId
    }
    
    await setDoc(doc(db, 'users', firebaseUser.uid), userData)
    
    console.log('User document created in Firestore')
    
    // 4. Sign back in as the original user
    if (currentUser && currentUserData) {
      // Need to sign out first
      await signOut(auth)
      
      // Sign back in as original user - but we don't have their password
      // So we'll need to handle this differently
      console.log('Note: Admin will need to refresh to re-authenticate')
    }
    
    // Return created user
    return {
      id: firebaseUser.uid,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      displayName: `${data.firstName} ${data.lastName}`,
      role: data.role,
      schoolId: schoolId,
      phone: data.phone || '',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
  } catch (error: any) {
    console.error('Error creating user:', error)
    
    // Rollback: Delete Firebase Auth user if created
    if (firebaseUser) {
      try {
        await deleteAuthUser(firebaseUser)
        console.log('Rolled back Firebase Auth user')
      } catch (deleteError) {
        console.error('Error deleting auth user:', deleteError)
      }
    }
    
    // Handle specific errors
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('อีเมลนี้ถูกใช้งานแล้ว')
    } else if (error.code === 'auth/weak-password') {
      throw new Error('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร')
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('รูปแบบอีเมลไม่ถูกต้อง')
    }
    
    throw new Error(error.message || 'เกิดข้อผิดพลาดในการสร้างผู้ใช้')
  }
}

// Update user
export const updateUser = async (
  userId: string,
  data: UpdateUserData
): Promise<void> => {
  try {
    const updateData: any = {
      ...data,
      updatedAt: serverTimestamp()
    }
    
    // Update display name if name changed
    if (data.firstName || data.lastName) {
      const userDoc = await getDoc(doc(db, 'users', userId))
      if (userDoc.exists()) {
        const currentData = userDoc.data()
        const firstName = data.firstName || currentData.firstName
        const lastName = data.lastName || currentData.lastName
        updateData.displayName = `${firstName} ${lastName}`
      }
    }
    
    await updateDoc(doc(db, 'users', userId), updateData)
  } catch (error) {
    console.error('Error updating user:', error)
    throw error
  }
}

// Toggle user active status
export const toggleUserStatus = async (userId: string): Promise<void> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId))
    if (userDoc.exists()) {
      const currentStatus = userDoc.data().isActive
      await updateDoc(doc(db, 'users', userId), {
        isActive: !currentStatus,
        updatedAt: serverTimestamp()
      })
    }
  } catch (error) {
    console.error('Error toggling user status:', error)
    throw error
  }
}

// Send password reset email
export const sendPasswordReset = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email)
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      throw new Error('ไม่พบผู้ใช้ที่ใช้อีเมลนี้')
    }
    throw error
  }
}

// Delete user (soft delete)
export const deleteUser = async (userId: string): Promise<void> => {
  try {
    await updateDoc(doc(db, 'users', userId), {
      isActive: false,
      isDeleted: true,
      deletedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
  } catch (error) {
    console.error('Error deleting user:', error)
    throw error
  }
}

// Check if email exists
export const checkEmailExists = async (email: string): Promise<boolean> => {
  try {
    const usersRef = collection(db, 'users')
    const q = query(usersRef, where('email', '==', email))
    const snapshot = await getDocs(q)
    return !snapshot.empty
  } catch (error) {
    console.error('Error checking email:', error)
    return false
  }
}

// Get user statistics
export const getUserStats = async (schoolId: string) => {
  try {
    const usersRef = collection(db, 'users')
    const q = query(
      usersRef,
      where('schoolId', '==', schoolId)
    )
    
    const snapshot = await getDocs(q)
    
    let stats = {
      total: 0,
      active: 0,
      inactive: 0,
      byRole: {
        owner: 0,
        admin: 0,
        teacher: 0
      }
    }
    
    snapshot.docs.forEach(doc => {
      const data = doc.data()
      stats.total++
      
      if (data.isActive) {
        stats.active++
      } else {
        stats.inactive++
      }
      
      if (data.role && stats.byRole[data.role as keyof typeof stats.byRole] !== undefined) {
        stats.byRole[data.role as keyof typeof stats.byRole]++
      }
    })
    
    return stats
  } catch (error) {
    console.error('Error getting user stats:', error)
    return {
      total: 0,
      active: 0,
      inactive: 0,
      byRole: {
        owner: 0,
        admin: 0,
        teacher: 0
      }
    }
  }
}