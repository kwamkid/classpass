// src/services/course.ts
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
  Timestamp
} from 'firebase/firestore'
import { db } from './firebase'

// Types
export interface Course {
  id: string
  schoolId: string
  code: string // Auto-generated
  name: string
  category: 'academic' | 'sport' | 'art' | 'language' | 'other'
  description?: string
  coverImage?: string
  status: 'active' | 'inactive' | 'archived'
  totalEnrolled: number
  tags?: string[]  // <-- เพิ่มบรรทัดนี้
  isActive: boolean
  isDeleted?: boolean
  createdAt: Date
  updatedAt: Date
}

export interface CreateCourseData {
  name: string
  category: 'academic' | 'sport' | 'art' | 'language' | 'other'
  description?: string
}

// Generate course code
const generateCourseCode = async (schoolId: string, category: string): Promise<string> => {
  const prefix = category.substring(0, 3).toUpperCase()
  const year = new Date().getFullYear().toString().slice(-2)
  
  // Get the latest course code
  const coursesRef = collection(db, 'courses')
  const q = query(
    coursesRef,
    where('schoolId', '==', schoolId),
    where('code', '>=', `${prefix}${year}`),
    where('code', '<', `${prefix}${parseInt(year) + 1}`),
    orderBy('code', 'desc')
  )
  
  const snapshot = await getDocs(q)
  let nextNumber = 1
  
  if (!snapshot.empty) {
    const lastCode = snapshot.docs[0].data().code
    const lastNumber = parseInt(lastCode.slice(-3))
    if (!isNaN(lastNumber)) {
      nextNumber = lastNumber + 1
    }
  }
  
  return `${prefix}${year}${nextNumber.toString().padStart(3, '0')}`
}

// Get all courses for a school
export const getCourses = async (schoolId: string, status?: string): Promise<Course[]> => {
  try {
    const coursesRef = collection(db, 'courses')
    let q
    
    if (status) {
      q = query(
        coursesRef,
        where('schoolId', '==', schoolId),
        where('status', '==', status),
        orderBy('name')
      )
    } else {
      q = query(
        coursesRef,
        where('schoolId', '==', schoolId),
        orderBy('name')
      )
    }
    
    const snapshot = await getDocs(q)
    
    // Filter out deleted courses on client side
    const courses: Course[] = []
    snapshot.docs.forEach(doc => {
      const data = doc.data() as any
      const course: Course = {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      }
      
      // Only include if not deleted
      if (!course.isDeleted) {
        courses.push(course)
      }
    })
    
    return courses
  } catch (error) {
    console.error('Error getting courses:', error)
    return []
  }
}

// Get single course
export const getCourse = async (courseId: string): Promise<Course | null> => {
  try {
    const courseDoc = await getDoc(doc(db, 'courses', courseId))
    
    if (courseDoc.exists()) {
      const data = courseDoc.data()
      return {
        id: courseDoc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as Course
    }
    
    return null
  } catch (error) {
    console.error('Error getting course:', error)
    return null
  }
}

// Create new course
export const createCourse = async (
  schoolId: string, 
  data: CreateCourseData
): Promise<Course> => {
  try {
    // Generate course code automatically
    const courseCode = await generateCourseCode(schoolId, data.category)
    
    // Prepare course data
    const courseData = {
      schoolId,
      code: courseCode,
      name: data.name,
      category: data.category,
      description: data.description || '',
      status: 'active' as const,
      totalEnrolled: 0,
      isActive: true,
      isDeleted: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }
    
    // Create course document
    const docRef = await addDoc(collection(db, 'courses'), courseData)
    
    // Return created course
    return {
      id: docRef.id,
      ...courseData,
      createdAt: new Date(),
      updatedAt: new Date()
    } as Course
  } catch (error) {
    console.error('Error creating course:', error)
    throw error
  }
}

// Update course
export const updateCourse = async (
  courseId: string,
  data: Partial<Course>
): Promise<void> => {
  try {
    const updateData = {
      ...data,
      updatedAt: serverTimestamp()
    }
    
    // Remove fields that shouldn't be updated
    delete updateData.id
    delete updateData.schoolId
    delete updateData.code
    delete updateData.createdAt
    delete updateData.totalEnrolled
    
    await updateDoc(doc(db, 'courses', courseId), updateData)
  } catch (error) {
    console.error('Error updating course:', error)
    throw error
  }
}

// Soft delete course
export const deleteCourse = async (courseId: string): Promise<void> => {
  try {
    await updateDoc(doc(db, 'courses', courseId), {
      status: 'archived',
      isActive: false,
      isDeleted: true,
      deletedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
  } catch (error) {
    console.error('Error deleting course:', error)
    throw error
  }
}

// Search courses
export const searchCourses = async (
  schoolId: string,
  searchTerm: string
): Promise<Course[]> => {
  try {
    // Get all courses and filter client-side
    const allCourses = await getCourses(schoolId)
    
    const lowerSearch = searchTerm.toLowerCase()
    
    return allCourses.filter(course => 
      course.name.toLowerCase().includes(lowerSearch) ||
      course.code.toLowerCase().includes(lowerSearch) ||
      course.description?.toLowerCase().includes(lowerSearch) ||
      course.tags?.some((tag: any) => tag.toLowerCase().includes(lowerSearch))
    )
  } catch (error) {
    console.error('Error searching courses:', error)
    return []
  }
}