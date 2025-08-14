// src/services/student.ts
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
  limit,
  serverTimestamp
} from 'firebase/firestore'
import { db } from './firebase'

// Types
export interface Student {
  id: string
  schoolId: string
  studentCode: string
  firstName: string
  lastName: string
  nickname?: string
  birthDate?: string
  age?: number
  gender: 'male' | 'female' | 'other'
  currentGrade: string
  profileImage?: string
  phone?: string
  email?: string
  status: 'active' | 'inactive' | 'graduated' | 'suspended'
  isActive: boolean
  isDeleted?: boolean
  parents?: Parent[]
  address?: Address
  createdAt: Date
  updatedAt: Date
  [key: string]: any
}

export interface Parent {
  id?: string
  type: 'father' | 'mother' | 'guardian'
  firstName: string
  lastName: string
  phone: string
  email?: string
  isPrimaryContact?: boolean
}

export interface Address {
  houseNumber: string
  street: string
  subdistrict: string
  district: string
  province: string
  postalCode: string
}

export interface CreateStudentData {
  firstName: string
  lastName: string
  nickname?: string
  birthDate?: string
  gender: 'male' | 'female' | 'other'
  currentGrade: string
  phone?: string
  email?: string
  parentName?: string
  parentPhone?: string
  parentEmail?: string
}

const calculateAge = (birthDate?: string): number | undefined => {
  if (!birthDate) return undefined
  
  try {
    const today = new Date()
    const birth = new Date(birthDate)
    
    // ตรวจสอบว่าวันที่ valid หรือไม่
    if (isNaN(birth.getTime())) {
      return undefined
    }
    
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    
    return age
  } catch (error) {
    console.error('Error calculating age:', error)
    return undefined
  }
}

// Generate student code
const generateStudentCode = async (schoolId: string): Promise<string> => {
  const year = new Date().getFullYear()
  
  // Get the latest student code
  const studentsRef = collection(db, 'students')
  const q = query(
    studentsRef,
    where('schoolId', '==', schoolId),
    orderBy('studentCode', 'desc'),
    limit(1)
  )
  
  const snapshot = await getDocs(q)
  let nextNumber = 1
  
  if (!snapshot.empty) {
    const lastCode = snapshot.docs[0].data().studentCode
    const lastNumber = parseInt(lastCode.slice(-3))
    if (!isNaN(lastNumber)) {
      nextNumber = lastNumber + 1
    }
  }
  
  return `STD${year}${nextNumber.toString().padStart(3, '0')}`
}

// Get all students for a school
export const getStudents = async (schoolId: string, status?: string): Promise<Student[]> => {
  try {
    const studentsRef = collection(db, 'students')
    let q
    
    // Simple query without compound index requirement
    if (status) {
      q = query(
        studentsRef,
        where('schoolId', '==', schoolId),
        where('status', '==', status),
        orderBy('createdAt', 'desc')
      )
    } else {
      q = query(
        studentsRef,
        where('schoolId', '==', schoolId),
        orderBy('createdAt', 'desc')
      )
    }
    
    const snapshot = await getDocs(q)
    
    // Filter out deleted students on client side
    const students: Student[] = []
    snapshot.docs.forEach(doc => {
      const data = doc.data() as any
      const student: Student = {
        id: doc.id,
        schoolId: data.schoolId,
        studentCode: data.studentCode,
        firstName: data.firstName,
        lastName: data.lastName,
        nickname: data.nickname,
        birthDate: data.birthDate,
        age: data.age,
        gender: data.gender,
        currentGrade: data.currentGrade,
        profileImage: data.profileImage,
        phone: data.phone,
        email: data.email,
        status: data.status,
        isActive: data.isActive,
        isDeleted: data.isDeleted,
        parents: data.parents,
        address: data.address,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      }
      
      // Only include if not deleted
      if (!student.isDeleted) {
        students.push(student)
      }
    })
    
    return students
  } catch (error) {
    console.error('Error getting students:', error)
    return []
  }
}

// Get single student
export const getStudent = async (studentId: string): Promise<Student | null> => {
  try {
    const studentDoc = await getDoc(doc(db, 'students', studentId))
    
    if (studentDoc.exists()) {
      const data = studentDoc.data() as any
      return {
        id: studentDoc.id,
        schoolId: data.schoolId,
        studentCode: data.studentCode,
        firstName: data.firstName,
        lastName: data.lastName,
        nickname: data.nickname,
        birthDate: data.birthDate,
        age: data.age,
        gender: data.gender,
        currentGrade: data.currentGrade,
        profileImage: data.profileImage,
        phone: data.phone,
        email: data.email,
        status: data.status,
        isActive: data.isActive,
        isDeleted: data.isDeleted,
        parents: data.parents,
        address: data.address,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      }
    }
    
    return null
  } catch (error) {
    console.error('Error getting student:', error)
    return null
  }
}

