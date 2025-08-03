// src/components/common/UserAvatar.tsx
import React from 'react'

interface UserAvatarProps {
  user?: {
    firstName?: string
    lastName?: string
    displayName?: string
    profileImage?: string
  }
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  showBorder?: boolean
}

const UserAvatar: React.FC<UserAvatarProps> = ({ 
  user, 
  size = 'md', 
  className = '', 
  showBorder = false 
}) => {
  // Size configurations
  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg'
  }

  const borderClass = showBorder ? 'ring-2 ring-white shadow-sm' : ''
  
  // Get initials
  const getInitials = () => {
    if (user?.firstName) {
      const first = user.firstName[0]?.toUpperCase() || ''
      const last = user?.lastName?.[0]?.toUpperCase() || ''
      return first + last
    }
    if (user?.displayName) {
      const names = user.displayName.split(' ')
      if (names.length >= 2) {
        return names[0][0]?.toUpperCase() + names[1][0]?.toUpperCase()
      }
      return names[0][0]?.toUpperCase() || 'U'
    }
    return 'U'
  }

  // Generate consistent colors based on name
  const getAvatarColor = () => {
    const colors = [
      'bg-red-100 text-red-700',
      'bg-orange-100 text-orange-700',
      'bg-amber-100 text-amber-700',
      'bg-yellow-100 text-yellow-700',
      'bg-lime-100 text-lime-700',
      'bg-green-100 text-green-700',
      'bg-emerald-100 text-emerald-700',
      'bg-teal-100 text-teal-700',
      'bg-cyan-100 text-cyan-700',
      'bg-sky-100 text-sky-700',
      'bg-blue-100 text-blue-700',
      'bg-indigo-100 text-indigo-700',
      'bg-violet-100 text-violet-700',
      'bg-purple-100 text-purple-700',
      'bg-fuchsia-100 text-fuchsia-700',
      'bg-pink-100 text-pink-700',
      'bg-rose-100 text-rose-700'
    ]
    
    const name = user?.firstName || user?.displayName || 'User'
    const index = name.charCodeAt(0) % colors.length
    return colors[index]
  }

  return (
    <div className={`
      ${sizeClasses[size]}
      ${getAvatarColor()}
      ${borderClass}
      ${className}
      rounded-full 
      flex 
      items-center 
      justify-center 
      font-semibold 
      select-none
      transition-colors
      duration-200
    `}>
      {getInitials()}
    </div>
  )
}

export default UserAvatar