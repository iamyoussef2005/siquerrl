'use client';

import React from 'react';
import { Order } from '@/types/database';
import { Package, Clock, CheckCircle2, TrendingUp, DollarSign } from 'lucide-react';

interface StatsCardsProps {
  orders: Order[];
}

export function StatsCards({ orders }: StatsCardsProps) {
  const totalOrders = orders.length;
  const pendingOrders = orders.filter((o) => o.status === 'pending').length;
  const deliveredOrders = orders.filter((o) => o.status === 'delivered').length;
  const inDeliveryOrders = orders.filter((o) => o.status === 'delivering').length;

  const activeOrders = orders.filter((o) => o.status !== 'cancelled');
  const totalCollection = activeOrders.reduce((sum, o) => sum + (Number(o.collection_amount) || 0), 0);
  const totalOfficeFee = activeOrders.reduce((sum, o) => sum + (Number(o.office_fee) || 0), 0);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US').format(val || 0);
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      {/* إجمالي طلبات اليوم */}
      <div className="bg-white border border-zinc-200/80 rounded-2xl p-3.5 flex flex-col justify-between shadow-xs hover:border-orange-300 hover:shadow-xs transition-all">
        <div className="flex items-center justify-between text-zinc-500 mb-1">
          <span className="text-xs font-bold text-zinc-700">إجمالي اليوم</span>
          <div className="p-1.5 rounded-lg bg-orange-50 text-orange-600 border border-orange-100">
            <Package className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-black text-zinc-900 tracking-tight font-mono">{totalOrders}</span>
          <span className="text-xs font-medium text-zinc-400">طلب</span>
        </div>
      </div>

      {/* بانتظار تحضير الطلب */}
      <div className="bg-white border border-zinc-200/80 rounded-2xl p-3.5 flex flex-col justify-between shadow-xs hover:border-amber-300 hover:shadow-xs transition-all">
        <div className="flex items-center justify-between text-zinc-500 mb-1">
          <span className="text-xs font-bold text-zinc-700">بانتظار التحضير</span>
          <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-black text-amber-600 tracking-tight font-mono">{pendingOrders}</span>
          <span className="text-xs font-bold text-amber-600/80">طلب</span>
        </div>
      </div>

      {/* قيد التوصيل */}
      <div className="bg-white border border-zinc-200/80 rounded-2xl p-3.5 flex flex-col justify-between shadow-xs hover:border-sky-300 hover:shadow-xs transition-all">
        <div className="flex items-center justify-between text-zinc-500 mb-1">
          <span className="text-xs font-bold text-zinc-700">قيد التوصيل</span>
          <div className="p-1.5 rounded-lg bg-sky-50 text-sky-600 border border-sky-100">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-black text-sky-600 tracking-tight font-mono">{inDeliveryOrders}</span>
          <span className="text-xs font-bold text-sky-600/80">مع المندوب</span>
        </div>
      </div>

      {/* مكتملة ومسلّمة */}
      <div className="bg-white border border-zinc-200/80 rounded-2xl p-3.5 flex flex-col justify-between shadow-xs hover:border-emerald-300 hover:shadow-xs transition-all">
        <div className="flex items-center justify-between text-zinc-500 mb-1">
          <span className="text-xs font-bold text-zinc-700">مكتملة ومسلّمة</span>
          <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-black text-emerald-600 tracking-tight font-mono">{deliveredOrders}</span>
          <span className="text-xs font-bold text-emerald-600/80">مكتمل</span>
        </div>
      </div>

      {/* إجمالي مبالغ التحصيل */}
      <div className="bg-white border border-zinc-200/80 rounded-2xl p-3.5 flex flex-col justify-between shadow-xs hover:border-orange-300 hover:shadow-xs transition-all">
        <div className="flex items-center justify-between text-zinc-500 mb-1">
          <span className="text-xs font-bold text-zinc-700">التحصيل المطلوب</span>
          <div className="p-1.5 rounded-lg bg-orange-50 text-orange-600 border border-orange-100">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-black text-zinc-900 tracking-tight truncate font-mono">{formatCurrency(totalCollection)}</span>
          <span className="text-xs font-bold text-orange-600">ل.س</span>
        </div>
      </div>

      {/* دخل المكتب */}
      <div className="bg-white border border-zinc-200/80 rounded-2xl p-3.5 flex flex-col justify-between shadow-xs hover:border-amber-300 hover:shadow-xs transition-all">
        <div className="flex items-center justify-between text-zinc-500 mb-1">
          <span className="text-xs font-bold text-zinc-700">دخل المكتب اليوم</span>
          <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-black text-amber-700 tracking-tight truncate font-mono">{formatCurrency(totalOfficeFee)}</span>
          <span className="text-xs font-bold text-amber-600">ل.س</span>
        </div>
      </div>
    </div>
  );
}
