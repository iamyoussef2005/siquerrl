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
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between shadow-xs hover:border-slate-300 transition-all">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-xs font-semibold">إجمالي اليوم</span>
          <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
            <Package className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-slate-900 tracking-tight font-mono">{totalOrders}</span>
          <span className="text-xs text-slate-500">طلب</span>
        </div>
      </div>

      {/* قيد الانتظار */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between shadow-xs hover:border-slate-300 transition-all">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-xs font-semibold">قيد الانتظار</span>
          <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-amber-600 tracking-tight font-mono">{pendingOrders}</span>
          <span className="text-xs text-amber-600/80">طلب جديد</span>
        </div>
      </div>

      {/* جاري التوصيل */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between shadow-xs hover:border-slate-300 transition-all">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-xs font-semibold">جاري التوصيل</span>
          <div className="p-1.5 rounded-lg bg-sky-50 text-sky-600 border border-sky-100">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-sky-600 tracking-tight font-mono">{inDeliveryOrders}</span>
          <span className="text-xs text-sky-600/80">مع المندوب</span>
        </div>
      </div>

      {/* تم التسليم */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between shadow-xs hover:border-slate-300 transition-all">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-xs font-semibold">تم التسليم</span>
          <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-emerald-600 tracking-tight font-mono">{deliveredOrders}</span>
          <span className="text-xs text-emerald-600/80">مكتمل</span>
        </div>
      </div>

      {/* إجمالي مبالغ التحصيل */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between shadow-xs hover:border-slate-300 transition-all">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-xs font-semibold">التحصيل المطلوب</span>
          <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-bold text-slate-900 tracking-tight truncate font-mono">{formatCurrency(totalCollection)}</span>
          <span className="text-xs text-slate-500 font-normal">ل.س</span>
        </div>
      </div>

      {/* دخل المكتب */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between shadow-xs hover:border-slate-300 transition-all">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-xs font-semibold">دخل المكتب اليوم</span>
          <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600 border border-purple-100">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-bold text-purple-700 tracking-tight truncate font-mono">{formatCurrency(totalOfficeFee)}</span>
          <span className="text-xs text-purple-600 font-normal">ل.س</span>
        </div>
      </div>
    </div>
  );
}
