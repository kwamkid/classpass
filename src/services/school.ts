// src/services/school.ts
import { 
  doc, 
  getDoc, 
  updateDoc,
  collection,
  getDocs,
  query,
  where,
  serverTimestamp 
} from 'firebase/firestore'
import { db } from './firebase'

// Types
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
  plan: 'free' | 'basic' | 'pro' | 'enterprise'
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
  isActive: boolean
  isVerified: boolean
  createdAt: any
  updatedAt: any
  [key: string]: any
}

// Get school by ID
export const getSchoolById = async (schoolId: string): Promise<School | null> => {
  try {
    const schoolDoc = await getDoc(doc(db, 'schools', schoolId))
    
    if (schoolDoc.exists()) {
      return {
        id: schoolDoc.id,
        ...schoolDoc.data()
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
      const schoolDoc = snapshot.docs[0]
      return {
        id: schoolDoc.id,
        ...schoolDoc.data()
      } as School
    }
    
    return null
  } catch (error) {
    console.error('Error getting school by subdomain:', error)
    return null
  }
}

// Update school
export const updateSchool = async (schoolId: string, data: Partial<School>): Promise<void> => {
  try {
    const updateData = {
      ...data,
      updatedAt: serverTimestamp()
    }
    
    await updateDoc(doc(db, 'schools', schoolId), updateData)
  } catch (error) {
    console.error('Error updating school:', error)
    throw error
  }
}

// Check if subdomain is available
export const isSubdomainAvailable = async (subdomain: string): Promise<boolean> => {
  try {
    const school = await getSchoolBySubdomain(subdomain)
    return !school
  } catch (error) {
    console.error('Error checking subdomain availability:', error)
    return false
  }
}

// Get school statistics
export const getSchoolStats = async (schoolId: string) => {
  try {
    // This would typically fetch from multiple collections
    // For now, return basic school info
    const school = await getSchoolById(schoolId)
    
    if (!school) {
      return null
    }
    
    return {
      school,
      stats: {
        totalUsers: 0,
        totalStudents: 0,
        totalCourses: 0,
        activeCredits: 0
      }
    }
  } catch (error) {
    console.error('Error getting school stats:', error)
    return null
  }
}