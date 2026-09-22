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
  const inDeliveryOrders = relevantOrders.filter((o) => o.status === 'delivering').length;
  const preparingOrders = relevantOrders.filter((o) => o.status === 'assigned').length;
  const pendingAssignmentOrders = relevantOrders.filter((o) => o.status === 'pending').length;
  const cancelledOrders = relevantOrders.filter((o) => o.status === 'cancelled').length;

  // Financial calculations (excluding cancelled orders)
  const activeFinancialOrders = relevantOrders.filter((o) => o.status !== 'cancelled');
  const totalCollection = activeFinancialOrders.reduce((sum, o) => sum + (Number(o.collection_amount) || 0), 0);
  const totalOfficeProfit = activeFinancialOrders.reduce((sum, o) => sum + (Number(o.office_fee) || 0), 0);
  const totalDriverDues = activeFinancialOrders.reduce((sum, o) => sum + (Number(o.driver_fee) || 0), 0);

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
        <div className="rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-50/60 to-white border border-amber-200/90 p-4 sm:p-5 shadow-xs hover:border-amber-300 hover:shadow-md hover:shadow-amber-500/10 transition-all">
          <div className="flex items-center justify-between text-zinc-500 mb-3">
            <span className="text-xs font-bold text-amber-950">إجمالي مبالغ التحصيل</span>
            <div className="p-2 rounded-xl bg-amber-100/80 border border-amber-200 text-amber-700 shadow-2xs">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-amber-950 font-mono tracking-tight">
              {formatCurrency(totalCollection)}
            </span>
            <span className="text-xs font-black text-amber-600">ل.س</span>
          </div>
          <p className="text-[11px] text-amber-800/70 mt-2 font-medium">
            مجموع مبالغ التحصيل المحسوبة ({filterLabel})
          </p>
        </div>

        {/* 2. أرباح المكتب (HERO CARD) */}
        <div className="rounded-2xl bg-gradient-to-br from-orange-500/15 via-amber-500/10 to-orange-50/40 border-2 border-orange-300/90 p-4 sm:p-5 shadow-sm shadow-orange-500/10 hover:border-orange-400 hover:shadow-md hover:shadow-orange-500/15 transition-all">
          <div className="flex items-center justify-between text-zinc-500 mb-3">
            <span className="text-xs font-black text-orange-950">أرباح المكتب (عمولات التوصيل)</span>
            <div className="p-2 rounded-xl btn-sinjab-primary text-white shadow-xs">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-orange-950 font-mono tracking-tight">
              {formatCurrency(totalOfficeProfit)}
            </span>
            <span className="text-xs font-black text-orange-600">ل.س</span>
          </div>
          <p className="text-[11px] text-orange-800/80 mt-2 font-medium">
            صافي حصة المكتب من أجور التوصيل ({filterLabel})
          </p>
        </div>

        {/* 3. مستحقات المناديب */}
        <div className="rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-50/60 to-white border border-emerald-200/90 p-4 sm:p-5 shadow-xs hover:border-emerald-300 hover:shadow-md hover:shadow-emerald-500/10 transition-all">
          <div className="flex items-center justify-between text-zinc-500 mb-3">
            <span className="text-xs font-bold text-emerald-950">
              {selectedDriver ? `مستحقات ${selectedDriver.name}` : 'إجمالي مستحقات المناديب'}
            </span>
            <div className="p-2 rounded-xl bg-emerald-100/80 border border-emerald-200 text-emerald-700 shadow-2xs">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-800 font-mono tracking-tight">
              {formatCurrency(totalDriverDues)}
            </span>
            <span className="text-xs font-black text-emerald-600">ل.س</span>
          </div>
          <p className="text-[11px] text-emerald-800/70 mt-2 font-medium">
            حصة السائقين المقررة عن التوصيل ({filterLabel})
          </p>
        </div>
      </div>

      {/* عدادات الحالات التنفيذية الأنيقة */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {/* بانتظار الإسناد */}
        <div className="bg-gradient-to-br from-amber-50/90 to-yellow-50/50 border border-amber-200/80 rounded-xl p-3 flex items-center justify-between hover:border-amber-300 transition-colors shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-100/90 text-amber-700 border border-amber-200/80 shadow-2xs">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-[11px] text-amber-900 font-semibold">بانتظار الإسناد</div>
              <div className="text-base font-black text-amber-700 font-mono mt-0.5">{pendingAssignmentOrders}</div>
            </div>
          </div>
        </div>

        {/* بانتظار تحضير الطلب */}
        <div className="bg-gradient-to-br from-orange-50/90 to-amber-50/50 border border-orange-200/80 rounded-xl p-3 flex items-center justify-between hover:border-orange-300 transition-colors shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-orange-100/90 text-orange-700 border border-orange-200/80 shadow-2xs">
              <UserCheck className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-[11px] text-orange-900 font-semibold">بانتظار التحضير</div>
              <div className="text-base font-black text-orange-700 font-mono mt-0.5">{preparingOrders}</div>
            </div>
          </div>
        </div>

        {/* قيد التوصيل */}
        <div className="bg-gradient-to-br from-sky-50/90 to-indigo-50/40 border border-sky-200/80 rounded-xl p-3 flex items-center justify-between hover:border-sky-300 transition-colors shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-sky-100/90 text-sky-700 border border-sky-200/80 shadow-2xs">
              <Truck className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-[11px] text-sky-900 font-semibold">قيد التوصيل</div>
              <div className="text-base font-black text-sky-700 font-mono mt-0.5">{inDeliveryOrders}</div>
            </div>
          </div>
        </div>

        {/* مكتملة ومسلّمة */}
        <div className="bg-gradient-to-br from-emerald-50/90 to-teal-50/40 border border-emerald-200/80 rounded-xl p-3 flex items-center justify-between hover:border-emerald-300 transition-colors shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-100/90 text-emerald-700 border border-emerald-200/80 shadow-2xs">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-[11px] text-emerald-900 font-semibold">مكتملة ومسلّمة</div>
              <div className="text-base font-black text-emerald-700 font-mono mt-0.5">{completedOrders}</div>
            </div>
          </div>
        </div>

        {/* ملغي */}
        <div className="bg-gradient-to-br from-rose-50/90 to-red-50/40 border border-rose-200/80 rounded-xl p-3 flex items-center justify-between hover:border-rose-300 transition-colors shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-rose-100/90 text-rose-700 border border-rose-200/80 shadow-2xs">
              <XCircle className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-[11px] text-rose-900 font-semibold">طلبات ملغاة</div>
              <div className="text-base font-black text-rose-700 font-mono mt-0.5">{cancelledOrders}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
