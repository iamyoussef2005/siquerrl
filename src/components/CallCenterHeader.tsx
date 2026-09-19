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
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface CallCenterHeaderProps {
  realtimeConnected: boolean;
  onRefresh: () => void;
  isLoading: boolean;
  onOpenDriversModal?: () => void;
  ordersCountToday?: number;
}

export function CallCenterHeader({
  realtimeConnected,
  onRefresh,
  isLoading,
  onOpenDriversModal,
  ordersCountToday = 0,
}: CallCenterHeaderProps) {
  const { profile, user, logout } = useAuth();

  return (
    <header className="border-b border-[#1b2234] bg-[#0b0f19]/95 backdrop-blur-md sticky top-0 z-30 px-4 lg:px-8 py-3 mb-6 shadow-sm">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 max-w-7xl mx-auto">
        {/* عنوان اللوحة والشعار الاحترافي */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-cyan-600/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Headphones className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-white tracking-tight">
                شاشة الكول سنتر واستقبال الطلبات
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-medium bg-slate-800/90 text-slate-300 border border-slate-700/70 rounded-md">
                خدمة العملاء
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-normal">
              تسجيل طلبات الزبائن والمتابعة اللحظية لحركات التوصيل
            </p>
          </div>
        </div>

        {/* أدوات المراقبة والإجراءات السريعة */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* تلميح الحفظ السريع */}
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#101522] border border-[#1e2638] text-[11px] text-slate-400">
            <Command className="w-3.5 h-3.5 text-slate-500" />
            <span>إرسال الطلب:</span>
            <kbd className="px-1.5 py-0.5 rounded bg-[#161d2d] border border-[#232d42] font-mono text-[10px] text-slate-300 font-semibold">
              Ctrl + Enter
            </kbd>
          </div>

          {/* زر الاطلاع على كادر المناديب */}
          {onOpenDriversModal && (
            <button
              onClick={onOpenDriversModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#131926] hover:bg-[#1a2233] border border-[#232b3e] text-xs font-medium text-slate-300 hover:text-white shadow-sm transition-all duration-150 cursor-pointer active:scale-95"
              title="الاطلاع على المناديب المتاحين"
            >
              <Bike className="w-3.5 h-3.5 text-cyan-400" />
              <span>المناديب المتاحين</span>
            </button>
          )}

          {/* زر التحديث اليدوي */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1.5 rounded-lg border border-[#232b3e] bg-[#131926] hover:bg-[#1a2233] text-slate-400 hover:text-slate-200 transition-all duration-150 disabled:opacity-50 cursor-pointer active:scale-95 shadow-sm"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>

          {/* ملف موظف الكول سنتر وزر تسجيل الخروج */}
          {user && (
            <div className="flex items-center gap-2 pr-2 border-r border-[#1b2234]">
              <div className="hidden sm:flex items-center gap-2 bg-[#101522] border border-[#1e2638] rounded-lg px-2.5 py-1">
                <div className="w-5 h-5 rounded-md bg-cyan-500/15 text-cyan-400 flex items-center justify-center font-bold text-[10px]">
                  <User className="w-3 h-3" />
                </div>
                <span className="text-xs font-medium text-slate-200">
                  {profile?.name || user.email?.split('@')[0]}
                </span>
              </div>
              <button
                onClick={() => logout()}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-xs font-medium transition-all duration-150 cursor-pointer active:scale-95"
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
