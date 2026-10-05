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
  onlineDriversCount?: number;
}

export function CallCenterHeader({
  realtimeConnected,
  onRefresh,
  isLoading,
  onOpenDriversModal,
  ordersCountToday = 0,
  activeView = 'create',
  onChangeView,
  onlineDriversCount,
}: CallCenterHeaderProps) {
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
                الكول سنتر
              </span>
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
            <div className="inline-flex p-1 bg-orange-100/60 border border-orange-200/80 rounded-xl text-xs gap-1">
              <button
                type="button"
                onClick={() => onChangeView('create')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  activeView === 'create'
                    ? 'bg-white text-orange-700 shadow-xs border border-orange-300'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-orange-50/60'
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5 text-orange-600" />
                <span>إضافة طلب</span>
              </button>
              <button
                type="button"
                onClick={() => onChangeView('table')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  activeView === 'table'
                    ? 'bg-white text-orange-700 shadow-xs border border-orange-300'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-orange-50/60'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-orange-600" />
                <span>سجل الطلبات ({ordersCountToday})</span>
              </button>
            </div>
          )}

          {/* تلميح الحفظ السريع */}
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-100/60 border border-orange-200/80 text-[11px] text-orange-900 font-medium">
            <Command className="w-3.5 h-3.5 text-orange-600" />
            <span>إرسال الطلب:</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white border border-orange-200 font-mono text-[10px] text-orange-900 font-bold shadow-2xs">
              Ctrl + Enter
            </kbd>
          </div>

          {/* زر الاطلاع على كادر المناديب */}
          {onOpenDriversModal && (
            <button
              onClick={onOpenDriversModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/95 hover:bg-orange-50/80 border border-orange-200/80 hover:border-orange-300 text-xs font-bold text-zinc-800 shadow-2xs transition-all duration-150 cursor-pointer active:scale-95"
              title="الاطلاع على المناديب المتاحين ونشاطهم"
            >
              <Bike className="w-3.5 h-3.5 text-orange-600" />
              <span>المناديب المتاحين</span>
              {onlineDriversCount !== undefined && (
                <span className="flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 mr-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  {onlineDriversCount}
                </span>
              )}
            </button>
          )}

          {/* زر التحديث اليدوي */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1.5 rounded-xl border border-orange-200/80 bg-white/95 hover:bg-orange-50/80 text-zinc-700 hover:text-orange-600 transition-all duration-150 disabled:opacity-50 cursor-pointer active:scale-95 shadow-2xs"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-orange-600' : ''}`} />
          </button>

          {/* ملف موظف الكول سنتر وزر تسجيل الخروج */}
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
