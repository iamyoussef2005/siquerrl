'use client';

import React, { useState, useEffect } from 'react';
import {
  Headphones,
  Radio,
  RefreshCw,
  LogOut,
  Bike,
  User,
  Command,
  PlusCircle,
  FileText,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface CallCenterHeaderProps {
  realtimeConnected: boolean;
  onRefresh: () => void;
  isLoading: boolean;
  onOpenDriversModal?: () => void;
  ordersCountToday?: number;
  activeView?: 'create' | 'table';
  onChangeView?: (view: 'create' | 'table') => void;
}

export function CallCenterHeader({
  realtimeConnected,
  onRefresh,
  isLoading,
  onOpenDriversModal,
  ordersCountToday = 0,
  activeView = 'create',
  onChangeView,
}: CallCenterHeaderProps) {
  const { profile, user, logout } = useAuth();

  return (
    <header className="border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 z-30 px-4 lg:px-8 py-3 mb-6 shadow-xs">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 max-w-7xl mx-auto">
        {/* عنوان اللوحة والشعار الاحترافي */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-xs">
            <Headphones className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                شاشة الكول سنتر واستقبال الطلبات
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200 rounded-md">
                خدمة العملاء
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-normal">
              تسجيل طلبات الزبائن والمتابعة اللحظية لحركات التوصيل
            </p>
          </div>
        </div>

        {/* أدوات المراقبة والإجراءات السريعة */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* أزرار التبديل بين شاشة تسجيل الطلب وجدول الطلبات */}
          {onChangeView && (
            <div className="inline-flex p-1 bg-slate-100 border border-slate-200 rounded-xl text-xs gap-1">
              <button
                type="button"
                onClick={() => onChangeView('create')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  activeView === 'create'
                    ? 'bg-white text-blue-600 shadow-xs border border-slate-200/80 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>إضافة طلب</span>
              </button>
              <button
                type="button"
                onClick={() => onChangeView('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  activeView === 'table'
                    ? 'bg-white text-blue-600 shadow-xs border border-slate-200/80 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>جدول الطلبات ({ordersCountToday})</span>
              </button>
            </div>
          )}

          {/* تلميح الحفظ السريع */}
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-500">
            <Command className="w-3.5 h-3.5 text-slate-400" />
            <span>إرسال الطلب:</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-300 font-mono text-[10px] text-slate-700 font-semibold shadow-2xs">
              Ctrl + Enter
            </kbd>
          </div>

          {/* زر الاطلاع على كادر المناديب */}
          {onOpenDriversModal && (
            <button
              onClick={onOpenDriversModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 shadow-xs hover:shadow transition-all duration-150 cursor-pointer active:scale-95"
              title="الاطلاع على المناديب المتاحين"
            >
              <Bike className="w-3.5 h-3.5 text-blue-600" />
              <span>المناديب المتاحين</span>
            </button>
          )}

          {/* زر التحديث اليدوي */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-all duration-150 disabled:opacity-50 cursor-pointer active:scale-95 shadow-xs"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          {/* ملف موظف الكول سنتر وزر تسجيل الخروج */}
          {user && (
            <div className="flex items-center gap-2 pr-2 border-r border-slate-200">
              <div className="hidden sm:flex items-center gap-2 bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1">
                <div className="w-5 h-5 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px]">
                  <User className="w-3 h-3" />
                </div>
                <span className="text-xs font-medium text-slate-700">
                  {profile?.name || user.email?.split('@')[0]}
                </span>
              </div>
              <button
                onClick={() => logout()}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-medium transition-all duration-150 cursor-pointer active:scale-95"
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
