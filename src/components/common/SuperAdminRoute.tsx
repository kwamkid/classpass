// src/components/common/SuperAdminRoute.tsx
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'

interface SuperAdminRouteProps {
  children: React.ReactNode
}

export default function SuperAdminRoute({ children }: SuperAdminRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuthStore()
  
  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">กำลังตรวจสอบสิทธิ์...</p>
        </div>
      </div>
    )
  }
  
  // Check if user is authenticated and is super admin
  if (!isAuthenticated || !user) {
    return <Navigate to="/superadmin" replace />
  }
  
  // Check if user has super admin privileges
  if (!user.isSuperAdmin && user.role !== 'superadmin') {
    console.warn('Unauthorized access attempt to super admin area by:', user.email)
    return <Navigate to="/" replace />
  }
  
  // User is super admin, allow access
  return <>{children}</>
}