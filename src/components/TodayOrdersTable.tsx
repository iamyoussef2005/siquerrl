'use client';

import React, { useState, useMemo } from 'react';
import { Order, OrderStatus, Profile } from '@/types/database';
import {
  Search,
  Filter,
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
  XCircle,
  ExternalLink,
  Phone,
  MapPin,
  FileText,
  Eye,
  X,
  Package,
  Bike,
  Edit3,
  UserCheck,
  LayoutGrid,
  Table as TableIcon,
  MessageCircle,
} from 'lucide-react';

interface TodayOrdersTableProps {
  orders: Order[];
  drivers?: Profile[];
  onRefresh: () => void;
  isLoading: boolean;
  highlightedOrderId?: string | number | null;
  onOpenEditModal?: (order: Order) => void;
}

export function TodayOrdersTable({
  orders,
  drivers = [],
  onRefresh,
  isLoading,
  highlightedOrderId,
  onOpenEditModal,
}: TodayOrdersTableProps) {
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFinishedSidebar, setShowFinishedSidebar] = useState<boolean>(true);

  // Format currency safely
  const formatCurrency = (val?: number | string | null) => {
    if (val === null || val === undefined || val === '') return '0';
    const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, ''));
    if (isNaN(num)) return '0';
    return new Intl.NumberFormat('en-US').format(num);
  };

  // Format phone for WhatsApp safely
  const formatWhatsAppPhone = (phoneStr?: string | number | null) => {
    if (!phoneStr) return '';
    let clean = String(phoneStr).replace(/\D/g, '');
    if (clean.startsWith('00')) clean = clean.substring(2);
    if (clean.startsWith('0')) clean = '963' + clean.substring(1);
    else if (!clean.startsWith('963') && clean.length === 9 && clean.startsWith('9')) clean = '963' + clean;
    return clean;
  };

  // Format time with Latin numerals safely
  const formatTime = (dateStr?: string | null) => {
    if (!dateStr) return 'الآن';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'الآن';
      return d.toLocaleTimeString('ar-SY-u-nu-latn', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      try {
        const d = new Date(dateStr);
        return d.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
      } catch {
        return String(dateStr);
      }
    }
  };

  // Status styling and labels (Read-only view for Call Center)
  const getStatusBadge = (status?: OrderStatus | string | null) => {
    switch (status) {
      case 'pending':
        return {
          label: 'بانتظار الإسناد',
          className: 'bg-amber-50 text-amber-700 border-amber-200',
          dotColor: 'bg-amber-500',
          icon: Clock,
        };
      case 'assigned':
        return {
          label: 'تم الإسناد',
          className: 'bg-blue-50 text-blue-700 border-blue-200',
          dotColor: 'bg-blue-500',
          icon: UserCheck,
        };
      case 'preparing':
        return {
          label: 'بانتظار تحضير الطلب',
          className: 'bg-orange-50 text-orange-700 border-orange-200',
          dotColor: 'bg-orange-500',
          icon: Package,
        };
      case 'delivering':
        return {
          label: 'قيد التوصيل',
          className: 'bg-sky-50 text-sky-700 border-sky-200',
          dotColor: 'bg-sky-500',
          icon: Truck,
        };
      case 'delivered':
        return {
          label: 'مكتملة ومسلّمة',
          className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dotColor: 'bg-emerald-500',
          icon: CheckCircle2,
        };
      case 'cancelled':
        return {
          label: 'ملغي',
          className: 'bg-rose-50 text-rose-700 border-rose-200',
          dotColor: 'bg-rose-500',
          icon: XCircle,
        };
      default:
        return {
          label: status || 'غير محدد',
          className: 'bg-slate-100 text-slate-600 border-slate-200',
          dotColor: 'bg-slate-400',
          icon: AlertCircle,
        };
    }
  };

  // Driver name resolver
  const getDriverName = (driverId?: string | null) => {
    if (!driverId || !drivers || !Array.isArray(drivers)) return null;
    const found = drivers.find((d) => d && d.id === driverId);
    return found ? (found.name || found.full_name || 'مندوب') : null;
  };

  // Filtering safely
  const filteredOrders = useMemo(() => {
    if (!orders || !Array.isArray(orders)) return [];
    return orders.filter((order) => {
      if (!order) return false;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        String(order.id ?? '').toLowerCase().includes(q) ||
        (order.customer_name && String(order.customer_name).toLowerCase().includes(q)) ||
        (order.customer_phone && String(order.customer_phone).includes(q)) ||
        (order.delivery_address && String(order.delivery_address).toLowerCase().includes(q)) ||
        (order.order_details && String(order.order_details).toLowerCase().includes(q));

      const matchesStatus =
        statusFilter === 'all' || order.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [orders, searchQuery, statusFilter]);

  // Split into active and finished
  const activeOrders = useMemo(() => {
    return filteredOrders.filter(
      (o) => o && o.status !== 'delivered' && o.status !== 'cancelled'
    );
  }, [filteredOrders]);

  const finishedOrders = useMemo(() => {
    return filteredOrders.filter(
      (o) => o && (o.status === 'delivered' || o.status === 'cancelled')
    );
  }, [filteredOrders]);

  return (
    <div className="bg-[#faf6ee] border-2 border-[#cdbba2] rounded-2xl shadow-sm shadow-orange-950/5 overflow-hidden transition-all">
      {/* شريط التحكم بالطلبات والفلترة وأزرار العرض */}
      <div className="p-3.5 lg:p-4 border-b-2 border-[#cdbba2] bg-gradient-to-r from-[#faeada] via-[#f7f0e3] to-[#faf4eb] flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-orange-500 text-white shadow-xs">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold text-zinc-900 tracking-tight">
                سجل طلبات اليوم
              </h3>
              <span className="px-2 py-0.5 text-[11px] font-bold bg-white text-orange-900 rounded-md border border-orange-300 font-mono shadow-2xs">
                {activeOrders.length} طلبات جارية
              </span>
              <span className="px-2 py-0.5 text-[11px] font-bold bg-emerald-50 text-emerald-900 rounded-md border border-emerald-300 font-mono shadow-2xs">
                {finishedOrders.length} منتهية
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 flex items-center gap-1 font-medium">
              <Edit3 className="w-3.5 h-3.5 text-orange-600" />
              <span>متابعة الطلبات النشطة اليوم، وفصل الطلبات المنتهية بقائمة جانبية مصغرة</span>
            </p>
          </div>
        </div>

        {/* أدوات البحث السريع والفلترة والتبديل بين البطاقات والجدول */}
        <div className="flex flex-wrap items-center gap-2">
          {/* زر التبديل بين عرض البطاقات والجدول */}
          <div className="inline-flex p-1 bg-white border-2 border-[#d5c3aa] rounded-xl text-xs gap-1 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-zinc-600 hover:text-orange-950 hover:bg-orange-50'
              }`}
              title="عرض الطلبات كبطاقات"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>بطاقات</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-zinc-600 hover:text-orange-950 hover:bg-orange-50'
              }`}
              title="عرض الطلبات كجدول"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>جدول</span>
            </button>
          </div>

          {/* زر إظهار/إخفاء القائمة الجانبية للطلبات المنتهية */}
          <button
            type="button"
            onClick={() => setShowFinishedSidebar(!showFinishedSidebar)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs border-2 ${
              showFinishedSidebar
                ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                : 'bg-white hover:bg-emerald-50 text-emerald-800 border-emerald-300'
            }`}
            title={showFinishedSidebar ? 'إخفاء قائمة الطلبات المنتهية الجانبية' : 'عرض قائمة الطلبات المنتهية الجانبية'}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>المنتهية ({finishedOrders.length})</span>
          </button>

          {/* حقل البحث */}
          <div className="relative flex-1 sm:w-56">
            <input
              type="text"
              placeholder="بحث برقم الطلب، الزبون، أو الهاتف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border-2 border-[#d5c3aa] hover:border-orange-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 rounded-xl px-3 py-1.5 pr-8 pl-7 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-hidden transition-all shadow-2xs"
            />
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-2.5 pointer-events-none" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-2 top-2 text-zinc-400 hover:text-zinc-600 p-0.5 rounded hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* فلتر الحالة */}
          <div className="relative flex-1 sm:flex-none">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-white border-2 border-[#d5c3aa] hover:border-orange-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 rounded-xl px-3 py-1.5 text-xs text-zinc-800 font-semibold focus:outline-hidden cursor-pointer appearance-none pl-7 shadow-2xs"
            >
              <option value="all">جميع الحالات</option>
              <option value="pending">بانتظار الإسناد</option>
              <option value="assigned">تم الإسناد</option>
              <option value="preparing">بانتظار تحضير الطلب</option>
              <option value="delivering">قيد التوصيل</option>
              <option value="delivered">مكتملة ومسلّمة</option>
              <option value="cancelled">ملغي</option>
            </select>
            <Filter className="w-3.5 h-3.5 text-zinc-400 absolute left-2 top-2.5 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* المحتوى المقسم: الطلبات الجارية في الوسط + الطلبات المنتهية في قائمة جانبية مصغرة */}
      <div className="flex flex-col lg:flex-row items-start gap-4 p-3.5 lg:p-4 bg-[#f3ede1]/60">
        {/* 1. المنطقة الرئيسية: الطلبات الجارية والنشطة */}
        <div className="flex-1 w-full min-w-0 space-y-3">
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse"></span>
              <h4 className="text-xs sm:text-sm font-bold text-zinc-900">
                الطلبات الجارية والنشطة
              </h4>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-orange-100 text-orange-950 border border-orange-200">
                {activeOrders.length} طلب
              </span>
            </div>

            {!showFinishedSidebar && finishedOrders.length > 0 && (
              <button
                type="button"
                onClick={() => setShowFinishedSidebar(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold transition-all shadow-2xs cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>إظهار المنتهية ({finishedOrders.length})</span>
              </button>
            )}
          </div>

          {activeOrders.length === 0 ? (
            <div className="py-14 text-center text-zinc-500 bg-white rounded-2xl border border-orange-100/90 p-6">
              <div className="flex flex-col items-center justify-center gap-2">
                <div className="p-3 rounded-2xl bg-orange-50 text-orange-400 border border-orange-200">
                  <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                </div>
                <p className="text-sm font-bold text-zinc-800">
                  {finishedOrders.length > 0
                    ? 'لا توجد طلبات جارية حالياً، كافة طلبات اليوم مكتملة ومسلّمة 🎉'
                    : 'لا توجد طلبات تطابق معايير البحث الحالية'}
                </p>
                <p className="text-xs text-zinc-400">
                  يمكنك مراجعة الطلبات المكتملة في القائمة الجانبية
                </p>
              </div>
            </div>
          ) : viewMode === 'cards' ? (
            /* بطاقات الطلبات الجارية للكول سنتر */
            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3.5">
              {activeOrders.map((order) => {
                const badge = getStatusBadge(order.status);
                const assignedName = getDriverName(order.driver_id);
                const isHighlighted = highlightedOrderId === order.id;

                return (
                  <div
                    key={order.id}
                    className={`bg-white rounded-2xl border-2 transition-all duration-200 p-4 flex flex-col justify-between shadow-xs hover:shadow-md relative group border-[#d2c0aa] hover:border-orange-500 ${
                      isHighlighted ? 'animate-new-row ring-2 ring-orange-500/40' : ''
                    }`}
                  >
                    {/* رأس البطاقة */}
                    <div>
                      <div className="flex items-center justify-between gap-2 pb-3 border-b-2 border-[#dfceba]">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-xl bg-orange-100 border-2 border-orange-300 text-orange-950 font-black font-mono text-xs shadow-2xs">
                            #{order.id}
                          </span>
                          <div className="flex items-center gap-1 text-[11px] text-zinc-600 font-mono font-medium">
                            <Clock className="w-3 h-3 text-orange-600" />
                            <span>{formatTime(order.created_at)}</span>
                          </div>
                        </div>

                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border-2 inline-flex items-center gap-1.5 shadow-2xs ${badge.className}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dotColor}`}></span>
                          <span>{badge.label}</span>
                        </span>
                      </div>

                      {/* بيانات الزبون والتوصيل */}
                      <div className="pt-3 space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-extrabold text-zinc-900 text-sm sm:text-base tracking-tight truncate">
                            {order.customer_name}
                          </h4>
                          <div className="flex items-center gap-1 shrink-0">
                            <a
                              href={`tel:${order.customer_phone}`}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-900 border border-orange-300 text-[11px] font-mono font-bold transition-all shadow-2xs"
                              dir="ltr"
                              title="اتصال هاتفي بالزبون"
                            >
                              <Phone className="w-3 h-3 text-orange-600" />
                              <span>{order.customer_phone}</span>
                            </a>

                            {order.customer_phone && (
                              <a
                                href={`https://wa.me/${formatWhatsAppPhone(order.customer_phone)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 transition-all shadow-2xs"
                                title="مراسلة عبر واتساب"
                              >
                                <MessageCircle className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>

                        {/* عنوان التوصيل وتفاصيل الطلب */}
                        <div className="bg-[#faf5ec] p-3 rounded-xl border-2 border-[#dfceba] space-y-2">
                          <div className="flex items-start gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-orange-600 shrink-0 mt-0.5" />
                            <span className="text-xs text-zinc-900 font-bold leading-relaxed">
                              {order.delivery_address}
                            </span>
                          </div>

                          {order.order_details && (
                            <div className="flex items-start gap-1.5 pt-1.5 border-t border-[#dfceba] text-[11px] text-zinc-700 font-medium">
                              <Package className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                              <p className="line-clamp-2">{order.order_details}</p>
                            </div>
                          )}

                          {order.maps_url && (
                            <div className="pt-1">
                              <a
                                href={order.maps_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white hover:bg-orange-50 border border-orange-300 text-[10px] text-orange-800 font-bold transition-colors shadow-2xs"
                              >
                                <ExternalLink className="w-2.5 h-2.5" />
                                <span>عرض العنوان على الخريطة</span>
                              </a>
                            </div>
                          )}
                        </div>

                        {/* المندوب المسند */}
                        <div className="flex items-center justify-between p-3 rounded-xl bg-[#f4ece0] border-2 border-[#dfceba] text-xs">
                          <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                            <Bike className="w-3.5 h-3.5 text-orange-600" />
                            <span>المندوب:</span>
                          </span>
                          {assignedName ? (
                            <span className="font-bold text-blue-900 bg-blue-100 border border-blue-300 px-2 py-0.5 rounded-md">
                              {assignedName}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-500 italic font-medium">
                              بانتظار إسناد الإدارة
                            </span>
                          )}
                        </div>

                        {/* الحسابات والأجور */}
                        <div className="grid grid-cols-3 gap-2 bg-[#fdf9f2] p-2.5 rounded-xl border-2 border-[#d8c5ad] text-center">
                          <div className="flex flex-col justify-center">
                            <span className="text-[10px] text-zinc-600 font-bold">سعر الأغراض</span>
                            {order.items_price && Number(order.items_price) > 0 ? (
                              <span className="font-mono font-bold text-amber-950 text-xs mt-0.5">
                                {formatCurrency(Number(order.items_price))}
                                <span className="text-[9px] text-amber-800 mr-0.5 font-bold">ل.س</span>
                              </span>
                            ) : (
                              <span className="text-[9.5px] text-zinc-400 italic mt-0.5">بانتظار المندوب</span>
                            )}
                          </div>

                          <div className="flex flex-col justify-center border-x-2 border-[#dfceba] px-1">
                            <span className="text-[10px] text-zinc-600 font-bold">أجرة التوصيل</span>
                            {order.delivery_fee && Number(order.delivery_fee) > 0 ? (
                              <span className="font-mono font-bold text-orange-950 text-xs mt-0.5">
                                {formatCurrency(Number(order.delivery_fee))}
                                <span className="text-[9px] text-orange-800 mr-0.5 font-bold">ل.س</span>
                              </span>
                            ) : (
                              <span className="text-[9.5px] text-zinc-400 italic mt-0.5">بانتظار المدير</span>
                            )}
                          </div>

                          <div className="flex flex-col justify-center">
                            <span className="text-[10px] text-emerald-950 font-extrabold">إجمالي التحصيل</span>
                            <span className="font-mono font-black text-emerald-800 text-xs sm:text-sm mt-0.5">
                              {formatCurrency(Number(order.collection_amount))}
                              <span className="text-[9px] text-emerald-700 mr-0.5 font-bold">ل.س</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* زر تعديل الطلب والحسابات */}
                    {onOpenEditModal && (
                      <div className="pt-3 mt-3 border-t-2 border-[#dfceba]">
                        <button
                          type="button"
                          onClick={() => onOpenEditModal(order)}
                          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-orange-100 hover:bg-orange-200 text-orange-950 border-2 border-orange-300 text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-2xs hover:shadow-xs"
                          title="تعديل تفاصيل الطلب والحسابات"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-orange-600" />
                          <span>تعديل الطلب والحسابات</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* جدول الطلبات الجارية */
            <div className="overflow-x-auto bg-white rounded-2xl border-2 border-[#cdbba2] shadow-2xs">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#efe6d5] text-zinc-900 border-b-2 border-[#cdbba2] text-[11px] font-bold tracking-normal">
                  <tr>
                    <th className="py-3 px-4">رقم الطلب</th>
                    <th className="py-3 px-3">الوقت</th>
                    <th className="py-3 px-4">الزبون والهاتف</th>
                    <th className="py-3 px-4">العنوان والمواد</th>
                    <th className="py-3 px-3 text-center">سعر الأغراض</th>
                    <th className="py-3 px-3 text-center">أجرة التوصيل</th>
                    <th className="py-3 px-3 text-center">إجمالي التحصيل</th>
                    <th className="py-3 px-4">المندوب المسند</th>
                    <th className="py-3 px-4 text-center">الحالة</th>
                    {onOpenEditModal && <th className="py-3 px-4 text-center">الإجراءات</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#dfceba]/70 text-zinc-800">
                  {activeOrders.map((order) => {
                    const badge = getStatusBadge(order.status);
                    const assignedName = getDriverName(order.driver_id);
                    const isHighlighted = highlightedOrderId === order.id;

                    return (
                      <tr
                        key={order.id}
                        className={`hover:bg-orange-50/50 transition-colors group ${
                          isHighlighted ? 'animate-new-row ring-1 ring-orange-500' : ''
                        }`}
                      >
                        <td className="py-3 px-4 font-mono whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md bg-orange-100/70 border border-orange-200/80 text-orange-900 font-bold text-xs shadow-2xs">
                            #{order.id}
                          </span>
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                          {formatTime(order.created_at)}
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 text-xs sm:text-sm">{order.customer_name}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <a
                              href={`tel:${order.customer_phone}`}
                              className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-orange-600 font-mono transition-colors"
                              dir="ltr"
                            >
                              <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{order.customer_phone}</span>
                            </a>
                            {order.customer_phone && (
                              <a
                                href={`https://wa.me/${formatWhatsAppPhone(order.customer_phone)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-emerald-600 hover:text-emerald-700 transition-colors"
                                title="واتساب"
                              >
                                <MessageCircle className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4 max-w-xs">
                          <div className="flex items-start gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <span className="line-clamp-1 text-slate-800 font-medium text-xs" title={order.delivery_address}>
                              {order.delivery_address}
                            </span>
                          </div>
                          {order.order_details && (
                            <p className="line-clamp-1 text-[11px] text-slate-500 mt-0.5 font-normal" title={order.order_details}>
                              {order.order_details}
                            </p>
                          )}
                          {order.maps_url && (
                            <a
                              href={order.maps_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-1 px-1.5 py-0.5 rounded bg-orange-50 hover:bg-orange-100 border border-orange-200 text-[10px] text-orange-700 inline-flex items-center gap-1 transition-colors font-medium"
                            >
                              <span>عرض الخريطة</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </td>

                        <td className="py-3 px-3 text-center whitespace-nowrap font-mono text-xs">
                          {order.items_price && Number(order.items_price) > 0 ? (
                            <span className="font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md inline-block">
                              {formatCurrency(Number(order.items_price))} <span className="text-[10px] text-amber-700">ل.س</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-zinc-400 italic">بانتظار المندوب</span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-center whitespace-nowrap font-mono text-xs">
                          {order.delivery_fee && Number(order.delivery_fee) > 0 ? (
                            <span className="font-bold text-orange-950 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-md inline-block">
                              {formatCurrency(Number(order.delivery_fee))} <span className="text-[10px] text-orange-700">ل.س</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-zinc-400 italic">بانتظار المدير</span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-center whitespace-nowrap font-mono font-bold text-emerald-800 text-xs sm:text-sm">
                          {formatCurrency(Number(order.collection_amount))}
                          <span className="text-[10px] text-emerald-600 mr-1">ل.س</span>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          {assignedName ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-medium text-xs">
                              <Bike className="w-3.5 h-3.5 text-slate-500" />
                              <span>{assignedName}</span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">
                              بانتظار إسناد الإدارة
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border inline-flex items-center gap-1.5 ${badge.className}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${badge.dotColor}`}></span>
                            <span>{badge.label}</span>
                          </span>
                        </td>

                        {onOpenEditModal && (
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => onOpenEditModal(order)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 text-xs font-semibold transition-all cursor-pointer active:scale-95 shadow-2xs hover:shadow-xs"
                              title="تعديل تفاصيل الطلب والحسابات"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>تعديل</span>
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 2. القائمة الجانبية المستقلة: الطلبات المنتهية (المكتملة والملغاة) بحجم مصغر */}
        {showFinishedSidebar && (
          <aside className="w-full lg:w-80 xl:w-96 shrink-0 bg-gradient-to-b from-[#f7f0e4] via-[#fbf8f2] to-white rounded-2xl border-2 border-[#cdbba2] p-3 sm:p-3.5 space-y-3 shadow-sm">
            {/* رأس القائمة الجانبية */}
            <div className="flex items-center justify-between pb-2.5 border-b-2 border-[#dfceba]">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800 border-2 border-emerald-300 shadow-2xs">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs sm:text-sm font-extrabold text-zinc-900">
                      الطلبات المنتهية
                    </h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white text-zinc-900 border-2 border-[#dfceba] shadow-2xs">
                      {finishedOrders.length}
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-500 font-medium">المكتملة والمسلّمة والملغاة</p>
                </div>
              </div>

              {/* زر إخفاء القائمة الجانبية */}
              <button
                type="button"
                onClick={() => setShowFinishedSidebar(false)}
                className="p-1 rounded-lg hover:bg-orange-100/70 text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
                title="إخفاء القائمة الجانبية"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* قائمة البطاقات المصغرة للطلبات المنتهية للكول سنتر */}
            <div className="space-y-2.5 max-h-[750px] overflow-y-auto pr-1">
              {finishedOrders.length === 0 ? (
                <div className="py-10 text-center text-zinc-400 text-xs bg-white/70 rounded-xl border-2 border-[#dfceba] p-4">
                  <CheckCircle2 className="w-6 h-6 mx-auto mb-1 text-zinc-300" />
                  <p className="font-semibold text-zinc-600">لا توجد طلبات منتهية حالياً</p>
                  <p className="text-[10.5px] text-zinc-400 mt-0.5">عند تسليم أي طلب أو إلغائه سيظهر هنا بشكل مصغر</p>
                </div>
              ) : (
                finishedOrders.map((order) => {
                  const badge = getStatusBadge(order.status);
                  const assignedName = getDriverName(order.driver_id);
                  const isDelivered = order.status === 'delivered';

                  return (
                    <div
                      key={order.id}
                      className={`bg-white rounded-xl border-2 p-3 transition-all shadow-2xs hover:shadow-xs space-y-2 ${
                        isDelivered
                          ? 'border-emerald-300 hover:border-emerald-500'
                          : 'border-rose-300 hover:border-rose-500 bg-rose-50/30'
                      }`}
                    >
                      {/* رأس البطاقة المصغرة */}
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-md bg-zinc-100 font-mono font-bold text-[11px] text-zinc-900 border border-zinc-300">
                            #{order.id}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-mono font-semibold">
                            {formatTime(order.created_at)}
                          </span>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border-2 inline-flex items-center gap-1 ${badge.className}`}
                        >
                          <span className={`w-1 h-1 rounded-full ${badge.dotColor}`}></span>
                          <span>{badge.label}</span>
                        </span>
                      </div>

                      {/* تفاصيل الزبون والعنوان */}
                      <div className="text-xs space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-extrabold text-zinc-900 truncate">
                            {order.customer_name}
                          </span>
                          <a
                            href={`tel:${order.customer_phone}`}
                            className="text-[10.5px] text-zinc-600 hover:text-orange-600 font-mono font-bold"
                            dir="ltr"
                          >
                            {order.customer_phone}
                          </a>
                        </div>

                        <div className="flex items-center gap-1 text-[11px] text-zinc-700">
                          <MapPin className="w-3 h-3 text-orange-600 shrink-0" />
                          <span className="truncate font-medium">{order.delivery_address}</span>
                        </div>
                      </div>

                      {/* المندوب والحسابات */}
                      <div className="bg-[#f6eee0] p-2 rounded-lg border border-[#dfceba] text-[10.5px] flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1 truncate text-zinc-800">
                          <Bike className="w-3 h-3 text-orange-600 shrink-0" />
                          <span className="truncate font-bold">{assignedName || 'بدون مندوب'}</span>
                        </div>
                        <div className="font-mono font-black text-emerald-800 shrink-0">
                          {formatCurrency(Number(order.collection_amount))} <span className="text-[9px]">ل.س</span>
                        </div>
                      </div>

                      {/* زر التعديل */}
                      {onOpenEditModal && (
                        <div className="flex items-center justify-end pt-1.5 border-t border-[#dfceba]">
                          <button
                            type="button"
                            onClick={() => onOpenEditModal(order)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-100 hover:bg-orange-200 text-orange-950 border border-orange-300 text-[10.5px] font-bold transition-all cursor-pointer shadow-2xs"
                            title="عرض وتعديل تفاصيل الطلب"
                          >
                            <Edit3 className="w-3 h-3 text-orange-600" />
                            <span>تعديل</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
