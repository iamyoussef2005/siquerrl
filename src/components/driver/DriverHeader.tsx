'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Profile } from '@/types/database';
import {
  Bike,
  ShieldCheck,
  Headphones,
  Radio,
  User,
  DollarSign,
  Package,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface DriverHeaderProps {
  drivers: Profile[];
  selectedDriver: Profile | null;
  onSelectDriver: (driver: Profile | null) => void;
  realtimeConnected: boolean;
  activeCount: number;
  todayEarnings: number;
}

export function DriverHeader({
  drivers,
  selectedDriver,
  onSelectDriver,
  realtimeConnected,
  activeCount,
  todayEarnings,
}: DriverHeaderProps) {
  const { profile, user, logout } = useAuth();
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US').format(val || 0);
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-zinc-200/90 px-4 py-3 shadow-xs">
      <div className="max-w-md mx-auto space-y-3">
        {/* الصف العلوي: الشعار وحالة الاتصال وروابط التنقل */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="relative h-9 w-9 rounded-xl bg-orange-50 border border-orange-200 p-0.5 flex items-center justify-center shadow-xs overflow-hidden shrink-0">
              <Image
                src="/sinjab-logo.png"
                alt="Sinjab Delivery"
                width={34}
                height={34}
                className="object-contain"
              />
            </div>
            <div>
              <h1 className="text-sm font-black text-zinc-900 tracking-tight leading-tight">
                سنجاب دليفري
              </h1>
            </div>
          </div>

          {/* روابط سريعة للوحات الأخرى وزر تسجيل الخروج */}
          <div className="flex items-center gap-1.5">
            <Link
              href="/"
              className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors shadow-2xs"
              title="شاشة الكول سنتر"
            >
              <Headphones className="w-4 h-4" />
            </Link>
            <Link
              href="/admin"
              className="p-2 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors shadow-2xs border border-purple-200"
              title="لوحة الإدارة"
            >
              <ShieldCheck className="w-4 h-4" />
            </Link>
            {user && (
              <button
                onClick={() => logout()}
                className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors cursor-pointer shadow-2xs"
                title="تسجيل الخروج"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* عرض هوية المندوب المسجل أو التبديل إذا كان مديراً */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center gap-2 shadow-2xs">
          <div className="p-1.5 rounded-lg bg-orange-50 text-orange-600 border border-orange-100 shrink-0">
            <User className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            {profile?.role === 'driver' ? (
              <div>
                <span className="block text-[10px] text-slate-500 font-medium">المندوب الحالي:</span>
                <span className="text-xs font-bold text-slate-900">
                  {profile.name} {profile.phone ? `(${profile.phone})` : ''}
                </span>
              </div>
            ) : (
              <div>
                <label className="block text-[10px] text-slate-500 font-medium leading-none mb-1">
                  المندوب النشط (معاينة من حساب المدير):
                </label>
                <select
                  value={selectedDriver?.id || ''}
                  onChange={(e) => {
                    const found = drivers.find((d) => d.id === e.target.value) || null;
                    onSelectDriver(found);
                  }}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-900 font-semibold focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 cursor-pointer shadow-2xs"
                >
                  <option value="">-- اختر المندوب للمعاينة --</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} {d.phone ? `(${d.phone})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* شريط الإحصائيات السريعة للمندوب (الطلبات النشطة + المستحقات) */}
        {selectedDriver && (
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white border border-slate-200 rounded-xl p-2.5 flex items-center justify-between shadow-2xs">
              <div>
                <span className="text-[10px] text-slate-500 font-medium block">طلبات نشطة للتوصيل</span>
                <span className="text-base font-bold text-slate-900 font-mono">{activeCount} طلبات</span>
              </div>
              <div className="p-1.5 rounded-lg bg-sky-50 text-sky-600">
                <Package className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-2.5 flex items-center justify-between shadow-2xs">
              <div>
                <span className="text-[10px] text-slate-500 font-medium block">مستحقاتك المكتملة</span>
                <span className="text-base font-bold text-emerald-700 font-mono">
                  {formatCurrency(todayEarnings)} <span className="text-[10px] text-slate-400 font-normal">ل.س</span>
                </span>
              </div>
              <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
