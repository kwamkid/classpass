// src/services/superadmin.ts
import { 
  collection, 
  doc, 
  getDocs, 
  deleteDoc, 
  query, 
  where,
  writeBatch,
  serverTimestamp,
  addDoc,
  setDoc,
  orderBy,
  limit
} from 'firebase/firestore'
import { 
  createUserWithEmailAndPassword,
  deleteUser,
  updateProfile
} from 'firebase/auth'
import { db, auth } from './firebase'

// Update User interface in auth service
export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  displayName: string
  role: 'owner' | 'admin' | 'teacher' | 'superadmin'
  schoolId: string
  isActive: boolean
  isSuperAdmin?: boolean // เพิ่ม field นี้
  createdAt?: any
  updatedAt?: any
}

// Types
export interface SystemStats {
  totalSchools: number
  totalUsers: number
  totalStudents: number
  totalRevenue: number
  activeSchools: number
  storageUsed: number
}

export interface SchoolWithStats {
  id: string
  name: string
  logo?: string
  plan: string
  isActive: boolean
  createdAt: any
  totalStudents: number
  totalUsers: number
  totalRevenue: number
  lastActiveAt?: any
}

// Get all schools with stats
export async function getAllSchoolsWithStats(): Promise<SchoolWithStats[]> {
  try {
    const schoolsSnapshot = await getDocs(collection(db, 'schools'))
    const schools: SchoolWithStats[] = []
    
    for (const schoolDoc of schoolsSnapshot.docs) {
      const schoolData = schoolDoc.data()
      const schoolId = schoolDoc.id
      
      // Get counts for this school
      const [studentsSnapshot, usersSnapshot, creditsSnapshot] = await Promise.all([
        getDocs(query(
          collection(db, 'students'),
          where('schoolId', '==', schoolId)
        )),
        getDocs(query(
          collection(db, 'users'),
          where('schoolId', '==', schoolId)
        )),
        getDocs(query(
          collection(db, 'student_credits'),
          where('schoolId', '==', schoolId),
          where('paymentStatus', '==', 'paid')
        ))
      ])
      
      // Calculate total revenue
      let totalRevenue = 0
      creditsSnapshot.forEach(doc => {
        totalRevenue += doc.data().finalPrice || 0
      })
      
      schools.push({
        id: schoolId,
        name: schoolData.name,
        logo: schoolData.logo,
        plan: schoolData.plan,
        isActive: schoolData.isActive,
        createdAt: schoolData.createdAt,
        totalStudents: studentsSnapshot.size,
        totalUsers: usersSnapshot.size,
        totalRevenue,
        lastActiveAt: schoolData.lastActiveAt
      })
    }
    
    // Sort by created date descending
    schools.sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0)
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0)
      return dateB.getTime() - dateA.getTime()
    })
    
    return schools
  } catch (error) {
    console.error('Error getting schools with stats:', error)
    throw error
  }
}

// Get system-wide statistics
export async function getSystemStats(): Promise<SystemStats> {
  try {
    const [
      schoolsSnapshot,
      usersSnapshot,
      studentsSnapshot,
      creditsSnapshot
    ] = await Promise.all([
      getDocs(collection(db, 'schools')),
      getDocs(collection(db, 'users')),
      getDocs(collection(db, 'students')),
      getDocs(query(
        collection(db, 'student_credits'),
        where('paymentStatus', '==', 'paid')
      ))
    ])
    
    let totalRevenue = 0
    let activeSchools = 0
    
    schoolsSnapshot.forEach(doc => {
      if (doc.data().isActive) {
        activeSchools++
      }
    })
    
    creditsSnapshot.forEach(doc => {
      totalRevenue += doc.data().finalPrice || 0
    })
    
    return {
      totalSchools: schoolsSnapshot.size,
      totalUsers: usersSnapshot.size,
      totalStudents: studentsSnapshot.size,
      totalRevenue,
      activeSchools,
      storageUsed: 0 // TODO: Calculate from storage
    }
  } catch (error) {
    console.error('Error getting system stats:', error)
    throw error
  }
}

