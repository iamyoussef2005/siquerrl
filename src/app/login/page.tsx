'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowLeft,
  Loader2,
  AlertCircle,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, user, role, isLoading: isAuthLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // If already authenticated, redirect based on role
  useEffect(() => {
    if (!isAuthLoading && user) {
      if (role === 'admin') {
        router.replace('/');
      } else if (role === 'call_center') {
        router.replace('/call-center');
      }
    }
  }, [user, role, isAuthLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password.trim()) {
      setErrorMessage('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }

    setIsSubmitting(true);
    try {
      const { profile } = await login(email.trim(), password);

      // Redirect according to user role
      if (profile?.role === 'admin') {
        router.replace('/');
      } else if (profile?.role === 'call_center') {
        router.replace('/call-center');
      } else {
        setErrorMessage('عذراً، تطبيق الويب مخصص لحسابات الإدارة والكول سنتر فقط.');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.message?.includes('Invalid login credentials')) {
        setErrorMessage('البريد الإلكتروني أو كلمة المرور غير صحيحة');
      } else {
        setErrorMessage(err.message || 'حدث خطأ أثناء تسجيل الدخول، يرجى المحاولة مجدداً');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center items-center px-4 py-12 selection:bg-blue-100 selection:text-blue-900 relative">
      <div className="max-w-md w-full relative z-10 space-y-6">
        {/* Header / Logo */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 mb-1 shadow-xs">
            <ShieldCheck className="w-6 h-6" />
          </div>

          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            تسجيل الدخول للنظام
          </h1>
          <p className="text-xs text-slate-500 font-normal">
            منظومة إدارة وتوزيع الطلبات والتدقيق المالي اللحظي
          </p>
        </div>

        {/* Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-5">
          {/* Error notification */}
          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center gap-2.5 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  dir="ltr"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@delivery.com"
                  className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 rounded-xl pr-10 pl-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden transition-all text-left"
                />
              </div>
            </div>

            {/* Password input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                كلمة المرور
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  dir="ltr"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 rounded-xl pr-10 pl-11 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden transition-all text-left"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري التحقق...</span>
                </>
              ) : (
                <>
                  <span>تسجيل الدخول</span>
                  <ArrowLeft className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Security notice */}
          <div className="pt-3 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-400">
              الدخول مقيد للمصرح لهم فقط • منظومة التدقيق المالي وإدارة العمليات
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-slate-400">
          Supabase Row-Level Security (RLS) Active
        </p>
      </div>
    </div>
  );
}
