// seed-demo.mjs - Run with: node seed-demo.mjs
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://atbyhotnsnyjviqiihkx.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0Ynlob3Ruc255anZpcWlpaGt4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDE4MjA2NCwiZXhwIjoyMDg1NzU4MDY0fQ.CGk_bsDpxpf74JwZ4ysPW4ZH059NrAbGLccy1kJJdjw'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const SCHOOL_ID = 'school_demo_tutor'
const PASSWORD = 'demo1234'

async function createAuthUser(email, firstName, lastName) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
      display_name: `${firstName} ${lastName}`,
    },
  })
  if (error) {
    if (error.message.includes('already been registered')) {
      console.log(`  ⏭️  ${email} already exists, fetching...`)
      const { data: listData } = await supabase.auth.admin.listUsers()
      const existing = listData?.users?.find(u => u.email === email)
      if (existing) return existing.id
      throw error
    }
    throw error
  }
  return data.user.id
}

async function seed() {
  console.log('🚀 Starting demo seed...\n')

  // 1. Create school
  console.log('📚 Creating school: DEMO Tutor')
  const { error: schoolError } = await supabase.from('schools').upsert({
    id: SCHOOL_ID,
    name: 'DEMO Tutor',
    address: '123 ถ.สุขุมวิท แขวงคลองตัน เขตคลองเตย กรุงเทพฯ 10110',
    phone: '02-123-4567',
    email: 'contact@demotutor.com',
    line_oa: '@demotutor',
    timezone: 'Asia/Bangkok',
    currency: 'THB',
    date_format: 'DD/MM/YYYY',
    language: 'th',
    plan: 'pro',
    max_students: 999999,
    max_teachers: 999999,
    max_courses: 999999,
    storage_quota: 20 * 1024 * 1024 * 1024,
    features: {
      onlinePayment: true,
      parentApp: true,
      apiAccess: true,
      customDomain: true,
      whiteLabel: false,
    },
    is_active: true,
    is_verified: true,
  }, { onConflict: 'id' })

  if (schoolError) {
    console.error('❌ School error:', schoolError)
    throw schoolError
  }
  console.log('  ✅ School created\n')

  // 2. Create auth users + user records
  const users = [
    { email: 'demo@owner.com', firstName: 'สมชาย', lastName: 'เจ้าของกิจการ', role: 'owner' },
    { email: 'demo@admin.com', firstName: 'สมหญิง', lastName: 'ผู้ดูแลระบบ', role: 'admin' },
    { email: 'demo@teacher.com', firstName: 'ครูมานี', lastName: 'ใจดี', role: 'teacher' },
  ]

  const userIds = {}

  for (const u of users) {
    console.log(`👤 Creating user: ${u.email} (${u.role})`)
    const uid = await createAuthUser(u.email, u.firstName, u.lastName)
    userIds[u.role] = uid

    const { error } = await supabase.from('users').upsert({
      id: uid,
      email: u.email,
      first_name: u.firstName,
      last_name: u.lastName,
      display_name: `${u.firstName} ${u.lastName}`,
      role: u.role,
      school_id: SCHOOL_ID,
      is_active: true,
      is_super_admin: false,
      is_deleted: false,
    }, { onConflict: 'id' })

    if (error) {
      console.error(`  ❌ User record error for ${u.email}:`, error)
      throw error
    }
    console.log(`  ✅ ${u.role}: ${u.email} (id: ${uid.substring(0, 8)}...)\n`)
  }

  // 3. Create courses
  console.log('📖 Creating courses...')
  const courses = [
    { code: 'ACM25001', name: 'คณิตศาสตร์ ม.1', category: 'academic', desc: 'คณิตศาสตร์ระดับมัธยมศึกษาปีที่ 1 ครอบคลุมพีชคณิต เรขาคณิต และสถิติ' },
    { code: 'ACM25002', name: 'คณิตศาสตร์ ม.2', category: 'academic', desc: 'คณิตศาสตร์ระดับมัธยมศึกษาปีที่ 2 ครอบคลุมสมการ อสมการ และฟังก์ชัน' },
    { code: 'LNG25001', name: 'ภาษาอังกฤษพื้นฐาน', category: 'language', desc: 'ภาษาอังกฤษสำหรับผู้เริ่มต้น เน้นการสนทนาและไวยากรณ์' },
    { code: 'ART25001', name: 'วาดภาพสีน้ำ', category: 'art', desc: 'เรียนรู้เทคนิคการวาดภาพสีน้ำตั้งแต่เบื้องต้นจนถึงขั้นสูง' },
    { code: 'SPT25001', name: 'ว่ายน้ำ', category: 'sport', desc: 'สอนว่ายน้ำ 4 ท่า สำหรับเด็กและผู้ใหญ่' },
  ]

  const courseIds = {}
  for (const c of courses) {
    const { data, error } = await supabase.from('courses').upsert({
      school_id: SCHOOL_ID,
      code: c.code,
      name: c.name,
      category: c.category,
      description: c.desc,
      schedule: { type: 'weekly', sessions: [{ day: 'saturday', startTime: '09:00', endTime: '11:00' }] },
      primary_teacher_id: userIds.teacher,
      assistant_teacher_ids: [],
      max_students_per_class: 20,
      default_credits_per_session: 1,
      total_enrolled: 0,
      tags: [],
      status: 'active',
      is_active: true,
      is_deleted: false,
    }, { onConflict: 'school_id,code', ignoreDuplicates: false })
    .select('id')
    .single()

    if (error) {
      console.error(`  ❌ Course error (${c.name}):`, error)
      throw error
    }
    courseIds[c.code] = data.id
    console.log(`  ✅ ${c.name} (${c.code})`)
  }
  console.log()

  // 4. Create students
  console.log('🎓 Creating students...')
  const students = [
    { code: 'STD2025001', firstName: 'ด.ช.ธนกร', lastName: 'สุขใจ', nickname: 'ปลาย', grade: 'ม.1', gender: 'male' },
    { code: 'STD2025002', firstName: 'ด.ญ.พิมพ์ชนก', lastName: 'รุ่งเรือง', nickname: 'พิม', grade: 'ม.1', gender: 'female' },
    { code: 'STD2025003', firstName: 'ด.ช.กิตติพงษ์', lastName: 'วิเศษ', nickname: 'กิต', grade: 'ม.2', gender: 'male' },
    { code: 'STD2025004', firstName: 'ด.ญ.ณัฐธิดา', lastName: 'ใจดี', nickname: 'ณัฐ', grade: 'ม.2', gender: 'female' },
    { code: 'STD2025005', firstName: 'ด.ช.ภูมิพัฒน์', lastName: 'พิทักษ์', nickname: 'ภูมิ', grade: 'ม.1', gender: 'male' },
  ]

  const studentIds = {}
  for (const s of students) {
    const { data, error } = await supabase.from('students').upsert({
      school_id: SCHOOL_ID,
      student_code: s.code,
      first_name: s.firstName,
      last_name: s.lastName,
      nickname: s.nickname,
      gender: s.gender,
      current_grade: s.grade,
      address: { houseNumber: '', street: '', subdistrict: '', district: '', province: 'กรุงเทพฯ', postalCode: '' },
      parents: [{ name: `ผู้ปกครอง ${s.nickname}`, relationship: 'parent', phone: '081-xxx-xxxx' }],
      enrolled_courses: [],
      status: 'active',
      is_active: true,
      is_deleted: false,
    }, { onConflict: 'school_id,student_code', ignoreDuplicates: false })
    .select('id')
    .single()

    if (error) {
      console.error(`  ❌ Student error (${s.firstName}):`, error)
      throw error
    }
    studentIds[s.code] = data.id
    console.log(`  ✅ ${s.firstName} ${s.lastName} (${s.nickname}) - ${s.code}`)
  }
  console.log()

  // 5. Create credit packages
  console.log('💳 Creating credit packages...')
  const packages = [
    {
      code: 'PKG-MATH1-10', name: 'คณิต ม.1 - 10 ครั้ง',
      courseId: courseIds['ACM25001'], courseName: 'คณิตศาสตร์ ม.1',
      credits: 10, price: 3000, pricePerCredit: 300,
      validityType: 'months', validityValue: 3,
    },
    {
      code: 'PKG-MATH1-20', name: 'คณิต ม.1 - 20 ครั้ง',
      courseId: courseIds['ACM25001'], courseName: 'คณิตศาสตร์ ม.1',
      credits: 20, price: 5000, pricePerCredit: 250, bonus: 2,
      isPromo: true, originalPrice: 6000, discountPercent: 16.67,
      validityType: 'months', validityValue: 6,
    },
    {
      code: 'PKG-ENG-10', name: 'ภาษาอังกฤษ - 10 ครั้ง',
      courseId: courseIds['LNG25001'], courseName: 'ภาษาอังกฤษพื้นฐาน',
      credits: 10, price: 3500, pricePerCredit: 350,
      validityType: 'months', validityValue: 3,
    },
    {
      code: 'PKG-ART-8', name: 'วาดภาพสีน้ำ - 8 ครั้ง',
      courseId: courseIds['ART25001'], courseName: 'วาดภาพสีน้ำ',
      credits: 8, price: 4000, pricePerCredit: 500,
      validityType: 'months', validityValue: 3,
    },
    {
      code: 'PKG-ALL-30', name: 'แพ็คเกจรวม - 30 ครั้ง (ใช้ได้ทุกวิชา)',
      courseId: null, courseName: null, isUniversal: true,
      credits: 30, price: 7500, pricePerCredit: 250, bonus: 5,
      isPromo: true, originalPrice: 9000, discountPercent: 16.67,
      validityType: 'months', validityValue: 6,
    },
  ]

  const packageIds = {}
  for (const p of packages) {
    const totalWithBonus = p.credits + (p.bonus || 0)
    const { data, error } = await supabase.from('credit_packages').insert({
      school_id: SCHOOL_ID,
      code: p.code,
      name: p.name,
      course_id: p.courseId || null,
      course_name: p.courseName || null,
      applicable_course_ids: p.courseId ? [p.courseId] : [],
      applicable_course_names: p.courseName ? [p.courseName] : [],
      is_universal: p.isUniversal || false,
      credits: p.credits,
      price: p.price,
      price_per_credit: p.pricePerCredit,
      validity_type: p.validityType,
      validity_value: p.validityValue,
      validity_description: `${p.validityValue} เดือน`,
      is_promotion: p.isPromo || false,
      original_price: p.originalPrice || null,
      discount_percent: p.discountPercent || null,
      bonus_credits: p.bonus || 0,
      total_credits_with_bonus: totalWithBonus,
      popular: p.code === 'PKG-MATH1-20',
      recommended: p.code === 'PKG-ALL-30',
      status: 'active',
      is_active: true,
    })
    .select('id')
    .single()

    if (error) {
      console.error(`  ❌ Package error (${p.name}):`, error)
      throw error
    }
    packageIds[p.code] = data.id
    console.log(`  ✅ ${p.name} (${p.credits}+${p.bonus || 0} credits, ฿${p.price})`)
  }
  console.log()

  // 6. Purchase credits for some students
  console.log('🛒 Creating student credit purchases...')
  const today = new Date().toISOString().split('T')[0]
  const threeMonthsLater = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const sixMonthsLater = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const purchases = [
    { student: 'STD2025001', studentName: 'ด.ช.ธนกร สุขใจ', pkg: 'PKG-MATH1-10', expiry: threeMonthsLater },
    { student: 'STD2025001', studentName: 'ด.ช.ธนกร สุขใจ', pkg: 'PKG-ENG-10', expiry: threeMonthsLater },
    { student: 'STD2025002', studentName: 'ด.ญ.พิมพ์ชนก รุ่งเรือง', pkg: 'PKG-MATH1-20', expiry: sixMonthsLater },
    { student: 'STD2025003', studentName: 'ด.ช.กิตติพงษ์ วิเศษ', pkg: 'PKG-ALL-30', expiry: sixMonthsLater },
    { student: 'STD2025004', studentName: 'ด.ญ.ณัฐธิดา ใจดี', pkg: 'PKG-ART-8', expiry: threeMonthsLater },
  ]

  const creditIds = []
  for (const pr of purchases) {
    const pkg = packages.find(p => p.code === pr.pkg)
    const totalCredits = pkg.credits + (pkg.bonus || 0)
    const { data, error } = await supabase.from('student_credits').insert({
      school_id: SCHOOL_ID,
      student_id: studentIds[pr.student],
      package_id: packageIds[pr.pkg],
      course_id: pkg.courseId || null,
      course_name: pkg.courseName || null,
      applicable_course_ids: pkg.courseId ? [pkg.courseId] : [],
      applicable_course_names: pkg.courseName ? [pkg.courseName] : [],
      is_universal: pkg.isUniversal || false,
      student_name: pr.studentName,
      student_code: pr.student,
      package_name: pkg.name,
      package_code: pkg.code,
      total_credits: totalCredits,
      bonus_credits: pkg.bonus || 0,
      used_credits: 0,
      remaining_credits: totalCredits,
      original_price: pkg.originalPrice || pkg.price,
      discount_amount: pkg.originalPrice ? pkg.originalPrice - pkg.price : 0,
      final_price: pkg.price,
      price_per_credit: pkg.pricePerCredit,
      payment_status: 'paid',
      payment_method: 'transfer',
      payment_date: today,
      has_expiry: true,
      purchase_date: today,
      activation_date: today,
      expiry_date: pr.expiry,
      status: 'active',
      receipt_number: 'RCP' + today.replace(/-/g, '') + String(Math.floor(Math.random() * 10000)).padStart(4, '0'),
    })
    .select('id')
    .single()

    if (error) {
      console.error(`  ❌ Credit error:`, error)
      throw error
    }
    creditIds.push({ id: data.id, studentId: studentIds[pr.student], courseCode: pkg.courseId ? Object.keys(courseIds).find(k => courseIds[k] === pkg.courseId) : null, courseId: pkg.courseId })
    console.log(`  ✅ ${pr.studentName} → ${pkg.name}`)
  }
  console.log()

  // 7. Create some attendance records
  console.log('📋 Creating attendance records...')
  const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  // Student 1 (ธนกร) attended math 3 times
  const attendanceRecords = [
    { creditIdx: 0, courseId: courseIds['ACM25001'], date: daysAgo(14), studentCode: 'STD2025001', studentName: 'ด.ช.ธนกร สุขใจ', studentNickname: 'ปลาย', courseName: 'คณิตศาสตร์ ม.1', courseCode: 'ACM25001' },
    { creditIdx: 0, courseId: courseIds['ACM25001'], date: daysAgo(7), studentCode: 'STD2025001', studentName: 'ด.ช.ธนกร สุขใจ', studentNickname: 'ปลาย', courseName: 'คณิตศาสตร์ ม.1', courseCode: 'ACM25001' },
    { creditIdx: 0, courseId: courseIds['ACM25001'], date: daysAgo(0), studentCode: 'STD2025001', studentName: 'ด.ช.ธนกร สุขใจ', studentNickname: 'ปลาย', courseName: 'คณิตศาสตร์ ม.1', courseCode: 'ACM25001' },
    // Student 2 (พิมพ์ชนก) attended math 2 times
    { creditIdx: 2, courseId: courseIds['ACM25001'], date: daysAgo(7), studentCode: 'STD2025002', studentName: 'ด.ญ.พิมพ์ชนก รุ่งเรือง', studentNickname: 'พิม', courseName: 'คณิตศาสตร์ ม.1', courseCode: 'ACM25001' },
    { creditIdx: 2, courseId: courseIds['ACM25001'], date: daysAgo(0), studentCode: 'STD2025002', studentName: 'ด.ญ.พิมพ์ชนก รุ่งเรือง', studentNickname: 'พิม', courseName: 'คณิตศาสตร์ ม.1', courseCode: 'ACM25001' },
  ]

  for (const att of attendanceRecords) {
    const credit = creditIds[att.creditIdx]
    // Get current remaining from DB
    const { data: creditData } = await supabase.from('student_credits').select('remaining_credits').eq('id', credit.id).single()
    const remaining = creditData.remaining_credits

    const { error } = await supabase.from('attendance').insert({
      school_id: SCHOOL_ID,
      student_id: credit.studentId,
      course_id: att.courseId,
      credit_id: credit.id,
      student_code: att.studentCode,
      student_name: att.studentName,
      student_nickname: att.studentNickname,
      course_name: att.courseName,
      course_code: att.courseCode,
      check_in_date: att.date,
      check_in_time: '09:05',
      check_in_method: 'manual',
      session_date: att.date,
      credits_deducted: 1,
      credits_before: remaining,
      credits_after: remaining - 1,
      status: 'present',
      is_late: false,
      late_minutes: 0,
      checked_by: userIds.teacher,
      checked_by_name: 'ครูมานี ใจดี',
      checked_by_role: 'teacher',
    })

    if (error) {
      console.error(`  ❌ Attendance error:`, error)
      throw error
    }

    // Deduct credit
    await supabase.from('student_credits').update({
      used_credits: supabase.rpc ? undefined : undefined, // we'll do manual calc
      remaining_credits: remaining - 1,
      used_credits: creditData.remaining_credits > remaining ? 1 : (creditIds[att.creditIdx].totalCredits || 10) - (remaining - 1),
      last_used_date: att.date,
    }).eq('id', credit.id)

    // Actually let's just use raw update
    await supabase.from('student_credits')
      .update({
        remaining_credits: remaining - 1,
        last_used_date: att.date,
      })
      .eq('id', credit.id)

    // Update used_credits separately
    const { data: updatedCredit } = await supabase.from('student_credits')
      .select('total_credits, remaining_credits')
      .eq('id', credit.id)
      .single()

    if (updatedCredit) {
      await supabase.from('student_credits')
        .update({ used_credits: updatedCredit.total_credits - updatedCredit.remaining_credits })
        .eq('id', credit.id)
    }

    console.log(`  ✅ ${att.studentName} → ${att.courseName} (${att.date})`)
  }

  console.log('\n' + '='.repeat(50))
  console.log('🎉 Demo seed completed successfully!')
  console.log('='.repeat(50))
  console.log('\n📋 บัญชีทดลอง:')
  console.log('   Owner:   demo@owner.com / demo1234')
  console.log('   Admin:   demo@admin.com / demo1234')
  console.log('   Teacher: demo@teacher.com / demo1234')
  console.log('\n📚 โรงเรียน: DEMO Tutor')
  console.log(`   School ID: ${SCHOOL_ID}`)
  console.log('\n📖 คอร์ส: 5 คอร์ส (คณิต ม.1, คณิต ม.2, อังกฤษ, วาดภาพ, ว่ายน้ำ)')
  console.log('🎓 นักเรียน: 5 คน')
  console.log('💳 แพ็คเกจ: 5 แบบ (รวมแพ็คเกจรวมใช้ได้ทุกวิชา)')
  console.log('🛒 การซื้อเครดิต: 5 รายการ')
  console.log('📋 ประวัติเช็คชื่อ: 5 รายการ')
}

seed().catch((err) => {
  console.error('\n❌ Seed failed:', err)
  process.exit(1)
})