// Delete school and all related data
export async function deleteSchoolCompletely(
  schoolId: string,
  deletedBy: string
): Promise<void> {
  try {
    console.log(`🗑️ Starting complete deletion of school: ${schoolId}`)
    
    // Create a log entry first
    await addDoc(collection(db, 'system_logs'), {
      action: 'school.delete',
      schoolId,
      deletedBy,
      timestamp: serverTimestamp(),
      details: {
        reason: 'Super admin deletion',
        dataDeleted: {
          students: true,
          users: true,
          courses: true,
          packages: true,
          credits: true,
          attendance: true,
          transactions: true,
          notifications: true
        }
      }
    })
    
    // Use batched writes for efficiency (max 500 operations per batch)
    const batch = writeBatch(db)
    let operationCount = 0
    const maxBatchSize = 500
    
    // Helper function to commit batch when needed
    const commitBatchIfNeeded = async () => {
      if (operationCount >= maxBatchSize - 10) { // Leave some buffer
        await batch.commit()
        operationCount = 0
      }
    }
    
    // 1. Delete all students
    console.log('Deleting students...')
    const studentsSnapshot = await getDocs(query(
      collection(db, 'students'),
      where('schoolId', '==', schoolId)
    ))
    
    for (const doc of studentsSnapshot.docs) {
      batch.delete(doc.ref)
      operationCount++
      await commitBatchIfNeeded()
    }
    console.log(`Deleted ${studentsSnapshot.size} students`)
    
    // 2. Delete all courses
    console.log('Deleting courses...')
    const coursesSnapshot = await getDocs(query(
      collection(db, 'courses'),
      where('schoolId', '==', schoolId)
    ))
    
    for (const doc of coursesSnapshot.docs) {
      batch.delete(doc.ref)
      operationCount++
      await commitBatchIfNeeded()
    }
    console.log(`Deleted ${coursesSnapshot.size} courses`)
    
    // 3. Delete all credit packages
    console.log('Deleting credit packages...')
    const packagesSnapshot = await getDocs(query(
      collection(db, 'credit_packages'),
      where('schoolId', '==', schoolId)
    ))
    
    for (const doc of packagesSnapshot.docs) {
      batch.delete(doc.ref)
      operationCount++
      await commitBatchIfNeeded()
    }
    console.log(`Deleted ${packagesSnapshot.size} packages`)
    
    // 4. Delete all student credits
    console.log('Deleting student credits...')
    const creditsSnapshot = await getDocs(query(
      collection(db, 'student_credits'),
      where('schoolId', '==', schoolId)
    ))
    
    for (const doc of creditsSnapshot.docs) {
      batch.delete(doc.ref)
      operationCount++
      await commitBatchIfNeeded()
    }
    console.log(`Deleted ${creditsSnapshot.size} credits`)
    
    // 5. Delete all attendance records
    console.log('Deleting attendance records...')
    const attendanceSnapshot = await getDocs(query(
      collection(db, 'attendance'),
      where('schoolId', '==', schoolId)
    ))
    
    for (const doc of attendanceSnapshot.docs) {
      batch.delete(doc.ref)
      operationCount++
      await commitBatchIfNeeded()
    }
    console.log(`Deleted ${attendanceSnapshot.size} attendance records`)
    
    // 6. Delete all transactions
    console.log('Deleting transactions...')
    const transactionsSnapshot = await getDocs(query(
      collection(db, 'transactions'),
      where('schoolId', '==', schoolId)
    ))
    
    for (const doc of transactionsSnapshot.docs) {
      batch.delete(doc.ref)
      operationCount++
      await commitBatchIfNeeded()
    }
    console.log(`Deleted ${transactionsSnapshot.size} transactions`)
    
    // 7. Delete all notifications
    console.log('Deleting notifications...')
    const notificationsSnapshot = await getDocs(query(
      collection(db, 'notifications'),
      where('schoolId', '==', schoolId)
    ))
    
    for (const doc of notificationsSnapshot.docs) {
      batch.delete(doc.ref)
      operationCount++
      await commitBatchIfNeeded()
    }
    console.log(`Deleted ${notificationsSnapshot.size} notifications`)
    
    // 8. Delete all users (Firestore documents only - Firebase Auth handled separately)
    console.log('Deleting users...')
    const usersSnapshot = await getDocs(query(
      collection(db, 'users'),
      where('schoolId', '==', schoolId)
    ))
    
    for (const doc of usersSnapshot.docs) {
      batch.delete(doc.ref)
      operationCount++
      await commitBatchIfNeeded()
    }
    console.log(`Deleted ${usersSnapshot.size} users`)
    
    // 9. Finally, delete the school itself
    console.log('Deleting school document...')
    batch.delete(doc(db, 'schools', schoolId))
    operationCount++
    
    // Commit any remaining operations
    if (operationCount > 0) {
      await batch.commit()
    }
    
    console.log(`✅ Successfully deleted school ${schoolId} and all related data`)
    
    // Create a completion log
    await addDoc(collection(db, 'system_logs'), {
      action: 'school.delete.completed',
      schoolId,
      deletedBy,
      timestamp: serverTimestamp(),
      details: {
        deletedCounts: {
          students: studentsSnapshot.size,
          users: usersSnapshot.size,
          courses: coursesSnapshot.size,
          packages: packagesSnapshot.size,
          credits: creditsSnapshot.size,
          attendance: attendanceSnapshot.size,
          transactions: transactionsSnapshot.size,
          notifications: notificationsSnapshot.size
        }
      }
    })
    
  } catch (error) {
    console.error('Error deleting school:', error)
    
    // Log the error
    await addDoc(collection(db, 'system_logs'), {
      action: 'school.delete.error',
      schoolId,
      deletedBy,
      timestamp: serverTimestamp(),
      error: error.message || 'Unknown error'
    })
    
    throw error
  }
}

