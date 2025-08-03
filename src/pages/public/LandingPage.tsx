import { Link } from 'react-router-dom'
import { 
  CreditCard, 
  Users, 
  BarChart3, 
  Shield,
  ArrowRight,
  CheckCircle 
} from 'lucide-react'

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <img 
                src="/logo.svg" 
                alt="ClassPass Logo"
                className="w-8 h-8 mr-3"
              />
              <h1 className="text-2xl font-bold text-primary-600">ClassPass</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link 
                to="/login" 
                className="text-gray-700 hover:text-primary-600 font-medium"
              >
                เข้าสู่ระบบ
              </Link>
              <Link 
                to="/register" 
                className="btn-primary"
              >
                เริ่มต้นใช้งาน
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section with Banner */}
      <section className="pt-20 pb-32 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Banner Image */}
          <div className="mb-12 rounded-2xl overflow-hidden shadow-2xl">
            <img 
              src="/banner-01.jpg" 
              alt="ClassPass Banner" 
              className="w-full h-auto object-cover"
            />
          </div>
          
          {/* Hero Content */}
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              ระบบจัดการโรงเรียนสอนพิเศษ
              <span className="text-gradient block mt-2">ที่ใช้งานง่ายที่สุด</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              จัดการนักเรียน ตารางเรียน และระบบเครดิต ได้ในที่เดียว 
              ด้วยระบบที่ออกแบบมาเพื่อโรงเรียนสอนพิเศษโดยเฉพาะ
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register" className="btn-primary text-lg px-8 py-3">
                สมัครใช้งานฟรีตลอดชีพ!
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
              <button className="btn-secondary text-lg px-8 py-3">
                ดูตัวอย่างการใช้งาน
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            ฟีเจอร์ที่ตอบโจทย์ทุกความต้องการ
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard
              icon={<CreditCard className="w-10 h-10 text-primary-500" />}
              title="ระบบเครดิตยืดหยุ่น"
              description="จัดการแพ็คเกจเรียน เครดิต และการชำระเงินได้อย่างง่ายดาย"
            />
            <FeatureCard
              icon={<Users className="w-10 h-10 text-primary-500" />}
              title="จัดการนักเรียน"
              description="เก็บข้อมูลนักเรียน ผู้ปกครอง และประวัติการเรียนครบถ้วน"
            />
            <FeatureCard
              icon={<BarChart3 className="w-10 h-10 text-primary-500" />}
              title="รายงานแบบ Real-time"
              description="ดูสถิติ รายได้ และการเข้าเรียนได้ทันที"
            />
            <FeatureCard
              icon={<Shield className="w-10 h-10 text-primary-500" />}
              title="ปลอดภัย"
              description="ข้อมูลถูกเข้ารหัสและแยกกันอย่างปลอดภัย"
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-orange-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            เริ่มต้นใช้งานง่ายๆ ใน 4 ขั้นตอน
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { step: 1, title: "สมัครใช้งาน", desc: "กรอกข้อมูลโรงเรียน" },
              { step: 2, title: "ตั้งค่าวิชาเรียน", desc: "สร้างคอร์สและตารางเรียน" },
              { step: 3, title: "เพิ่มนักเรียน", desc: "นำเข้าข้อมูลนักเรียน" },
              { step: 4, title: "เริ่มใช้งาน", desc: "จัดการเครดิตและเช็คชื่อ" }
            ].map((item, index) => (
              <div key={item.step} className="text-center">
                <div className="w-16 h-16 bg-primary-500 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.desc}</p>
                {index < 3 && (
                  <ArrowRight className="w-6 h-6 text-primary-400 mx-auto mt-4 hidden md:block" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">
            ราคาที่คุ้มค่า เริ่มต้นเพียง
          </h2>
          <p className="text-center text-gray-600 mb-12">
            ทดลองใช้ฟรี 30 วัน ไม่ต้องใช้บัตรเครดิต
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <PricingCard
              name="Free"
              price="0"
              features={[
                "นักเรียนสูงสุด 50 คน",
                "ผู้ใช้งาน 3 คน",
                "พื้นที่เก็บข้อมูล 1 GB",
                "ฟีเจอร์พื้นฐาน"
              ]}
            />
            <PricingCard
              name="Basic"
              price="299"
              popular={true}
              features={[
                "นักเรียนสูงสุด 200 คน",
                "ผู้ใช้งาน 10 คน",
                "พื้นที่เก็บข้อมูล 5 GB",
                "ทุกฟีเจอร์",
                "Email support"
              ]}
            />
            <PricingCard
              name="Pro"
              price="599"
              features={[
                "นักเรียนไม่จำกัด",
                "ผู้ใช้งานไม่จำกัด",
                "พื้นที่เก็บข้อมูล 20 GB",
                "ทุกฟีเจอร์",
                "Priority support",
                "API access"
              ]}
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-2xl font-bold mb-4">ClassPass</h3>
              <p className="text-gray-400">
                ระบบจัดการโรงเรียนสอนพิเศษที่ใช้งานง่ายที่สุด
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">ผลิตภัณฑ์</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">ฟีเจอร์</a></li>
                <li><a href="#" className="hover:text-white">ราคา</a></li>
                <li><a href="#" className="hover:text-white">ตัวอย่าง</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">บริษัท</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">เกี่ยวกับเรา</a></li>
                <li><a href="#" className="hover:text-white">ติดต่อ</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">ช่วยเหลือ</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">คู่มือการใช้งาน</a></li>
                <li><a href="#" className="hover:text-white">FAQ</a></li>
                <li><a href="#" className="hover:text-white">Support</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 ClassPass. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

// Feature Card Component
const FeatureCard = ({ icon, title, description }: {
  icon: React.ReactNode
  title: string
  description: string
}) => (
  <div className="text-center p-6 rounded-lg hover:shadow-lg transition-shadow">
    <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
      {icon}
    </div>
    <h3 className="text-lg font-semibold mb-2">{title}</h3>
    <p className="text-gray-600">{description}</p>
  </div>
)

// Pricing Card Component
const PricingCard = ({ name, price, features, popular = false }: {
  name: string
  price: string
  features: string[]
  popular?: boolean
}) => (
  <div className={`card p-8 ${popular ? 'border-2 border-primary-500 relative' : ''}`}>
    {popular && (
      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
        <span className="bg-primary-500 text-white px-4 py-1 rounded-full text-sm font-medium">
          ยอดนิยม
        </span>
      </div>
    )}
    <h3 className="text-2xl font-bold text-center mb-2">{name}</h3>
    <div className="text-center mb-6">
      <span className="text-4xl font-bold">฿{price}</span>
      <span className="text-gray-600">/เดือน</span>
    </div>
    <ul className="space-y-3 mb-8">
      {features.map((feature, index) => (
        <li key={index} className="flex items-start">
          <CheckCircle className="w-5 h-5 text-success-500 mr-2 flex-shrink-0 mt-0.5" />
          <span className="text-gray-700">{feature}</span>
        </li>
      ))}
    </ul>
    <button className={`w-full ${popular ? 'btn-primary' : 'btn-outline'}`}>
      เริ่มต้นใช้งาน
    </button>
  </div>
)

export default LandingPage