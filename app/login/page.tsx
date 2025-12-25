'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button, Input } from '@/components/ui';
import { ClipboardList, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

  return (
    <div className="min-h-screen flex items-center justify-center px-4 text-gray-800">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#2D5BFF] to-[#5C7FFF] rounded-3xl mb-4 shadow-2xl shadow-[#2D5BFF]/40">
            <ClipboardList className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-[#2D5BFF] to-[#5C7FFF] bg-clip-text text-transparent">TaskFlow</h1>
          <p className="text-gray-900 mt-2 font-medium">ระบบจัดการงานและทรัพยากร</p>
        </div>

        {/* Login Form */}
        <div className="bg-white/60 backdrop-blur-xl rounded-3xl shadow-glass border border-white/20 p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">เข้าสู่ระบบ</h2>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              type="email"
              label="อีเมล"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              autoComplete="email"
            />

            <Input
              type="password"
              label="รหัสผ่าน"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-900">จดจำฉัน</span>
              </label>
              <a href="#" className="text-sm text-blue-600 hover:text-blue-700">
                ลืมรหัสผ่าน?
              </a>
            </div>

            <Button type="submit" className="w-full" isLoading={isLoading}>
              เข้าสู่ระบบ
            </Button>
          </form>

          {/* Demo Accounts */}
          <div className="mt-6 pt-6 border-t border-white/20">
            <p className="text-xs text-gray-900 text-center mb-3 font-semibold">
              บัญชีทดสอบ (Demo)
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-white/40 backdrop-blur-sm rounded-lg border border-white/20">
                <span className="font-medium">Admin:</span>
                <br />admin@demo.com
              </div>
              <div className="p-2 bg-white/40 backdrop-blur-sm rounded-lg border border-white/20">
                <span className="font-medium">Finance:</span>
                <br />finance@demo.com
              </div>
              <div className="p-2 bg-white/40 backdrop-blur-sm rounded-lg border border-white/20">
                <span className="font-medium">HeadTech:</span>
                <br />headtech@demo.com
              </div>
              <div className="p-2 bg-white/40 backdrop-blur-sm rounded-lg border border-white/20">
                <span className="font-medium">Tech:</span>
                <br />tech@demo.com
              </div>
            </div>
            <p className="text-xs text-gray-900 text-center mt-2">
              รหัสผ่าน: demo123
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
