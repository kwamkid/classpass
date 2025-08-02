// src/scripts/seedDemoAccounts.ts
import { 
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth'
import { 
  doc, 
  setDoc, 
  serverTimestamp,
  collection,
  addDoc,
  getDoc,
  getDocs,
  query,
  where
} from 'firebase/firestore'
import { auth, db } from '../services/firebase'

// Demo account credentials
const DEMO_ACCOUNTS = {
  owner: {
    email: 'demo@owner.com',
    password: 'demo1234',
    firstName: 'สมชาย',
    lastName: 'เจ้าของ',
    role: 'owner' as const
  },
  admin: {
    email: 'demo@admin.com', 
    password: 'demo1234',
    firstName: 'สมหญิง',
    lastName: 'ผู้ดูแล',
    role: 'admin' as const
  },
  teacher: {
    email: 'demo@teacher.com',
    password: 'demo1234', 
    firstName: 'สมศรี',
    lastName: 'ครูผู้สอน',
    role: 'teacher' as const
  }
}

// Seed function
export async function seedDemoAccounts() {
  console.log('🌱 Starting demo accounts seed...')
  
  let schoolId: string | null = null
  const createdUsers: string[] = []
  
  try {
    // 1. Create demo school first
    console.log('📚 Creating demo school...')
    schoolId = `school_demo_${Date.now()}`
    
    await setDoc(doc(db, 'schools', schoolId), {
      id: schoolId,
      name: 'โรงเรียนสาธิต ClassPass',
      logo: '/demo-school-logo.jpg',
      address: '123 ถ.สุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110',
      phone: '021234567',
      email: 'demo@classpass.school',
      lineOA: '@classpass_demo',
      website: 'www.classpass-demo.com',
      timezone: 'Asia/Bangkok',
      currency: 'THB',
      dateFormat: 'DD/MM/YYYY',
      language: 'th',
      businessHours: {
        monday: { open: '08:00', close: '18:00' },
        tuesday: { open: '08:00', close: '18:00' },
        wednesday: { open: '08:00', close: '18:00' },
        thursday: { open: '08:00', close: '18:00' },
        friday: { open: '08:00', close: '18:00' },
        saturday: { open: '09:00', close: '16:00' },
        sunday: { open: '09:00', close: '16:00' }
      },
      plan: 'pro',
      maxStudents: 999999,
      maxTeachers: 999999,
      maxCourses: 999999,
      storageQuota: 20 * 1024 * 1024 * 1024, // 20 GB
      features: {
        onlinePayment: true,
        parentApp: true,
        apiAccess: true,
        customDomain: true,
        whiteLabel: false
      },
      isActive: true,
      isVerified: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
    
    console.log('✅ Demo school created:', schoolId)
    
    // 2. Create user accounts
    for (const [key, userData] of Object.entries(DEMO_ACCOUNTS)) {
      console.log(`👤 Creating ${key} account...`)
      
      try {
        // Create Firebase Auth user
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          userData.email,
          userData.password
        )
        
        const firebaseUser = userCredential.user
        createdUsers.push(firebaseUser.uid)
        
        // Update display name
        await updateProfile(firebaseUser, {
          displayName: `${userData.firstName} ${userData.lastName}`
        })
        
        // Create user document in Firestore
        await setDoc(doc(db, 'users', firebaseUser.uid), {
          id: firebaseUser.uid,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          displayName: `${userData.firstName} ${userData.lastName}`,
          role: userData.role,
          schoolId: schoolId,
          phone: '0812345678',
          profileImage: `/demo-${key}-avatar.jpg`,
          isActive: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        })
        
        console.log(`✅ ${key} account created: ${userData.email}`)
        
        // Sign out after creating each user
        await signOut(auth)
        
      } catch (error: any) {
        if (error.code === 'auth/email-already-in-use') {
          console.log(`⚠️ ${key} account already exists: ${userData.email}`)
        } else {
          throw error
        }
      }
    }
    
    // 3. Create demo courses
    console.log('📚 Creating demo courses...')
    const courses = [
      {
        name: 'คณิตศาสตร์ ม.1',
        category: 'academic',
        code: 'MATH101',
        description: 'เรียนคณิตศาสตร์พื้นฐาน ม.1 เน้นพีชคณิตและเรขาคณิต'
      },
      {
        name: 'ภาษาอังกฤษพื้นฐาน',
        category: 'language',
        code: 'ENG101',
        description: 'เรียนภาษาอังกฤษเบื้องต้น ฟัง พูด อ่าน เขียน'
      },
      {
        name: 'กีตาร์เบื้องต้น',
        category: 'art',
        code: 'MUS101',
        description: 'เรียนกีตาร์สำหรับผู้เริ่มต้น คอร์ดพื้นฐาน'
      }
    ]
    
    const courseIds: string[] = []
    
    for (const courseData of courses) {
      const courseRef = await addDoc(collection(db, 'courses'), {
        schoolId,
        ...courseData,
        status: 'active',
        totalEnrolled: 0,
        isActive: true,
        isDeleted: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
      courseIds.push(courseRef.id)
      console.log(`✅ Course created: ${courseData.name}`)
    }
    
    // 4. Create demo packages
    console.log('💳 Creating demo packages...')
    for (let i = 0; i < courseIds.length; i++) {
      const packages = [
        {
          courseId: courseIds[i],
          name: 'แพ็คเกจทดลอง',
          description: 'เหมาะสำหรับทดลองเรียน',
          code: `PKG${Date.now()}${Math.random().toString(36).substr(2, 4)}`,
          credits: 4,
          price: 800,
          validityType: 'months' as const,
          validityValue: 1,
          validityDescription: 'ใช้ได้ 1 เดือน',
          popular: false,
          recommended: false,
          displayOrder: 1
        },
        {
          courseId: courseIds[i],
          name: 'แพ็คเกจประหยัด',
          description: 'เหมาะสำหรับเรียนระยะกลาง',
          code: `PKG${Date.now()}${Math.random().toString(36).substr(2, 4)}`,
          credits: 8,
          price: 1400,
          validityType: 'months' as const,
          validityValue: 2,
          validityDescription: 'ใช้ได้ 2 เดือน',
          popular: true,
          recommended: false,
          displayOrder: 2
        },
        {
          courseId: courseIds[i],
          name: 'แพ็คเกจคุ้มค่า',
          description: 'เหมาะสำหรับเรียนระยะยาว',
          code: `PKG${Date.now()}${Math.random().toString(36).substr(2, 4)}`,
          credits: 16,
          price: 2500,
          validityType: 'months' as const,
          validityValue: 3,
          validityDescription: 'ใช้ได้ 3 เดือน',
          popular: false,
          recommended: true,
          displayOrder: 3
        }
      ]
      
      for (const pkg of packages) {
        await addDoc(collection(db, 'credit_packages'), {
          schoolId,
          ...pkg,
          pricePerCredit: pkg.price / pkg.credits,
          totalCreditsWithBonus: pkg.credits,
          bonusCredits: 0,
          status: 'active',
          isActive: true,
          isDeleted: false,
          color: '#f97316',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        })
      }
    }
    console.log('✅ Packages created')
    
    // 5. Create demo students
    console.log('👨‍🎓 Creating demo students...')
    const students = [
      {
        firstName: 'นภัส',
        lastName: 'ใจดี',
        nickname: 'น้องนภัส',
        gender: 'female' as const,
        birthDate: '2010-05-15',
        currentGrade: 'ม.1',
        phone: '0891234567',
        parentName: 'คุณสมศรี ใจดี',
        parentPhone: '0892345678'
      },
      {
        firstName: 'ธนกร',
        lastName: 'รักเรียน',
        nickname: 'น้องบอส',
        gender: 'male' as const,
        birthDate: '2011-08-20',
        currentGrade: 'ป.6',
        phone: '0893456789',
        parentName: 'คุณวิชัย รักเรียน',
        parentPhone: '0894567890'
      },
      {
        firstName: 'ปภาวี',
        lastName: 'ตั้งใจ',
        nickname: 'น้องปาย',
        gender: 'female' as const,
        birthDate: '2009-12-10',
        currentGrade: 'ม.2',
        phone: '0895678901',
        parentName: 'คุณพรทิพย์ ตั้งใจ',
        parentPhone: '0896789012'
      }
    ]
    
    const studentIds: string[] = []
    
    for (let i = 0; i < students.length; i++) {
      const studentData = students[i]
      const studentCode = `STD2024${String(i + 1).padStart(3, '0')}`
      
      // Calculate age
      const birthYear = new Date(studentData.birthDate).getFullYear()
      const currentYear = new Date().getFullYear()
      const age = currentYear - birthYear
      
      // Parse parent name safely
      const parentNameParts = studentData.parentName.split(' ')
      const parentFirstName = parentNameParts[1] || 'ไม่ระบุ'
      const parentLastName = parentNameParts[2] || 'ไม่ระบุ'
      
      const studentDoc = {
        schoolId,
        studentCode,
        firstName: studentData.firstName,
        lastName: studentData.lastName,
        nickname: studentData.nickname,
        gender: studentData.gender,
        birthDate: studentData.birthDate,
        currentGrade: studentData.currentGrade,
        phone: studentData.phone || '',
        email: '',
        age: age,
        status: 'active',
        isActive: true,
        isDeleted: false,
        joinDate: new Date().toISOString().split('T')[0],
        parents: [{
          type: 'mother' as const,
          firstName: parentFirstName,
          lastName: parentLastName,
          phone: studentData.parentPhone || '',
          email: '',
          isPrimaryContact: true,
          receiveNotifications: true
        }],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }
      
      const docRef = await addDoc(collection(db, 'students'), studentDoc)
      studentIds.push(docRef.id)
      console.log(`✅ Student created: ${studentData.firstName} ${studentData.lastName}`)
    }
    
    // 6. Create demo credit purchases
    console.log('💳 Creating demo credit purchases...')
    
    if (studentIds.length > 0 && courseIds.length > 0) {
      for (let j = 0; j < students.length; j++) {
        // Purchase a package for each student
        const packageIndex = j % 3 // Rotate through 3 packages
        const courseIndex = j % courseIds.length
        
        const purchaseData = {
          schoolId,
          studentId: studentIds[j],
          courseId: courseIds[courseIndex],
          packageId: `demo_package_${courseIndex}_${packageIndex}`,
          studentName: `${students[j].firstName} ${students[j].lastName}`,
          studentCode: `STD2024${String(j + 1).padStart(3, '0')}`,
          courseName: courses[courseIndex].name,
          packageName: ['แพ็คเกจทดลอง', 'แพ็คเกจประหยัด', 'แพ็คเกจคุ้มค่า'][packageIndex],
          totalCredits: [4, 8, 16][packageIndex],
          bonusCredits: 0,
          usedCredits: 0,
          remainingCredits: [4, 8, 16][packageIndex],
          originalPrice: [800, 1400, 2500][packageIndex],
          discountAmount: 0,
          finalPrice: [800, 1400, 2500][packageIndex],
          pricePerCredit: [200, 175, 156.25][packageIndex],
          paymentStatus: 'paid' as const,
          paymentMethod: 'cash' as const,
          paymentDate: new Date().toISOString(),
          hasExpiry: true,
          purchaseDate: new Date().toISOString().split('T')[0],
          activationDate: new Date().toISOString().split('T')[0],
          expiryDate: new Date(Date.now() + [1, 2, 3][packageIndex] * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'active' as const,
          receiptNumber: `RCP2024${String(j + 1).padStart(4, '0')}`,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }
        
        await addDoc(collection(db, 'student_credits'), purchaseData)
        console.log(`✅ Credit purchase created for: ${students[j].firstName}`)
      }
      
      console.log('✅ Student credits created')
    }
    
    console.log('\n🎉 Demo accounts seed completed successfully!')
    console.log('\n📋 Demo Accounts:')
    console.log('Owner: demo@owner.com / demo1234')
    console.log('Admin: demo@admin.com / demo1234')
    console.log('Teacher: demo@teacher.com / demo1234')
    console.log(`\nSchool ID: ${schoolId}`)
    
    return {
      success: true,
      schoolId,
      accounts: DEMO_ACCOUNTS
    }
    
  } catch (error) {
    console.error('❌ Error seeding demo accounts:', error)
    
    // Cleanup on error
    if (schoolId) {
      console.log('🧹 Cleaning up...')
      // Here you would delete the school and users if needed
    }
    
    throw error
  }
}

// Run the seed function
// Uncomment the line below to run the seed when this file is executed
// seedDemoAccounts()

// Export for use in other scripts
export default seedDemoAccounts