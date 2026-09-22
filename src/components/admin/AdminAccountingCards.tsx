'use client';

import React from 'react';
import { Order, Profile } from '@/types/database';
import {
  DollarSign,
  TrendingUp,
  UserCheck,
  CheckCircle2,
  XCircle,
  Truck,
  Clock,
  Coins,
  Wallet,
  ArrowUpRight,
} from 'lucide-react';

interface AdminAccountingCardsProps {
  orders: Order[];
  selectedDriver?: Profile | null;
  dateFilter?: 'today' | '24h' | 'all';
}

export function AdminAccountingCards({ orders, selectedDriver, dateFilter = 'all' }: AdminAccountingCardsProps) {
  const filterLabel =
    dateFilter === 'today'
      ? 'طلبات اليوم'
      : dateFilter === '24h'
      ? 'آخر 24 ساعة'
      : 'كافة الطلبات';
  // If a driver is filtered, calculate stats specifically for this driver
  const relevantOrders = selectedDriver
    ? orders.filter((o) => o.driver_id === selectedDriver.id)
    : orders;

  const totalOrdersCount = relevantOrders.length;
  const completedOrders = relevantOrders.filter((o) => o.status === 'delivered').length;
  const inDeliveryOrders = relevantOrders.filter((o) => o.status === 'delivering' || o.status === 'assigned').length;
  const cancelledOrders = relevantOrders.filter((o) => o.status === 'cancelled').length;
  const pendingOrders = relevantOrders.filter((o) => o.status === 'pending').length;

  // Financial calculations (excluding cancelled orders from active revenues)
  const activeOrders = relevantOrders.filter((o) => o.status !== 'cancelled');
  const totalCollection = activeOrders.reduce((sum, o) => sum + (Number(o.collection_amount) || 0), 0);
  const totalOfficeProfit = activeOrders.reduce((sum, o) => sum + (Number(o.office_fee) || 0), 0);
  const totalDriverDues = activeOrders.reduce((sum, o) => sum + (Number(o.driver_fee) || 0), 0);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US').format(val || 0);
  };

  return (
    <div className="mb-6 space-y-3">
      {/* تنبيه فلترة المندوب */}
      {selectedDriver && (
        <div className="bg-orange-50 border border-orange-200/90 rounded-xl px-4 py-2.5 text-xs flex items-center justify-between text-zinc-800 shadow-2xs">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-orange-600" />
            <span>
              عرض حسابات المندوب:{' '}
              <strong className="text-zinc-900 font-bold">
                {selectedDriver.name}
              </strong>
            </span>
          </div>
          <span className="bg-white text-orange-700 border border-orange-200 px-2.5 py-0.5 rounded-md font-mono text-[11px] font-bold shadow-2xs">
            {relevantOrders.length} {relevantOrders.length === 1 ? 'طلب' : 'طلبات'}
          </span>
        </div>
      )}

      {/* بطاقات المؤشرات المالية الرئيسية */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {/* 1. إجمالي المبالغ المطلوب تحصيلها */}
        <div className="rounded-2xl bg-white border border-zinc-200/80 p-4 sm:p-5 shadow-xs hover:border-orange-300 hover:shadow-md hover:shadow-orange-500/5 transition-all">
          <div className="flex items-center justify-between text-zinc-500 mb-3">
            <span className="text-xs font-bold text-zinc-700">إجمالي مبالغ التحصيل</span>
            <div className="p-2 rounded-xl bg-orange-50 border border-orange-100 text-orange-600 shadow-2xs">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-zinc-900 font-mono tracking-tight">
              {formatCurrency(totalCollection)}
            </span>
            <span className="text-xs font-bold text-orange-600">ل.س</span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-2 font-medium">
            مجموع مبالغ التحصيل المحسوبة ({filterLabel})
          </p>
        </div>

        {/* 2. أرباح المكتب */}
        <div className="rounded-2xl bg-white border border-zinc-200/80 p-4 sm:p-5 shadow-xs hover:border-amber-300 hover:shadow-md hover:shadow-amber-500/5 transition-all">
          <div className="flex items-center justify-between text-zinc-500 mb-3">
            <span className="text-xs font-bold text-zinc-700">أرباح المكتب (عمولات التوصيل)</span>
            <div className="p-2 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 shadow-2xs">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-zinc-900 font-mono tracking-tight">
              {formatCurrency(totalOfficeProfit)}
            </span>
            <span className="text-xs font-bold text-amber-600">ل.س</span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-2 font-medium">
            صافي حصة المكتب من أجور التوصيل ({filterLabel})
          </p>
        </div>

        {/* 3. مستحقات المناديب */}
        <div className="rounded-2xl bg-white border border-zinc-200/80 p-4 sm:p-5 shadow-xs hover:border-emerald-300 hover:shadow-md hover:shadow-emerald-500/5 transition-all">
          <div className="flex items-center justify-between text-zinc-500 mb-3">
            <span className="text-xs font-bold text-zinc-700">
              {selectedDriver ? `مستحقات ${selectedDriver.name}` : 'إجمالي مستحقات المناديب'}
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 shadow-2xs">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-700 font-mono tracking-tight">
              {formatCurrency(totalDriverDues)}
            </span>
            <span className="text-xs font-bold text-emerald-600">ل.س</span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-2 font-medium">
            حصة السائقين المقررة عن التوصيل ({filterLabel})
          </p>
        </div>
      </div>

      {/* عدادات الحالات التنفيذية الأنيقة */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* قيد الانتظار */}
        <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between hover:border-slate-300 transition-colors shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-[11px] text-slate-500 font-medium">بانتظار مندوب</div>
              <div className="text-base font-bold text-amber-600 font-mono mt-0.5">{pendingOrders}</div>
            </div>
          </div>
        </div>

        {/* قيد التوصيل */}
        <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between hover:border-slate-300 transition-colors shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-sky-50 text-sky-600 border border-sky-100">
              <Truck className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-[11px] text-slate-500 font-medium">قيد التوصيل</div>
              <div className="text-base font-bold text-sky-600 font-mono mt-0.5">{inDeliveryOrders}</div>
            </div>
          </div>
        </div>

        {/* مكتملة */}
        <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between hover:border-slate-300 transition-colors shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-[11px] text-slate-500 font-medium">مكتملة ومسلّمة</div>
              <div className="text-base font-bold text-emerald-600 font-mono mt-0.5">{completedOrders}</div>
            </div>
          </div>
        </div>

        {/* ملغاة */}
        <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between hover:border-slate-300 transition-colors shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-100">
              <XCircle className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-[11px] text-slate-500 font-medium">ملغاة</div>
              <div className="text-base font-bold text-rose-600 font-mono mt-0.5">{cancelledOrders}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
