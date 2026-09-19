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
        <div className="bg-[#121826] border border-blue-500/30 rounded-xl px-4 py-2.5 text-xs flex items-center justify-between text-slate-200 shadow-sm">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-blue-400" />
            <span>
              عرض حسابات المندوب:{' '}
              <strong className="text-white font-semibold">
                {selectedDriver.name}
              </strong>
            </span>
          </div>
          <span className="bg-blue-500/15 text-blue-400 border border-blue-500/25 px-2.5 py-0.5 rounded-md font-mono text-[11px] font-medium">
            {relevantOrders.length} {relevantOrders.length === 1 ? 'طلب' : 'طلبات'}
          </span>
        </div>
      )}

      {/* بطاقات المؤشرات المالية الرئيسية */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {/* 1. إجمالي المبالغ المطلوب تحصيلها */}
        <div className="rounded-xl bg-[#0e131f] border border-[#1c2436] p-4 sm:p-5 shadow-sm hover:border-[#28344d] transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium">إجمالي مبالغ التحصيل</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-white font-mono tracking-tight">
              {formatCurrency(totalCollection)}
            </span>
            <span className="text-xs font-medium text-slate-400">ل.س</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 font-normal">
            مجموع مبالغ التحصيل المحسوبة ({filterLabel})
          </p>
        </div>

        {/* 2. أرباح المكتب */}
        <div className="rounded-xl bg-[#0e131f] border border-[#1c2436] p-4 sm:p-5 shadow-sm hover:border-[#28344d] transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium">أرباح المكتب (عمولات التوصيل)</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-white font-mono tracking-tight">
              {formatCurrency(totalOfficeProfit)}
            </span>
            <span className="text-xs font-medium text-slate-400">ل.س</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 font-normal">
            صافي حصة المكتب من أجور التوصيل ({filterLabel})
          </p>
        </div>

        {/* 3. مستحقات المناديب */}
        <div className="rounded-xl bg-[#0e131f] border border-[#1c2436] p-4 sm:p-5 shadow-sm hover:border-[#28344d] transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium">
              {selectedDriver ? `مستحقات ${selectedDriver.name}` : 'إجمالي مستحقات المناديب'}
            </span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-white font-mono tracking-tight">
              {formatCurrency(totalDriverDues)}
            </span>
            <span className="text-xs font-medium text-slate-400">ل.س</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 font-normal">
            حصة السائقين المقررة عن التوصيل ({filterLabel})
          </p>
        </div>
      </div>

      {/* عدادات الحالات التنفيذية الأنيقة */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* قيد الانتظار */}
        <div className="bg-[#0e131f] border border-[#1b2234] rounded-xl p-3 flex items-center justify-between hover:border-[#28344d] transition-colors">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-[11px] text-slate-400">بانتظار مندوب</div>
              <div className="text-base font-bold text-amber-400 font-mono mt-0.5">{pendingOrders}</div>
            </div>
          </div>
        </div>

        {/* قيد التوصيل */}
        <div className="bg-[#0e131f] border border-[#1b2234] rounded-xl p-3 flex items-center justify-between hover:border-[#28344d] transition-colors">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
              <Truck className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-[11px] text-slate-400">قيد التوصيل</div>
              <div className="text-base font-bold text-blue-400 font-mono mt-0.5">{inDeliveryOrders}</div>
            </div>
          </div>
        </div>

        {/* مكتملة */}
        <div className="bg-[#0e131f] border border-[#1b2234] rounded-xl p-3 flex items-center justify-between hover:border-[#28344d] transition-colors">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-[11px] text-slate-400">مكتملة ومسلّمة</div>
              <div className="text-base font-bold text-emerald-400 font-mono mt-0.5">{completedOrders}</div>
            </div>
          </div>
        </div>

        {/* ملغاة */}
        <div className="bg-[#0e131f] border border-[#1b2234] rounded-xl p-3 flex items-center justify-between hover:border-[#28344d] transition-colors">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
              <XCircle className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-[11px] text-slate-400">ملغاة</div>
              <div className="text-base font-bold text-rose-400 font-mono mt-0.5">{cancelledOrders}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
