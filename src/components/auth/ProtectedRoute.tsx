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
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-800 p-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-200 animate-pulse flex items-center justify-center shadow-xs">
            <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
          </div>
        </div>
        <p className="mt-4 text-xs font-semibold text-slate-500">جاري التحقق من صلاحيات الدخول...</p>
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
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-800 p-4">
        <div className="bg-white border border-rose-200 rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 mx-auto flex items-center justify-center border border-rose-100">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">صلاحيات غير كافية</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            هذه اللوحة مخصصة لإدارة العمليات فقط (Admin). حسابك الحالي ({role || 'غير محدد'}) لا يمتلك صلاحيات الوصول المطلوبة.
          </p>
          <button
            onClick={() => {
              logout();
              router.replace('/login');
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>تسجيل الخروج والتبديل إلى حساب آخر</span>
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
