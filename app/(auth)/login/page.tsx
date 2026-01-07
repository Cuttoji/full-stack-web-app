'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { 
  ClipboardList, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Sparkles
} from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เข้าสู่ระบบไม่สำเร็จ');
    } finally {
      setIsLoading(false);
    }
  };

  const demoAccounts = [
    { role: 'Admin', email: 'admin@example.com', password: 'password123' },
    { role: 'Head Tech', email: 'headtech@example.com', password: 'password123' },
  ];

  const fillDemo = (demoEmail: string, pass: string) => {
    setEmail(demoEmail);
    setPassword(pass);
    setError('');
  };

  return (
    <div className="w-full max-w-md">
      {/* Mobile Logo */}
      <div className="lg:hidden text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl mb-4 shadow-xl shadow-blue-500/30">
          <ClipboardList className="w-9 h-9 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">TaskFlow</h1>
        <p className="text-gray-500 mt-1">ระบบจัดการงานและทรัพยากร</p>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
          ยินดีต้อนรับ 👋
        </h2>
        <p className="text-gray-500 mt-2">
          เข้าสู่ระบบเพื่อจัดการงานของคุณ
        </p>
      </div>

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

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">อีเมล</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            autoComplete="email"
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">รหัสผ่าน</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center cursor-pointer group">
            <input type="checkbox" className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
            <span className="ml-2 text-sm text-gray-600 group-hover:text-gray-900">จดจำฉัน</span>
          </label>
          <Link href="/reset-password" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            ลืมรหัสผ่าน?
          </Link>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>กำลังเข้าสู่ระบบ...</span>
            </>
          ) : (
            <span>เข้าสู่ระบบ</span>
          )}
        </button>
      </form>

      {/* Mobile switch */}
      <p className="mt-6 text-center text-sm text-gray-600 lg:hidden">
        ยังไม่มีบัญชี?{' '}
        <Link href="/register" className="text-blue-600 hover:text-blue-700 font-medium">
          สมัครสมาชิก
        </Link>
      </p>

      <p className="mt-8 text-center text-sm text-gray-500">© 2026 TaskFlow. All rights reserved.</p>
    </div>
  );
}
