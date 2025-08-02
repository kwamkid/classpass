// User Types
export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  displayName: string
  profileImage?: string
  phone?: string
  role: 'owner' | 'admin' | 'teacher'
  schoolId: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  lastLogin?: Date
}

// School Types - removed subdomain
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

// Credit Package Types
export interface CreditPackage {
  id: string
  schoolId: string
  courseId: string
  name: string
  description?: string
  code: string
  credits: number
  price: number
  pricePerCredit: number
  validityType: 'months' | 'days' | 'unlimited'
  validityValue?: number
  isPromotion: boolean
  originalPrice?: number
  discountPercent?: number
  bonusCredits: number
  totalCreditsWithBonus: number
  popular: boolean
  recommended: boolean
  displayOrder: number
  color?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// Student Credit Types
export interface StudentCredit {
  id: string
  schoolId: string
  studentId: string
  courseId: string
  packageId: string
  studentName: string // Denormalized
  courseName: string // Denormalized
  packageName: string
  totalCredits: number
  usedCredits: number
  remainingCredits: number
  originalPrice: number
  finalPrice: number
  paymentStatus: 'pending' | 'paid' | 'refunded'
  paymentMethod: 'cash' | 'transfer' | 'credit_card' | 'promptpay'
  hasExpiry: boolean
  purchaseDate: string
  expiryDate?: string
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
  courseId: string
  creditId: string
  studentName: string // Denormalized
  courseName: string // Denormalized
  checkInDate: string
  checkInTime: string
  sessionDate: string
  creditsDeducted: number
  creditsBefore: number
  creditsAfter: number
  status: 'present' | 'absent' | 'late' | 'excused' | 'holiday'
  isLate: boolean
  lateMinutes?: number
  checkedBy: string
  checkedByName: string
  createdAt: Date
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