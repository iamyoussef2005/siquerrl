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

import Image from 'next/image';

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
    <header className="border-b border-zinc-200/90 bg-white/95 backdrop-blur-md sticky top-0 z-30 px-4 lg:px-8 py-2.5 mb-6 shadow-xs">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 max-w-7xl mx-auto">
        {/* عنوان اللوحة وشعار سنجاب دليفري الاحترافي */}
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 rounded-2xl bg-orange-50 border border-orange-200/80 p-1 flex items-center justify-center shadow-xs overflow-hidden shrink-0">
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
              <span className="px-2 py-0.5 text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200 rounded-md">
                الكول سنتر
              </span>
              <div className="flex items-center gap-1.5 text-[10px] mr-1">
                <span className={`w-2 h-2 rounded-full ${realtimeConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                <span className={realtimeConnected ? 'text-emerald-700 font-semibold' : 'text-amber-700 font-semibold'}>
                  {realtimeConnected ? 'مباشر' : 'مزامنة...'}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-zinc-500 font-medium">
              تسجيل طلبات الزبائن والمتابعة اللحظية لحركات التوصيل
            </p>
          </div>
        </div>

        {/* أدوات المراقبة والإجراءات السريعة */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* أزرار التبديل بين شاشة تسجيل الطلب وجدول الطلبات */}
          {onChangeView && (
            <div className="inline-flex p-1 bg-zinc-100 border border-zinc-200/80 rounded-xl text-xs gap-1">
              <button
                type="button"
                onClick={() => onChangeView('create')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  activeView === 'create'
                    ? 'bg-white text-orange-600 shadow-xs border border-orange-200/80'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60'
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5 text-orange-500" />
                <span>إضافة طلب</span>
              </button>
              <button
                type="button"
                onClick={() => onChangeView('table')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  activeView === 'table'
                    ? 'bg-white text-orange-600 shadow-xs border border-orange-200/80'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-orange-500" />
                <span>جدول الطلبات ({ordersCountToday})</span>
              </button>
            </div>
          )}

          {/* تلميح الحفظ السريع */}
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-50/60 border border-orange-200/60 text-[11px] text-orange-800">
            <Command className="w-3.5 h-3.5 text-orange-500" />
            <span>إرسال الطلب:</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white border border-orange-200 font-mono text-[10px] text-orange-900 font-bold shadow-2xs">
              Ctrl + Enter
            </kbd>
          </div>

          {/* زر الاطلاع على كادر المناديب */}
          {onOpenDriversModal && (
            <button
              onClick={onOpenDriversModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-orange-50/50 border border-zinc-200 hover:border-orange-200 text-xs font-semibold text-zinc-700 hover:text-orange-700 shadow-2xs transition-all duration-150 cursor-pointer active:scale-95"
              title="الاطلاع على المناديب المتاحين"
            >
              <Bike className="w-3.5 h-3.5 text-orange-600" />
              <span>المناديب المتاحين</span>
            </button>
          )}

          {/* زر التحديث اليدوي */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-600 hover:text-zinc-900 transition-all duration-150 disabled:opacity-50 cursor-pointer active:scale-95 shadow-2xs"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-orange-600' : ''}`} />
          </button>

          {/* ملف موظف الكول سنتر وزر تسجيل الخروج */}
          {user && (
            <div className="flex items-center gap-2 pr-2 border-r border-zinc-200">
              <div className="hidden sm:flex items-center gap-2 bg-zinc-100 border border-zinc-200 rounded-lg px-2.5 py-1">
                <div className="w-5 h-5 rounded-md bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-[10px]">
                  <User className="w-3 h-3" />
                </div>
                <span className="text-xs font-semibold text-zinc-700">
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
