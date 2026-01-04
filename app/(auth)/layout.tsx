'use client';

import { usePathname } from 'next/navigation';
import { 
  ClipboardList, 
  Zap,
  Users,
  Shield,
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLogin = pathname === '/login';

  return (
    <div className="min-h-screen flex relative overflow-hidden bg-gray-100">
      {/* Colored Panel - Slides based on route */}
      <div 
        className={`absolute inset-y-0 w-1/2 transition-all duration-700 ease-in-out z-20 hidden lg:block ${
          isLogin ? 'left-0' : 'left-1/2'
        }`}
      >
        <div className={`h-full relative overflow-hidden transition-all duration-700 ${
          isLogin 
            ? 'bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800' 
            : 'bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800'
        }`}>
          {/* Animated Background Elements */}
          <div className="absolute inset-0">
            <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-20 right-20 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse delay-1000" />
            <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-white/5 rounded-full blur-2xl animate-pulse delay-500" />
          </div>
          
          {/* Grid Pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />
          
          {/* Content */}
          <div className="relative z-10 flex flex-col justify-center h-full px-12 xl:px-20">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <ClipboardList className="w-9 h-9 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white">TaskFlow</h1>
                <p className={`transition-colors duration-500 ${isLogin ? 'text-blue-200' : 'text-emerald-200'}`}>
                  Enterprise Edition
                </p>
              </div>
            </div>
            
            {/* Login Panel Content */}
            <div className={`transition-all duration-500 ${isLogin ? 'opacity-100 translate-y-0 relative' : 'opacity-0 translate-y-4 absolute pointer-events-none'}`}>
              <h2 className="text-3xl xl:text-4xl font-bold text-white mb-6 leading-tight">
                ระบบจัดการงาน<br />
                <span className="text-blue-200">และทรัพยากรองค์กร</span>
              </h2>
              
              <p className="text-blue-100 text-lg mb-10 max-w-md">
                แพลตฟอร์มที่ช่วยให้ทีมของคุณทำงานได้อย่างมีประสิทธิภาพ 
                ติดตามงาน จัดการทรัพยากร และบริหารทีมได้ในที่เดียว
              </p>
              
              <div className="space-y-4">
                <div className="flex items-center gap-4 text-white/90">
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                    <Zap className="w-5 h-5" />
                  </div>
                  <span>จัดการงานได้รวดเร็วและง่ายดาย</span>
                </div>
                <div className="flex items-center gap-4 text-white/90">
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                  <span>บริหารทีมและทรัพยากรได้อย่างมีประสิทธิภาพ</span>
                </div>
                <div className="flex items-center gap-4 text-white/90">
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                    <Shield className="w-5 h-5" />
                  </div>
                  <span>ปลอดภัยด้วยระบบยืนยันตัวตน</span>
                </div>
              </div>

              {/* Switch to Register */}
              <div className="mt-12 pt-8 border-t border-white/20">
                <p className="text-white/80 mb-4">ยังไม่มีบัญชี?</p>
                <Link
                  href="/register"
                  className="group inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl text-white font-medium transition-all duration-300"
                >
                  <span>สมัครสมาชิก</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>

            {/* Register Panel Content */}
            <div className={`transition-all duration-500 ${!isLogin ? 'opacity-100 translate-y-0 relative' : 'opacity-0 -translate-y-4 absolute pointer-events-none'}`}>
              <h2 className="text-3xl xl:text-4xl font-bold text-white mb-6 leading-tight">
                เข้าร่วมทีมของเรา<br />
                <span className="text-emerald-200">วันนี้</span>
              </h2>
              
              <p className="text-emerald-100 text-lg mb-10 max-w-md">
                สร้างบัญชีเพื่อเริ่มต้นใช้งานระบบจัดการงานและทรัพยากรที่ทันสมัย
                ที่ช่วยให้ทีมของคุณทำงานได้อย่างมีประสิทธิภาพ
              </p>

              <div className="space-y-4">
                <div className="flex items-center gap-4 text-white/90">
                  <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <span>ใช้งานฟรีไม่มีค่าใช้จ่าย</span>
                </div>
                <div className="flex items-center gap-4 text-white/90">
                  <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <span>ตั้งค่าง่ายภายใน 5 นาที</span>
                </div>
                <div className="flex items-center gap-4 text-white/90">
                  <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <span>รองรับทุกอุปกรณ์</span>
                </div>
              </div>

              {/* Switch to Login */}
              <div className="mt-12 pt-8 border-t border-white/20">
                <p className="text-white/80 mb-4">มีบัญชีอยู่แล้ว?</p>
                <Link
                  href="/login"
                  className="group inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl text-white font-medium transition-all duration-300"
                >
                  <span>เข้าสู่ระบบ</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form Container with slide animation */}
      <div className="flex w-full min-h-screen">
        {/* Left side spacer for login (when colored panel is on left) */}
        <div className={`hidden lg:block transition-all duration-700 ease-in-out ${
          isLogin ? 'w-1/2' : 'w-0'
        }`} />
        
        {/* Form content */}
        <div className={`w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-gradient-to-b from-gray-50 to-gray-100 transition-all duration-700 ease-in-out`}>
          {children}
        </div>
        
        {/* Right side spacer for register (when colored panel is on right) */}
        <div className={`hidden lg:block transition-all duration-700 ease-in-out ${
          !isLogin ? 'w-1/2' : 'w-0'
        }`} />
      </div>
    </div>
  );
}
