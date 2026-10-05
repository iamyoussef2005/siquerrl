'use client';

import React, { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { notifyDriverAssignment } from '@/lib/notificationClient';
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
  Check,
  Wifi,
  Bike,
  LayoutGrid,
  Table as TableIcon,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';

interface AdminOrdersTableProps {
  orders: Order[];
  drivers: Profile[];
  onOrderUpdated: (updatedOrder: Order) => void;
  onOpenEditModal: (order: Order) => void;
  selectedDriverId: string;
  onSelectDriverId: (id: string) => void;
  isLoading: boolean;
  isDriverOnline?: (id?: string | null) => boolean;
  formatLastSeen?: (lastSeenAt?: string | null, isOnline?: boolean) => string;
  sortDriversByPresence?: (drivers: Profile[]) => Profile[];
  onlineCount?: number;
}

export function AdminOrdersTable({
  orders,
  drivers,
  onOrderUpdated,
  onOpenEditModal,
  selectedDriverId,
  onSelectDriverId,
  isLoading,
  isDriverOnline,
  formatLastSeen,
  sortDriversByPresence,
  onlineCount,
}: AdminOrdersTableProps) {
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [onlyUnsetFee, setOnlyUnsetFee] = useState<boolean>(false);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | number | null>(null);
  const [editingFeeOrderId, setEditingFeeOrderId] = useState<string | number | null>(null);
  const [tempDeliveryFee, setTempDeliveryFee] = useState<string>('');
  const [showFinishedSidebar, setShowFinishedSidebar] = useState<boolean>(true);

  const sortedDrivers = useMemo(() => {
    return sortDriversByPresence ? sortDriversByPresence(drivers) : drivers;
  }, [drivers, sortDriversByPresence]);

  // Unset fee orders count for quick indicator badge
  const unsetFeeOrdersCount = orders.filter(
    (o) => (!o.delivery_fee || Number(o.delivery_fee) === 0) && o.status !== 'cancelled'
  ).length;

  // Format currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US').format(val || 0);
  };

  // Format phone for WhatsApp
  const formatWhatsAppPhone = (phoneStr?: string) => {
    if (!phoneStr) return '';
    let clean = phoneStr.replace(/\D/g, '');
    if (clean.startsWith('00')) clean = clean.substring(2);
    if (clean.startsWith('0')) clean = '963' + clean.substring(1);
    else if (!clean.startsWith('963') && clean.length === 9 && clean.startsWith('9')) clean = '963' + clean;
    return clean;
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
          label: status,
          className: 'bg-slate-100 text-slate-600 border-slate-200',
          dotColor: 'bg-slate-400',
          icon: AlertCircle,
        };
    }
  };

  // Handle Driver Assignment with Custom Commission Rate
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

    // Transition status: if assigned a driver, becomes 'assigned' (تم الإسناد), if unassigned returns to 'pending' (بانتظار الإسناد)
    const newStatus: OrderStatus = newDriverId
      ? (order.status === 'pending' ? 'assigned' : order.status)
      : (order.status === 'assigned' || order.status === 'preparing' ? 'pending' : order.status);

    try {
      const { data, error } = await supabase
        .from('orders')
        .update({
          driver_id: newDriverId,
          driver_fee: newDriverFee,
          office_fee: newOfficeFee,
          status: newStatus,
          assigned_at: newDriverId ? new Date().toISOString() : null,
        })
        .eq('id', order.id)
        .select()
        .single();

      if (error) throw error;
      if (newDriverId && order.id) {
        notifyDriverAssignment(order.id, newDriverId);
      }
      if (data) {
        onOrderUpdated(data as Order);
      } else {
        onOrderUpdated({
          ...order,
          driver_id: newDriverId,
          driver_fee: newDriverFee,
          office_fee: newOfficeFee,
          status: newStatus,
        });
      }
    } catch (err: any) {
      console.error('Assign driver error:', err);
      alert(`حدث خطأ أثناء إسناد المندوب: ${err.message || 'يرجى المحاولة مجدداً'}`);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Handle Admin setting/updating Delivery Fee directly
  const handleUpdateDeliveryFee = async (order: Order, newDeliveryFee: number) => {
    setUpdatingOrderId(order.id!);
    const assignedDriver = drivers.find((d) => d.id === order.driver_id);
    const commissionRate = assignedDriver?.commission_percentage ?? 70;
    const driverFee = Math.round((newDeliveryFee * commissionRate) / 100);
    const officeFee = Math.max(0, newDeliveryFee - driverFee);
    const totalCollection = (Number(order.items_price) || 0) + newDeliveryFee;

    try {
      const { data, error } = await supabase
        .from('orders')
        .update({
          delivery_fee: newDeliveryFee,
          driver_fee: driverFee,
          office_fee: officeFee,
          collection_amount: totalCollection,
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
          delivery_fee: newDeliveryFee,
          driver_fee: driverFee,
          office_fee: officeFee,
          collection_amount: totalCollection,
        });
      }
      setEditingFeeOrderId(null);
    } catch (err: any) {
      console.error('Update delivery fee error:', err);
      alert(`حدث خطأ أثناء تعديل أجرة التوصيل: ${err.message || 'يرجى المحاولة مجدداً'}`);
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
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
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

      // Unset fee filter
      const matchesFeeFilter =
        !onlyUnsetFee ||
        ((!order.delivery_fee || Number(order.delivery_fee) === 0) && order.status !== 'cancelled');

      return matchesSearch && matchesStatus && matchesDriver && matchesFeeFilter;
    });
  }, [orders, searchQuery, statusFilter, selectedDriverId, onlyUnsetFee]);

  // Split orders into Active (الطلبات الجارية) and Finished (الطلبات المنتهية)
  const activeOrders = useMemo(() => {
    return filteredOrders.filter(
      (o) => o.status !== 'delivered' && o.status !== 'cancelled'
    );
  }, [filteredOrders]);

  const finishedOrders = useMemo(() => {
    return filteredOrders.filter(
      (o) => o.status === 'delivered' || o.status === 'cancelled'
    );
  }, [filteredOrders]);

  return (
    <div className="bg-[#faf6ee] border-2 border-[#cdbba2] rounded-2xl shadow-sm shadow-orange-950/5 overflow-hidden transition-all">
      {/* شريط أدوات الفلاتر والتبديل بين البطاقات والجدول */}
      <div className="p-3.5 lg:p-4 border-b-2 border-[#cdbba2] bg-gradient-to-r from-[#faeada] via-[#f7f0e3] to-[#faf4eb] flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-orange-500 text-white shadow-xs">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold text-zinc-900 tracking-tight">
                متابعة وتوزيع الطلبات
              </h3>
              <span className="px-2 py-0.5 text-[11px] font-bold bg-white text-orange-900 rounded-md border border-orange-300 font-mono shadow-2xs">
                {activeOrders.length} طلبات نشطة
              </span>
              <span className="px-2 py-0.5 text-[11px] font-bold bg-emerald-50 text-emerald-900 rounded-md border border-emerald-300 font-mono shadow-2xs">
                {finishedOrders.length} منتهية
              </span>
              {onlineCount !== undefined && (
                <span
                  className="px-2 py-0.5 text-[11px] font-bold bg-emerald-50 text-emerald-800 rounded-md border border-emerald-300 shadow-2xs flex items-center gap-1.5"
                  title="المناديب النشطين الذين لديهم التطبيق مفتوح الآن"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>{onlineCount} متصل الآن</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-500">إسناد الطلبات الجارية، ومتابعة الطلبات المنتهية في قائمة جانبية مستقلة</p>
          </div>
        </div>

        {/* أدوات البحث والفلترة وأزرار العرض */}
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

          {/* فلتر وتنبيه الطلبات التي لم تُحدد أجرتها بعد */}
          {unsetFeeOrdersCount > 0 && (
            <button
              type="button"
              onClick={() => setOnlyUnsetFee(!onlyUnsetFee)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs border-2 ${
                onlyUnsetFee
                  ? 'bg-amber-500 text-white border-amber-600 ring-2 ring-amber-400/30'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
              }`}
              title={onlyUnsetFee ? 'إلغاء التصفية وعرض كافة الطلبات' : 'تصفية الطلبات التي لم تُحدد أجرتها فقط'}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <span>بحاجة للأجرة ({unsetFeeOrdersCount})</span>
            </button>
          )}

          {/* بحث سريع */}
          <div className="relative flex-1 sm:w-52">
            <input
              type="text"
              placeholder="بحث برقم، زبون، هاتف..."
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

          {/* فلترة حسب المندوب */}
          <div className="relative flex-1 sm:flex-none">
            <select
              value={selectedDriverId}
              onChange={(e) => onSelectDriverId(e.target.value)}
              className="w-full bg-white border-2 border-[#d5c3aa] hover:border-orange-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 rounded-xl px-3 py-1.5 text-xs text-zinc-800 font-semibold focus:outline-hidden cursor-pointer appearance-none pl-7 shadow-2xs"
            >
              <option value="all">
                جميع المناديب {onlineCount ? `(${onlineCount} متصل)` : ''}
              </option>
              {sortedDrivers.map((drv) => {
                const isOnline = isDriverOnline ? isDriverOnline(drv.id) : false;
                return (
                  <option key={drv.id} value={drv.id}>
                    {isOnline ? '🟢' : '⚪'} {drv.name} {isOnline ? '(متصل الآن)' : ''}
                  </option>
                );
              })}
            </select>
            <UserCheck className="w-3.5 h-3.5 text-zinc-400 absolute left-2 top-2.5 pointer-events-none" />
          </div>

          {/* فلترة حسب الحالة */}
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
                    ? 'لا توجد طلبات جارية حالياً، كافة الطلبات منتهية ومكتملة 🎉'
                    : 'لا توجد طلبات تطابق معايير البحث الحالية'}
                </p>
                <p className="text-xs text-zinc-400">
                  يمكنك مراجعة الطلبات المكتملة في القائمة الجانبية
                </p>
              </div>
            </div>
          ) : viewMode === 'cards' ? (
            /* بطاقات الطلبات الجارية */
            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3.5">
              {activeOrders.map((order) => {
                const badge = getStatusBadge(order.status);
                const isUpdating = updatingOrderId === order.id;
                const isEditingFee = editingFeeOrderId === order.id;
                const isFeeUnset =
                  (!order.delivery_fee || Number(order.delivery_fee) === 0) &&
                  order.status !== 'cancelled';
                const assignedDriver = drivers.find((d) => d.id === order.driver_id);
                const isOnline = isDriverOnline && order.driver_id ? isDriverOnline(order.driver_id) : false;
                const lastSeen = formatLastSeen && assignedDriver ? formatLastSeen(assignedDriver.last_seen_at, isOnline) : '';

                return (
                  <div
                    key={order.id}
                    className={`bg-white rounded-2xl border-2 transition-all duration-200 p-4 flex flex-col justify-between shadow-xs hover:shadow-md relative group ${
                      isFeeUnset
                        ? 'border-amber-400 ring-2 ring-amber-400/30 bg-gradient-to-b from-amber-50/40 via-white to-white'
                        : 'border-[#d2c0aa] hover:border-orange-500'
                    }`}
                  >
                    {/* رأس البطاقة: رقم الطلب، الوقت، وشارة الحالة */}
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
                        {/* اسم الزبون وأزرار الاتصال وواتساب */}
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-extrabold text-zinc-900 text-sm sm:text-base tracking-tight truncate">
                            {order.customer_name}
                          </h4>
                          <div className="flex items-center gap-1 shrink-0">
                            {/* اتصال هاتفي */}
                            <a
                              href={`tel:${order.customer_phone}`}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-900 border border-orange-300 text-[11px] font-mono font-bold transition-all shadow-2xs"
                              dir="ltr"
                              title="اتصال هاتفي بالزبون"
                            >
                              <Phone className="w-3 h-3 text-orange-600" />
                              <span>{order.customer_phone}</span>
                            </a>

                            {/* محادثة واتساب سريعة */}
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

                        {/* عنوان التوصيل ورابط الخريطة */}
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
                                <span>عرض العنوان على خرائط Google</span>
                              </a>
                            </div>
                          )}
                        </div>

                        {/* صندوق إسناد المندوب المباشر */}
                        <div className="bg-[#f4ece0] p-3 rounded-xl border-2 border-[#dfceba]">
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-800 mb-1.5">
                            <span className="flex items-center gap-1">
                              <Bike className="w-3.5 h-3.5 text-orange-600" />
                              <span>المندوب المسند:</span>
                            </span>
                            {order.driver_id && (
                              <span>
                                {isOnline ? (
                                  <span className="inline-flex items-center gap-1 text-emerald-800 font-bold">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    <span>متصل الآن</span>
                                  </span>
                                ) : (
                                  <span className="text-slate-600 font-mono text-[10px]">
                                    {lastSeen || 'غير متصل'}
                                  </span>
                                )}
                              </span>
                            )}
                          </div>

                          <div className="relative">
                            <select
                              disabled={isUpdating || order.status === 'delivered' || order.status === 'cancelled'}
                              value={order.driver_id || ''}
                              onChange={(e) => handleAssignDriver(order, e.target.value)}
                              className="w-full bg-white border-2 border-[#d2c0aa] hover:border-orange-400 rounded-lg px-2.5 py-1.5 text-xs text-zinc-900 font-bold focus:outline-hidden focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-2xs"
                            >
                              <option value="">لم يُسند بعد (اختر مندوباً)</option>
                              {sortedDrivers.map((drv) => {
                                const isDrvOnline = isDriverOnline ? isDriverOnline(drv.id) : false;
                                const drvLastSeen = formatLastSeen ? formatLastSeen(drv.last_seen_at, isDrvOnline) : '';
                                return (
                                  <option key={drv.id} value={drv.id}>
                                    {isDrvOnline ? '🟢' : '⚪'} {drv.name} {isDrvOnline ? '(متصل)' : `(${drvLastSeen})`} - ({drv.commission_percentage ?? 70}%)
                                  </option>
                                );
                              })}
                            </select>
                            {isUpdating && (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-500 absolute left-2.5 top-2.5 pointer-events-none" />
                            )}
                          </div>
                        </div>

                        {/* الحسابات والأجور (3 أعمدة واضحة) */}
                        <div className="grid grid-cols-3 gap-2 bg-[#fdf9f2] p-2.5 rounded-xl border-2 border-[#d8c5ad] text-center">
                          {/* سعر الأغراض */}
                          <div className="flex flex-col justify-center">
                            <span className="text-[10px] text-zinc-600 font-bold">سعر الأغراض</span>
                            {order.items_price && Number(order.items_price) > 0 ? (
                              <span className="font-mono font-bold text-amber-950 text-xs mt-0.5">
                                {formatCurrency(Number(order.items_price))}
                                <span className="text-[9px] text-amber-800 mr-0.5">ل.س</span>
                              </span>
                            ) : (
                              <span className="text-[9.5px] text-zinc-400 italic mt-0.5">بانتظار المندوب</span>
                            )}
                          </div>

                          {/* أجرة التوصيل (المدير) مع تعديل سريع */}
                          <div className="flex flex-col justify-center border-x-2 border-[#dfceba] px-1">
                            <span className="text-[10px] text-zinc-600 font-bold">أجرة التوصيل</span>
                            {isEditingFee ? (
                              <div className="flex items-center justify-center gap-1 mt-1">
                                <input
                                  type="number"
                                  autoFocus
                                  value={tempDeliveryFee}
                                  onChange={(e) => setTempDeliveryFee(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleUpdateDeliveryFee(order, parseFloat(tempDeliveryFee) || 0);
                                    } else if (e.key === 'Escape') {
                                      setEditingFeeOrderId(null);
                                    }
                                  }}
                                  className="w-16 bg-white border border-orange-500 rounded px-1 py-0.5 text-xs text-zinc-900 font-bold text-center"
                                  placeholder="0"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleUpdateDeliveryFee(order, parseFloat(tempDeliveryFee) || 0)}
                                  className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
                                  title="حفظ"
                                >
                                  <Check className="w-2.5 h-2.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingFeeOrderId(null)}
                                  className="p-1 rounded bg-zinc-200 text-zinc-700 hover:bg-zinc-300 cursor-pointer"
                                  title="إلغاء"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            ) : isFeeUnset ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingFeeOrderId(order.id!);
                                  setTempDeliveryFee('');
                                }}
                                className="mt-1 px-1.5 py-0.5 rounded-md bg-amber-200 hover:bg-amber-300 text-amber-950 font-bold text-[10px] shadow-2xs cursor-pointer animate-pulse"
                                title="اضغط لتحديد أجرة التوصيل"
                              >
                                حدد الأجرة ⚠️
                              </button>
                            ) : (
                              <div className="flex flex-col items-center">
                                <div className="flex items-center gap-1 font-mono font-bold text-zinc-900 text-xs mt-0.5">
                                  <span>{formatCurrency(Number(order.delivery_fee))}</span>
                                  <span className="text-[9px] text-zinc-600 font-bold">ل.س</span>
                                  {order.status !== 'delivered' && order.status !== 'cancelled' && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingFeeOrderId(order.id!);
                                        setTempDeliveryFee(String(order.delivery_fee || ''));
                                      }}
                                      className="text-zinc-500 hover:text-orange-600 p-0.5 rounded cursor-pointer"
                                      title="تعديل الأجرة"
                                    >
                                      <Edit3 className="w-2.5 h-2.5" />
                                    </button>
                                  )}
                                </div>
                                <div className="text-[9px] text-zinc-600 font-semibold">
                                  سائق {formatCurrency(Number(order.driver_fee))} | مكتب {formatCurrency(Number(order.office_fee))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* إجمالي التحصيل */}
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

                    {/* ذيل البطاقة: أزرار الإجراءات (تعديل الطلب وإلغاؤه) */}
                    <div className="pt-3 mt-3 border-t-2 border-[#dfceba] flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenEditModal(order)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-orange-100 hover:bg-orange-200 text-orange-950 border-2 border-orange-300 text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-2xs hover:shadow-xs"
                        title="تعديل تفاصيل الطلب والحسابات"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-orange-600" />
                        <span>تعديل الطلب والحسابات</span>
                      </button>

                      {order.status !== 'delivered' && order.status !== 'cancelled' && (
                        <button
                          type="button"
                          onClick={() => handleCancelOrder(order)}
                          disabled={isUpdating}
                          className="flex items-center justify-center gap-1 py-2 px-3 rounded-xl bg-white hover:bg-rose-50 text-rose-700 border-2 border-zinc-300 hover:border-rose-400 text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-2xs"
                          title="إلغاء الطلب نهائياً"
                        >
                          <XCircle className="w-3.5 h-3.5 text-rose-500" />
                          <span>إلغاء</span>
                        </button>
                      )}
                    </div>
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
                    <th className="py-3 px-3 text-center">أجرة التوصيل (المدير)</th>
                    <th className="py-3 px-3 text-center">إجمالي التحصيل</th>
                    <th className="py-3 px-4">المندوب المسند</th>
                    <th className="py-3 px-4 text-center">الحالة</th>
                    <th className="py-3 px-4 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#dfceba]/70 text-zinc-800">
                  {activeOrders.map((order) => {
                    const badge = getStatusBadge(order.status);
                    const isUpdating = updatingOrderId === order.id;
                    const isEditingFee = editingFeeOrderId === order.id;
                    const isFeeUnset =
                      (!order.delivery_fee || Number(order.delivery_fee) === 0) &&
                      order.status !== 'cancelled';

                    return (
                      <tr
                        key={order.id}
                        className={`transition-colors group ${
                          isFeeUnset
                            ? 'bg-amber-50/40 hover:bg-amber-100/60 border-r-4 border-r-amber-500'
                            : 'hover:bg-orange-50/50'
                        }`}
                      >
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
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <a
                              href={`tel:${order.customer_phone}`}
                              className="inline-flex items-center gap-1 text-[11px] text-zinc-500 hover:text-orange-600 font-mono transition-colors font-medium"
                              dir="ltr"
                            >
                              <Phone className="w-3 h-3 text-orange-500/70 shrink-0" />
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

                        {/* سعر الأغراض (المندوب) */}
                        <td className="py-3 px-3 text-center whitespace-nowrap font-mono text-xs">
                          {order.items_price && Number(order.items_price) > 0 ? (
                            <span className="font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md inline-block">
                              {formatCurrency(Number(order.items_price))} <span className="text-[10px] text-amber-700">ل.س</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-zinc-400 italic bg-zinc-50 px-2 py-0.5 rounded border border-zinc-200">
                              بانتظار المندوب
                            </span>
                          )}
                        </td>

                        {/* أجرة التوصيل (يحددها المدير) */}
                        <td className="py-3 px-3 text-center whitespace-nowrap font-mono">
                          {isEditingFee ? (
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="number"
                                autoFocus
                                value={tempDeliveryFee}
                                onChange={(e) => setTempDeliveryFee(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleUpdateDeliveryFee(order, parseFloat(tempDeliveryFee) || 0);
                                  } else if (e.key === 'Escape') {
                                    setEditingFeeOrderId(null);
                                  }
                                }}
                                className="w-20 bg-white border-2 border-orange-500 rounded-md px-1.5 py-0.5 text-xs text-zinc-900 font-bold text-center focus:outline-hidden"
                                placeholder="0"
                              />
                              <button
                                type="button"
                                onClick={() => handleUpdateDeliveryFee(order, parseFloat(tempDeliveryFee) || 0)}
                                className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 transition-colors cursor-pointer"
                                title="حفظ الأجرة"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingFeeOrderId(null)}
                                className="p-1 rounded bg-zinc-200 text-zinc-700 hover:bg-zinc-300 transition-colors cursor-pointer"
                                title="إلغاء"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : isFeeUnset ? (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingFeeOrderId(order.id!);
                                setTempDeliveryFee('');
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100/90 hover:bg-amber-200 text-amber-900 border border-amber-300 text-[11px] font-bold shadow-2xs transition-all cursor-pointer hover:scale-105 active:scale-95 animate-pulse"
                              title="اضغط لتحديد أجرة التوصيل الآن"
                            >
                              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span>لم تُحدد الأجرة بعد ⚠️</span>
                            </button>
                          ) : (
                            <div>
                              <div className="flex items-center justify-center gap-1.5">
                                <span className="text-zinc-900 font-bold text-xs">
                                  {formatCurrency(Number(order.delivery_fee))}
                                </span>
                                <span className="text-[10px] text-zinc-500">ل.س</span>
                                {order.status !== 'delivered' && order.status !== 'cancelled' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingFeeOrderId(order.id!);
                                      setTempDeliveryFee(String(order.delivery_fee || ''));
                                    }}
                                    className="text-zinc-400 hover:text-orange-600 p-0.5 rounded transition-colors cursor-pointer opacity-70 hover:opacity-100"
                                    title="تحديد / تعديل أجرة التوصيل"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                              <div className="text-[9.5px] text-zinc-500">
                                سائق {formatCurrency(Number(order.driver_fee))} | مكتب {formatCurrency(Number(order.office_fee))}
                              </div>
                            </div>
                          )}
                        </td>

                        {/* إجمالي التحصيل */}
                        <td className="py-3 px-3 text-center whitespace-nowrap font-mono font-bold text-emerald-800 text-xs sm:text-sm">
                          {formatCurrency(Number(order.collection_amount))}
                          <span className="text-[10px] text-emerald-600 mr-1">ل.س</span>
                        </td>

                        {/* المندوب المسند */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="relative inline-block w-40">
                            <select
                              disabled={isUpdating || order.status === 'delivered' || order.status === 'cancelled'}
                              value={order.driver_id || ''}
                              onChange={(e) => handleAssignDriver(order, e.target.value)}
                              className="w-full bg-white border border-orange-200/80 hover:border-orange-300 rounded-lg px-2 py-1 text-xs text-zinc-800 focus:outline-hidden cursor-pointer"
                            >
                              <option value="">لم يُسند</option>
                              {sortedDrivers.map((drv) => {
                                const isOnline = isDriverOnline ? isDriverOnline(drv.id) : false;
                                return (
                                  <option key={drv.id} value={drv.id}>
                                    {isOnline ? '🟢' : '⚪'} {drv.name}
                                  </option>
                                );
                              })}
                            </select>
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
                            <button
                              type="button"
                              onClick={() => onOpenEditModal(order)}
                              className="p-1.5 rounded-lg bg-white hover:bg-orange-50 text-zinc-700 hover:text-orange-700 border border-orange-200 transition-all cursor-pointer shadow-2xs"
                              title="تعديل بيانات الطلب"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCancelOrder(order)}
                              disabled={isUpdating}
                              className="p-1.5 rounded-lg bg-white hover:bg-rose-50 text-zinc-600 hover:text-rose-600 border border-zinc-200 hover:border-rose-300 transition-all cursor-pointer shadow-2xs"
                              title="إلغاء الطلب"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 2. القائمة الجانبية المستقلة: الطلبات المنتهية (المكتملة والملغاة) بحجم أصغر ومقتضب */}
        {showFinishedSidebar && (
          <aside className="w-full lg:w-80 xl:w-96 shrink-0 bg-gradient-to-b from-[#f7f0e4] via-[#fbf8f2] to-white rounded-2xl border-2 border-[#cdbba2] p-3 sm:p-3.5 space-y-3 shadow-sm">
            {/* رأس القائمة الجانبية للطلبات المنتهية */}
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

            {/* قائمة البطاقات المصغرة للطلبات المنتهية */}
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
                  const assignedDriver = drivers.find((d) => d.id === order.driver_id);
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
                      {/* رأس البطاقة المصغرة: الرقم، الوقت، والحالة */}
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

                      {/* تفاصيل الزبون والعنوان المقتضبة */}
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

                      {/* المندوب والحسابات بشكل مصغر */}
                      <div className="bg-[#f6eee0] p-2 rounded-lg border border-[#dfceba] text-[10.5px] flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1 truncate text-zinc-800">
                          <Bike className="w-3 h-3 text-orange-600 shrink-0" />
                          <span className="truncate font-bold">{assignedDriver?.name || 'بدون مندوب'}</span>
                        </div>
                        <div className="font-mono font-black text-emerald-800 shrink-0">
                          {formatCurrency(Number(order.collection_amount))} <span className="text-[9px]">ل.س</span>
                        </div>
                      </div>

                      {/* زر التعديل المصغر */}
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
