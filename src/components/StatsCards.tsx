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
  const inDeliveryOrders = orders.filter((o) => o.status === 'delivering' || o.status === 'assigned').length;

  const totalCollection = orders.reduce((sum, o) => sum + (Number(o.collection_amount) || 0), 0);
  const totalOfficeFee = orders.reduce((sum, o) => sum + (Number(o.office_fee) || 0), 0);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US').format(val || 0);
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      {/* إجمالي طلبات اليوم */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between shadow-sm hover:border-slate-700 transition-colors">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-xs font-medium">إجمالي اليوم</span>
          <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
            <Package className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-white tracking-tight">{totalOrders}</span>
          <span className="text-xs text-slate-500">طلب</span>
        </div>
      </div>

      {/* قيد الانتظار */}
      <div className="bg-slate-900/80 border border-amber-900/40 rounded-xl p-3.5 flex flex-col justify-between shadow-sm hover:border-amber-700/50 transition-colors">
        <div className="flex items-center justify-between text-amber-400 mb-1">
          <span className="text-xs font-medium">قيد الانتظار</span>
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-amber-400 tracking-tight">{pendingOrders}</span>
          <span className="text-xs text-amber-500/80">طلب جديد</span>
        </div>
      </div>

      {/* جاري التوصيل */}
      <div className="bg-slate-900/80 border border-sky-900/40 rounded-xl p-3.5 flex flex-col justify-between shadow-sm hover:border-sky-700/50 transition-colors">
        <div className="flex items-center justify-between text-sky-400 mb-1">
          <span className="text-xs font-medium">جاري التوصيل</span>
          <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-sky-400 tracking-tight">{inDeliveryOrders}</span>
          <span className="text-xs text-sky-500/80">مع المندوب</span>
        </div>
      </div>

      {/* تم التسليم */}
      <div className="bg-slate-900/80 border border-emerald-900/40 rounded-xl p-3.5 flex flex-col justify-between shadow-sm hover:border-emerald-700/50 transition-colors">
        <div className="flex items-center justify-between text-emerald-400 mb-1">
          <span className="text-xs font-medium">تم التسليم</span>
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-emerald-400 tracking-tight">{deliveredOrders}</span>
          <span className="text-xs text-emerald-500/80">مكتمل</span>
        </div>
      </div>

      {/* إجمالي مبالغ التحصيل */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between shadow-sm hover:border-slate-700 transition-colors">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-xs font-medium">التحصيل المطلوب</span>
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-bold text-slate-100 tracking-tight truncate">{formatCurrency(totalCollection)}</span>
          <span className="text-xs text-slate-400 font-normal">ل.س</span>
        </div>
      </div>

      {/* دخل المكتب */}
      <div className="bg-slate-900/80 border border-purple-900/30 rounded-xl p-3.5 flex flex-col justify-between shadow-sm hover:border-purple-700/40 transition-colors">
        <div className="flex items-center justify-between text-purple-400 mb-1">
          <span className="text-xs font-medium">دخل المكتب اليوم</span>
          <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-bold text-purple-300 tracking-tight truncate">{formatCurrency(totalOfficeFee)}</span>
          <span className="text-xs text-purple-400 font-normal">ل.س</span>
        </div>
      </div>
    </div>
  );
}
