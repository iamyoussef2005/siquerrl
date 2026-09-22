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

import Image from 'next/image';

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
    <div className="min-h-screen bg-[#fcfcfd] text-zinc-900 flex flex-col justify-center items-center px-4 py-12 selection:bg-orange-500 selection:text-white relative overflow-hidden">
      {/* خلفية ضوئية برتقالية خافتة وفخمة */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-gradient-to-tr from-orange-400/15 via-amber-300/10 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full relative z-10 space-y-6">
        {/* Header / Brand Logo */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center p-2.5 rounded-3xl bg-white border border-orange-100 shadow-lg shadow-orange-500/10 mb-1 hover:scale-105 transition-transform duration-300">
            <Image
              src="/sinjab-logo.png"
              alt="Sinjab Delivery Logo"
              width={105}
              height={105}
              priority
              className="object-contain rounded-2xl"
            />
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-900">
              سنجاب دليفري
            </h1>
            <p className="text-xs font-semibold text-zinc-500 font-mono tracking-wide mt-0.5">
              SINJAB DELIVERY OPERATIONS
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white border border-zinc-200/90 rounded-3xl p-6 sm:p-8 shadow-xl shadow-zinc-200/50 space-y-5 backdrop-blur-md">
          {/* Error notification */}
          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center gap-2.5 text-xs text-rose-700 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-zinc-700">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-zinc-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  dir="ltr"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@sinjabdelivery.com"
                  className="w-full bg-zinc-50/60 border border-zinc-300 focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 rounded-xl pr-10 pl-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-hidden transition-all text-left font-medium"
                />
              </div>
            </div>

            {/* Password input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-zinc-700">
                كلمة المرور
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-zinc-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  dir="ltr"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-zinc-50/60 border border-zinc-300 focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 rounded-xl pr-10 pl-11 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-hidden transition-all text-left font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit button with Sinjab orange gradient */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-3 py-3 px-4 rounded-xl btn-sinjab-primary font-bold text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري التحقق والدخول...</span>
                </>
              ) : (
                <>
                  <span>تسجيل الدخول إلى النظام</span>
                  <ArrowLeft className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Security notice */}
          <div className="pt-3 border-t border-zinc-100 text-center">
            <p className="text-[11px] text-zinc-400 font-medium">
              سنجاب دليفري • نظام التدقيق اللحظي وإدارة الطلبات السريعة
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-zinc-400">
          Sinjab Delivery System • Realtime Sync Active
        </p>
      </div>
    </div>
  );
}
