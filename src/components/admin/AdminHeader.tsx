'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Radio, RefreshCw, LogOut, PlusCircle, Sliders, FileSpreadsheet, User, Users, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface AdminHeaderProps {
  realtimeConnected: boolean;
  onRefresh: () => void;
  isLoading: boolean;
  onOpenCreateModal?: () => void;
  onOpenCommissionModal?: () => void;
  onOpenReportsModal?: () => void;
  onOpenStaffModal?: () => void;
  onOpenCleanupModal?: () => void;
}

export function AdminHeader({
  realtimeConnected,
  onRefresh,
  isLoading,
  onOpenCreateModal,
  onOpenCommissionModal,
  onOpenReportsModal,
  onOpenStaffModal,
  onOpenCleanupModal,
}: AdminHeaderProps) {
  const { profile, user, logout } = useAuth();

  return (
    <header className="border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 z-30 px-4 lg:px-8 py-3 mb-6 shadow-xs">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 max-w-7xl mx-auto">
        {/* عنوان اللوحة والشعار الاحترافي */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-2xs">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                لوحة الإدارة والعمليات
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 rounded-md">
                مسؤول النظام
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-normal">إدارة وتوزيع الطلبات ومتابعة الحسابات اللحظية</p>
          </div>
        </div>

        {/* أدوات الإدارة والأزرار الوظيفية */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* زر تسجيل طلب جديد */}
          {onOpenCreateModal && (
            <button
              onClick={onOpenCreateModal}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white shadow-xs hover:shadow transition-all duration-150 cursor-pointer active:scale-95"
              title="تسجيل طلب جديد"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>طلب جديد</span>
            </button>
          )}

          {/* زر إدارة فريق العمل */}
          {onOpenStaffModal && (
            <button
              onClick={onOpenStaffModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 shadow-2xs transition-all duration-150 cursor-pointer active:scale-95"
              title="إدارة المناديب وموظفي الكول سنتر"
            >
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span>فريق العمل</span>
            </button>
          )}

          {/* زر إدارة نسب المناديب */}
          {onOpenCommissionModal && (
            <button
              onClick={onOpenCommissionModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 shadow-2xs transition-all duration-150 cursor-pointer active:scale-95"
              title="تحديد نسب عمولات المناديب"
            >
              <Sliders className="w-3.5 h-3.5 text-slate-500" />
              <span>نسب المناديب</span>
            </button>
          )}

          {/* زر التقارير المالية والتشغيلية */}
          {onOpenReportsModal && (
            <button
              onClick={onOpenReportsModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 shadow-2xs transition-all duration-150 cursor-pointer active:scale-95"
              title="عرض وتصدير التقارير المالية"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>التقارير</span>
            </button>
          )}

          {/* زر تنظيف وأرشفة الطلبات القديمة */}
          {onOpenCleanupModal && (
            <button
              onClick={onOpenCleanupModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-xs font-semibold text-slate-700 hover:text-rose-700 shadow-2xs transition-all duration-150 cursor-pointer active:scale-95"
              title="تنظيف وتفريغ الطلبات القديمة لتوفير المساحة"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              <span>تنظيف الطلبات</span>
            </button>
          )}

          {/* زر التحديث اليدوي */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-all duration-150 disabled:opacity-50 cursor-pointer active:scale-95 shadow-2xs"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          {/* ملف المدير وزر تسجيل الخروج */}
          {user && (
            <div className="flex items-center gap-2 pr-2 border-r border-slate-200">
              <div className="hidden sm:flex items-center gap-2 bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1">
                <div className="w-5 h-5 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px]">
                  <User className="w-3 h-3" />
                </div>
                <span className="text-xs font-semibold text-slate-700">
                  {profile?.name || user.email?.split('@')[0]}
                </span>
              </div>
              <button
                onClick={() => logout()}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-semibold transition-all duration-150 cursor-pointer active:scale-95"
                title="تسجيل الخروج"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">خروج</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
