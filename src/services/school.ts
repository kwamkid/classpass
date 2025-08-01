// src/services/school.ts
import { 
  doc, 
  getDoc, 
  updateDoc, 
  query, 
  where, 
  getDocs,
  collection,
  serverTimestamp 
} from 'firebase/firestore'
import { db } from './firebase'

// Types
export interface School {
  id: string
  subdomain: string
  name: string
  logo?: string
  address?: string
  phone?: string
  email?: string
  lineOA?: string
  website?: string
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
  taxId?: string
  isActive: boolean
  isVerified: boolean
  createdAt: Date
  updatedAt: Date
  lastActiveAt?: Date
}

// Get school by ID
export const getSchoolById = async (schoolId: string): Promise<School | null> => {
  try {
    const schoolDoc = await getDoc(doc(db, 'schools', schoolId))
    
    if (schoolDoc.exists()) {
      const data = schoolDoc.data()
      return {
        id: schoolDoc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        lastActiveAt: data.lastActiveAt?.toDate(),
        planExpiry: data.planExpiry?.toDate()
      } as School
    }
    
    return null
  } catch (error) {
    console.error('Error getting school:', error)
    return null
  }
}

// Get school by subdomain
export const getSchoolBySubdomain = async (subdomain: string): Promise<School | null> => {
  try {
    const schoolsRef = collection(db, 'schools')
    const q = query(schoolsRef, where('subdomain', '==', subdomain))
    const snapshot = await getDocs(q)
    
    if (!snapshot.empty) {
      const doc = snapshot.docs[0]
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        lastActiveAt: data.lastActiveAt?.toDate(),
        planExpiry: data.planExpiry?.toDate()
      } as School
    }
    
    return null
  } catch (error) {
    console.error('Error getting school by subdomain:', error)
    return null
  }
}

// Update school
export const updateSchool = async (
  schoolId: string, 
  data: Partial<School>
): Promise<void> => {
  try {
    const updateData = {
      ...data,
      updatedAt: serverTimestamp()
    }
    
    // Remove fields that shouldn't be updated
    delete updateData.id
    delete updateData.subdomain
    delete updateData.createdAt
    
    await updateDoc(doc(db, 'schools', schoolId), updateData)
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