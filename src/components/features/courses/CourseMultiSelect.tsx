// src/components/features/courses/CourseMultiSelect.tsx

import { useState, useEffect } from 'react'
import { 
  Check, 
  ChevronDown, 
  Search,
  X,
  BookOpen
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
  const [activeTab, setActiveTab] = useState<'category' | 'search'>('category')

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

  const categoryLabels = {
    academic: { label: 'วิชาการ', icon: '📚' },
    sport: { label: 'กีฬา', icon: '⚽' },
    art: { label: 'ศิลปะ', icon: '🎨' },
    language: { label: 'ภาษา', icon: '💬' },
    other: { label: 'อื่นๆ', icon: '📌' }
  }

  const handleUniversalChange = (checked: boolean) => {
    onChange([], checked)
    if (!checked && courses.length > 0) {
      // ถ้าเปลี่ยนจาก universal เป็นเลือกเอง ให้เลือกวิชาแรกไปก่อน
      onChange([courses[0].id], false)
    }
  }

  const handleCourseToggle = (courseId: string) => {
    if (isUniversal) return

    const newSelection = selectedCourseIds.includes(courseId)
      ? selectedCourseIds.filter(id => id !== courseId)
      : [...selectedCourseIds, courseId]

    onChange(newSelection, false)
  }

  const handleSelectAll = (category: string) => {
    if (isUniversal) return

    const categoryCoursesIds = groupedCourses[category].map(c => c.id)
    const allSelected = categoryCoursesIds.every(id => selectedCourseIds.includes(id))

    if (allSelected) {
      // Deselect all in category
      const newSelection = selectedCourseIds.filter(id => !categoryCoursesIds.includes(id))
      onChange(newSelection, false)
    } else {
      // Select all in category
      const newSelection = [...new Set([...selectedCourseIds, ...categoryCoursesIds])]
      onChange(newSelection, false)
    }
  }

  const getSelectedCoursesLabel = () => {
    if (isUniversal) return 'ใช้ได้ทุกวิชา'
    if (selectedCourseIds.length === 0) return 'กรุณาเลือกวิชา'
    if (selectedCourseIds.length === 1) {
      const course = courses.find(c => c.id === selectedCourseIds[0])
      return course?.name || 'เลือกแล้ว 1 วิชา'
    }
    return `เลือกแล้ว ${selectedCourseIds.length} วิชา`
  }

  const filteredCourses = searchTerm
    ? courses.filter(course => 
        course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.code.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : courses

  return (
    <div className="relative">
      <label className="block text-base font-medium text-gray-700 mb-2">
        วิชาที่ใช้ได้ <span className="text-red-500">*</span>
      </label>

      {/* Universal Option */}
      <div className="mb-3 p-3 bg-gray-50 rounded-lg">
        <label className="flex items-center cursor-pointer">
          <input
            type="radio"
            name="courseSelection"
            checked={isUniversal}
            onChange={(e) => handleUniversalChange(true)}
            className="w-4 h-4 text-primary-600"
          />
          <span className="ml-2 text-base">ใช้ได้กับทุกวิชา</span>
        </label>
        <label className="flex items-center cursor-pointer mt-2">
          <input
            type="radio"
            name="courseSelection"
            checked={!isUniversal}
            onChange={(e) => handleUniversalChange(false)}
            className="w-4 h-4 text-primary-600"
          />
          <span className="ml-2 text-base">เลือกวิชาที่ใช้ได้</span>
        </label>
      </div>

      {/* Course Selector */}
      {!isUniversal && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={`
              w-full px-4 py-2 text-left bg-white border rounded-md shadow-sm
              focus:outline-none focus:ring-2 focus:ring-primary-500
              ${error ? 'border-red-300' : 'border-gray-300'}
            `}
          >
            <div className="flex items-center justify-between">
              <span className={selectedCourseIds.length === 0 ? 'text-gray-400' : ''}>
                {getSelectedCoursesLabel()}
              </span>
              <ChevronDown className="w-5 h-5 text-gray-400" />
            </div>
          </button>

          {error && (
            <p className="mt-1 text-sm text-red-600">{error}</p>
          )}

          {/* Dropdown */}
          {isOpen && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setIsOpen(false)}
              />
              <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-96 overflow-hidden">
                {/* Tabs */}
                <div className="flex border-b sticky top-0 bg-white">
                  <button
                    type="button"
                    onClick={() => setActiveTab('category')}
                    className={`flex-1 px-4 py-2 text-sm font-medium ${
                      activeTab === 'category' 
                        ? 'text-primary-600 border-b-2 border-primary-600' 
                        : 'text-gray-700'
                    }`}
                  >
                    ตามประเภท
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('search')}
                    className={`flex-1 px-4 py-2 text-sm font-medium ${
                      activeTab === 'search' 
                        ? 'text-primary-600 border-b-2 border-primary-600' 
                        : 'text-gray-700'
                    }`}
                  >
                    ค้นหา
                  </button>
                </div>

                <div className="overflow-y-auto max-h-80">
                  {/* Category Tab */}
                  {activeTab === 'category' && (
                    <div className="p-2">
                      {Object.entries(groupedCourses).map(([category, categoryCourses]) => {
                        const categoryInfo = categoryLabels[category as keyof typeof categoryLabels]
                        const allSelected = categoryCourses.every(c => 
                          selectedCourseIds.includes(c.id)
                        )

                        return (
                          <div key={category} className="mb-4">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-sm font-medium text-gray-700">
                                <span className="mr-1">{categoryInfo?.icon}</span>
                                {categoryInfo?.label} ({categoryCourses.length})
                              </h4>
                              <button
                                type="button"
                                onClick={() => handleSelectAll(category)}
                                className="text-xs text-primary-600 hover:text-primary-700"
                              >
                                {allSelected ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด'}
                              </button>
                            </div>
                            <div className="space-y-1">
                              {categoryCourses.map(course => (
                                <label
                                  key={course.id}
                                  className="flex items-center px-3 py-2 hover:bg-gray-50 rounded cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedCourseIds.includes(course.id)}
                                    onChange={() => handleCourseToggle(course.id)}
                                    className="w-4 h-4 text-primary-600 rounded"
                                  />
                                  <span className="ml-2 text-sm">
                                    {course.name} ({course.code})
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Search Tab */}
                  {activeTab === 'search' && (
                    <div className="p-2">
                      <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="ค้นหาวิชา..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm"
                          autoFocus
                        />
                      </div>
                      <div className="space-y-1">
                        {filteredCourses.map(course => (
                          <label
                            key={course.id}
                            className="flex items-center px-3 py-2 hover:bg-gray-50 rounded cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedCourseIds.includes(course.id)}
                              onChange={() => handleCourseToggle(course.id)}
                              className="w-4 h-4 text-primary-600 rounded"
                            />
                            <span className="ml-2 text-sm">
                              {course.name} ({course.code})
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Selected Courses Summary */}
      {!isUniversal && selectedCourseIds.length > 0 && (
        <div className="mt-3 p-3 bg-orange-50 rounded-lg">
          <p className="text-sm font-medium text-gray-700 mb-2">
            วิชาที่เลือก ({selectedCourseIds.length}):
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedCourseIds.map(id => {
              const course = courses.find(c => c.id === id)
              if (!course) return null
              return (
                <span
                  key={id}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-200 text-orange-800"
                >
                  {course.name}
                  <button
                    type="button"
                    onClick={() => handleCourseToggle(id)}
                    className="ml-1 hover:text-orange-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}