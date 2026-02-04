// src/types/database.types.ts
// Database row types matching the Supabase PostgreSQL schema
// These are used internally by services for DB operations
// The app-level types in models.ts remain unchanged

export interface DbSchool {
  id: string
  name: string
  logo: string | null
  address: string | null
  phone: string | null
  email: string | null
  line_oa: string | null
  website: string | null
  tax_id: string | null
  timezone: string
  currency: string
  date_format: string
  language: string
  business_hours: Record<string, any>
  plan: 'free' | 'basic' | 'pro' | 'enterprise'
  plan_expiry: string | null
  max_students: number
  max_teachers: number
  max_courses: number
  storage_quota: number
  features: {
    onlinePayment: boolean
    parentApp: boolean
    apiAccess: boolean
    customDomain: boolean
    whiteLabel: boolean
  }
  billing_email: string | null
  is_active: boolean
  is_verified: boolean
  created_at: string
  updated_at: string
  last_active_at: string | null
}

export interface DbUser {
  id: string
  email: string
  first_name: string
  last_name: string
  display_name: string
  profile_image: string | null
  phone: string | null
  role: 'owner' | 'admin' | 'teacher' | 'superadmin'
  school_id: string | null
  is_active: boolean
  is_super_admin: boolean
  is_deleted: boolean
  created_at: string
  updated_at: string
  last_login: string | null
  deleted_at: string | null
}

