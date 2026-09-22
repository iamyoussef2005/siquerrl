'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Order, OrderStatus, Profile } from '@/types/database';
import {
  Search,
  Filter,
  UserCheck,
  Edit3,
  XCircle,
  Clock,
  Truck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  MapPin,
  Phone,
  DollarSign,
  Loader2,
  X,
  Package,
} from 'lucide-react';

interface AdminOrdersTableProps {
  orders: Order[];
  drivers: Profile[];
  onOrderUpdated: (updatedOrder: Order) => void;
  onOpenEditModal: (order: Order) => void;
  selectedDriverId: string;
  onSelectDriverId: (id: string) => void;
  isLoading: boolean;
}

export function AdminOrdersTable({
  orders,
  drivers,
  onOrderUpdated,
  onOpenEditModal,
  selectedDriverId,
  onSelectDriverId,
  isLoading,
}: AdminOrdersTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [updatingOrderId, setUpdatingOrderId] = useState<string | number | null>(null);

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

  // Status styling and labels
  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return {
          label: 'بانتظار تحضير الطلب',
          className: 'bg-amber-50 text-amber-700 border-amber-200',
          dotColor: 'bg-amber-500',
          icon: Clock,
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
          label: status,
          className: 'bg-slate-100 text-slate-600 border-slate-200',
          dotColor: 'bg-slate-400',
          icon: AlertCircle,
        };
    }
  };

  // Handle Driver Assignment with Custom Commission Rate (Status stays unchanged)
  const handleAssignDriver = async (order: Order, driverId: string) => {
    setUpdatingOrderId(order.id!);
    const newDriverId = driverId === '' ? null : driverId;

    // Calculate driver_fee and office_fee based on selected driver's custom percentage
    let newDriverFee = Number(order.driver_fee) || 0;
    let newOfficeFee = Number(order.office_fee) || 0;

    if (newDriverId) {
      const assignedDriver = drivers.find((d) => d.id === newDriverId);
      const commissionRate = assignedDriver?.commission_percentage ?? 70;
      const deliveryFee = Number(order.delivery_fee) || 0;
      newDriverFee = Math.round((deliveryFee * commissionRate) / 100);
      newOfficeFee = Math.max(0, deliveryFee - newDriverFee);
    }

    try {
      const { data, error } = await supabase
        .from('orders')
        .update({
          driver_id: newDriverId,
          driver_fee: newDriverFee,
          office_fee: newOfficeFee,
        })
        .eq('id', order.id)
        .select()
        .single();

      if (error) throw error;
      if (data) {
        onOrderUpdated(data as Order);
      } else {
        onOrderUpdated({
          ...order,
          driver_id: newDriverId,
          driver_fee: newDriverFee,
          office_fee: newOfficeFee,
        });
      }
    } catch (err: any) {
      console.error('Assign driver error:', err);
      alert(`حدث خطأ أثناء إسناد المندوب: ${err.message || 'يرجى المحاولة مجدداً'}`);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Handle Order Cancellation by Admin
  const handleCancelOrder = async (order: Order) => {
    if (order.status === 'delivered') return;
    if (!confirm(`هل أنت متأكد من رغبتك في إلغاء الطلب #${order.id} للزبون (${order.customer_name})؟`)) {
      return;
    }

    setUpdatingOrderId(order.id!);
    try {
      const { data, error } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', order.id)
        .select()
        .single();

      if (error) throw error;
      if (data) {
        onOrderUpdated(data as Order);
      } else {
        onOrderUpdated({ ...order, status: 'cancelled' });
      }
    } catch (err: any) {
      console.error('Cancel order error:', err);
      alert(`حدث خطأ أثناء إلغاء الطلب: ${err.message || 'يرجى المحاولة مجدداً'}`);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Filter orders based on search and selected filters
  const filteredOrders = orders.filter((order) => {
    // Search filter
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      String(order.id).includes(query) ||
      (order.customer_name && order.customer_name.toLowerCase().includes(query)) ||
      (order.customer_phone && order.customer_phone.includes(query)) ||
      (order.delivery_address && order.delivery_address.toLowerCase().includes(query)) ||
      (order.order_details && order.order_details.toLowerCase().includes(query));

    // Status filter
    const matchesStatus =
      statusFilter === 'all' || order.status === statusFilter;

    // Driver filter
    const matchesDriver =
      !selectedDriverId || selectedDriverId === 'all'
        ? true
        : order.driver_id === selectedDriverId;

    return matchesSearch && matchesStatus && matchesDriver;
  });

  return (
    <div className="bg-white/95 border border-orange-200/80 rounded-2xl shadow-sm shadow-orange-950/5 overflow-hidden transition-all">
      {/* شريط أدوات الجدول والفلاتر المتقدمة */}
      <div className="p-3.5 lg:p-4 border-b border-orange-200/70 bg-gradient-to-r from-orange-100/70 via-amber-50/50 to-orange-50/30 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-orange-500 text-white shadow-xs">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-zinc-900 tracking-tight">
                جدول متابعة وتوزيع الطلبات
              </h3>
              <span className="px-2 py-0.5 text-[11px] font-bold bg-white text-orange-800 rounded-md border border-orange-200 font-mono shadow-2xs">
                {filteredOrders.length} طلب
              </span>
            </div>
            <p className="text-[11px] text-zinc-500">إسناد الطلبات للمناديب وتدقيق الحسابات</p>
          </div>
        </div>

        {/* أدوات البحث والفلترة المتقدمة */}
        <div className="flex flex-wrap items-center gap-2">
          {/* بحث سريع */}
          <div className="relative flex-1 sm:w-60">
            <input
              type="text"
              placeholder="بحث برقم الطلب، الزبون، أو الهاتف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-orange-200/80 hover:border-orange-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 rounded-xl px-3 py-1.5 pr-8 pl-7 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-hidden transition-all shadow-2xs"
            />
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-2 pointer-events-none" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-2 top-2 text-zinc-400 hover:text-zinc-600 p-0.5 rounded hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* فلترة حسب المندوب */}
          <div className="relative flex-1 sm:flex-none">
            <select
              value={selectedDriverId}
              onChange={(e) => onSelectDriverId(e.target.value)}
              className="w-full bg-white border border-orange-200/80 hover:border-orange-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 rounded-xl px-3 py-1.5 text-xs text-zinc-800 font-semibold focus:outline-hidden cursor-pointer appearance-none pl-7 shadow-2xs"
            >
              <option value="all">جميع المناديب</option>
              {drivers.map((drv) => (
                <option key={drv.id} value={drv.id}>
                  {drv.name}
                </option>
              ))}
            </select>
            <UserCheck className="w-3.5 h-3.5 text-zinc-400 absolute left-2 top-2 pointer-events-none" />
          </div>

          {/* فلترة حسب الحالة */}
          <div className="relative flex-1 sm:flex-none">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-white border border-orange-200/80 hover:border-orange-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 rounded-xl px-3 py-1.5 text-xs text-zinc-800 font-semibold focus:outline-hidden cursor-pointer appearance-none pl-7 shadow-2xs"
            >
              <option value="all">جميع الحالات</option>
              <option value="pending">بانتظار تحضير الطلب</option>
              <option value="delivering">قيد التوصيل</option>
              <option value="delivered">مكتملة ومسلّمة</option>
              <option value="cancelled">ملغي</option>
            </select>
            <Filter className="w-3.5 h-3.5 text-zinc-400 absolute left-2 top-2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* الجدول العصري المتجاوب */}
      <div className="overflow-x-auto">
        <table className="w-full text-right text-xs">
          <thead className="bg-[#f5f1e8] text-zinc-800 border-b border-orange-200/90 text-[11px] font-bold tracking-normal">
            <tr>
              <th className="py-3 px-4">رقم الطلب</th>
              <th className="py-3 px-3">الوقت</th>
              <th className="py-3 px-4">الزبون والهاتف</th>
              <th className="py-3 px-4">العنوان والمواد</th>
              <th className="py-3 px-4 text-center">المبلغ المطلوب</th>
              <th className="py-3 px-4 text-center">توزيع الأجرة</th>
              <th className="py-3 px-4">المندوب المسند</th>
              <th className="py-3 px-4 text-center">الحالة</th>
              <th className="py-3 px-4 text-center">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-orange-100/60 text-zinc-800">
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-14 text-center text-zinc-500">
                  <div className="flex flex-col items-center justify-center gap-2.5">
                    <div className="p-3 rounded-2xl bg-orange-50 text-orange-400 border border-orange-200">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <p className="text-xs sm:text-sm font-semibold text-zinc-800">لا توجد طلبات تطابق معايير البحث الحالية</p>
                    <p className="text-[11px] text-zinc-400">جرب تفريغ الفلاتر أو كتابة عبارة بحث أخرى</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => {
                const badge = getStatusBadge(order.status);
                const isUpdating = updatingOrderId === order.id;

                return (
                  <tr key={order.id} className="hover:bg-orange-50/50 transition-colors group">
                    {/* رقم الطلب */}
                    <td className="py-3 px-4 font-mono whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-md bg-orange-100/70 border border-orange-200/80 text-orange-900 font-bold text-xs shadow-2xs">
                        #{order.id}
                      </span>
                    </td>

                    {/* الوقت */}
                    <td className="py-3 px-3 whitespace-nowrap text-zinc-500 font-mono text-[11px]">
                      {formatTime(order.created_at)}
                    </td>

                    {/* الزبون والهاتف */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-zinc-900 text-xs sm:text-sm">{order.customer_name}</div>
                      <a
                        href={`tel:${order.customer_phone}`}
                        className="inline-flex items-center gap-1 text-[11px] text-zinc-500 hover:text-orange-600 font-mono mt-0.5 transition-colors font-medium"
                        dir="ltr"
                      >
                        <Phone className="w-3 h-3 text-orange-500/70 shrink-0" />
                        <span>{order.customer_phone}</span>
                      </a>
                    </td>

                    {/* العنوان والمواد */}
                    <td className="py-3 px-4 max-w-xs">
                      <div className="flex items-start gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0 mt-0.5" />
                        <span className="line-clamp-1 text-zinc-800 font-medium text-xs" title={order.delivery_address}>
                          {order.delivery_address}
                        </span>
                      </div>
                      {order.order_details && (
                        <p className="line-clamp-1 text-[11px] text-zinc-500 mt-0.5 font-normal" title={order.order_details}>
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

                    {/* توزيع الأجرة (سائق ومكتب) */}
                    <td className="py-3 px-4 text-center whitespace-nowrap font-mono">
                      <div className="text-zinc-900 font-bold text-xs">
                        {formatCurrency(Number(order.delivery_fee))} <span className="text-[10px] text-zinc-500">ل.س</span>
                      </div>
                      <div className="flex items-center justify-center gap-2 text-[10px] mt-0.5 bg-orange-50/80 py-0.5 px-2 rounded-md border border-orange-200/70">
                        <span className="text-zinc-700 font-medium">
                          سائق: {formatCurrency(Number(order.driver_fee))}
                        </span>
                        <span className="text-orange-200">|</span>
                        <span className="text-orange-800 font-bold">
                          مكتب: {formatCurrency(Number(order.office_fee))}
                        </span>
                      </div>
                    </td>

                    {/* إسناد المندوب */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="relative inline-block w-38">
                        <select
                          disabled={isUpdating || order.status === 'delivered' || order.status === 'cancelled'}
                          value={order.driver_id || ''}
                          onChange={(e) => handleAssignDriver(order, e.target.value)}
                          className="w-full bg-white border border-orange-200/80 hover:border-orange-300 rounded-lg px-2 py-1 text-xs text-zinc-800 focus:outline-hidden focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-2xs font-medium"
                        >
                          <option value="">لم يُسند</option>
                          {drivers.map((drv) => (
                            <option key={drv.id} value={drv.id}>
                              {drv.name} ({drv.commission_percentage ?? 70}%)
                            </option>
                          ))}
                        </select>
                        {isUpdating && (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-500 absolute left-2 top-2 pointer-events-none" />
                        )}
                      </div>
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

                    {/* إجراءات المدير */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        {/* زر تعديل الطلب */}
                        <button
                          type="button"
                          onClick={() => onOpenEditModal(order)}
                          className="p-1.5 rounded-lg bg-white/90 hover:bg-orange-50 text-zinc-700 hover:text-orange-700 border border-orange-200/80 transition-all cursor-pointer active:scale-95 shadow-2xs"
                          title="تعديل بيانات الطلب"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {/* زر إلغاء الطلب للمدير فقط */}
                        {order.status !== 'delivered' && order.status !== 'cancelled' && (
                          <button
                            type="button"
                            onClick={() => handleCancelOrder(order)}
                            disabled={isUpdating}
                            className="p-1.5 rounded-lg bg-white/90 hover:bg-rose-50 text-zinc-600 hover:text-rose-600 border border-zinc-200 hover:border-rose-300 transition-all cursor-pointer active:scale-95 shadow-2xs"
                            title="إلغاء الطلب نهائياً"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
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
