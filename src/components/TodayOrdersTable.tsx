'use client';

import React, { useState } from 'react';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Format currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US').format(val || 0);
  };

  // Format time with Latin numerals
  const formatTime = (dateStr?: string) => {
    if (!dateStr) return 'الآن';
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString('ar-SY-u-nu-latn', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  // Status styling and labels (Read-only view for Call Center)
  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return {
          label: 'بانتظار مندوب',
          className: 'bg-amber-50 text-amber-700 border-amber-200',
          dotColor: 'bg-amber-500',
          icon: Clock,
        };
      case 'assigned':
        return {
          label: 'مُسند للمندوب',
          className: 'bg-orange-50 text-orange-700 border-orange-200 font-bold',
          dotColor: 'bg-orange-500',
          icon: Truck,
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
          label: 'تم التسليم',
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
          label: status,
          className: 'bg-slate-100 text-slate-600 border-slate-200',
          dotColor: 'bg-slate-400',
          icon: AlertCircle,
        };
    }
  };

  // Driver name resolver
  const getDriverName = (driverId?: string | null) => {
    if (!driverId) return null;
    const found = drivers.find((d) => d.id === driverId);
    return found ? found.name : null;
  };

  // Filtering
  const filteredOrders = orders.filter((order) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      String(order.id).toLowerCase().includes(q) ||
      (order.customer_name && order.customer_name.toLowerCase().includes(q)) ||
      (order.customer_phone && order.customer_phone.includes(q)) ||
      (order.delivery_address && order.delivery_address.toLowerCase().includes(q)) ||
      (order.order_details && order.order_details.toLowerCase().includes(q));

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'in_delivery'
        ? order.status === 'delivering' || order.status === 'assigned'
        : order.status === statusFilter);

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden transition-all">
      {/* شريط التحكم بالجدول والفلترة */}
      <div className="p-3.5 lg:p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-orange-50 text-orange-600 border border-orange-100 shadow-2xs">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                سجل طلبات اليوم
              </h3>
              <span className="px-2 py-0.5 text-[11px] font-semibold bg-white text-slate-700 rounded-md border border-slate-200 font-mono shadow-2xs">
                {filteredOrders.length} طلب
              </span>
            </div>
            <p className="text-[11px] text-slate-500 flex items-center gap-1">
              <Edit3 className="w-3.5 h-3.5 text-orange-600" />
              <span>عرض ومتابعة وتعديل بيانات الطلبات والحسابات</span>
            </p>
          </div>
        </div>

        {/* أدوات البحث السريع والفلترة */}
        <div className="flex flex-wrap items-center gap-2">
          {/* حقل البحث */}
          <div className="relative flex-1 sm:w-60">
            <input
              type="text"
              placeholder="بحث برقم الطلب، الزبون، أو الهاتف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-300 hover:border-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 rounded-xl px-3 py-1.5 pr-8 pl-7 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden transition-all shadow-2xs"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2 pointer-events-none" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-2 top-2 text-slate-400 hover:text-slate-600 p-0.5 rounded hover:bg-slate-100 transition-colors cursor-pointer"
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
              className="w-full bg-white border border-slate-300 hover:border-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-medium focus:outline-hidden cursor-pointer appearance-none pl-7 shadow-2xs"
            >
              <option value="all">جميع الحالات</option>
              <option value="pending">بانتظار مندوب</option>
              <option value="in_delivery">قيد التوصيل</option>
              <option value="delivered">تم التسليم</option>
              <option value="cancelled">ملغي</option>
            </select>
            <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* جدول طلبات اليوم */}
      <div className="overflow-x-auto">
        <table className="w-full text-right text-xs">
          <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[11px] font-semibold tracking-normal">
            <tr>
              <th className="py-3 px-4">رقم الطلب</th>
              <th className="py-3 px-3">الوقت</th>
              <th className="py-3 px-4">الزبون والهاتف</th>
              <th className="py-3 px-4">العنوان والمواد</th>
              <th className="py-3 px-4 text-center">المبلغ المطلوب</th>
              <th className="py-3 px-4 text-center">أجرة التوصيل</th>
              <th className="py-3 px-4">المندوب المسند</th>
              <th className="py-3 px-4 text-center">الحالة</th>
              {onOpenEditModal && <th className="py-3 px-4 text-center">الإجراءات</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={onOpenEditModal ? 9 : 8} className="py-14 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2.5">
                    <div className="p-3 rounded-2xl bg-slate-50 text-slate-400 border border-slate-200">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <p className="text-xs sm:text-sm font-semibold text-slate-800">لا توجد طلبات تطابق معايير البحث الحالية</p>
                    <p className="text-[11px] text-slate-400">جرب تفريغ الفلاتر أو كتابة عبارة بحث أخرى</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => {
                const badge = getStatusBadge(order.status);
                const assignedName = getDriverName(order.driver_id);
                const isHighlighted = highlightedOrderId === order.id;

                return (
                  <tr
                    key={order.id}
                    className={`hover:bg-slate-50/80 transition-colors group ${
                      isHighlighted ? 'animate-new-row' : ''
                    }`}
                  >
                    {/* رقم الطلب */}
                    <td className="py-3 px-4 font-mono whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs">
                        #{order.id}
                      </span>
                    </td>

                    {/* الوقت */}
                    <td className="py-3 px-3 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                      {formatTime(order.created_at)}
                    </td>

                    {/* الزبون والهاتف */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 text-xs sm:text-sm">{order.customer_name}</div>
                      <a
                        href={`tel:${order.customer_phone}`}
                        className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-orange-600 font-mono mt-0.5 transition-colors"
                        dir="ltr"
                      >
                        <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{order.customer_phone}</span>
                      </a>
                    </td>

                    {/* العنوان والمواد ورابط الخريطة */}
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

                    {/* المبلغ المطلوب تحصيله */}
                    <td className="py-3 px-4 text-center whitespace-nowrap font-mono font-bold text-emerald-700 text-xs sm:text-sm">
                      {formatCurrency(Number(order.collection_amount))}
                      <span className="text-[10px] text-emerald-600 mr-1">ل.س</span>
                    </td>

                    {/* أجرة التوصيل */}
                    <td className="py-3 px-4 text-center whitespace-nowrap font-mono">
                      <span className="text-slate-900 font-bold text-xs">
                        {formatCurrency(Number(order.delivery_fee))}
                      </span>
                      <span className="text-[10px] text-slate-500 mr-1">ل.س</span>
                    </td>

                    {/* المندوب المسند (عرض فقط بدون تحكم) */}
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

                    {/* الحالة */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border inline-flex items-center gap-1.5 ${badge.className}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dotColor}`}></span>
                        <span>{badge.label}</span>
                      </span>
                    </td>

                    {/* زر تعديل الطلب للكول سنتر */}
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
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