// Create new student
// แก้ไขฟังก์ชัน createStudent
export const createStudent = async (
  schoolId: string, 
  data: CreateStudentData
): Promise<Student> => {
  try {
    // Generate student code
    const studentCode = await generateStudentCode(schoolId)
    
    // Calculate age - ถ้าไม่มีวันเกิดจะไม่ใส่ field age เลย
    const age = data.birthDate ? calculateAge(data.birthDate) : null
    
    // Prepare student data
    const studentData: any = {
      schoolId,
      studentCode,
      firstName: data.firstName,
      lastName: data.lastName,
      nickname: data.nickname || '',
      birthDate: data.birthDate || '',
      gender: data.gender,
      currentGrade: data.currentGrade,
      phone: data.phone || '',
      email: data.email || '',
      status: 'active' as const,
      isActive: true,
      isDeleted: false,
      parents: data.parentName ? [{
        type: 'mother' as const,
        firstName: data.parentName.split(' ')[0] || '',
        lastName: data.parentName.split(' ').slice(1).join(' ') || '',
        phone: data.parentPhone || '',
        email: data.parentEmail || '',
        isPrimaryContact: true
      }] : [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }
    
    // เพิ่ม age เฉพาะเมื่อมีค่า (ไม่ใช่ null หรือ undefined)
    if (age !== null && age !== undefined) {
      studentData.age = age
    }
    
    // Create student document
    const docRef = await addDoc(collection(db, 'students'), studentData)
    
    // Return created student
    return {
      id: docRef.id,
      ...studentData,
      createdAt: new Date(),
      updatedAt: new Date()
    } as Student
  } catch (error) {
    console.error('Error creating student:', error)
    throw error
  }
}

// Update student
// แก้ไขฟังก์ชัน updateStudent ให้สมบูรณ์
export const updateStudent = async (
  studentId: string,
  data: Partial<Student>
): Promise<void> => {
  try {
    // สร้าง updateData object ใหม่
    const updateData: any = {
      updatedAt: serverTimestamp()
    }
    
    // Copy only defined values from data
    Object.keys(data).forEach(key => {
      const value = (data as any)[key]
      // ข้ามค่า undefined และ field ที่ไม่ควรอัพเดท
      if (value !== undefined && 
          key !== 'id' && 
          key !== 'schoolId' && 
          key !== 'studentCode' && 
          key !== 'createdAt' &&
          key !== 'updatedAt') {
        updateData[key] = value
      }
    })
    
    // Handle age field specially
    if ('birthDate' in data) {
      if (data.birthDate && data.birthDate !== '') {
        // คำนวณอายุถ้ามีวันเกิด
        const age = calculateAge(data.birthDate)
        if (age !== null && age !== undefined) {
          updateData.age = age
        } else {
          // ถ้าคำนวณไม่ได้ให้ set เป็น null (ไม่ใช่ undefined)
          updateData.age = null
        }
      } else {
        // ถ้าไม่มีวันเกิด ให้ set age เป็น null
        updateData.age = null
      }
    }
    
    // Handle parents array - make sure no undefined values
    if (updateData.parents && Array.isArray(updateData.parents)) {
      updateData.parents = updateData.parents.map((parent: any) => {
        const cleanParent: any = {}
        Object.keys(parent).forEach(key => {
          if (parent[key] !== undefined) {
            cleanParent[key] = parent[key] === '' ? '' : parent[key]
          }
        })
        return cleanParent
      })
    }
    
    // Handle address object - make sure no undefined values
    if (updateData.address && typeof updateData.address === 'object') {
      const cleanAddress: any = {}
      Object.keys(updateData.address).forEach(key => {
        const value = updateData.address[key]
        if (value !== undefined) {
          cleanAddress[key] = value === '' ? '' : value
        }
      })
      updateData.address = cleanAddress
    }
    
    // Final cleanup - remove any remaining undefined values
    const cleanData: any = {}
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        cleanData[key] = updateData[key]
      }
    })
    
    console.log('Updating student with clean data:', cleanData)
    
    await updateDoc(doc(db, 'students', studentId), cleanData)
  } catch (error) {
    console.error('Error updating student:', error)
    throw error
  }
}

// Search students
export const searchStudents = async (
  schoolId: string,
  searchTerm: string
): Promise<Student[]> => {
  try {
    // In a real app, you'd use a search service like Algolia
    // For now, we'll get all students and filter client-side
    const allStudents = await getStudents(schoolId)
    
    const lowerSearch = searchTerm.toLowerCase()
    
    return allStudents.filter(student => 
      student.firstName.toLowerCase().includes(lowerSearch) ||
      student.lastName.toLowerCase().includes(lowerSearch) ||
      student.nickname?.toLowerCase().includes(lowerSearch) ||
      student.studentCode.toLowerCase().includes(lowerSearch)
    )
  } catch (error) {
    console.error('Error searching students:', error)
    return []
  }
}

// Soft delete student
export const deleteStudent = async (studentId: string): Promise<void> => {
  try {
    await updateDoc(doc(db, 'students', studentId), {
      status: 'inactive',
      isActive: false,
      isDeleted: true,
      deletedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
  } catch (error) {
    console.error('Error deleting student:', error)
    throw error
  }
}