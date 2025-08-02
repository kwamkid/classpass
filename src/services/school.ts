// src/services/school.ts
import { 
  doc, 
  getDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  serverTimestamp 
} from 'firebase/firestore'
import { db } from './firebase'

// Types - removed subdomain
export interface School {
  id: string
  name: string
  logo?: string
  address?: string
  phone?: string
  email?: string
  lineOA?: string
  website?: string
  taxId?: string
  timezone: string
  currency: string
  dateFormat: string
  language: string
  businessHours?: Record<string, { open: string; close: string }>
  plan: 'free' | 'basic' | 'pro' | 'enterprise'
  planExpiry?: Date | null
  maxStudents: number
  maxTeachers: number
  maxCourses: number
  storageQuota: number
  features: {
    onlinePayment: boolean
    parentApp: boolean
    apiAccess: boolean
    customDomain: boolean
    whiteLabel: boolean
  }
  billingEmail?: string
  isActive: boolean
  isVerified: boolean
  createdAt: Date
  updatedAt: Date
  lastActiveAt?: Date
}

// Get school by ID
export const getSchoolById = async (schoolId: string): Promise<School | null> => {
  try {
    console.log('🏫 Fetching school with ID:', schoolId)
    const schoolDoc = await getDoc(doc(db, 'schools', schoolId))
    
    if (schoolDoc.exists()) {
      const data = schoolDoc.data()
      console.log('✅ School found:', data.name)
      return {
        id: schoolDoc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        lastActiveAt: data.lastActiveAt?.toDate(),
        planExpiry: data.planExpiry?.toDate()
      } as School
    }
    
    console.log('❌ School not found')
    return null
  } catch (error) {
    console.error('Error getting school:', error)
    return null
  }
}

// Update school
export const updateSchool = async (
  schoolId: string, 
  data: Partial<School>
): Promise<void> => {
  try {
    const updateData: any = {
      ...data,
      updatedAt: serverTimestamp()
    }
    
    // Remove fields that shouldn't be updated
    delete updateData.id
    delete updateData.createdAt
    
    // Remove undefined values
    Object.keys(updateData).forEach(key => 
      updateData[key] === undefined && delete updateData[key]
    )
    
    await updateDoc(doc(db, 'schools', schoolId), updateData)
    console.log('✅ School updated successfully')
  } catch (error) {
    console.error('Error updating school:', error)
    throw error
  }
}

// Update school activity
export const updateSchoolActivity = async (schoolId: string): Promise<void> => {
  try {
    await updateDoc(doc(db, 'schools', schoolId), {
      lastActiveAt: serverTimestamp()
    })
  } catch (error) {
    console.error('Error updating school activity:', error)
  }
}

// Get school statistics
export async function getSchoolStats(schoolId: string) {
  try {
    // Get counts from different collections
    const [studentsQuery, coursesQuery, teachersQuery] = await Promise.all([
      getDocs(query(
        collection(db, 'students'),
        where('schoolId', '==', schoolId),
        where('status', '==', 'active')
      )),
      getDocs(query(
        collection(db, 'courses'),
        where('schoolId', '==', schoolId),
        where('status', '==', 'active')
      )),
      getDocs(query(
        collection(db, 'users'),
        where('schoolId', '==', schoolId),
        where('role', 'in', ['admin', 'teacher']),
        where('isActive', '==', true)
      ))
    ])
    
    return {
      activeStudents: studentsQuery.size,
      activeCourses: coursesQuery.size,
      activeTeachers: teachersQuery.size
    }
  } catch (error) {
    console.error('Error getting school stats:', error)
    throw error
  }
}

// Validate school limits
export async function validateSchoolLimits(schoolId: string, type: 'students' | 'teachers' | 'courses'): Promise<boolean> {
  try {
    const school = await getSchoolById(schoolId)
    if (!school) {
      throw new Error('School not found')
    }
    
    const stats = await getSchoolStats(schoolId)
    
    switch (type) {
      case 'students':
        return stats.activeStudents < school.maxStudents
      case 'teachers':
        return stats.activeTeachers < school.maxTeachers
      case 'courses':
        return stats.activeCourses < school.maxCourses
      default:
        return false
    }
  } catch (error) {
    console.error('Error validating school limits:', error)
    throw error
  }
}