'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShieldCheck, Radio, RefreshCw, LogOut, Sliders, FileSpreadsheet, User, Users, Trash2, PlusCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

import Image from 'next/image';

interface AdminHeaderProps {
  realtimeConnected: boolean;
  onRefresh: () => void;
  isLoading: boolean;
  onOpenCreateOrderModal?: () => void;
  onOpenCommissionModal?: () => void;
  onOpenReportsModal?: () => void;
  onOpenStaffModal?: () => void;
  onOpenCleanupModal?: () => void;
}

export function AdminHeader({
  realtimeConnected,
  onRefresh,
  isLoading,
  onOpenCreateOrderModal,
  onOpenCommissionModal,
  onOpenReportsModal,
  onOpenStaffModal,
  onOpenCleanupModal,
}: AdminHeaderProps) {
  const { profile, user, logout } = useAuth();

  return (
    <header className="border-b-2 border-[#cdbba2] bg-[#faf6ee]/95 backdrop-blur-md sticky top-0 z-30 px-4 lg:px-8 py-2.5 mb-6 shadow-sm shadow-orange-950/5">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 max-w-7xl mx-auto">
        {/* عنوان اللوحة وشعار سنجاب دليفري الاحترافي */}
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 rounded-2xl bg-orange-50 border-2 border-[#d5c3aa] p-1 flex items-center justify-center shadow-xs overflow-hidden shrink-0">
            <Image
              src="/sinjab-logo.png"
              alt="Sinjab Delivery"
              width={38}
              height={38}
              className="object-contain"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-extrabold text-zinc-900 tracking-tight">
                سنجاب دليفري
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-orange-100/80 text-orange-800 border border-orange-300/80 rounded-md">
                لوحة الإدارة
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 font-medium">منظومة إدارة وتوزيع الطلبات والتدقيق اللحظي</p>
          </div>
        </div>

        {/* أدوات الإدارة والأزرار الوظيفية */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* زر تسجيل طلب جديد في صفحة مخصصة */}
          <Link
            href="/admin/new-order"
            className="btn-sinjab-primary flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white shadow-xs transition-all duration-150 cursor-pointer active:scale-95"
            title="تسجيل طلب جديد في صفحة مخصصة مع تحديد الأجرة وسعر الأغراض وإسناد المندوب"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>إضافة طلب جديد</span>
          </Link>

          {/* زر إدارة فريق العمل */}
          {onOpenStaffModal && (
            <button
              onClick={onOpenStaffModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/95 hover:bg-orange-50/80 border border-orange-200/80 hover:border-orange-300 text-xs font-bold text-zinc-800 shadow-2xs transition-all duration-150 cursor-pointer active:scale-95"
              title="إدارة المناديب وموظفي الكول سنتر"
            >
              <Users className="w-3.5 h-3.5 text-orange-600" />
              <span>فريق العمل</span>
            </button>
          )}

          {/* زر إدارة نسب المناديب */}
          {onOpenCommissionModal && (
            <button
              onClick={onOpenCommissionModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/95 hover:bg-orange-50/80 border border-orange-200/80 hover:border-orange-300 text-xs font-bold text-zinc-800 shadow-2xs transition-all duration-150 cursor-pointer active:scale-95"
              title="تحديد نسب عمولات المناديب"
            >
              <Sliders className="w-3.5 h-3.5 text-amber-600" />
              <span>نسب المناديب</span>
            </button>
          )}

          {/* زر التقارير المالية والتشغيلية */}
          {onOpenReportsModal && (
            <button
              onClick={onOpenReportsModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/95 hover:bg-emerald-50/70 border border-emerald-200/80 hover:border-emerald-300 text-xs font-bold text-zinc-800 shadow-2xs transition-all duration-150 cursor-pointer active:scale-95"
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/95 hover:bg-rose-50 border border-orange-200/80 hover:border-rose-300 text-xs font-bold text-zinc-700 hover:text-rose-700 shadow-2xs transition-all duration-150 cursor-pointer active:scale-95"
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
            className="p-1.5 rounded-xl border border-orange-200/80 bg-white/95 hover:bg-orange-50/80 text-zinc-700 hover:text-orange-600 transition-all duration-150 disabled:opacity-50 cursor-pointer active:scale-95 shadow-2xs"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-orange-500' : ''}`} />
          </button>

          {/* ملف المدير وزر تسجيل الخروج */}
          {user && (
            <div className="flex items-center gap-2 pr-2 border-r border-orange-200/80">
              <div className="hidden sm:flex items-center gap-2 bg-orange-50/90 border border-orange-200/80 rounded-lg px-2.5 py-1">
                <div className="w-5 h-5 rounded-md bg-orange-200/70 text-orange-800 flex items-center justify-center font-bold text-[10px]">
                  <User className="w-3 h-3" />
                </div>
                <span className="text-xs font-bold text-zinc-800">
                  {profile?.name || user.email?.split('@')[0]}
                </span>
              </div>
              <button
                onClick={() => logout()}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold transition-all duration-150 cursor-pointer active:scale-95"
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
