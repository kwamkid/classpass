// src/components/common/ProtectedRoute.tsx
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: Array<'owner' | 'admin' | 'teacher' | 'superadmin'>
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuthStore()
  const location = useLocation()
  
  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner spinner-primary w-8 h-8 mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังตรวจสอบสิทธิ์...</p>
        </div>
      </div>
    )
  }
  
  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  
  // If user is super admin, redirect to super admin dashboard
  if (user.isSuperAdmin || user.role === 'superadmin') {
    return <Navigate to="/superadmin/dashboard" replace />
  }
  
  // Check role permissions if specified
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">ไม่มีสิทธิ์เข้าถึง</h1>
          <p className="text-gray-600 mb-4">คุณไม่มีสิทธิ์ในการเข้าถึงหน้านี้</p>
          <button 
            onClick={() => window.history.back()}
            className="btn-primary"
          >
            ย้อนกลับ
          </button>
        </div>
      </div>
    )
  }
  
  return <>{children}</>
}