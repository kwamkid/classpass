// src/components/features/courses/CourseMultiSelect.tsx

import { useState, useEffect } from 'react'
import { 
  Check, 
  ChevronDown, 
  Search,
  X,
  BookOpen,
  Globe,
  CheckCircle2,
  Circle
} from 'lucide-react'
import * as courseService from '../../../services/course'

interface CourseMultiSelectProps {
  schoolId: string
  selectedCourseIds: string[]
  isUniversal: boolean
  onChange: (courseIds: string[], isUniversal: boolean) => void
  error?: string
}

export const CourseMultiSelect = ({ 
  schoolId, 
  selectedCourseIds, 
  isUniversal,
  onChange,
  error
}: CourseMultiSelectProps) => {
  const [courses, setCourses] = useState<courseService.Course[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    loadCourses()
  }, [schoolId])

  const loadCourses = async () => {
    try {
      const data = await courseService.getCourses(schoolId, 'active')
      setCourses(data)
    } catch (error) {
      console.error('Error loading courses:', error)
    } finally {
      setLoading(false)
    }
  }

  // Group courses by category
  const groupedCourses = courses.reduce((acc, course) => {
    if (!acc[course.category]) {
      acc[course.category] = []
    }
    acc[course.category].push(course)
    return acc
  }, {} as Record<string, courseService.Course[]>)

  const categoryConfig = {
    academic: { label: 'วิชาการ', icon: '📚', color: 'blue' },
    sport: { label: 'กีฬา', icon: '⚽', color: 'green' },
    art: { label: 'ศิลปะ', icon: '🎨', color: 'purple' },
    language: { label: 'ภาษา', icon: '💬', color: 'yellow' },
    other: { label: 'อื่นๆ', icon: '📌', color: 'gray' }
  }

  const handleUniversalChange = (checked: boolean) => {
    onChange([], checked)
    setIsOpen(false)
  }

  const handleCourseToggle = (courseId: string) => {
    if (isUniversal) return

    const newSelection = selectedCourseIds.includes(courseId)
      ? selectedCourseIds.filter(id => id !== courseId)
      : [...selectedCourseIds, courseId]

    onChange(newSelection, false)
  }

  const handleSelectAll = () => {
    if (isUniversal) return
    
    if (selectedCourseIds.length === courses.length) {
      onChange([], false)
    } else {
      onChange(courses.map(c => c.id), false)
    }
  }

  const handleSelectCategory = (category: string) => {
    if (isUniversal) return

    const categoryCoursesIds = groupedCourses[category].map(c => c.id)
    const allSelected = categoryCoursesIds.every(id => selectedCourseIds.includes(id))

    if (allSelected) {
      const newSelection = selectedCourseIds.filter(id => !categoryCoursesIds.includes(id))
      onChange(newSelection, false)
    } else {
      const newSelection = [...new Set([...selectedCourseIds, ...categoryCoursesIds])]
      onChange(newSelection, false)
    }
  }

  const getSelectedCoursesLabel = () => {
    if (isUniversal) return 'ใช้ได้กับทุกวิชา'
    if (selectedCourseIds.length === 0) return 'เลือกวิชาที่ใช้ได้'
    if (selectedCourseIds.length === courses.length) return `เลือกทุกวิชา (${courses.length} วิชา)`
    if (selectedCourseIds.length === 1) {
      const course = courses.find(c => c.id === selectedCourseIds[0])
      return course?.name || 'เลือกแล้ว 1 วิชา'
    }
    return `เลือกแล้ว ${selectedCourseIds.length} จาก ${courses.length} วิชา`
  }

  const filteredCourses = searchTerm
    ? courses.filter(course => 
        course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.code.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : courses

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-50 text-blue-700 border-blue-200',
      green: 'bg-green-50 text-green-700 border-green-200',
      purple: 'bg-purple-50 text-purple-700 border-purple-200',
      yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      gray: 'bg-gray-50 text-gray-700 border-gray-200',
      orange: 'bg-orange-50 text-orange-700 border-orange-200'
    }
    return colors[color as keyof typeof colors] || colors.gray
  }

  return (
    <div className="space-y-4">
      {/* Universal vs Select Courses Toggle */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => handleUniversalChange(true)}
          className={`
            relative p-4 rounded-lg border-2 transition-all cursor-pointer
            ${isUniversal 
              ? 'border-orange-500 bg-orange-50' 
              : 'border-gray-200 bg-white hover:border-gray-300'
            }
          `}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Globe className={`w-5 h-5 ${isUniversal ? 'text-orange-600' : 'text-gray-500'}`} />
              <div className="text-left">
                <p className={`font-medium ${isUniversal ? 'text-orange-900' : 'text-gray-900'}`}>
                  ใช้ได้ทุกวิชา
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  แพ็คเกจนี้ใช้ได้กับทุกวิชาในโรงเรียน
                </p>
              </div>
            </div>
            {isUniversal && (
              <CheckCircle2 className="w-5 h-5 text-orange-600 absolute top-3 right-3" />
            )}
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleUniversalChange(false)}
          className={`
            relative p-4 rounded-lg border-2 transition-all cursor-pointer
            ${!isUniversal 
              ? 'border-orange-500 bg-orange-50' 
              : 'border-gray-200 bg-white hover:border-gray-300'
            }
          `}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <BookOpen className={`w-5 h-5 ${!isUniversal ? 'text-orange-600' : 'text-gray-500'}`} />
              <div className="text-left">
                <p className={`font-medium ${!isUniversal ? 'text-orange-900' : 'text-gray-900'}`}>
                  เลือกวิชา
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  กำหนดวิชาที่ใช้ได้เอง
                </p>
              </div>
            </div>
            {!isUniversal && (
              <CheckCircle2 className="w-5 h-5 text-orange-600 absolute top-3 right-3" />
            )}
          </div>
        </button>
      </div>

      {/* Course Selector */}
      {!isUniversal && (
        <div className="space-y-3">
          {/* Dropdown Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className={`
                w-full px-4 py-3 text-left bg-white border-2 rounded-lg shadow-sm
                transition-all focus:outline-none focus:ring-2 focus:ring-orange-500
                ${error ? 'border-red-300' : 'border-gray-200 hover:border-gray-300'}
                ${isOpen ? 'ring-2 ring-orange-500 border-orange-500' : ''}
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <BookOpen className="w-5 h-5 text-gray-400" />
                  <span className={`${selectedCourseIds.length === 0 ? 'text-gray-400' : 'text-gray-900'}`}>
                    {getSelectedCoursesLabel()}
                  </span>
                </div>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {error && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <X className="w-4 h-4 mr-1" />
                {error}
              </p>
            )}

            {/* Dropdown Menu */}
            {isOpen && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setIsOpen(false)}
                />
                <div className="absolute z-20 mt-2 w-full bg-white border-2 border-gray-200 rounded-lg shadow-xl">
                  {/* Search Bar */}
                  <div className="p-3 border-b border-gray-100">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="ค้นหาวิชา..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>

                  {/* Select All Option */}
                  <div className="px-3 py-2 border-b border-gray-100">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      <span className="text-sm font-medium text-gray-700">
                        เลือกทั้งหมด
                      </span>
                      <span className="text-xs text-gray-500">
                        {selectedCourseIds.length}/{courses.length}
                      </span>
                    </button>
                  </div>

                  {/* Course List */}
                  <div className="max-h-80 overflow-y-auto p-3">
                    {searchTerm ? (
                      // Search Results
                      <div className="space-y-1">
                        {filteredCourses.length === 0 ? (
                          <p className="text-center py-8 text-gray-500 text-sm">
                            ไม่พบวิชาที่ค้นหา
                          </p>
                        ) : (
                          filteredCourses.map(course => {
                            const category = categoryConfig[course.category as keyof typeof categoryConfig]
                            return (
                              <label
                                key={course.id}
                                className="flex items-center px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer transition-colors"
                              >
                                <div className="relative flex items-center justify-center w-5 h-5 mr-3">
                                  <input
                                    type="checkbox"
                                    checked={selectedCourseIds.includes(course.id)}
                                    onChange={() => handleCourseToggle(course.id)}
                                    className="sr-only"
                                  />
                                  {selectedCourseIds.includes(course.id) ? (
                                    <CheckCircle2 className="w-5 h-5 text-orange-600" />
                                  ) : (
                                    <Circle className="w-5 h-5 text-gray-300" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900">
                                    {course.name}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {course.code} • {category.label}
                                  </p>
                                </div>
                                <span className="text-lg ml-2">{category.icon}</span>
                              </label>
                            )
                          })
                        )}
                      </div>
                    ) : (
                      // Grouped by Category
                      <div className="space-y-4">
                        {Object.entries(groupedCourses).map(([category, categoryCourses]) => {
                          const config = categoryConfig[category as keyof typeof categoryConfig]
                          const selectedInCategory = categoryCourses.filter(c => 
                            selectedCourseIds.includes(c.id)
                          ).length

                          return (
                            <div key={category}>
                              <div className="flex items-center justify-between mb-2">
                                <button
                                  type="button"
                                  onClick={() => handleSelectCategory(category)}
                                  className="flex items-center space-x-2 text-sm font-medium text-gray-700 hover:text-orange-600 transition-colors"
                                >
                                  <span className="text-lg">{config.icon}</span>
                                  <span>{config.label}</span>
                                  <span className="text-xs text-gray-500">
                                    ({selectedInCategory}/{categoryCourses.length})
                                  </span>
                                </button>
                              </div>
                              <div className="space-y-1 ml-7">
                                {categoryCourses.map(course => (
                                  <label
                                    key={course.id}
                                    className="flex items-center px-3 py-2 hover:bg-gray-50 rounded-md cursor-pointer transition-colors"
                                  >
                                    <div className="relative flex items-center justify-center w-5 h-5 mr-3">
                                      <input
                                        type="checkbox"
                                        checked={selectedCourseIds.includes(course.id)}
                                        onChange={() => handleCourseToggle(course.id)}
                                        className="sr-only"
                                      />
                                      {selectedCourseIds.includes(course.id) ? (
                                        <CheckCircle2 className="w-5 h-5 text-orange-600" />
                                      ) : (
                                        <Circle className="w-5 h-5 text-gray-300" />
                                      )}
                                    </div>
                                    <div className="flex-1">
                                      <p className="text-sm text-gray-900">{course.name}</p>
                                      <p className="text-xs text-gray-500">{course.code}</p>
                                    </div>
                                  </label>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Selected Courses Tags */}
          {selectedCourseIds.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedCourseIds.slice(0, 5).map(id => {
                const course = courses.find(c => c.id === id)
                if (!course) return null
                const config = categoryConfig[course.category as keyof typeof categoryConfig]
                
                return (
                  <span
                    key={id}
                    className={`
                      inline-flex items-center px-3 py-1 rounded-full text-xs font-medium
                      border ${getColorClasses(config.color)}
                    `}
                  >
                    <span className="mr-1">{config.icon}</span>
                    {course.name}
                    <button
                      type="button"
                      onClick={() => handleCourseToggle(id)}
                      className="ml-2 hover:opacity-75 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )
              })}
              {selectedCourseIds.length > 5 && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                  +{selectedCourseIds.length - 5} วิชา
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}