export interface DbStudent {
  id: string
  school_id: string
  student_code: string
  first_name: string
  last_name: string
  nickname: string | null
  birth_date: string | null
  age: number | null
  gender: 'male' | 'female' | 'other'
  current_grade: string
  profile_image: string | null
  phone: string | null
  email: string | null
  address: Record<string, any>
  parents: any[]
  enrolled_courses: any[]
  status: 'active' | 'inactive' | 'graduated' | 'suspended'
  is_active: boolean
  is_deleted: boolean
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export interface DbCourse {
  id: string
  school_id: string
  code: string
  name: string
  category: 'academic' | 'sport' | 'art' | 'language' | 'other'
  description: string | null
  cover_image: string | null
  schedule: Record<string, any>
  primary_teacher_id: string | null
  assistant_teacher_ids: string[]
  max_students_per_class: number
  default_credits_per_session: number
  total_enrolled: number
  tags: string[]
  status: 'active' | 'inactive' | 'archived'
  is_active: boolean
  is_deleted: boolean
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export interface DbCreditPackage {
  id: string
  school_id: string
  course_id: string | null
  course_name: string | null
  applicable_course_ids: string[]
  applicable_course_names: string[]
  is_universal: boolean
  course_categories: string[]
  course_levels: string[]
  name: string
  description: string | null
  code: string
  credits: number
  price: number
  price_per_credit: number
  validity_type: 'months' | 'days' | 'unlimited'
  validity_value: number | null
  validity_description: string | null
  is_promotion: boolean
  original_price: number | null
  discount_percent: number | null
  bonus_credits: number
  total_credits_with_bonus: number
  popular: boolean
  recommended: boolean
  color: string | null
  status: 'active' | 'inactive' | 'archived'
  is_active: boolean
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export interface DbStudentCredit {
  id: string
  school_id: string
  student_id: string
  course_id: string | null
  course_name: string | null
  applicable_course_ids: string[]
  applicable_course_names: string[]
  is_universal: boolean
  package_id: string
  student_name: string
  student_code: string
  package_name: string
  package_code: string | null
  total_credits: number
  bonus_credits: number
  used_credits: number
  remaining_credits: number
  original_price: number
  discount_amount: number
  final_price: number
  price_per_credit: number
  payment_status: 'pending' | 'paid' | 'refunded'
  payment_method: 'cash' | 'transfer' | 'credit_card' | 'promptpay'
  payment_reference: string | null
  payment_date: string | null
  payment_note: string | null
  has_expiry: boolean
  purchase_date: string
  activation_date: string
  expiry_date: string | null
  days_until_expiry: number | null
  last_used_date: string | null
  status: 'active' | 'expired' | 'depleted' | 'suspended'
  receipt_number: string | null
  created_at: string
  updated_at: string
}

export interface DbAttendance {
  id: string
  school_id: string
  student_id: string
  course_id: string
  credit_id: string
  student_code: string
  student_name: string
  student_nickname: string | null
  course_name: string
  course_code: string | null
  package_name: string | null
  check_in_date: string
  check_in_time: string
  check_in_method: 'manual' | 'qr_code' | 'face_recognition'
  session_date: string
  session_start_time: string | null
  session_end_time: string | null
  session_room: string | null
  credits_deducted: number
  credits_before: number
  credits_after: number
  status: 'present' | 'absent' | 'late' | 'excused' | 'holiday'
  is_late: boolean
  late_minutes: number
  checked_by: string
  checked_by_name: string
  checked_by_role: string
  teacher_notes: string | null
  created_at: string
  updated_at: string | null
}

// =============================================
// HELPER: Convert snake_case DB rows to camelCase app types
// =============================================

export function dbUserToUser(row: DbUser) {
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    displayName: row.display_name,
    profileImage: row.profile_image,
    phone: row.phone,
    role: row.role,
    schoolId: row.school_id || '',
    isActive: row.is_active,
    isSuperAdmin: row.is_super_admin,
    isDeleted: row.is_deleted,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    lastLogin: row.last_login ? new Date(row.last_login) : undefined,
    deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
  }
}

export function dbSchoolToSchool(row: DbSchool) {
  return {
    id: row.id,
    name: row.name,
    logo: row.logo,
    address: row.address,
    phone: row.phone,
    email: row.email,
    lineOA: row.line_oa,
    website: row.website,
    taxId: row.tax_id,
    timezone: row.timezone,
    currency: row.currency,
    dateFormat: row.date_format,
    language: row.language,
    businessHours: row.business_hours,
    plan: row.plan,
    planExpiry: row.plan_expiry ? new Date(row.plan_expiry) : null,
    maxStudents: row.max_students,
    maxTeachers: row.max_teachers,
    maxCourses: row.max_courses,
    storageQuota: row.storage_quota,
    features: row.features,
    billingEmail: row.billing_email,
    isActive: row.is_active,
    isVerified: row.is_verified,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    lastActiveAt: row.last_active_at ? new Date(row.last_active_at) : undefined,
  }
}

export function dbStudentToStudent(row: DbStudent) {
  return {
    id: row.id,
    schoolId: row.school_id,
    studentCode: row.student_code,
    firstName: row.first_name,
    lastName: row.last_name,
    nickname: row.nickname,
    birthDate: row.birth_date || '',
    age: row.age || 0,
    gender: row.gender,
    currentGrade: row.current_grade,
    profileImage: row.profile_image,
    phone: row.phone,
    email: row.email,
    address: row.address,
    parents: row.parents || [],
    enrolledCourses: row.enrolled_courses || [],
    status: row.status,
    isActive: row.is_active,
    isDeleted: row.is_deleted,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

export function dbCourseToCourse(row: DbCourse) {
  return {
    id: row.id,
    schoolId: row.school_id,
    code: row.code,
    name: row.name,
    category: row.category,
    description: row.description,
    coverImage: row.cover_image,
    schedule: row.schedule,
    primaryTeacherId: row.primary_teacher_id || '',
    assistantTeacherIds: row.assistant_teacher_ids || [],
    maxStudentsPerClass: row.max_students_per_class,
    defaultCreditsPerSession: row.default_credits_per_session,
    totalEnrolled: row.total_enrolled,
    tags: row.tags || [],
    status: row.status,
    isActive: row.is_active,
    isDeleted: row.is_deleted,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

export function dbPackageToPackage(row: DbCreditPackage) {
  return {
    id: row.id,
    schoolId: row.school_id,
    courseId: row.course_id,
    courseName: row.course_name,
    applicableCourseIds: row.applicable_course_ids || [],
    applicableCourseNames: row.applicable_course_names || [],
    isUniversal: row.is_universal,
    courseCategories: row.course_categories || [],
    courseLevels: row.course_levels || [],
    name: row.name,
    description: row.description,
    code: row.code,
    credits: row.credits,
    price: Number(row.price),
    pricePerCredit: Number(row.price_per_credit),
    validityType: row.validity_type,
    validityValue: row.validity_value,
    validityDescription: row.validity_description,
    isPromotion: row.is_promotion,
    originalPrice: row.original_price ? Number(row.original_price) : undefined,
    discountPercent: row.discount_percent ? Number(row.discount_percent) : undefined,
    bonusCredits: row.bonus_credits,
    totalCreditsWithBonus: row.total_credits_with_bonus,
    popular: row.popular,
    recommended: row.recommended,
    color: row.color,
    status: row.status,
    isActive: row.is_active,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

export function dbCreditToCredit(row: DbStudentCredit) {
  return {
    id: row.id,
    schoolId: row.school_id,
    studentId: row.student_id,
    courseId: row.course_id,
    courseName: row.course_name,
    applicableCourseIds: row.applicable_course_ids || [],
    applicableCourseNames: row.applicable_course_names || [],
    isUniversal: row.is_universal,
    packageId: row.package_id,
    studentName: row.student_name,
    studentCode: row.student_code,
    packageName: row.package_name,
    packageCode: row.package_code,
    totalCredits: row.total_credits,
    bonusCredits: row.bonus_credits,
    usedCredits: row.used_credits,
    remainingCredits: row.remaining_credits,
    originalPrice: Number(row.original_price),
    discountAmount: Number(row.discount_amount),
    finalPrice: Number(row.final_price),
    pricePerCredit: Number(row.price_per_credit),
    paymentStatus: row.payment_status,
    paymentMethod: row.payment_method,
    paymentReference: row.payment_reference,
    paymentDate: row.payment_date,
    paymentNote: row.payment_note,
    hasExpiry: row.has_expiry,
    purchaseDate: row.purchase_date,
    activationDate: row.activation_date,
    expiryDate: row.expiry_date,
    daysUntilExpiry: row.days_until_expiry,
    status: row.status,
    receiptNumber: row.receipt_number,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

export function dbAttendanceToAttendance(row: DbAttendance) {
  return {
    id: row.id,
    schoolId: row.school_id,
    studentId: row.student_id,
    courseId: row.course_id,
    creditId: row.credit_id,
    studentCode: row.student_code,
    studentName: row.student_name,
    studentNickname: row.student_nickname,
    courseName: row.course_name,
    courseCode: row.course_code,
    packageName: row.package_name,
    checkInDate: row.check_in_date,
    checkInTime: row.check_in_time,
    checkInMethod: row.check_in_method,
    sessionDate: row.session_date,
    sessionStartTime: row.session_start_time,
    sessionEndTime: row.session_end_time,
    sessionRoom: row.session_room,
    creditsDeducted: row.credits_deducted,
    creditsBefore: row.credits_before,
    creditsAfter: row.credits_after,
    status: row.status,
    isLate: row.is_late,
    lateMinutes: row.late_minutes,
    checkedBy: row.checked_by,
    checkedByName: row.checked_by_name,
    checkedByRole: row.checked_by_role,
    teacherNotes: row.teacher_notes,
    createdAt: new Date(row.created_at),
    updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
  }
}
