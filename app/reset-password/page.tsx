'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { 
  ClipboardList, 
  AlertCircle, 
  Mail,
  ArrowLeft,
  CheckCircle,
  KeyRound,
  ShieldCheck
} from 'lucide-react';

type Step = 'email' | 'sent' | 'reset' | 'success';

export default function ResetPasswordPage() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('กรุณากรอกอีเมล');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('รูปแบบอีเมลไม่ถูกต้อง');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      
      await response.json();
      
      // Always show success to prevent email enumeration
      setStep('sent');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-violet-600 via-violet-700 to-purple-800 relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
          <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-violet-400/10 rounded-full blur-2xl animate-pulse delay-500" />
        </div>
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <ClipboardList className="w-9 h-9 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white">TaskFlow</h1>
              <p className="text-violet-200">Enterprise Edition</p>
            </div>
          </div>
          
          <h2 className="text-3xl xl:text-4xl font-bold text-white mb-6 leading-tight">
            รีเซ็ตรหัสผ่าน<br />
            <span className="text-violet-200">อย่างปลอดภัย</span>
          </h2>
          
          <p className="text-violet-100 text-lg mb-10 max-w-md">
            ไม่ต้องกังวลหากลืมรหัสผ่าน เราจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่
            ไปยังอีเมลของคุณภายในไม่กี่วินาที
          </p>

          {/* Security Features */}
          <div className="space-y-4">
            <div className="flex items-center gap-4 text-white/90">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span>ลิงก์รีเซ็ตใช้ได้ครั้งเดียว</span>
            </div>
            <div className="flex items-center gap-4 text-white/90">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <span>เข้ารหัสข้อมูลด้วย SSL</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Reset Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-gradient-to-b from-gray-50 to-gray-100">
        <div className="w-full max-w-md">
          {/* Back Button */}
          <Link 
            href="/login" 
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">กลับไปหน้าเข้าสู่ระบบ</span>
          </Link>

          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-violet-600 to-purple-700 rounded-2xl mb-4 shadow-xl shadow-violet-500/30">
              <ClipboardList className="w-9 h-9 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">TaskFlow</h1>
          </div>

          {/* Step: Email Input */}
          {step === 'email' && (
            <>
              {/* Icon */}
              <div className="w-16 h-16 bg-violet-100 rounded-2xl flex items-center justify-center mb-6">
                <KeyRound className="w-8 h-8 text-violet-600" />
              </div>

              <div className="mb-6">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  ลืมรหัสผ่าน?
                </h2>
                <p className="text-gray-500 mt-2">
                  กรอกอีเมลที่ใช้ลงทะเบียน เราจะส่งลิงก์สำหรับรีเซ็ตรหัสผ่านให้คุณ
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                  </div>
                  <div>
                    <p className="font-medium text-red-800">เกิดข้อผิดพลาด</p>
                    <p className="text-sm text-red-600 mt-0.5">{error}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleEmailSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    อีเมล
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg shadow-violet-500/30 hover:shadow-xl hover:shadow-violet-500/40 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>กำลังส่ง...</span>
                    </>
                  ) : (
                    <span>ส่งลิงก์รีเซ็ตรหัสผ่าน</span>
                  )}
                </button>
              </form>

              {/* Back to Login */}
              <p className="mt-6 text-center text-sm text-gray-600">
                จำรหัสผ่านได้แล้ว?{' '}
                <Link href="/login" className="text-violet-600 hover:text-violet-700 font-medium">
                  เข้าสู่ระบบ
                </Link>
              </p>
            </>
          )}

          {/* Step: Email Sent */}
          {step === 'sent' && (
            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                ส่งอีเมลแล้ว!
              </h2>
              
              <p className="text-gray-500 mb-2">
                เราได้ส่งลิงก์สำหรับรีเซ็ตรหัสผ่านไปยัง
              </p>
              
              <p className="font-medium text-gray-900 mb-6">
                {email}
              </p>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                <p className="text-sm text-amber-800">
                  <strong>หมายเหตุ:</strong> ลิงก์จะหมดอายุภายใน 1 ชั่วโมง
                  หากไม่พบอีเมล กรุณาตรวจสอบในโฟลเดอร์สแปม
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => setStep('email')}
                  className="w-full py-3 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                >
                  ส่งอีเมลอีกครั้ง
                </button>
                
                <Link
                  href="/login"
                  className="block w-full py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-semibold rounded-xl text-center transition-all"
                >
                  กลับไปหน้าเข้าสู่ระบบ
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
