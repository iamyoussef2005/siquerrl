'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Order, Profile, OrderStatus } from '@/types/database';
import { supabase } from '@/lib/supabase';
import {
  X,
  Printer,
  Download,
  Calendar,
  DollarSign,
  TrendingUp,
  Truck,
  CheckCircle2,
  FileSpreadsheet,
  Bike,
  ShieldCheck,
  AlertCircle,
  Clock,
  XCircle,
  UserCheck,
  RefreshCw,
  Filter,
  ListOrdered,
  Search,
  ChevronDown,
  Layers,
  FileText,
  MapPin,
  Phone,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export type ReportPreset =
  | 'today_shift'
  | 'yesterday_shift'
  | 'today'
  | 'yesterday'
  | 'last_24h'
  | 'this_week'
  | 'this_month'
  | 'custom'
  | 'all';

interface ReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  drivers: Profile[];
}

// Convert local Date to YYYY-MM-DDTHH:mm for <input type="datetime-local">
function toDatetimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Format date into human-friendly Arabic string
function formatArabicDateTime(dateStrOrObj: string | Date | undefined): string {
  if (!dateStrOrObj) return '';
  const d = typeof dateStrOrObj === 'string' ? new Date(dateStrOrObj) : dateStrOrObj;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('ar-SY-u-nu-latn', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

// Format Currency
function formatCurrency(val: number): string {
  return new Intl.NumberFormat('en-US').format(val || 0);
}

// Get shift datetime range (accounting for delivery shifts spanning across midnight)
function getShiftRange(type: 'today_shift' | 'yesterday_shift'): { start: string; end: string } {
  const now = new Date();
  const isEarlyMorning = now.getHours() < 6; // Between midnight and 6 AM belongs to previous evening shift

  if (type === 'today_shift') {
    if (isEarlyMorning) {
      const start = new Date(now);
      start.setDate(start.getDate() - 1);
      start.setHours(8, 0, 0, 0);
      const end = new Date(now);
      end.setHours(4, 0, 0, 0);
      return { start: toDatetimeLocal(start), end: toDatetimeLocal(end) };
    } else {
      const start = new Date(now);
      start.setHours(8, 0, 0, 0);
      const end = new Date(now);
      end.setDate(end.getDate() + 1);
      end.setHours(4, 0, 0, 0);
      return { start: toDatetimeLocal(start), end: toDatetimeLocal(end) };
    }
  } else {
    // yesterday_shift
    if (isEarlyMorning) {
      const start = new Date(now);
      start.setDate(start.getDate() - 2);
      start.setHours(8, 0, 0, 0);
      const end = new Date(now);
      end.setDate(end.getDate() - 1);
      end.setHours(4, 0, 0, 0);
      return { start: toDatetimeLocal(start), end: toDatetimeLocal(end) };
    } else {
      const start = new Date(now);
      start.setDate(start.getDate() - 1);
      start.setHours(8, 0, 0, 0);
      const end = new Date(now);
      end.setHours(4, 0, 0, 0);
      return { start: toDatetimeLocal(start), end: toDatetimeLocal(end) };
    }
  }
}

function getTodayRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return { start: toDatetimeLocal(start), end: toDatetimeLocal(end) };
}

function getYesterdayRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setDate(end.getDate() - 1);
  end.setHours(23, 59, 59, 999);
  return { start: toDatetimeLocal(start), end: toDatetimeLocal(end) };
}

function getLast24hRange(): { start: string; end: string } {
  const end = new Date();
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
  return { start: toDatetimeLocal(start), end: toDatetimeLocal(end) };
}

function getThisWeekRange(): { start: string; end: string } {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 7);
  start.setHours(0, 0, 0, 0);
  return { start: toDatetimeLocal(start), end: toDatetimeLocal(end) };
}

function getThisMonthRange(): { start: string; end: string } {
  const end = new Date();
  const start = new Date(end.getFullYear(), end.getMonth(), 1, 0, 0, 0, 0);
  return { start: toDatetimeLocal(start), end: toDatetimeLocal(end) };
}

