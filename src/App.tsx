// src/App.tsx
import { Suspense, lazy, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './stores/authStore'
import { useSchoolStore } from './stores/schoolStore'
import { ProtectedRoute } from './components/common/ProtectedRoute'
import { FontLoader } from './components/common/FontLoader'


// Lazy load pages
const LandingPage = lazy(() => import('./pages/public/LandingPage'))
const Login = lazy(() => import('./pages/auth/Login'))
const Register = lazy(() => import('./pages/auth/Register'))
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'))

// Super Admin pages
const SuperAdminLogin = lazy(() => import('./pages/auth/SuperAdminLogin'))
const SuperAdminDashboard = lazy(() => import('./pages/superadmin/SuperAdminDashboard'))
const SuperAdminRoute = lazy(() => import('./components/common/SuperAdminRoute'))

// Regular pages
const Dashboard = lazy(() => import('./pages/dashboard/Dashboard'))
const StudentsPage = lazy(() => import('./pages/students/StudentsPage'))
const AddStudentPage = lazy(() => import('./pages/students/AddStudentPage'))
const EditStudentPage = lazy(() => import('./pages/students/EditStudentPage'))
const StudentDetailPage = lazy(() => import('./pages/students/StudentDetailPage'))
const CoursesPage = lazy(() => import('./pages/courses/CoursesPage'))
const AddCoursePage = lazy(() => import('./pages/courses/AddCoursePage'))
const CourseDetailPage = lazy(() => import('./pages/courses/CourseDetailPage'))
const PackagesPage = lazy(() => import('./pages/packages/PackagesPage'))
const AddPackagePage = lazy(() => import('./pages/packages/AddPackagePage'))
const PurchaseCreditsPage = lazy(() => import('./pages/credits/PurchaseCreditsPage'))
const CreditHistoryPage = lazy(() => import('./pages/credits/CreditHistoryPage'))
const ReceiptPage = lazy(() => import('./pages/credits/ReceiptPage'))
const AttendancePage = lazy(() => import('./pages/attendance/AttendancePage'))
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage'))
const ReportsPage = lazy(() => import('./pages/reports/ReportsPage'))

// Loading component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <div className="spinner spinner-primary w-8 h-8 mx-auto mb-4"></div>
      <p className="text-gray-600">กำลังโหลด...</p>
    </div>
  </div>
)

function App() {
  const { checkAuth, user, isLoading } = useAuthStore()
  const { loadSchool } = useSchoolStore()
  
  // Check authentication status on app load
  useEffect(() => {
    const initAuth = async () => {
      await checkAuth()
    }
    initAuth()
  }, [checkAuth])
  
  // Load school data when user is authenticated (but NOT for super admin)
  useEffect(() => {
    // Skip loading school for super admin
    if (user?.isSuperAdmin || user?.role === 'superadmin') {
      console.log('Skipping school load for super admin')
      return
    }
    
    // Load school for regular users
    if (user?.schoolId && user.schoolId !== 'SYSTEM') {
      loadSchool(user.schoolId)
    }
  }, [user, loadSchool])
  
  // Show loading spinner while checking auth
  if (isLoading) {
    return <PageLoader />
  }
  
return (
  <FontLoader>
      {/* Toast notifications */}
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            style: {
              background: '#22c55e',
            },
          },
          error: {
            style: {
              background: '#ef4444',
            },
          },
        }}
      />

      {/* Routes */}
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          
          {/* Super Admin routes */}
          <Route path="/superadmin" element={<SuperAdminLogin />} />
          <Route path="/superadmin/*" element={
            <SuperAdminRoute>
              <Routes>
                <Route path="dashboard" element={<SuperAdminDashboard />} />
              </Routes>
            </SuperAdminRoute>
          } />
          
          {/* Protected routes - ต้อง login ก่อน */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          
          {/* Student routes */}
          <Route path="/students" element={
            <ProtectedRoute>
              <StudentsPage />
            </ProtectedRoute>
          } />
          
          <Route path="/students/add" element={
            <ProtectedRoute>
              <AddStudentPage />
            </ProtectedRoute>
          } />
          
          <Route path="/students/:id" element={
            <ProtectedRoute>
              <StudentDetailPage />
            </ProtectedRoute>
          } />
          
          <Route path="/students/:id/edit" element={
            <ProtectedRoute>
              <EditStudentPage />
            </ProtectedRoute>
          } />
          
          {/* Course routes */}
          <Route path="/courses" element={
            <ProtectedRoute>
              <CoursesPage />
            </ProtectedRoute>
          } />
          
          <Route path="/courses/add" element={
            <ProtectedRoute>
              <AddCoursePage />
            </ProtectedRoute>
          } />
          
          <Route path="/courses/:id" element={
            <ProtectedRoute>
              <CourseDetailPage />
            </ProtectedRoute>
          } />
          
          {/* Package routes */}
          <Route path="/packages" element={
            <ProtectedRoute>
              <PackagesPage />
            </ProtectedRoute>
          } />
          
          <Route path="/packages/add" element={
            <ProtectedRoute>
              <AddPackagePage />
            </ProtectedRoute>
          } />
          
          <Route path="/packages/:id/edit" element={
            <ProtectedRoute>
              <AddPackagePage />
            </ProtectedRoute>
          } />
          
          {/* Credit routes */}
          <Route path="/credits/purchase" element={
            <ProtectedRoute>
              <PurchaseCreditsPage />
            </ProtectedRoute>
          } />
          
          <Route path="/credits/history" element={
            <ProtectedRoute>
              <CreditHistoryPage />
            </ProtectedRoute>
          } />
          
          <Route path="/credits/receipt/:id" element={
            <ProtectedRoute>
              <ReceiptPage />
            </ProtectedRoute>
          } />
          
          {/* Attendance routes */}
          <Route path="/attendance" element={
            <ProtectedRoute>
              <AttendancePage />
            </ProtectedRoute>
          } />
          
          {/* Settings routes */}
          <Route path="/settings" element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          } />
          
          {/* Reports routes */}
          <Route path="/reports" element={
            <ProtectedRoute>
              <ReportsPage />
            </ProtectedRoute>
          } />
          
          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
        </FontLoader>
  )
}

export default App