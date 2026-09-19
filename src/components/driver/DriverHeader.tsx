'use client';

import React from 'react';
import Link from 'next/link';
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
    <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 shadow-lg">
      <div className="max-w-md mx-auto space-y-3">
        {/* الصف العلوي: الشعار وحالة الاتصال وروابط التنقل */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-sky-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-sky-600/30">
              <Bike className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-tight leading-tight">
                واجهة المندوب
              </h1>
              <div className="flex items-center gap-1.5 text-[10px]">
                <Radio
                  className={`w-2.5 h-2.5 ${
                    realtimeConnected ? 'text-emerald-400 animate-pulse' : 'text-amber-400'
                  }`}
                />
                <span className={realtimeConnected ? 'text-emerald-400' : 'text-amber-400'}>
                  {realtimeConnected ? 'مباشر Realtime' : 'مزامنة...'}
                </span>
              </div>
            </div>
          </div>

          {/* روابط سريعة للوحات الأخرى وزر تسجيل الخروج */}
          <div className="flex items-center gap-1.5">
            <Link
              href="/"
              className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title="شاشة الكول سنتر"
            >
              <Headphones className="w-4 h-4" />
            </Link>
            <Link
              href="/admin"
              className="p-2 rounded-lg bg-slate-800 text-purple-400 hover:text-white transition-colors"
              title="لوحة الإدارة"
            >
              <ShieldCheck className="w-4 h-4" />
            </Link>
            {user && (
              <button
                onClick={() => logout()}
                className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                title="تسجيل الخروج"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* عرض هوية المندوب المسجل أو التبديل إذا كان مديراً */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 shrink-0">
            <User className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            {profile?.role === 'driver' ? (
              <div>
                <span className="block text-[10px] text-slate-400 font-medium">المندوب الحالي:</span>
                <span className="text-xs font-bold text-white">
                  {profile.name} {profile.phone ? `(${profile.phone})` : ''}
                </span>
              </div>
            ) : (
              <div>
                <label className="block text-[10px] text-slate-400 font-medium leading-none mb-1">
                  المندوب النشط (معاينة من حساب المدير):
                </label>
                <select
                  value={selectedDriver?.id || ''}
                  onChange={(e) => {
                    const found = drivers.find((d) => d.id === e.target.value) || null;
                    onSelectDriver(found);
                  }}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1 text-xs text-white font-semibold focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
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
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-2.5 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block">طلبات نشطة للتوصيل</span>
                <span className="text-base font-bold text-white font-mono">{activeCount} طلبات</span>
              </div>
              <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400">
                <Package className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-2.5 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block">مستحقاتك المكتملة</span>
                <span className="text-base font-bold text-emerald-400 font-mono">
                  {formatCurrency(todayEarnings)} <span className="text-[10px] text-slate-400">ل.س</span>
                </span>
              </div>
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
