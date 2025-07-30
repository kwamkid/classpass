import { doc, getDoc } from 'firebase/firestore'
import { db } from './firebase'

// Types
interface School {
  id: string
  name: string
  subdomain: string
  logo?: string
  address?: string
  phone?: string
  email?: string
  plan: 'free' | 'basic' | 'pro' | 'enterprise'
  isActive: boolean
  [key: string]: any
}

// Get school data by ID
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
    // In real app, you would query by subdomain
    // For now, we'll use the test school
    if (subdomain === 'test' || subdomain === 'localhost') {
      return getSchoolById('test-school')
    }
    
    return null
  } catch (error) {
    console.error('Error getting school by subdomain:', error)
    return null
  }
}