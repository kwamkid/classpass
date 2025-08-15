// src/types/models.ts

// User Types
export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  displayName: string
  profileImage?: string
  phone?: string
  role: 'owner' | 'admin' | 'teacher' | 'superadmin'
  schoolId: string
  isActive: boolean
  isSuperAdmin?: boolean
  createdAt: Date
  updatedAt: Date
  lastLogin?: Date
}

// School Types
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

// Student Types
export interface Student {
  id: string
  schoolId: string
  studentCode: string
  firstName: string
  lastName: string
  nickname?: string
  birthDate: string
  age: number
  gender: 'male' | 'female' | 'other'
  currentGrade: string
  profileImage?: string
  phone?: string
  email?: string
  address?: {
    houseNumber: string
    street: string
    subdistrict: string
    district: string
    province: string
    postalCode: string
  }
  parents: Parent[]
  enrolledCourses: EnrolledCourse[]
  status: 'active' | 'inactive' | 'graduated' | 'suspended'
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// Parent Types
export interface Parent {
  id: string
  type: 'father' | 'mother' | 'guardian'
  firstName: string
  lastName: string
  phone: string
  email?: string
  lineId?: string
  occupation?: string
  isPrimaryContact: boolean
  receiveNotifications: boolean
}

// Course Types
export interface Course {
  id: string
  schoolId: string
  code: string
  name: string
  category: 'academic' | 'sport' | 'art' | 'language' | 'other'
  description?: string
  coverImage?: string
  schedule: {
    type: 'weekly' | 'flexible'
    sessions: CourseSession[]
  }
  primaryTeacherId: string
  assistantTeacherIds: string[]
  maxStudentsPerClass: number
  defaultCreditsPerSession: number
  status: 'active' | 'inactive' | 'archived'
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// Course Session
export interface CourseSession {
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
  startTime: string // HH:mm format
  endTime: string // HH:mm format
  room?: string
}

// Enrolled Course
export interface EnrolledCourse {
  courseId: string
  courseName: string
  enrollDate: string
  status: 'active' | 'completed' | 'dropped'
}

// Credit Package Types - Updated for Multi-Course Support
export interface CreditPackage {
  id: string
  schoolId: string
  
  // Backward compatibility - keep these for now
  courseId?: string // Deprecated - for backward compatibility
  courseName?: string // Deprecated - for backward compatibility
  
  // New fields for multi-course support - made optional for backward compatibility
  applicableCourseIds?: string[] // Array of course IDs this package can be used with
  applicableCourseNames?: string[] // Array of course names for display
  isUniversal?: boolean // True if can be used with all courses
  courseCategories?: string[] // Categories for filtering
  courseLevels?: string[] // Grade levels for filtering
  
  name: string
  description?: string
  code: string
  credits: number
  price: number
  pricePerCredit: number
  validityType: 'months' | 'days' | 'unlimited'
  validityValue?: number
  validityDescription?: string
  isPromotion: boolean
  originalPrice?: number
  discountPercent?: number
  bonusCredits: number
  totalCreditsWithBonus: number
  popular: boolean
  recommended: boolean
  displayOrder: number
  color?: string
  status?: 'active' | 'inactive' | 'archived' // Added for compatibility
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// Student Credit Types - Updated for Multi-Course Support
export interface StudentCredit {
  id: string
  schoolId: string
  studentId: string
  
  // Changed from single course to multiple courses
  courseId?: string // Deprecated - for backward compatibility
  courseName?: string // Deprecated - for backward compatibility
  
  // New fields for multi-course support
  applicableCourseIds?: string[] // Array of course IDs this credit can be used with
  applicableCourseNames?: string[] // Array of course names for display
  isUniversal?: boolean // True if can be used with all courses
  
  packageId: string
  studentName: string // Denormalized
  studentCode: string // Denormalized
  packageName: string
  packageCode?: string
  totalCredits: number
  bonusCredits: number
  usedCredits: number
  remainingCredits: number
  originalPrice: number
  discountAmount: number
  finalPrice: number
  pricePerCredit: number
  paymentStatus: 'pending' | 'paid' | 'refunded'
  paymentMethod: 'cash' | 'transfer' | 'credit_card' | 'promptpay'
  paymentReference?: string
  paymentDate?: string
  paymentNote?: string
  hasExpiry: boolean
  purchaseDate: string
  activationDate: string
  expiryDate?: string
  daysUntilExpiry?: number
  status: 'active' | 'expired' | 'depleted' | 'suspended'
  receiptNumber?: string
  createdAt: Date
  updatedAt: Date
}

// Attendance Types
export interface Attendance {
  id: string
  schoolId: string
  studentId: string
  courseId: string // The actual course used for this attendance
  creditId: string
  studentCode: string // Denormalized
  studentName: string // Denormalized
  studentNickname?: string // Denormalized
  courseName: string // The actual course name
  courseCode?: string // Denormalized
  packageName?: string // Which package was used
  checkInDate: string
  checkInTime: string
  checkInMethod: 'manual' | 'qr_code' | 'face_recognition'
  sessionDate: string
  sessionStartTime?: string
  sessionEndTime?: string
  sessionRoom?: string
  creditsDeducted: number
  creditsBefore: number
  creditsAfter: number
  status: 'present' | 'absent' | 'late' | 'excused' | 'holiday'
  isLate: boolean
  lateMinutes?: number
  checkedBy: string
  checkedByName: string
  checkedByRole: string
  teacherNotes?: string
  createdAt: Date
  updatedAt?: Date
}

// Auth Types
export interface LoginCredentials {
  email: string
  password: string
}

// Updated RegisterData without subdomain
export interface RegisterData {
  email: string
  password: string
  firstName: string
  lastName: string
  schoolName: string
}