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
  Package,
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
  const preparingOrders = relevantOrders.filter((o) => o.status === 'preparing').length;
  const assignedOrders = relevantOrders.filter((o) => o.status === 'assigned').length;
  const pendingAssignmentOrders = relevantOrders.filter((o) => o.status === 'pending').length;
  const cancelledOrders = relevantOrders.filter((o) => o.status === 'cancelled').length;

  // Financial calculations (excluding cancelled orders)
  const activeFinancialOrders = relevantOrders.filter((o) => o.status !== 'cancelled');
  const totalItemsPrice = activeFinancialOrders.reduce((sum, o) => sum + (Number(o.items_price) || 0), 0);
  const totalDeliveryFees = activeFinancialOrders.reduce((sum, o) => sum + (Number(o.delivery_fee) || 0), 0);
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
        <div className="rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-50/80 to-white border-2 border-amber-300 p-4 sm:p-5 shadow-xs hover:border-amber-400 hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-zinc-500 mb-3">
            <span className="text-xs font-bold text-amber-950">إجمالي مبالغ التحصيل</span>
            <div className="p-2 rounded-xl bg-amber-100 border border-amber-300 text-amber-800 shadow-2xs">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-amber-950 font-mono tracking-tight">
              {formatCurrency(totalCollection)}
            </span>
            <span className="text-xs font-black text-amber-700">ل.س</span>
          </div>
          <p className="text-[11px] text-amber-900/90 mt-2 font-semibold flex items-center justify-between gap-1 flex-wrap">
            <span>سعر الأغراض: {formatCurrency(totalItemsPrice)}</span>
            <span>•</span>
            <span>أجور التوصيل: {formatCurrency(totalDeliveryFees)}</span>
          </p>
        </div>

        {/* 2. أرباح المكتب (HERO CARD) */}
        <div className="rounded-2xl bg-gradient-to-br from-orange-500/15 via-amber-500/10 to-orange-50/60 border-2 border-orange-400 p-4 sm:p-5 shadow-sm shadow-orange-500/10 hover:border-orange-500 hover:shadow-md transition-all">
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
          <p className="text-[11px] text-orange-900 mt-2 font-semibold">
            صافي حصة المكتب من أجور التوصيل ({filterLabel})
          </p>
        </div>

        {/* 3. مستحقات المناديب */}
        <div className="rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-50/80 to-white border-2 border-emerald-300 p-4 sm:p-5 shadow-xs hover:border-emerald-400 hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-zinc-500 mb-3">
            <span className="text-xs font-bold text-emerald-950">
              {selectedDriver ? `مستحقات ${selectedDriver.name}` : 'إجمالي مستحقات المناديب'}
            </span>
            <div className="p-2 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-800 shadow-2xs">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-900 font-mono tracking-tight">
              {formatCurrency(totalDriverDues)}
            </span>
            <span className="text-xs font-black text-emerald-700">ل.س</span>
          </div>
          <p className="text-[11px] text-emerald-900/80 mt-2 font-semibold">
            حصة السائقين المقررة عن التوصيل ({filterLabel})
          </p>
        </div>
      </div>

      {/* عدادات الحالات التنفيذية المصغرة والأنيقة جنب بعض */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 sm:gap-2">
        {/* بانتظار الإسناد */}
        <div className="bg-gradient-to-br from-amber-50 to-yellow-50/70 border-2 border-amber-300 rounded-xl p-2 sm:p-2.5 flex items-center justify-between hover:border-amber-400 transition-all shadow-2xs">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <div className="p-1 sm:p-1.5 rounded-lg bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs shrink-0">
              <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] sm:text-[11px] text-amber-950 font-bold truncate">بانتظار الإسناد</div>
              <div className="text-xs sm:text-sm font-black text-amber-800 font-mono leading-none mt-0.5">{pendingAssignmentOrders}</div>
            </div>
          </div>
        </div>

        {/* تم الإسناد */}
        <div className="bg-gradient-to-br from-blue-50 to-sky-50/70 border-2 border-blue-300 rounded-xl p-2 sm:p-2.5 flex items-center justify-between hover:border-blue-400 transition-all shadow-2xs">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <div className="p-1 sm:p-1.5 rounded-lg bg-blue-100 text-blue-800 border border-blue-300 shadow-2xs shrink-0">
              <UserCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] sm:text-[11px] text-blue-950 font-bold truncate">تم الإسناد</div>
              <div className="text-xs sm:text-sm font-black text-blue-800 font-mono leading-none mt-0.5">{assignedOrders}</div>
            </div>
          </div>
        </div>

        {/* بانتظار تحضير الطلب */}
        <div className="bg-gradient-to-br from-orange-50 to-amber-50/70 border-2 border-orange-300 rounded-xl p-2 sm:p-2.5 flex items-center justify-between hover:border-orange-400 transition-all shadow-2xs">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <div className="p-1 sm:p-1.5 rounded-lg bg-orange-100 text-orange-800 border border-orange-300 shadow-2xs shrink-0">
              <Package className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] sm:text-[11px] text-orange-950 font-bold truncate">بانتظار التحضير</div>
              <div className="text-xs sm:text-sm font-black text-orange-800 font-mono leading-none mt-0.5">{preparingOrders}</div>
            </div>
          </div>
        </div>

        {/* قيد التوصيل */}
        <div className="bg-gradient-to-br from-sky-50 to-indigo-50/60 border-2 border-sky-300 rounded-xl p-2 sm:p-2.5 flex items-center justify-between hover:border-sky-400 transition-all shadow-2xs">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <div className="p-1 sm:p-1.5 rounded-lg bg-sky-100 text-sky-800 border border-sky-300 shadow-2xs shrink-0">
              <Truck className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] sm:text-[11px] text-sky-950 font-bold truncate">قيد التوصيل</div>
              <div className="text-xs sm:text-sm font-black text-sky-800 font-mono leading-none mt-0.5">{inDeliveryOrders}</div>
            </div>
          </div>
        </div>

        {/* مكتملة ومسلّمة */}
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50/60 border-2 border-emerald-300 rounded-xl p-2 sm:p-2.5 flex items-center justify-between hover:border-emerald-400 transition-all shadow-2xs">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <div className="p-1 sm:p-1.5 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs shrink-0">
              <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] sm:text-[11px] text-emerald-950 font-bold truncate">مكتملة ومسلّمة</div>
              <div className="text-xs sm:text-sm font-black text-emerald-800 font-mono leading-none mt-0.5">{completedOrders}</div>
            </div>
          </div>
        </div>

        {/* ملغي */}
        <div className="bg-gradient-to-br from-rose-50 to-red-50/60 border-2 border-rose-300 rounded-xl p-2 sm:p-2.5 flex items-center justify-between hover:border-rose-400 transition-all shadow-2xs">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <div className="p-1 sm:p-1.5 rounded-lg bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs shrink-0">
              <XCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] sm:text-[11px] text-rose-950 font-bold truncate">طلبات ملغاة</div>
              <div className="text-xs sm:text-sm font-black text-rose-800 font-mono leading-none mt-0.5">{cancelledOrders}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
