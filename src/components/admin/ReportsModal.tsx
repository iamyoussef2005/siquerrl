'use client';

import React, { useState, useMemo } from 'react';
import { Order, Profile } from '@/types/database';
import {
  X,
  Printer,
  Download,
  Calendar,
  DollarSign,
  TrendingUp,
  Truck,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  Bike,
  ShieldCheck,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface ReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  drivers: Profile[];
}

export function ReportsModal({
  isOpen,
  onClose,
  orders,
  drivers,
}: ReportsModalProps) {
  const { profile } = useAuth();
  const [dateFilter, setDateFilter] = useState<'today' | 'all'>('today');

  // Filter orders based on dateFilter
  const filteredOrders = useMemo(() => {
    if (dateFilter === 'all') return orders;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return orders.filter((o) => {
      if (!o.created_at) return true;
      try {
        const d = new Date(o.created_at);
        return d >= today;
      } catch {
        return true;
      }
    });
  }, [orders, dateFilter]);

  // Currency Formatter
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US').format(val || 0);
  };

  // Drivers calculations
  const driverReports = useMemo(() => {
    return drivers.map((driver) => {
      const assigned = filteredOrders.filter((o) => o.driver_id === driver.id);
      const delivered = assigned.filter((o) => o.status === 'delivered');
      const inProgress = assigned.filter(
        (o) => o.status === 'delivering' || o.status === 'assigned'
      );
      const cancelled = assigned.filter((o) => o.status === 'cancelled');

      // Active delivered revenue calculations
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
        cancelledCount: cancelled.length,
        completionRate,
        totalCollection,
        totalDeliveryFee,
        driverShare,
        officeShare,
      };
    });
  }, [drivers, filteredOrders]);

  // Overall system totals
  const totals = useMemo(() => {
    const totalOrdersCount = filteredOrders.length;
    const delivered = filteredOrders.filter((o) => o.status === 'delivered');
    const inProgress = filteredOrders.filter(
      (o) => o.status === 'delivering' || o.status === 'assigned'
    );
    const pending = filteredOrders.filter((o) => o.status === 'pending');
    const cancelled = filteredOrders.filter((o) => o.status === 'cancelled');

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

    // Cancelled orders metrics
    const totalCancelledAmount = cancelled.reduce(
      (sum, o) => sum + (Number(o.collection_amount) || 0),
      0
    );

    const unassignedOrders = filteredOrders.filter((o) => !o.driver_id);

    return {
      totalOrdersCount,
      deliveredCount: delivered.length,
      inProgressCount: inProgress.length,
      pendingCount: pending.length,
      cancelledCount: cancelled.length,
      unassignedCount: unassignedOrders.length,
      totalCollection,
      totalDeliveryFee,
      totalDriverShare,
      totalOfficeProfit,
      totalCancelledAmount,
    };
  }, [filteredOrders]);

  if (!isOpen) return null;

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  // Export to CSV Function
  const handleExportCSV = () => {
    const headers = [
      'اسم المندوب',
      'رقم الهاتف',
      'نسبة العمولة (%)',
      'الطلبات المسندة',
      'الطلبات المسلمة',
      'طلبات قيد التوصيل',
      'الطلبات الملغاة',
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
      r.cancelledCount,
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
      totals.cancelledCount,
      '""',
      totals.totalCollection,
      totals.totalDeliveryFee,
      totals.totalDriverShare,
      totals.totalOfficeProfit,
    ]);

    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `تقرير_التوصيل_والحسابات_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const currentDateStr = new Date().toLocaleDateString('ar-SY-u-nu-latn', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
      {/* Container with print styles */}
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-6xl max-h-[94vh] flex flex-col shadow-2xl relative overflow-hidden print:max-w-none print:max-h-none print:w-full print:border-none print:shadow-none print:bg-white print:text-black">
        {/* رأس النافذة وأدوات التحكم */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 sm:p-5 px-6 border-b border-slate-200 bg-white z-20 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-100 text-blue-600">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                  التقرير المالي والتشغيلي الشامل
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                  تدقيق فوري
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                تدقيق إيرادات العمليات، حصص المناديب، أرباح المكتب، ومطابقة الصندوق
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end w-full sm:w-auto">
            {/* خيار تصفية التاريخ */}
            <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setDateFilter('today')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  dateFilter === 'today'
                    ? 'bg-white text-blue-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                اليوم فقط
              </button>
              <button
                type="button"
                onClick={() => setDateFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  dateFilter === 'all'
                    ? 'bg-white text-blue-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                كل السجلات ({orders.length})
              </button>
            </div>

            {/* زر التصدير إلى Excel */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-bold text-emerald-700 hover:text-emerald-800 shadow-2xs transition-colors cursor-pointer"
              title="تصدير جدول التقرير كملف CSV / Excel"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تصدير Excel</span>
            </button>

            {/* زر الطباعة الرسمية */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer"
              title="طباعة التقرير أو حفظه كملف PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة التقرير</span>
            </button>

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

        {/* ترويسة مخصصة فقط للطباعة (تظهر في ورقة A4) */}
        <div className="hidden print:block p-6 border-b border-gray-300 mb-4 text-black">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">منظومة Siquerrl • تقرير التدقيق المالي والتشغيلي</h1>
              <p className="text-xs text-gray-600 mt-1">
                تاريخ التقرير: {currentDateStr} | المسؤول: {profile?.name || 'المدير العام'}
              </p>
            </div>
            <div className="text-left font-mono text-xs text-gray-500">
              <p>نظام إدارة العمليات والتوزيع اللحظي</p>
              <p>حالة التقرير: معتمد ومطابق للحسابات</p>
            </div>
          </div>
        </div>

        {/* محتوى التقرير القابل للتمرير */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 print:overflow-visible print:p-0">
          {/* 1. بطاقات المؤشرات المالية الرئيسية */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 print:grid-cols-4 print:gap-2">
            {/* ربح اليوم الصافي للمكتب */}
            <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 shadow-2xs print:border-gray-300 print:bg-gray-50">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 print:text-black">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <span>صافي أرباح المكتب</span>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-xl sm:text-2xl font-bold font-mono text-blue-700 print:text-black">
                  {formatCurrency(totals.totalOfficeProfit)}
                </span>
                <span className="text-xs text-slate-500 font-semibold print:text-gray-600">ل.س</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1 font-medium print:text-gray-500">
                صافي عمولات المكتب من أجور التوصيل
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
                المبالغ النقدية المطلوبة من الزبائن
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
                مجموع أجور خدمات التوصيل للطلبات
              </p>
            </div>

            {/* إجمالي مستحقات المناديب */}
            <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 shadow-2xs print:border-gray-300 print:bg-gray-50">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 print:text-black">
                <Bike className="w-4 h-4 text-amber-600" />
                <span>مستحقات المناديب الإجمالية</span>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-xl sm:text-2xl font-bold font-mono text-amber-700 print:text-black">
                  {formatCurrency(totals.totalDriverShare)}
                </span>
                <span className="text-xs text-slate-500 font-semibold print:text-gray-600">ل.س</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1 font-medium print:text-gray-500">
                حصة المناديب وفق نسب العمولات المعتمدة
              </p>
            </div>
          </div>

          {/* 2. شريط حالة الطلبات */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-semibold">
            <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200 text-slate-700 flex items-center justify-between shadow-2xs print:border-gray-300 print:bg-white print:text-black">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 print:text-black" />
                <span>طلبات تم تسليمها:</span>
              </div>
              <span className="font-bold font-mono text-sm text-emerald-700 print:text-black">{totals.deliveredCount}</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200 text-slate-700 flex items-center justify-between shadow-2xs print:border-gray-300 print:bg-white print:text-black">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-sky-600 print:text-black" />
                <span>قيد التوصيل والتحرك:</span>
              </div>
              <span className="font-bold font-mono text-sm text-sky-700 print:text-black">{totals.inProgressCount}</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200 text-slate-700 flex items-center justify-between shadow-2xs print:border-gray-300 print:bg-white print:text-black">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600 print:text-black" />
                <span>بانتظار إسناد مندوب:</span>
              </div>
              <span className="font-bold font-mono text-sm text-amber-700 print:text-black">{totals.unassignedCount}</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200 text-slate-700 flex items-center justify-between shadow-2xs print:border-gray-300 print:bg-white print:text-black">
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-rose-600 print:text-black" />
                <span>طلبات ملغاة:</span>
              </div>
              <span className="font-bold font-mono text-sm text-rose-700 print:text-black">{totals.cancelledCount}</span>
            </div>
          </div>

          {/* 3. جدول التقرير التفصيلي لكل مندوب */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs print:border-gray-400">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between print:bg-gray-100 print:text-black">
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2 print:text-black">
                <Bike className="w-4 h-4 text-blue-600 print:text-black" />
                <span>جدول المحاسبة وحصص المناديب التفصيلي</span>
              </h3>
              <span className="text-[11px] text-slate-500 font-mono font-medium print:text-gray-600">
                {driverReports.length} مناديب مسجلين
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-600 border-b border-slate-200 text-[11px] font-bold print:bg-gray-200 print:text-black">
                    <th className="py-2.5 px-3">المندوب</th>
                    <th className="py-2.5 px-3 text-center">النسبة</th>
                    <th className="py-2.5 px-3 text-center">الطلبات</th>
                    <th className="py-2.5 px-3 text-center">المسلّمة</th>
                    <th className="py-2.5 px-3 text-center">الملغاة</th>
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
                        لا يوجد مناديب مسجلين في النظام.
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
                            <span className="block text-[10px] text-slate-500 font-mono print:text-gray-500 mt-0.5" dir="ltr">
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

                        <td className="py-2.5 px-3 text-center font-mono text-rose-700 print:text-black font-semibold">
                          {row.cancelledCount}
                        </td>

                        {/* نسبة الإنجاز مع شريط تقدم صغير */}
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
                          {formatCurrency(row.totalCollection)} <span className="text-[10px] text-slate-400 font-normal">ل.س</span>
                        </td>

                        <td className="py-2.5 px-3 text-center font-mono font-semibold text-slate-700 print:text-black whitespace-nowrap">
                          {formatCurrency(row.totalDeliveryFee)} <span className="text-[10px] text-slate-400 font-normal">ل.س</span>
                        </td>

                        <td className="py-2.5 px-3 text-center font-mono font-bold text-sky-700 print:text-black whitespace-nowrap">
                          {formatCurrency(row.driverShare)} <span className="text-[10px] text-slate-400 font-normal">ل.س</span>
                        </td>

                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900 print:text-black whitespace-nowrap">
                          {formatCurrency(row.officeShare)} <span className="text-[10px] text-slate-400 font-normal">ل.س</span>
                        </td>
                      </tr>
                    ))
                  )}

                  {/* صف الإجماليات الشاملة */}
                  <tr className="bg-slate-100/90 font-bold border-t-2 border-slate-300 text-slate-900 print:bg-gray-100 print:text-black print:border-gray-400">
                    <td className="py-3 px-3 text-slate-900 print:text-black">الإجمالي الكلي</td>
                    <td className="py-3 px-3 text-center text-slate-400 print:text-black">—</td>
                    <td className="py-3 px-3 text-center font-mono">{totals.totalOrdersCount}</td>
                    <td className="py-3 px-3 text-center font-mono text-emerald-700 print:text-black">
                      {totals.deliveredCount}
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-rose-700 print:text-black">
                      {totals.cancelledCount}
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

          {/* 4. تفاصيل الطلبات الملغاة اليوم */}
          {totals.cancelledCount > 0 && (
            <div className="bg-rose-50/60 border border-rose-200 rounded-xl p-3.5 space-y-1 text-xs shadow-2xs print:border-gray-300 print:bg-gray-50">
              <div className="flex items-center justify-between text-rose-800 print:text-black font-bold">
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-rose-600" />
                  <span>الطلبات الملغاة ({totals.cancelledCount} طلبات)</span>
                </div>
                <span className="font-mono">
                  إجمالي المبالغ المستبعدة: {formatCurrency(totals.totalCancelledAmount)} ل.س
                </span>
              </div>
              <p className="text-[11px] text-rose-700 print:text-gray-600 font-medium">
                ملاحظة تدقيقية: تم استبعاد كافة مبالغ التحصيل وأجور التوصيل للطلبات الملغاة من إجمالي حسابات التحصيل وأرباح المكتب أعلاه لضمان مطابقة الصندوق.
              </p>
            </div>
          )}

          {/* تذييل الورقة الرسمية للطباعة والتوقيعات */}
          <div className="hidden print:grid grid-cols-3 gap-6 pt-12 text-center text-xs text-black border-t border-gray-300 mt-8">
            <div className="space-y-8">
              <p className="font-bold">توقيع مسؤول التوزيع والحسابات</p>
              <p className="border-b border-gray-400 w-40 mx-auto"></p>
            </div>
            <div className="space-y-8">
              <p className="font-bold">توقيع مندوب الاستلام</p>
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
