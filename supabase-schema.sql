-- =============================================
-- ClassPass: Supabase Schema Migration
-- =============================================
-- If re-running after a partial failure, uncomment the DROP section below first.

-- =============================================
-- CLEANUP (uncomment if re-running after partial failure)
-- =============================================
-- DROP TABLE IF EXISTS attendance CASCADE;
-- DROP TABLE IF EXISTS student_credits CASCADE;
-- DROP TABLE IF EXISTS credit_packages CASCADE;
-- DROP TABLE IF EXISTS courses CASCADE;
-- DROP TABLE IF EXISTS students CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;
-- DROP TABLE IF EXISTS schools CASCADE;
-- DROP FUNCTION IF EXISTS public.user_school_id();
-- DROP FUNCTION IF EXISTS public.user_role();
-- DROP FUNCTION IF EXISTS public.is_super_admin();
-- DROP FUNCTION IF EXISTS public.belongs_to_school(TEXT);
-- DROP FUNCTION IF EXISTS public.is_admin_or_above();
-- DROP FUNCTION IF EXISTS public.is_teacher_or_above();
-- DROP FUNCTION IF EXISTS update_updated_at_column();
-- DROP FUNCTION IF EXISTS generate_student_code(TEXT);
-- DROP FUNCTION IF EXISTS generate_course_code(TEXT, TEXT);
-- DROP FUNCTION IF EXISTS purchase_credits(TEXT, UUID, UUID, TEXT, NUMERIC, NUMERIC, TEXT, TEXT);
-- DROP FUNCTION IF EXISTS check_in_student(TEXT, UUID, UUID, UUID, UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN, INTEGER, TEXT);
-- DROP FUNCTION IF EXISTS cancel_attendance(UUID);
-- DROP TYPE IF EXISTS user_role CASCADE;
-- DROP TYPE IF EXISTS school_plan CASCADE;
-- DROP TYPE IF EXISTS student_status CASCADE;
-- DROP TYPE IF EXISTS gender_type CASCADE;
-- DROP TYPE IF EXISTS course_category CASCADE;
-- DROP TYPE IF EXISTS course_status CASCADE;
-- DROP TYPE IF EXISTS validity_type CASCADE;
-- DROP TYPE IF EXISTS package_status CASCADE;
-- DROP TYPE IF EXISTS credit_status CASCADE;
-- DROP TYPE IF EXISTS payment_status_type CASCADE;
-- DROP TYPE IF EXISTS payment_method_type CASCADE;
-- DROP TYPE IF EXISTS attendance_status CASCADE;
-- DROP TYPE IF EXISTS check_in_method CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- ENUM TYPES
-- =============================================
DO $$ BEGIN CREATE TYPE user_role AS ENUM ('owner', 'admin', 'teacher', 'superadmin'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE school_plan AS ENUM ('free', 'basic', 'pro', 'enterprise'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE student_status AS ENUM ('active', 'inactive', 'graduated', 'suspended'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE gender_type AS ENUM ('male', 'female', 'other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE course_category AS ENUM ('academic', 'sport', 'art', 'language', 'other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE course_status AS ENUM ('active', 'inactive', 'archived'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE validity_type AS ENUM ('months', 'days', 'unlimited'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE package_status AS ENUM ('active', 'inactive', 'archived'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE credit_status AS ENUM ('active', 'expired', 'depleted', 'suspended'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE payment_status_type AS ENUM ('pending', 'paid', 'refunded'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE payment_method_type AS ENUM ('cash', 'transfer', 'credit_card', 'promptpay'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'excused', 'holiday'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE check_in_method AS ENUM ('manual', 'qr_code', 'face_recognition'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================
-- AUTO-UPDATE TRIGGER FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- TABLES
-- =============================================

-- 1. SCHOOLS
CREATE TABLE IF NOT EXISTS schools (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  logo TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  line_oa TEXT,
  website TEXT,
  tax_id TEXT,
  timezone TEXT NOT NULL DEFAULT 'Asia/Bangkok',
  currency TEXT NOT NULL DEFAULT 'THB',
  date_format TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
  language TEXT NOT NULL DEFAULT 'th',
  business_hours JSONB DEFAULT '{}',
  plan school_plan NOT NULL DEFAULT 'free',
  plan_expiry TIMESTAMPTZ,
  max_students INTEGER NOT NULL DEFAULT 50,
  max_teachers INTEGER NOT NULL DEFAULT 3,
  max_courses INTEGER NOT NULL DEFAULT 5,
  storage_quota BIGINT NOT NULL DEFAULT 1073741824,
  features JSONB NOT NULL DEFAULT '{"onlinePayment":false,"parentApp":false,"apiAccess":false,"customDomain":false,"whiteLabel":false}',
  billing_email TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMPTZ
);

DROP TRIGGER IF EXISTS update_schools_updated_at ON schools;
CREATE TRIGGER update_schools_updated_at
  BEFORE UPDATE ON schools
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. USERS (linked to auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  profile_image TEXT,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'teacher',
  school_id TEXT REFERENCES schools(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_super_admin BOOLEAN NOT NULL DEFAULT false,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_school_id ON users(school_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. STUDENTS
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_code TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  nickname TEXT,
  birth_date TEXT,
  age INTEGER,
  gender gender_type NOT NULL DEFAULT 'other',
  current_grade TEXT NOT NULL DEFAULT '',
  profile_image TEXT,
  phone TEXT,
  email TEXT,
  address JSONB DEFAULT '{}',
  parents JSONB DEFAULT '[]',
  enrolled_courses JSONB DEFAULT '[]',
  status student_status NOT NULL DEFAULT 'active',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_students_school_id ON students(school_id);
CREATE INDEX IF NOT EXISTS idx_students_student_code ON students(student_code);
CREATE INDEX IF NOT EXISTS idx_students_school_status ON students(school_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_students_school_code ON students(school_id, student_code);

DROP TRIGGER IF EXISTS update_students_updated_at ON students;
CREATE TRIGGER update_students_updated_at
  BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. COURSES
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  category course_category NOT NULL DEFAULT 'other',
  description TEXT,
  cover_image TEXT,
  schedule JSONB DEFAULT '{"type":"flexible","sessions":[]}',
  primary_teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
  assistant_teacher_ids UUID[] DEFAULT '{}',
  max_students_per_class INTEGER DEFAULT 30,
  default_credits_per_session INTEGER NOT NULL DEFAULT 1,
  total_enrolled INTEGER NOT NULL DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  status course_status NOT NULL DEFAULT 'active',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_courses_school_id ON courses(school_id);
CREATE INDEX IF NOT EXISTS idx_courses_school_status ON courses(school_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_courses_school_code ON courses(school_id, code);

DROP TRIGGER IF EXISTS update_courses_updated_at ON courses;
CREATE TRIGGER update_courses_updated_at
  BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. CREDIT PACKAGES
CREATE TABLE IF NOT EXISTS credit_packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  course_id UUID,
  course_name TEXT,
  applicable_course_ids UUID[] DEFAULT '{}',
  applicable_course_names TEXT[] DEFAULT '{}',
  is_universal BOOLEAN NOT NULL DEFAULT false,
  course_categories TEXT[] DEFAULT '{}',
  course_levels TEXT[] DEFAULT '{}',
  name TEXT NOT NULL,
  description TEXT,
  code TEXT NOT NULL,
  credits INTEGER NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  price_per_credit NUMERIC(10,2) NOT NULL DEFAULT 0,
  validity_type validity_type NOT NULL DEFAULT 'unlimited',
  validity_value INTEGER,
  validity_description TEXT,
  is_promotion BOOLEAN NOT NULL DEFAULT false,
  original_price NUMERIC(10,2),
  discount_percent NUMERIC(5,2),
  bonus_credits INTEGER NOT NULL DEFAULT 0,
  total_credits_with_bonus INTEGER NOT NULL,
  popular BOOLEAN NOT NULL DEFAULT false,
  recommended BOOLEAN NOT NULL DEFAULT false,
  color TEXT,
  status package_status NOT NULL DEFAULT 'active',
  is_active BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_packages_school_id ON credit_packages(school_id);
CREATE INDEX IF NOT EXISTS idx_packages_school_active ON credit_packages(school_id, is_active);

DROP TRIGGER IF EXISTS update_packages_updated_at ON credit_packages;
CREATE TRIGGER update_packages_updated_at
  BEFORE UPDATE ON credit_packages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. STUDENT CREDITS
CREATE TABLE IF NOT EXISTS student_credits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_id UUID,
  course_name TEXT,
  applicable_course_ids UUID[] DEFAULT '{}',
  applicable_course_names TEXT[] DEFAULT '{}',
  is_universal BOOLEAN NOT NULL DEFAULT false,
  package_id UUID NOT NULL REFERENCES credit_packages(id),
  student_name TEXT NOT NULL,
  student_code TEXT NOT NULL,
  package_name TEXT NOT NULL,
  package_code TEXT,
  total_credits INTEGER NOT NULL,
  bonus_credits INTEGER NOT NULL DEFAULT 0,
  used_credits INTEGER NOT NULL DEFAULT 0,
  remaining_credits INTEGER NOT NULL,
  original_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  final_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  price_per_credit NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_status payment_status_type NOT NULL DEFAULT 'pending',
  payment_method payment_method_type NOT NULL DEFAULT 'cash',
  payment_reference TEXT,
  payment_date TEXT,
  payment_note TEXT,
  has_expiry BOOLEAN NOT NULL DEFAULT false,
  purchase_date TEXT NOT NULL,
  activation_date TEXT NOT NULL,
  expiry_date TEXT,
  days_until_expiry INTEGER,
  last_used_date TEXT,
  status credit_status NOT NULL DEFAULT 'active',
  receipt_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credits_school_id ON student_credits(school_id);
CREATE INDEX IF NOT EXISTS idx_credits_student_id ON student_credits(student_id);
CREATE INDEX IF NOT EXISTS idx_credits_student_status ON student_credits(student_id, status);
CREATE INDEX IF NOT EXISTS idx_credits_school_student ON student_credits(school_id, student_id);
CREATE INDEX IF NOT EXISTS idx_credits_package_id ON student_credits(package_id);
CREATE INDEX IF NOT EXISTS idx_credits_purchase_date ON student_credits(purchase_date);

DROP TRIGGER IF EXISTS update_credits_updated_at ON student_credits;
CREATE TRIGGER update_credits_updated_at
  BEFORE UPDATE ON student_credits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. ATTENDANCE
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  credit_id UUID NOT NULL REFERENCES student_credits(id),
  student_code TEXT NOT NULL,
  student_name TEXT NOT NULL,
  student_nickname TEXT,
  course_name TEXT NOT NULL,
  course_code TEXT,
  package_name TEXT,
  check_in_date TEXT NOT NULL,
  check_in_time TEXT NOT NULL,
  check_in_method check_in_method NOT NULL DEFAULT 'manual',
  session_date TEXT NOT NULL,
  session_start_time TEXT,
  session_end_time TEXT,
  session_room TEXT,
  credits_deducted INTEGER NOT NULL DEFAULT 1,
  credits_before INTEGER NOT NULL,
  credits_after INTEGER NOT NULL,
  status attendance_status NOT NULL DEFAULT 'present',
  is_late BOOLEAN NOT NULL DEFAULT false,
  late_minutes INTEGER DEFAULT 0,
  checked_by UUID NOT NULL REFERENCES users(id),
  checked_by_name TEXT NOT NULL,
  checked_by_role TEXT NOT NULL,
  teacher_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_attendance_school_id ON attendance(school_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_course_id ON attendance(course_id);
CREATE INDEX IF NOT EXISTS idx_attendance_credit_id ON attendance(credit_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(check_in_date);
CREATE INDEX IF NOT EXISTS idx_attendance_school_course_date ON attendance(school_id, course_id, check_in_date);
CREATE INDEX IF NOT EXISTS idx_attendance_school_student ON attendance(school_id, student_id);

-- =============================================
-- RLS HELPER FUNCTIONS (in public schema)
-- =============================================

CREATE OR REPLACE FUNCTION public.user_school_id()
RETURNS TEXT AS $$
  SELECT school_id FROM public.users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.user_role()
RETURNS user_role AS $$
  SELECT role FROM public.users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT is_super_admin FROM public.users WHERE id = auth.uid()),
    false
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.belongs_to_school(p_school_id TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND school_id = p_school_id
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_admin_or_above()
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role IN ('owner', 'admin')
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_teacher_or_above()
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role IN ('owner', 'admin', 'teacher')
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- SCHOOLS
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "schools_select" ON schools;
CREATE POLICY "schools_select" ON schools FOR SELECT USING (
  public.belongs_to_school(id) OR public.is_super_admin()
);

DROP POLICY IF EXISTS "schools_insert" ON schools;
CREATE POLICY "schools_insert" ON schools FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "schools_update" ON schools;
CREATE POLICY "schools_update" ON schools FOR UPDATE USING (
  public.belongs_to_school(id) AND public.user_role() = 'owner'
);

DROP POLICY IF EXISTS "schools_delete" ON schools;
CREATE POLICY "schools_delete" ON schools FOR DELETE USING (
  public.is_super_admin()
);

-- USERS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select" ON users;
CREATE POLICY "users_select" ON users FOR SELECT USING (
  id = auth.uid()
  OR (public.belongs_to_school(school_id) AND public.is_admin_or_above())
  OR public.is_super_admin()
);

DROP POLICY IF EXISTS "users_insert" ON users;
CREATE POLICY "users_insert" ON users FOR INSERT WITH CHECK (
  id = auth.uid()
  OR public.is_admin_or_above()
  OR public.is_super_admin()
);

DROP POLICY IF EXISTS "users_update" ON users;
CREATE POLICY "users_update" ON users FOR UPDATE USING (
  id = auth.uid()
  OR (public.belongs_to_school(school_id) AND public.is_admin_or_above())
  OR public.is_super_admin()
);

-- STUDENTS
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "students_select" ON students;
CREATE POLICY "students_select" ON students FOR SELECT USING (
  public.belongs_to_school(school_id) AND public.is_teacher_or_above()
);

DROP POLICY IF EXISTS "students_insert" ON students;
CREATE POLICY "students_insert" ON students FOR INSERT WITH CHECK (
  public.belongs_to_school(school_id) AND public.is_admin_or_above()
);

DROP POLICY IF EXISTS "students_update" ON students;
CREATE POLICY "students_update" ON students FOR UPDATE USING (
  public.belongs_to_school(school_id) AND public.is_admin_or_above()
);

-- COURSES
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "courses_select" ON courses;
CREATE POLICY "courses_select" ON courses FOR SELECT USING (
  public.belongs_to_school(school_id)
);

DROP POLICY IF EXISTS "courses_insert" ON courses;
CREATE POLICY "courses_insert" ON courses FOR INSERT WITH CHECK (
  public.belongs_to_school(school_id) AND public.is_admin_or_above()
);

DROP POLICY IF EXISTS "courses_update" ON courses;
CREATE POLICY "courses_update" ON courses FOR UPDATE USING (
  public.belongs_to_school(school_id) AND public.is_admin_or_above()
);

-- CREDIT PACKAGES (Bug #1 fix: clean RLS)
ALTER TABLE credit_packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "packages_select" ON credit_packages;
CREATE POLICY "packages_select" ON credit_packages FOR SELECT USING (
  public.belongs_to_school(school_id)
);

DROP POLICY IF EXISTS "packages_insert" ON credit_packages;
CREATE POLICY "packages_insert" ON credit_packages FOR INSERT WITH CHECK (
  public.belongs_to_school(school_id) AND public.is_admin_or_above()
);

DROP POLICY IF EXISTS "packages_update" ON credit_packages;
CREATE POLICY "packages_update" ON credit_packages FOR UPDATE USING (
  public.belongs_to_school(school_id) AND public.is_admin_or_above()
);

-- STUDENT CREDITS (Bug #3 fix: teachers can only read active credits for check-in)
ALTER TABLE student_credits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "credits_select_admin" ON student_credits;
CREATE POLICY "credits_select_admin" ON student_credits FOR SELECT USING (
  public.belongs_to_school(school_id) AND public.is_admin_or_above()
);

DROP POLICY IF EXISTS "credits_select_teacher_checkin" ON student_credits;
CREATE POLICY "credits_select_teacher_checkin" ON student_credits FOR SELECT USING (
  public.belongs_to_school(school_id)
  AND public.user_role() = 'teacher'
  AND status = 'active'
  AND remaining_credits > 0
);

DROP POLICY IF EXISTS "credits_insert" ON student_credits;
CREATE POLICY "credits_insert" ON student_credits FOR INSERT WITH CHECK (
  public.belongs_to_school(school_id) AND public.is_admin_or_above()
);

DROP POLICY IF EXISTS "credits_update" ON student_credits;
CREATE POLICY "credits_update" ON student_credits FOR UPDATE USING (
  public.belongs_to_school(school_id) AND public.is_teacher_or_above()
);

-- ATTENDANCE (Bug #3 fix: teachers CAN create attendance)
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "attendance_select" ON attendance;
CREATE POLICY "attendance_select" ON attendance FOR SELECT USING (
  public.belongs_to_school(school_id)
);

DROP POLICY IF EXISTS "attendance_insert" ON attendance;
CREATE POLICY "attendance_insert" ON attendance FOR INSERT WITH CHECK (
  public.belongs_to_school(school_id) AND public.is_teacher_or_above()
);

DROP POLICY IF EXISTS "attendance_delete" ON attendance;
CREATE POLICY "attendance_delete" ON attendance FOR DELETE USING (
  public.belongs_to_school(school_id) AND public.is_teacher_or_above()
);

-- =============================================
-- DATABASE FUNCTIONS (for atomic transactions)
-- =============================================

-- Generate student code
CREATE OR REPLACE FUNCTION generate_student_code(p_school_id TEXT)
RETURNS TEXT AS $$
DECLARE
  v_year TEXT;
  v_last_num INTEGER;
BEGIN
  v_year := EXTRACT(YEAR FROM NOW())::TEXT;

  SELECT COALESCE(MAX(CAST(RIGHT(student_code, 3) AS INTEGER)), 0)
  INTO v_last_num
  FROM students
  WHERE school_id = p_school_id
    AND student_code LIKE 'STD' || v_year || '%';

  RETURN 'STD' || v_year || LPAD((v_last_num + 1)::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate course code
CREATE OR REPLACE FUNCTION generate_course_code(p_school_id TEXT, p_category TEXT)
RETURNS TEXT AS $$
DECLARE
  v_prefix TEXT;
  v_year TEXT;
  v_last_num INTEGER;
BEGIN
  v_prefix := CASE p_category
    WHEN 'academic' THEN 'ACM'
    WHEN 'sport' THEN 'SPT'
    WHEN 'art' THEN 'ART'
    WHEN 'language' THEN 'LNG'
    ELSE 'OTH'
  END;

  v_year := RIGHT(EXTRACT(YEAR FROM NOW())::TEXT, 2);

  SELECT COALESCE(MAX(CAST(RIGHT(code, 3) AS INTEGER)), 0)
  INTO v_last_num
  FROM courses
  WHERE school_id = p_school_id
    AND code LIKE v_prefix || v_year || '%';

  RETURN v_prefix || v_year || LPAD((v_last_num + 1)::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Purchase credits (atomic transaction)
CREATE OR REPLACE FUNCTION purchase_credits(
  p_school_id TEXT,
  p_student_id UUID,
  p_package_id UUID,
  p_payment_method TEXT,
  p_payment_amount NUMERIC,
  p_discount_amount NUMERIC DEFAULT 0,
  p_payment_note TEXT DEFAULT NULL,
  p_payment_reference TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_student RECORD;
  v_package RECORD;
  v_credit_id UUID;
  v_expiry_date TEXT;
  v_total_credits INTEGER;
  v_today TEXT;
BEGIN
  v_today := TO_CHAR(NOW(), 'YYYY-MM-DD');

  -- Get student
  SELECT * INTO v_student FROM students WHERE id = p_student_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Student not found'; END IF;

  -- Get package
  SELECT * INTO v_package FROM credit_packages WHERE id = p_package_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Package not found'; END IF;

  v_total_credits := v_package.total_credits_with_bonus;

  -- Calculate expiry
  IF v_package.validity_type = 'months' THEN
    v_expiry_date := TO_CHAR(NOW() + (v_package.validity_value || ' months')::INTERVAL, 'YYYY-MM-DD');
  ELSIF v_package.validity_type = 'days' THEN
    v_expiry_date := TO_CHAR(NOW() + (v_package.validity_value || ' days')::INTERVAL, 'YYYY-MM-DD');
  ELSE
    v_expiry_date := NULL;
  END IF;

  -- Insert credit record
  INSERT INTO student_credits (
    school_id, student_id, package_id,
    course_id, course_name,
    applicable_course_ids, applicable_course_names, is_universal,
    student_name, student_code, package_name, package_code,
    total_credits, bonus_credits, used_credits, remaining_credits,
    original_price, discount_amount, final_price, price_per_credit,
    payment_status, payment_method, payment_reference, payment_date, payment_note,
    has_expiry, purchase_date, activation_date, expiry_date,
    status, receipt_number
  ) VALUES (
    p_school_id, p_student_id, p_package_id,
    v_package.course_id, v_package.course_name,
    v_package.applicable_course_ids, v_package.applicable_course_names, v_package.is_universal,
    v_student.first_name || ' ' || v_student.last_name, v_student.student_code,
    v_package.name, v_package.code,
    v_total_credits, v_package.bonus_credits, 0, v_total_credits,
    v_package.price, p_discount_amount, p_payment_amount,
    p_payment_amount / GREATEST(v_total_credits, 1),
    'paid', p_payment_method::payment_method_type, p_payment_reference, v_today, p_payment_note,
    v_package.validity_type != 'unlimited',
    v_today, v_today, v_expiry_date,
    'active',
    'RCP' || TO_CHAR(NOW(), 'YYYYMM') || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0')
  ) RETURNING id INTO v_credit_id;

  RETURN v_credit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check in student (atomic transaction)
CREATE OR REPLACE FUNCTION check_in_student(
  p_school_id TEXT,
  p_student_id UUID,
  p_course_id UUID,
  p_credit_id UUID,
  p_checked_by UUID,
  p_checked_by_name TEXT,
  p_checked_by_role TEXT,
  p_check_in_date TEXT,
  p_check_in_method TEXT DEFAULT 'manual',
  p_is_late BOOLEAN DEFAULT false,
  p_late_minutes INTEGER DEFAULT 0,
  p_teacher_notes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_student RECORD;
  v_course RECORD;
  v_credit RECORD;
  v_attendance_id UUID;
BEGIN
  -- Get and validate student
  SELECT * INTO v_student FROM students WHERE id = p_student_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Student not found'; END IF;

  -- Get and validate course
  SELECT * INTO v_course FROM courses WHERE id = p_course_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Course not found'; END IF;

  -- Get and validate credit (with row lock)
  SELECT * INTO v_credit FROM student_credits WHERE id = p_credit_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Credit not found'; END IF;
  IF v_credit.status != 'active' THEN RAISE EXCEPTION 'Credit is not active'; END IF;
  IF v_credit.remaining_credits < 1 THEN RAISE EXCEPTION 'ไม่มีเครดิตเหลือ'; END IF;
  IF v_credit.has_expiry AND v_credit.expiry_date IS NOT NULL AND v_credit.expiry_date < p_check_in_date THEN
    RAISE EXCEPTION 'เครดิตหมดอายุแล้ว';
  END IF;

  -- Create attendance record
  INSERT INTO attendance (
    school_id, student_id, course_id, credit_id,
    student_code, student_name, student_nickname, course_name, course_code,
    check_in_date, check_in_time, check_in_method,
    session_date,
    credits_deducted, credits_before, credits_after,
    status, is_late, late_minutes,
    checked_by, checked_by_name, checked_by_role,
    teacher_notes
  ) VALUES (
    p_school_id, p_student_id, p_course_id, p_credit_id,
    v_student.student_code,
    v_student.first_name || ' ' || v_student.last_name,
    v_student.nickname,
    v_course.name, v_course.code,
    p_check_in_date, NOW()::TEXT, p_check_in_method::check_in_method,
    p_check_in_date,
    1, v_credit.remaining_credits, v_credit.remaining_credits - 1,
    'present', p_is_late, p_late_minutes,
    p_checked_by, p_checked_by_name, p_checked_by_role,
    p_teacher_notes
  ) RETURNING id INTO v_attendance_id;

  -- Update credit balance
  UPDATE student_credits SET
    used_credits = used_credits + 1,
    remaining_credits = remaining_credits - 1,
    last_used_date = p_check_in_date,
    status = CASE WHEN remaining_credits - 1 = 0 THEN 'depleted'::credit_status ELSE status END
  WHERE id = p_credit_id;

  RETURN v_attendance_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cancel attendance (atomic undo)
CREATE OR REPLACE FUNCTION cancel_attendance(p_attendance_id UUID)
RETURNS VOID AS $$
DECLARE
  v_attendance RECORD;
  v_credit RECORD;
BEGIN
  -- Get attendance record
  SELECT * INTO v_attendance FROM attendance WHERE id = p_attendance_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'ไม่พบข้อมูลการเช็คชื่อ'; END IF;

  -- Get credit record (with row lock)
  SELECT * INTO v_credit FROM student_credits WHERE id = v_attendance.credit_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ไม่พบข้อมูลเครดิต'; END IF;

  -- Delete attendance record
  DELETE FROM attendance WHERE id = p_attendance_id;

  -- Refund credit
  UPDATE student_credits SET
    used_credits = GREATEST(0, used_credits - v_attendance.credits_deducted),
    remaining_credits = remaining_credits + v_attendance.credits_deducted,
    status = CASE WHEN remaining_credits + v_attendance.credits_deducted > 0 THEN 'active'::credit_status ELSE status END
  WHERE id = v_attendance.credit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