export function ReportsModal({
  isOpen,
  onClose,
  orders: initialOrders,
  drivers,
}: ReportsModalProps) {
  const { profile } = useAuth();

  // Initial shift calculation
  const initialShift = useMemo(() => getShiftRange('today_shift'), []);

  // Filter States
  const [preset, setPreset] = useState<ReportPreset>('today_shift');
  const [startDate, setStartDate] = useState<string>(initialShift.start);
  const [endDate, setEndDate] = useState<string>(initialShift.end);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'summary' | 'orders'>('summary');
  const [searchQuery, setSearchQuery] = useState('');

  // Orders from direct Supabase query
  const [dbOrders, setDbOrders] = useState<Order[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch orders from Supabase for the precise datetime range
  const fetchOrdersForRange = useCallback(
    async (start: string, end: string, isAll: boolean) => {
      setIsLoading(true);
      try {
        let query = supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false });

        if (!isAll && start && end) {
          const startIso = new Date(start).toISOString();
          const endIso = new Date(end).toISOString();
          query = query.gte('created_at', startIso).lte('created_at', endIso);
        }

        const { data, error } = await query;
        if (!error && data) {
          setDbOrders(data as Order[]);
        } else {
          // In case of error fallback to initialOrders
          console.warn('Fallback to local orders due to error:', error?.message);
          setDbOrders(initialOrders);
        }
      } catch (err) {
        console.error('Failed to fetch orders for report:', err);
        setDbOrders(initialOrders);
      } finally {
        setIsLoading(false);
      }
    },
    [initialOrders]
  );

  // When modal opens or initial orders change, fetch fresh data
  useEffect(() => {
    if (isOpen) {
      fetchOrdersForRange(startDate, endDate, preset === 'all');
    }
  }, [isOpen, fetchOrdersForRange, startDate, endDate, preset]);

  // Handle Preset selection
  const handlePresetSelect = (selectedPreset: ReportPreset) => {
    setPreset(selectedPreset);
    let range = { start: startDate, end: endDate };

    switch (selectedPreset) {
      case 'today_shift':
        range = getShiftRange('today_shift');
        break;
      case 'yesterday_shift':
        range = getShiftRange('yesterday_shift');
        break;
      case 'today':
        range = getTodayRange();
        break;
      case 'yesterday':
        range = getYesterdayRange();
        break;
      case 'last_24h':
        range = getLast24hRange();
        break;
      case 'this_week':
        range = getThisWeekRange();
        break;
      case 'this_month':
        range = getThisMonthRange();
        break;
      case 'all':
        // No range needed
        break;
    }

    if (selectedPreset !== 'all' && selectedPreset !== 'custom') {
      setStartDate(range.start);
      setEndDate(range.end);
      fetchOrdersForRange(range.start, range.end, false);
    } else if (selectedPreset === 'all') {
      fetchOrdersForRange('', '', true);
    }
  };

  // Raw orders pool (Supabase or fallback)
  const baseOrders = dbOrders ?? initialOrders;

  // Filter orders by date range client-side as well (for instant responsiveness)
  const ordersInPeriod = useMemo(() => {
    if (preset === 'all') return baseOrders;
    if (!startDate || !endDate) return baseOrders;

    try {
      const startObj = new Date(startDate);
      const endObj = new Date(endDate);
      return baseOrders.filter((o) => {
        if (!o.created_at) return true;
        const d = new Date(o.created_at);
        return d >= startObj && d <= endObj;
      });
    } catch {
      return baseOrders;
    }
  }, [baseOrders, preset, startDate, endDate]);

  // Filter orders if a specific driver is selected
  const ordersForDriver = useMemo(() => {
    if (selectedDriverId === 'all') return ordersInPeriod;
    return ordersInPeriod.filter((o) => o.driver_id === selectedDriverId);
  }, [ordersInPeriod, selectedDriverId]);

  // Get active driver object if filtered
  const selectedDriver = useMemo(() => {
    if (selectedDriverId === 'all') return null;
    return drivers.find((d) => d.id === selectedDriverId) || null;
  }, [drivers, selectedDriverId]);

  // Drivers calculations
  const driverReports = useMemo(() => {
    const list =
      selectedDriverId === 'all'
        ? drivers
        : drivers.filter((d) => d.id === selectedDriverId);

    return list.map((driver) => {
      const assigned = ordersInPeriod.filter((o) => o.driver_id === driver.id);
      const delivered = assigned.filter((o) => o.status === 'delivered');
      const inProgress = assigned.filter((o) => o.status === 'delivering');
      const pending = assigned.filter(
        (o) => o.status === 'assigned' || o.status === 'preparing' || o.status === 'pending'
      );

      const totalCollection = delivered.reduce(
        (sum, o) => sum + (Number(o.collection_amount) || 0),
        0
      );
      const totalDeliveryFee = delivered.reduce(
        (sum, o) => sum + (Number(o.delivery_fee) || 0),
        0
      );
      const driverShare = delivered.reduce(
        (sum, o) => sum + (Number(o.driver_fee) || 0),
        0
      );
      const officeShare = delivered.reduce(
        (sum, o) => sum + (Number(o.office_fee) || 0),
        0
      );

      const completionRate =
        assigned.length > 0
          ? Math.round((delivered.length / assigned.length) * 100)
          : 0;

      return {
        driver,
        totalAssigned: assigned.length,
        deliveredCount: delivered.length,
        inProgressCount: inProgress.length,
        pendingCount: pending.length,
        completionRate,
        totalCollection,
        totalDeliveryFee,
        driverShare,
        officeShare,
      };
    });
  }, [drivers, ordersInPeriod, selectedDriverId]);

  // Overall system or driver totals
  const totals = useMemo(() => {
    const targetOrders = ordersForDriver;
    const totalOrdersCount = targetOrders.length;
    const delivered = targetOrders.filter((o) => o.status === 'delivered');
    const inProgress = targetOrders.filter((o) => o.status === 'delivering');
    const preparingOrders = targetOrders.filter((o) => o.status === 'preparing');
    const assignedOrders = targetOrders.filter((o) => o.status === 'assigned');
    const pendingAssignment = targetOrders.filter((o) => o.status === 'pending');
    const cancelled = targetOrders.filter((o) => o.status === 'cancelled');

    const totalCollection = delivered.reduce(
      (sum, o) => sum + (Number(o.collection_amount) || 0),
      0
    );
    const totalDeliveryFee = delivered.reduce(
      (sum, o) => sum + (Number(o.delivery_fee) || 0),
      0
    );
    const totalDriverShare = delivered.reduce(
      (sum, o) => sum + (Number(o.driver_fee) || 0),
      0
    );
    const totalOfficeProfit = delivered.reduce(
      (sum, o) => sum + (Number(o.office_fee) || 0),
      0
    );

    const unassignedOrders = targetOrders.filter((o) => !o.driver_id);

    return {
      totalOrdersCount,
      deliveredCount: delivered.length,
      inProgressCount: inProgress.length,
      preparingCount: preparingOrders.length,
      assignedCount: assignedOrders.length,
      pendingCount: pendingAssignment.length,
      cancelledCount: cancelled.length,
      unassignedCount: unassignedOrders.length,
      totalCollection,
      totalDeliveryFee,
      totalDriverShare,
      totalOfficeProfit,
    };
  }, [ordersForDriver]);

  // Detailed Orders List with Search
  const searchedOrders = useMemo(() => {
    if (!searchQuery.trim()) return ordersForDriver;
    const q = searchQuery.toLowerCase().trim();
    return ordersForDriver.filter((o) => {
      const orderIdMatch = String(o.id || '').toLowerCase().includes(q);
      const nameMatch = (o.customer_name || '').toLowerCase().includes(q);
      const phoneMatch = (o.customer_phone || '').toLowerCase().includes(q);
      const addressMatch = (o.delivery_address || '').toLowerCase().includes(q);
      const detailsMatch = (o.order_details || '').toLowerCase().includes(q);
      return orderIdMatch || nameMatch || phoneMatch || addressMatch || detailsMatch;
    });
  }, [ordersForDriver, searchQuery]);

  if (!isOpen) return null;

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  // Export Driver Statement CSV
  const handleExportDriverCSV = () => {
    const periodLabel =
      preset === 'all'
        ? 'كافة السجلات'
        : `من ${formatArabicDateTime(startDate)} إلى ${formatArabicDateTime(endDate)}`;

    const headers = [
      'اسم المندوب',
      'رقم الهاتف',
      'نسبة العمولة (%)',
      'الطلبات المسندة',
      'الطلبات المسلمة',
      'طلبات قيد التوصيل',
      'بانتظار التحضير',
      'نسبة الإنجاز (%)',
      'مجموع التحصيل (ل.س)',
      'أجرة التوصيل (ل.س)',
      'حصة المندوب (ل.س)',
      'حصة المكتب (ل.س)',
    ];

    const rows = driverReports.map((r) => [
      `"${r.driver.name}"`,
      `"${r.driver.phone || ''}"`,
      `"${r.driver.commission_percentage ?? 70}%"`,
      r.totalAssigned,
      r.deliveredCount,
      r.inProgressCount,
      r.pendingCount,
      `"${r.completionRate}%"`,
      r.totalCollection,
      r.totalDeliveryFee,
      r.driverShare,
      r.officeShare,
    ]);

    // Totals Row
    rows.push([
      '"الإجمالي العام"',
      '""',
      '""',
      totals.totalOrdersCount,
      totals.deliveredCount,
      totals.inProgressCount,
      totals.preparingCount,
      '""',
      totals.totalCollection,
      totals.totalDeliveryFee,
      totals.totalDriverShare,
      totals.totalOfficeProfit,
    ]);

    const titleRows = [
      ['"سنجاب دليفري (Sinjab Delivery) - تقرير التدقيق المالي وحسابات المناديب"'],
      [`"الفترة المشمولة:", "${periodLabel}"`],
      [`"تصفية المندوب:", "${selectedDriver ? selectedDriver.name : 'كافة المناديب'}"`],
      [`"تاريخ وتوقيت الاستخراج:", "${new Date().toLocaleString('ar-SY-u-nu-latn')}"`],
      [''],
    ];

    const csvContent =
      '\uFEFF' +
      titleRows.map((r) => r.join(',')).join('\r\n') +
      '\r\n' +
      [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `تقرير_حسابات_المناديب_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Detailed Orders CSV
  const handleExportOrdersCSV = () => {
    const periodLabel =
      preset === 'all'
        ? 'كافة السجلات'
        : `من ${formatArabicDateTime(startDate)} إلى ${formatArabicDateTime(endDate)}`;

    const headers = [
      'رقم الطلب',
      'تاريخ ووقت الطلب',
      'اسم الزبون',
      'رقم الهاتف',
      'العنوان',
      'تفاصيل الطلب',
      'المندوب',
      'سعر الأغراض (ل.س)',
      'أجرة التوصيل (ل.س)',
      'حصة المندوب (ل.س)',
      'حصة المكتب (ل.س)',
      'مبلغ التحصيل (ل.س)',
      'الحالة',
    ];

    const statusTranslations: Record<OrderStatus, string> = {
      pending: 'بانتظار الإسناد',
      assigned: 'تم الإسناد',
      preparing: 'بانتظار التحضير',
      delivering: 'قيد التوصيل',
      delivered: 'تم التسليم',
      cancelled: 'ملغي',
    };

    const rows = ordersForDriver.map((o) => {
      const driverName =
        drivers.find((d) => d.id === o.driver_id)?.name || 'غير مسند';
      const orderDate = formatArabicDateTime(o.created_at);

      return [
        `"#${o.id || ''}"`,
        `"${orderDate}"`,
        `"${o.customer_name || ''}"`,
        `"${o.customer_phone || ''}"`,
        `"${(o.delivery_address || '').replace(/"/g, '""')}"`,
        `"${(o.order_details || '').replace(/"/g, '""')}"`,
        `"${driverName}"`,
        o.items_price || 0,
        o.delivery_fee || 0,
        o.driver_fee || 0,
        o.office_fee || 0,
        o.collection_amount || 0,
        `"${statusTranslations[o.status] || o.status}"`,
      ];
    });

    const titleRows = [
      ['"سنجاب دليفري (Sinjab Delivery) - سجل طلبات الفترة التفصيلي"'],
      [`"الفترة المشمولة:", "${periodLabel}"`],
      [`"عدد الطلبات:", "${ordersForDriver.length}"`],
      [`"تاريخ وتوقيت الاستخراج:", "${new Date().toLocaleString('ar-SY-u-nu-latn')}"`],
      [''],
    ];

    const csvContent =
      '\uFEFF' +
      titleRows.map((r) => r.join(',')).join('\r\n') +
      '\r\n' +
      [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `سجل_طلبات_الفترة_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'delivered':
        return { label: 'تم التسليم', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'delivering':
        return { label: 'قيد التوصيل', bg: 'bg-sky-50 text-sky-700 border-sky-200' };
      case 'preparing':
        return { label: 'بانتظار التحضير', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'assigned':
        return { label: 'تم الإسناد', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'pending':
        return { label: 'بانتظار الإسناد', bg: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'cancelled':
        return { label: 'ملغي', bg: 'bg-rose-50 text-rose-700 border-rose-200' };
      default:
        return { label: status, bg: 'bg-slate-50 text-slate-700 border-slate-200' };
    }
  };

  const presetsList: { key: ReportPreset; label: string }[] = [
    { key: 'today_shift', label: '🌅 مناوبة اليوم (الوردية الحالية)' },
    { key: 'yesterday_shift', label: '🌙 مناوبة الأمس' },
    { key: 'today', label: '📅 اليوم كاملاً' },
    { key: 'yesterday', label: 'الأمس كاملاً' },
    { key: 'last_24h', label: '⏳ آخر 24 ساعة' },
    { key: 'this_week', label: '📆 هذا الأسبوع' },
    { key: 'this_month', label: '🗓️ هذا الشهر' },
    { key: 'all', label: '📦 كافة السجلات' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
      {/* Container with print styles */}
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-6xl max-h-[94vh] flex flex-col shadow-2xl relative overflow-hidden print:max-w-none print:max-h-none print:w-full print:border-none print:shadow-none print:bg-white print:text-black">
        {/* 1. رأس النافذة وأدوات التحكم الرئيسية */}
        <div className="flex flex-col gap-3 p-4 sm:p-5 px-6 border-b border-slate-200 bg-white z-20 print:hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-orange-50 border border-orange-100 text-orange-600">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                    التقرير المالي والتشغيلي الشامل
                  </h2>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                    تدقيق فوري
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  تحديد دقيق للمناوبات والفترات الزمنية بالساعة والدقيقة، تدقيق حسابات المناديب وأرباح المكتب
                </p>
              </div>
            </div>

            {/* أدوات الإجراءات والأزرار */}
            <div className="flex items-center gap-2 flex-wrap justify-end w-full sm:w-auto">
              {/* تبديل العرض (الملخص / سجل الطلبات) */}
              <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl p-0.5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setViewMode('summary')}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                    viewMode === 'summary'
                      ? 'bg-white text-orange-700 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>ملخص الحسابات والمناديب</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('orders')}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                    viewMode === 'orders'
                      ? 'bg-white text-orange-700 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                  <span>سجل طلبات الفترة ({ordersForDriver.length})</span>
                </button>
              </div>

              {/* زر التصدير إلى Excel */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={viewMode === 'summary' ? handleExportDriverCSV : handleExportOrdersCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-bold text-emerald-700 hover:text-emerald-800 shadow-2xs transition-colors cursor-pointer"
                  title={viewMode === 'summary' ? 'تصدير جدول المناديب إلى Excel' : 'تصدير تفاصيل الطلبات إلى Excel'}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تصدير Excel</span>
                </button>

                {/* زر الطباعة الرسمية */}
                <button
                  type="button"
                  onClick={handlePrint}
                  className="btn-sinjab-primary flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white shadow-xs transition-colors cursor-pointer"
                  title="طباعة التقرير أو حفظه كملف PDF"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>طباعة</span>
                </button>
              </div>

              {/* زر الإغلاق */}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                title="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 2. شريط الفلاتر السريعة والنطاق الزمني الدقيق (من الساعة إلى الساعة) */}
          <div className="mt-1 pt-3 border-t border-slate-100 flex flex-col gap-2.5">
            {/* أزرار الفترات السريعة والمناوبات */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
              <span className="text-[11px] font-bold text-slate-400 whitespace-nowrap pl-1">
                فلاتر سريعة:
              </span>
              {presetsList.map((p) => {
                const isActive = preset === p.key;
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => handlePresetSelect(p.key)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      isActive
                        ? 'bg-orange-600 text-white shadow-xs'
                        : 'bg-slate-100/80 hover:bg-slate-200/80 text-slate-600 border border-slate-200/70'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            {/* سطر تحديد التاريخ والوقت بدقة (من الساعة -- إلى الساعة --) + تصفية المندوب */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center">
              {/* حقل من تاريخ ووقت */}
              <div className="md:col-span-4 flex items-center gap-1.5 bg-slate-50 border border-slate-200/90 rounded-xl px-2.5 py-1.5 shadow-2xs">
                <span className="text-[11px] font-black text-slate-600 whitespace-nowrap">
                  من:
                </span>
                <input
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPreset('custom');
                  }}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-900 font-mono text-xs font-bold focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                />
              </div>

              {/* حقل إلى تاريخ ووقت */}
              <div className="md:col-span-4 flex items-center gap-1.5 bg-slate-50 border border-slate-200/90 rounded-xl px-2.5 py-1.5 shadow-2xs">
                <span className="text-[11px] font-black text-slate-600 whitespace-nowrap">
                  إلى:
                </span>
                <input
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPreset('custom');
                  }}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-900 font-mono text-xs font-bold focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                />
              </div>

              {/* تصفية المندوب */}
              <div className="md:col-span-3 flex items-center gap-1.5 bg-slate-50 border border-slate-200/90 rounded-xl px-2.5 py-1.5 shadow-2xs">
                <Bike className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <select
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-900 text-xs font-bold focus:outline-none focus:border-orange-500 transition-colors cursor-pointer"
                >
                  <option value="all">كافة المناديب ({drivers.length})</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} {d.phone ? `(${d.phone})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* زر تطبيق التصفية الفورية */}
              <div className="md:col-span-1 flex items-center">
                <button
                  type="button"
                  onClick={() => fetchOrdersForRange(startDate, endDate, preset === 'all')}
                  disabled={isLoading}
                  className="w-full h-full py-2 px-3 rounded-xl bg-orange-600 hover:bg-orange-700 active:scale-95 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="تحديث البيانات لهذه الفترة"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  <span className="md:hidden">تطبيق</span>
                </button>
              </div>
            </div>

            {/* شريط معلومات الفترة المعروضة */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 bg-gradient-to-r from-orange-50/80 via-amber-50/70 to-orange-50/40 border border-orange-200/70 rounded-xl text-xs">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-lg bg-orange-500 text-white shadow-2xs">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="font-bold text-slate-800">
                    {preset === 'all'
                      ? 'النطاق الزمني: كافة السجلات التاريخية المسجلة في النظام'
                      : `الفترة المحددة: من [${formatArabicDateTime(startDate)}] إلى [${formatArabicDateTime(endDate)}]`}
                  </span>
                  {selectedDriver && (
                    <span className="mr-2 text-orange-700 font-extrabold">
                      • كشف حساب مخصص للمندوب: {selectedDriver.name}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-white border border-orange-200 font-mono font-bold text-orange-800 text-[11px] shadow-2xs">
                  {ordersForDriver.length} {ordersForDriver.length === 1 ? 'طلب معتمد' : 'طلبات معتمدة'}
                </span>
                {isLoading && (
                  <span className="flex items-center gap-1 text-[11px] text-orange-600 font-bold animate-pulse">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    جاري التحديث...
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 3. ترويسة مخصصة فقط للطباعة (تظهر في ورقة A4) */}
        <div className="hidden print:block p-6 border-b border-gray-300 mb-4 text-black">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold">سنجاب دليفري (Sinjab Delivery) • تقرير التدقيق المالي والتشغيلي</h1>
              <div className="text-xs text-gray-700 mt-2 space-y-1">
                <p>
                  <strong>نطاق الفترة المحددة:</strong>{' '}
                  {preset === 'all'
                    ? 'كافة السجلات التاريخية'
                    : `من [${formatArabicDateTime(startDate)}] إلى [${formatArabicDateTime(endDate)}]`}
                </p>
                <p>
                  <strong>نوع التقرير:</strong>{' '}
                  {selectedDriver
                    ? `كشف حساب وتسوية مستحقات للمندوب: ${selectedDriver.name} (${selectedDriver.phone || ''})`
                    : 'تقرير مالي وتشغيلي شامل لكافة المناديب والمكتب'}
                </p>
                <p>
                  <strong>تاريخ وتوقيت الاستخراج:</strong> {new Date().toLocaleString('ar-SY-u-nu-latn')} |{' '}
                  <strong>المسؤول:</strong> {profile?.name || 'المدير العام'}
                </p>
              </div>
            </div>
            <div className="text-left font-mono text-xs text-gray-600">
              <p>نظام إدارة العمليات والتوزيع اللحظي</p>
              <p className="font-bold mt-1">عدد الطلبات: {ordersForDriver.length} طلب</p>
              <p>حالة التقرير: معتمد ومطابق للحسابات</p>
            </div>
          </div>
        </div>

        {/* 4. محتوى التقرير القابل للتمرير */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 print:overflow-visible print:p-0">
          {/* 1. بطاقات المؤشرات المالية الرئيسية للفترة المحددة */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 print:grid-cols-4 print:gap-2">
            {/* ربح الصافي للمكتب */}
            <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 shadow-2xs print:border-gray-300 print:bg-gray-50">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 print:text-black">
                <TrendingUp className="w-4 h-4 text-orange-600" />
                <span>صافي أرباح المكتب</span>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-xl sm:text-2xl font-bold font-mono text-orange-700 print:text-black">
                  {formatCurrency(totals.totalOfficeProfit)}
                </span>
                <span className="text-xs text-slate-500 font-semibold print:text-gray-600">ل.س</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1 font-medium print:text-gray-500">
                صافي عمولات المكتب من أجور التوصيل المنجزة
              </p>
            </div>

            {/* إجمالي مبالغ التحصيل */}
            <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 shadow-2xs print:border-gray-300 print:bg-gray-50">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 print:text-black">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <span>إجمالي مبالغ التحصيل</span>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-xl sm:text-2xl font-bold font-mono text-emerald-700 print:text-black">
                  {formatCurrency(totals.totalCollection)}
                </span>
                <span className="text-xs text-slate-500 font-semibold print:text-gray-600">ل.س</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1 font-medium print:text-gray-500">
                المبالغ النقدية المحصلة من الزبائن (أغراض + توصيل)
              </p>
            </div>

            {/* إجمالي أجور التوصيل */}
            <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 shadow-2xs print:border-gray-300 print:bg-gray-50">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 print:text-black">
                <Truck className="w-4 h-4 text-sky-600" />
                <span>إجمالي أجور التوصيل</span>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-xl sm:text-2xl font-bold font-mono text-slate-900 print:text-black">
                  {formatCurrency(totals.totalDeliveryFee)}
                </span>
                <span className="text-xs text-slate-500 font-semibold print:text-gray-600">ل.س</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1 font-medium print:text-gray-500">
                مجموع أجور خدمات التوصيل للطلبات المسلمة
              </p>
            </div>

            {/* إجمالي مستحقات المناديب */}
            <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 shadow-2xs print:border-gray-300 print:bg-gray-50">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 print:text-black">
                <Bike className="w-4 h-4 text-amber-600" />
                <span>{selectedDriver ? `مستحقات ${selectedDriver.name}` : 'مستحقات المناديب الإجمالية'}</span>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-xl sm:text-2xl font-bold font-mono text-amber-700 print:text-black">
                  {formatCurrency(totals.totalDriverShare)}
                </span>
                <span className="text-xs text-slate-500 font-semibold print:text-gray-600">ل.س</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1 font-medium print:text-gray-500">
                حصة المناديب وفق نسب العمولات المحددة
              </p>
            </div>
          </div>

          {/* 2. شريط حالة الطلبات للفترة */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs font-semibold">
            <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200 text-slate-700 flex items-center justify-between shadow-2xs print:border-gray-300 print:bg-white print:text-black">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-600 print:text-black" />
                <span>بانتظار الإسناد:</span>
              </div>
              <span className="font-bold font-mono text-sm text-purple-700 print:text-black">
                {totals.pendingCount}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200 text-slate-700 flex items-center justify-between shadow-2xs print:border-gray-300 print:bg-white print:text-black">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600 print:text-black" />
                <span>تم الإسناد:</span>
              </div>
              <span className="font-bold font-mono text-sm text-blue-700 print:text-black">
                {totals.assignedCount}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200 text-slate-700 flex items-center justify-between shadow-2xs print:border-gray-300 print:bg-white print:text-black">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-600 print:text-black" />
                <span>بانتظار التحضير:</span>
              </div>
              <span className="font-bold font-mono text-sm text-orange-700 print:text-black">
                {totals.preparingCount}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200 text-slate-700 flex items-center justify-between shadow-2xs print:border-gray-300 print:bg-white print:text-black">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-sky-600 print:text-black" />
                <span>قيد التوصيل:</span>
              </div>
              <span className="font-bold font-mono text-sm text-sky-700 print:text-black">
                {totals.inProgressCount}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200 text-slate-700 flex items-center justify-between shadow-2xs print:border-gray-300 print:bg-white print:text-black">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 print:text-black" />
                <span>تم التسليم:</span>
              </div>
              <span className="font-bold font-mono text-sm text-emerald-700 print:text-black">
                {totals.deliveredCount}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200 text-slate-700 flex items-center justify-between shadow-2xs print:border-gray-300 print:bg-white print:text-black">
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-rose-600 print:text-black" />
                <span>طلبات ملغاة:</span>
              </div>
              <span className="font-bold font-mono text-sm text-rose-700 print:text-black">
                {totals.cancelledCount}
              </span>
            </div>
          </div>

          {/* 3. العرض المختار: جدول ملخص المناديب أو جدول سجل طلبات الفترة */}
          {viewMode === 'summary' ? (
            /* جدول المحاسبة وحصص المناديب التفصيلي */
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs print:border-gray-400">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between print:bg-gray-100 print:text-black">
                <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2 print:text-black">
                  <Bike className="w-4 h-4 text-orange-600 print:text-black" />
                  <span>جدول المحاسبة وحصص المناديب للفترة المحددة</span>
                </h3>
                <span className="text-[11px] text-slate-500 font-mono font-medium print:text-gray-600">
                  {driverReports.length} {driverReports.length === 1 ? 'مندوب معروض' : 'مناديب معروضين'}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 text-slate-600 border-b border-slate-200 text-[11px] font-bold print:bg-gray-200 print:text-black">
                      <th className="py-2.5 px-3">المندوب</th>
                      <th className="py-2.5 px-3 text-center">النسبة</th>
                      <th className="py-2.5 px-3 text-center">المسندة</th>
                      <th className="py-2.5 px-3 text-center">المسلّمة</th>
                      <th className="py-2.5 px-3 text-center">بانتظار التحضير</th>
                      <th className="py-2.5 px-3 text-center">نسبة الإنجاز</th>
                      <th className="py-2.5 px-3 text-center font-bold">مجموع التحصيل</th>
                      <th className="py-2.5 px-3 text-center">أجرة التوصيل</th>
                      <th className="py-2.5 px-3 text-center font-bold text-sky-700 print:text-black">
                        حصة المندوب
                      </th>
                      <th className="py-2.5 px-3 text-center font-bold text-slate-900 print:text-black">
                        حصة المكتب
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 print:divide-gray-300 text-slate-700">
                    {driverReports.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-8 text-center text-slate-400 font-medium">
                          لا توجد بيانات للمناديب ضمن الفترة المحددة.
                        </td>
                      </tr>
                    ) : (
                      driverReports.map((row) => (
                        <tr
                          key={row.driver.id}
                          className="hover:bg-slate-50/80 transition-colors print:hover:bg-transparent"
                        >
                          <td className="py-2.5 px-3 font-bold text-slate-900 print:text-black whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span>{row.driver.name}</span>
                            </div>
                            {row.driver.phone && (
                              <span
                                className="block text-[10px] text-slate-500 font-mono print:text-gray-500 mt-0.5"
                                dir="ltr"
                              >
                                {row.driver.phone}
                              </span>
                            )}
                          </td>

                          <td className="py-2.5 px-3 text-center font-mono font-semibold text-slate-700 print:text-black">
                            {row.driver.commission_percentage ?? 70}%
                          </td>

                          <td className="py-2.5 px-3 text-center font-mono font-semibold text-slate-800">
                            {row.totalAssigned}
                          </td>

                          <td className="py-2.5 px-3 text-center font-mono text-emerald-700 print:text-black font-bold">
                            {row.deliveredCount}
                          </td>

                          <td className="py-2.5 px-3 text-center font-mono text-amber-700 print:text-black font-semibold">
                            {row.pendingCount}
                          </td>

                          {/* نسبة الإنجاز مع شريط تقدم */}
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-2">
                              <span className="font-mono font-bold text-[11px] text-slate-700">
                                {row.completionRate}%
                              </span>
                              <div className="w-12 h-1.5 rounded-full bg-slate-200 overflow-hidden print:hidden">
                                <div
                                  style={{ width: `${row.completionRate}%` }}
                                  className="h-full bg-emerald-600 rounded-full"
                                />
                              </div>
                            </div>
                          </td>

                          <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-700 print:text-black whitespace-nowrap">
                            {formatCurrency(row.totalCollection)}{' '}
                            <span className="text-[10px] text-slate-400 font-normal">ل.س</span>
                          </td>

                          <td className="py-2.5 px-3 text-center font-mono font-semibold text-slate-700 print:text-black whitespace-nowrap">
                            {formatCurrency(row.totalDeliveryFee)}{' '}
                            <span className="text-[10px] text-slate-400 font-normal">ل.س</span>
                          </td>

                          <td className="py-2.5 px-3 text-center font-mono font-bold text-sky-700 print:text-black whitespace-nowrap">
                            {formatCurrency(row.driverShare)}{' '}
                            <span className="text-[10px] text-slate-400 font-normal">ل.س</span>
                          </td>

                          <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900 print:text-black whitespace-nowrap">
                            {formatCurrency(row.officeShare)}{' '}
                            <span className="text-[10px] text-slate-400 font-normal">ل.س</span>
                          </td>
                        </tr>
                      ))
                    )}

                    {/* صف الإجماليات الشاملة */}
                    <tr className="bg-slate-100/90 font-bold border-t-2 border-slate-300 text-slate-900 print:bg-gray-100 print:text-black print:border-gray-400">
                      <td className="py-3 px-3 text-slate-900 print:text-black">الإجمالي للفترة</td>
                      <td className="py-3 px-3 text-center text-slate-400 print:text-black">—</td>
                      <td className="py-3 px-3 text-center font-mono">{totals.totalOrdersCount}</td>
                      <td className="py-3 px-3 text-center font-mono text-emerald-700 print:text-black">
                        {totals.deliveredCount}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-amber-700 print:text-black">
                        {totals.preparingCount}
                      </td>
                      <td className="py-3 px-3 text-center text-slate-400 print:text-black">—</td>
                      <td className="py-3 px-3 text-center font-mono text-emerald-700 print:text-black whitespace-nowrap">
                        {formatCurrency(totals.totalCollection)} ل.س
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-slate-800 print:text-black whitespace-nowrap">
                        {formatCurrency(totals.totalDeliveryFee)} ل.س
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-sky-700 print:text-black whitespace-nowrap">
                        {formatCurrency(totals.totalDriverShare)} ل.س
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-slate-950 print:text-black whitespace-nowrap">
                        {formatCurrency(totals.totalOfficeProfit)} ل.س
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* جدول سجل كافة طلبات الفترة بالتفصيل الدقيق */
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs print:border-gray-400">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 print:bg-gray-100 print:text-black">
                <div className="flex items-center gap-2">
                  <ListOrdered className="w-4 h-4 text-orange-600 print:text-black" />
                  <h3 className="text-xs font-bold text-slate-900 print:text-black">
                    سجل كافة الطلبات المشمولة ضمن هذه الفترة
                  </h3>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-200 font-mono text-slate-700 font-bold">
                    {searchedOrders.length} طلب
                  </span>
                </div>

                {/* حقل البحث السريع في الطلبات */}
                <div className="relative w-full sm:w-64 print:hidden">
                  <Search className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="بحث برقم الطلب، الزبون، الهاتف..."
                    className="w-full bg-white border border-slate-300 rounded-lg pr-8 pl-3 py-1 text-xs text-slate-800 focus:outline-none focus:border-orange-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 text-slate-600 border-b border-slate-200 text-[11px] font-bold print:bg-gray-200 print:text-black">
                      <th className="py-2.5 px-3">رقم الطلب</th>
                      <th className="py-2.5 px-3">وقت التسجيل</th>
                      <th className="py-2.5 px-3">الزبون / العنوان</th>
                      <th className="py-2.5 px-3">المندوب</th>
                      <th className="py-2.5 px-3 text-center">سعر الأغراض</th>
                      <th className="py-2.5 px-3 text-center">أجرة التوصيل</th>
                      <th className="py-2.5 px-3 text-center text-sky-700">حصة المندوب</th>
                      <th className="py-2.5 px-3 text-center text-orange-700">حصة المكتب</th>
                      <th className="py-2.5 px-3 text-center font-bold text-emerald-700">التحصيل المطلوب</th>
                      <th className="py-2.5 px-3 text-center">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 print:divide-gray-300 text-slate-700">
                    {searchedOrders.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-8 text-center text-slate-400 font-medium">
                          لا توجد طلبات مطابقة ضمن هذه الفترة.
                        </td>
                      </tr>
                    ) : (
                      searchedOrders.map((o) => {
                        const driver = drivers.find((d) => d.id === o.driver_id);
                        const statusBadge = getStatusBadge(o.status);

                        return (
                          <tr
                            key={o.id}
                            className="hover:bg-slate-50/80 transition-colors print:hover:bg-transparent"
                          >
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                              #{o.id}
                            </td>

                            <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                              {formatArabicDateTime(o.created_at)}
                            </td>

                            <td className="py-2.5 px-3 max-w-[200px]">
                              <p className="font-bold text-slate-900 truncate">{o.customer_name}</p>
                              <p className="text-[10px] text-slate-500 font-mono" dir="ltr">
                                {o.customer_phone}
                              </p>
                              <p className="text-[10px] text-slate-400 truncate mt-0.5">
                                {o.delivery_address}
                              </p>
                            </td>

                            <td className="py-2.5 px-3 font-semibold text-slate-800 whitespace-nowrap">
                              {driver ? (
                                <span className="inline-flex items-center gap-1">
                                  <Bike className="w-3 h-3 text-orange-600" />
                                  <span>{driver.name}</span>
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[11px]">غير مسند</span>
                              )}
                            </td>

                            <td className="py-2.5 px-3 text-center font-mono text-slate-700 whitespace-nowrap">
                              {formatCurrency(Number(o.items_price) || 0)} ل.س
                            </td>

                            <td className="py-2.5 px-3 text-center font-mono font-semibold text-slate-900 whitespace-nowrap">
                              {formatCurrency(Number(o.delivery_fee) || 0)} ل.س
                            </td>

                            <td className="py-2.5 px-3 text-center font-mono font-bold text-sky-700 whitespace-nowrap">
                              {formatCurrency(Number(o.driver_fee) || 0)} ل.س
                            </td>

                            <td className="py-2.5 px-3 text-center font-mono font-bold text-orange-700 whitespace-nowrap">
                              {formatCurrency(Number(o.office_fee) || 0)} ل.س
                            </td>

                            <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-700 whitespace-nowrap bg-emerald-50/40">
                              {formatCurrency(Number(o.collection_amount) || 0)} ل.س
                            </td>

                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${statusBadge.bg}`}
                              >
                                {statusBadge.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 4. تذييل الورقة الرسمية للطباعة والتوقيعات */}
          <div className="hidden print:grid grid-cols-3 gap-6 pt-12 text-center text-xs text-black border-t border-gray-300 mt-8">
            <div className="space-y-8">
              <p className="font-bold">توقيع مسؤول التوزيع والحسابات</p>
              <p className="border-b border-gray-400 w-40 mx-auto"></p>
            </div>
            <div className="space-y-8">
              <p className="font-bold">
                {selectedDriver ? `توقيع المندوب (${selectedDriver.name})` : 'توقيع مندوب الاستلام'}
              </p>
              <p className="border-b border-gray-400 w-40 mx-auto"></p>
            </div>
            <div className="space-y-8">
              <p className="font-bold">اعتماد الإدارة العامة</p>
              <p className="border-b border-gray-400 w-40 mx-auto"></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
