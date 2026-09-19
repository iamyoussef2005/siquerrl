'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/database';
import { Loader2, ShieldAlert, LogOut } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles = ['admin'] }: ProtectedRouteProps) {
  const { user, role, isLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    // If not authenticated, redirect to login
    if (!user) {
      router.replace('/login');
      return;
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#090d16] flex flex-col items-center justify-center text-slate-100 p-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-2xl bg-purple-600/20 border border-purple-500/40 animate-pulse flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
          </div>
        </div>
        <p className="mt-4 text-xs font-semibold text-slate-400">جاري التحقق من صلاحيات المدير...</p>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return null;
  }

  // Role check: Admin only by default
  const isAllowed = role && allowedRoles.includes(role);
  if (!isAllowed) {
    return (
      <div className="min-h-screen bg-[#090d16] flex flex-col items-center justify-center text-slate-100 p-4">
        <div className="bg-slate-900 border border-red-500/30 rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-full bg-red-500/10 text-red-400 mx-auto flex items-center justify-center">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-white">صلاحيات غير كافية</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            هذه اللوحة مخصصة لإدارة العمليات فقط (Admin). حسابك الحالي ({role || 'غير محدد'}) لا يمتلك صلاحيات المدير.
          </p>
          <button
            onClick={() => {
              logout();
              router.replace('/login');
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>تسجيل الخروج والتبديل إلى حساب المدير</span>
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
