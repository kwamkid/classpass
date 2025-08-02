// src/pages/superadmin/SeedDemoPage.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Database, Loader2, CheckCircle, AlertCircle, Users, School, BookOpen, CreditCard } from 'lucide-react'
import seedDemoAccounts from '../../scripts/seedDemoAccounts'
import toast from 'react-hot-toast'

const SeedDemoPage = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [seedResult, setSeedResult] = useState<any>(null)
  const [error, setError] = useState<string>('')
  
  const handleSeed = async () => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะสร้าง Demo Accounts? การดำเนินการนี้จะสร้างข้อมูลตัวอย่างในระบบ')) {
      return
    }
    
    setLoading(true)
    setError('')
    setSeedResult(null)
    
    try {
      const result = await seedDemoAccounts()
      setSeedResult(result)
      toast.success('สร้าง Demo Accounts สำเร็จ!')
    } catch (err: any) {
      console.error('Seed error:', err)
      setError(err.message || 'เกิดข้อผิดพลาดในการสร้าง Demo Accounts')
      toast.error('เกิดข้อผิดพลาด: ' + err.message)
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/superadmin/dashboard')}
            className="text-gray-400 hover:text-white mb-4"
          >
            ← กลับไปหน้า Dashboard
          </button>
          <h1 className="text-3xl font-bold flex items-center">
            <Database className="mr-3" />
            Seed Demo Accounts
          </h1>
          <p className="text-gray-400 mt-2">
            สร้างบัญชีทดลองและข้อมูลตัวอย่างสำหรับการ Demo
          </p>
        </div>
        
        {/* Info Card */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">ข้อมูลที่จะถูกสร้าง:</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-700 rounded p-4">
              <div className="flex items-center mb-2">
                <School className="w-5 h-5 mr-2 text-blue-400" />
                <h3 className="font-medium">โรงเรียน</h3>
              </div>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• โรงเรียนสาธิต ClassPass</li>
                <li>• Plan: Pro (ฟีเจอร์เต็ม)</li>
                <li>• พร้อมข้อมูลติดต่อครบถ้วน</li>
              </ul>
            </div>
            
            <div className="bg-gray-700 rounded p-4">
              <div className="flex items-center mb-2">
                <Users className="w-5 h-5 mr-2 text-green-400" />
                <h3 className="font-medium">บัญชีผู้ใช้</h3>
              </div>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Owner: demo@owner.com</li>
                <li>• Admin: demo@admin.com</li>
                <li>• Teacher: demo@teacher.com</li>
                <li className="text-yellow-400">Password: demo1234</li>
              </ul>
            </div>
            
            <div className="bg-gray-700 rounded p-4">
              <div className="flex items-center mb-2">
                <BookOpen className="w-5 h-5 mr-2 text-purple-400" />
                <h3 className="font-medium">คอร์สเรียน</h3>
              </div>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• คณิตศาสตร์ ม.1</li>
                <li>• ภาษาอังกฤษพื้นฐาน</li>
                <li>• กีตาร์เบื้องต้น</li>
              </ul>
            </div>
            
            <div className="bg-gray-700 rounded p-4">
              <div className="flex items-center mb-2">
                <CreditCard className="w-5 h-5 mr-2 text-orange-400" />
                <h3 className="font-medium">ข้อมูลอื่นๆ</h3>
              </div>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• แพ็คเกจเครดิต 3 แบบ/คอร์ส</li>
                <li>• นักเรียนตัวอย่าง 3 คน</li>
                <li>• พร้อมข้อมูลผู้ปกครอง</li>
              </ul>
            </div>
          </div>
        </div>
        
        {/* Action Button */}
        {!seedResult && (
          <div className="text-center">
            <button
              onClick={handleSeed}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin mr-2" />
                  กำลังสร้างข้อมูล...
                </>
              ) : (
                <>
                  <Database className="mr-2" />
                  สร้าง Demo Accounts
                </>
              )}
            </button>
            
            {error && (
              <div className="mt-4 bg-red-900/50 border border-red-500 rounded-lg p-4 inline-flex items-start">
                <AlertCircle className="w-5 h-5 text-red-400 mr-2 flex-shrink-0 mt-0.5" />
                <div className="text-left">
                  <p className="text-red-400 font-medium">เกิดข้อผิดพลาด</p>
                  <p className="text-red-300 text-sm mt-1">{error}</p>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Success Result */}
        {seedResult && (
          <div className="bg-green-900/50 border border-green-500 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-400 mr-3" />
              <h3 className="text-xl font-semibold text-green-400">
                สร้าง Demo Accounts สำเร็จ!
              </h3>
            </div>
            
            <div className="bg-gray-800 rounded p-4 mb-4">
              <h4 className="font-medium mb-2">School ID:</h4>
              <code className="text-yellow-400">{seedResult.schoolId}</code>
            </div>
            
            <div className="bg-gray-800 rounded p-4">
              <h4 className="font-medium mb-3">บัญชีที่สร้าง:</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center py-2 border-b border-gray-700">
                  <span>Owner</span>
                  <code className="text-yellow-400">demo@owner.com / demo1234</code>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-700">
                  <span>Admin</span>
                  <code className="text-yellow-400">demo@admin.com / demo1234</code>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span>Teacher</span>
                  <code className="text-yellow-400">demo@teacher.com / demo1234</code>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex gap-4">
              <button
                onClick={() => window.open('/login', '_blank')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium"
              >
                ไปหน้า Login
              </button>
              <button
                onClick={() => navigate('/superadmin/dashboard')}
                className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium"
              >
                กลับไป Dashboard
              </button>
            </div>
          </div>
        )}
        
        {/* Warning */}
        <div className="mt-8 bg-yellow-900/50 border border-yellow-600 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-yellow-400 mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-400 font-medium">หมายเหตุ:</p>
              <ul className="text-yellow-300 text-sm mt-1 space-y-1">
                <li>• หากมี email ซ้ำในระบบ จะข้ามการสร้างบัญชีนั้น</li>
                <li>• ควรใช้สำหรับการ Demo เท่านั้น</li>
                <li>• แนะนำให้ลบข้อมูลหลังจาก Demo เสร็จสิ้น</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SeedDemoPage