// Create new school with owner account
export async function createSchoolWithOwner(data: {
  schoolName: string
  ownerEmail: string
  ownerPassword: string
  ownerFirstName: string
  ownerLastName: string
  plan?: 'free' | 'basic' | 'pro' | 'enterprise'
}) {
  let firebaseUser = null
  let schoolId = null
  
  try {
    // 1. Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      data.ownerEmail,
      data.ownerPassword
    )
    firebaseUser = userCredential.user
    
    // 2. Update display name
    await updateProfile(firebaseUser, {
      displayName: `${data.ownerFirstName} ${data.ownerLastName}`
    })
    
    // 3. Create school document
    schoolId = `school_${firebaseUser.uid}_${Date.now()}`
    
    await setDoc(doc(db, 'schools', schoolId), {
      id: schoolId,
      name: data.schoolName,
      timezone: 'Asia/Bangkok',
      currency: 'THB',
      dateFormat: 'DD/MM/YYYY',
      language: 'th',
      plan: data.plan || 'free',
      maxStudents: data.plan === 'pro' ? 999999 : data.plan === 'basic' ? 200 : 50,
      maxTeachers: data.plan === 'pro' ? 999999 : data.plan === 'basic' ? 10 : 3,
      maxCourses: data.plan === 'pro' ? 999999 : data.plan === 'basic' ? 20 : 5,
      storageQuota: data.plan === 'pro' ? 20 * 1024 * 1024 * 1024 : 
                    data.plan === 'basic' ? 5 * 1024 * 1024 * 1024 : 
                    1024 * 1024 * 1024,
      features: {
        onlinePayment: data.plan !== 'free',
        parentApp: data.plan === 'pro',
        apiAccess: data.plan === 'pro',
        customDomain: data.plan === 'pro',
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
      email: data.ownerEmail,
      firstName: data.ownerFirstName,
      lastName: data.ownerLastName,
      displayName: `${data.ownerFirstName} ${data.ownerLastName}`,
      role: 'owner',
      schoolId: schoolId,
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
    
    // 5. Log the creation
    await addDoc(collection(db, 'system_logs'), {
      action: 'school.create',
      schoolId,
      createdBy: 'superadmin',
      timestamp: serverTimestamp(),
      details: {
        schoolName: data.schoolName,
        ownerEmail: data.ownerEmail,
        plan: data.plan || 'free'
      }
    })
    
    return {
      schoolId,
      userId: firebaseUser.uid,
      message: 'School created successfully'
    }
    
  } catch (error) {
    // Rollback if error
    if (firebaseUser) {
      try {
        await deleteUser(firebaseUser)
      } catch (e) {
        console.error('Error deleting user:', e)
      }
    }
    
    if (schoolId) {
      try {
        await deleteDoc(doc(db, 'schools', schoolId))
      } catch (e) {
        console.error('Error deleting school:', e)
      }
    }
    
    throw error
  }
}

// Get system logs
export async function getSystemLogs(limitCount: number = 50) {
  try {
    const logsSnapshot = await getDocs(query(
      collection(db, 'system_logs'),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    ))
    
    return logsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Error getting system logs:', error)
    return []
  }
}