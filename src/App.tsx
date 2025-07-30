// src/App.tsx
import { Suspense, lazy, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './stores/authStore'
import { useSchoolStore } from './stores/schoolStore'
import { ProtectedRoute } from './components/common/ProtectedRoute'

// Lazy load pages for better performance
const LandingPage = lazy(() => import('./pages/public/LandingPage'))
const Login = lazy(() => import('./pages/auth/Login'))
const Dashboard = lazy(() => import('./pages/dashboard/Dashboard'))
const StudentsPage = lazy(() => import('./pages/students/StudentsPage'))
const AddStudentPage = lazy(() => import('./pages/students/AddStudentPage'))
const StudentDetailPage = lazy(() => import('./pages/students/StudentDetailPage'))
const CoursesPage = lazy(() => import('./pages/courses/CoursesPage'))
const AddCoursePage = lazy(() => import('./pages/courses/AddCoursePage'))
const CourseDetailPage = lazy(() => import('./pages/courses/CourseDetailPage'))

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
  const { checkAuth, user } = useAuthStore()
  const { loadSchool } = useSchoolStore()
  
  // Check authentication status on app load
  useEffect(() => {
    checkAuth()
  }, [checkAuth])
  
  // Load school data when user is authenticated
  useEffect(() => {
    if (user?.schoolId) {
      loadSchool(user.schoolId)
    }
  }, [user, loadSchool])
  
  return (
    <>
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
          
          {/* Protected routes - ต้อง login ก่อน */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          
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
          
          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  )
}

export default App