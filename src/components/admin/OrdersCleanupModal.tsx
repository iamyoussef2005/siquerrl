'use client';

import React, { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Order } from '@/types/database';
import {
  X,
  Trash2,
  Download,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Calendar,
  Loader2,
  FileSpreadsheet,
  Layers,
  Info,
  Clock,
} from 'lucide-react';

interface OrdersCleanupModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  onOrdersCleaned: () => void;
}

export type CleanupRange = '30days' | '60days' | '90days' | 'custom' | 'all_completed' | 'all_orders';

export function OrdersCleanupModal({
  isOpen,
  onClose,
  orders,
  onOrdersCleaned,
}: OrdersCleanupModalProps) {
  const [range, setRange] = useState<CleanupRange>('30days');
  const [customDate, setCustomDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [onlyCompleted, setOnlyCompleted] = useState(true);
  const [resetSequence, setResetSequence] = useState(true);
  const [confirmText, setConfirmText] = useState('');
  const [isConfirmedCheckbox, setIsConfirmedCheckbox] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Calculate cutoff timestamp based on selected range
  const cutoffDate = useMemo(() => {
    const now = new Date();
    if (range === '30days') {
      now.setDate(now.getDate() - 30);
      return now;
    } else if (range === '60days') {
      now.setDate(now.getDate() - 60);
      return now;
    } else if (range === '90days') {
      now.setDate(now.getDate() - 90);
      return now;
    } else if (range === 'custom') {
      return customDate ? new Date(customDate + 'T23:59:59') : now;
    }
    return null; // all_completed or all_orders
  }, [range, customDate]);

  // Target orders to be deleted
  const targetOrders = useMemo(() => {
    return orders.filter((o) => {
      // تفريغ شامل لجميع الطلبات
      if (range === 'all_orders') {
        if (onlyCompleted) {
          return o.status === 'delivered' || o.status === 'cancelled';
        }
        return true;
      }

      // Status filter
      if (onlyCompleted) {
        if (o.status !== 'delivered' && o.status !== 'cancelled') {
          return false;
        }
      }

      // Date filter
      if (cutoffDate && o.created_at) {
        const orderDate = new Date(o.created_at);
        if (orderDate >= cutoffDate) {
          return false;
        }
      }

      return true;
    });
  }, [orders, cutoffDate, onlyCompleted, range]);

  if (!isOpen) return null;

  // Format numbers
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US').format(val || 0);
  };

  const totalCollections = targetOrders.reduce(
    (sum, o) => sum + (Number(o.collection_amount) || 0),
    0
  );
  const totalOfficeFees = targetOrders.reduce(
    (sum, o) => sum + (Number(o.office_fee) || 0),
    0
  );

  // Export CSV backup before deletion
  const handleExportBackup = () => {
    if (targetOrders.length === 0) return;

    const headers = [
      'رقم الطلب',
      'تاريخ الطلب',
      'اسم الزبون',
      'هاتف الزبون',
      'عنوان التوصيل',
      'تفاصيل الطلب',
      'الحالة',
      'مبلغ التحصيل',
      'أجرة التوصيل',
      'حصة المندوب',
      'حصة المكتب',
    ];

    const rows = targetOrders.map((o) => [
      o.id,
      o.created_at ? new Date(o.created_at).toLocaleString('ar-SY') : '',
      `"${(o.customer_name || '').replace(/"/g, '""')}"`,
      `"${o.customer_phone || ''}"`,
      `"${(o.delivery_address || '').replace(/"/g, '""')}"`,
      `"${(o.order_details || '').replace(/"/g, '""')}"`,
      o.status,
      o.collection_amount || 0,
      o.delivery_fee || 0,
      o.driver_fee || 0,
      o.office_fee || 0,
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `نسخة_احتياطية_للطلبات_المحذوفة_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Perform safe deletion
  const handleDeleteOrders = async () => {
    if (targetOrders.length === 0) return;
    if (confirmText.trim() !== 'حذف' && confirmText.trim() !== 'تاكيد' && confirmText.trim() !== 'تأكيد') {
      setFeedback({
        type: 'error',
        text: 'يرجى كتابة كلمة "حذف" في الحقل المخصص لتأكيد العملية.',
      });
      return;
    }

    setIsDeleting(true);
    setFeedback(null);

    try {
      const idsToDelete = targetOrders.map((o) => o.id).filter(Boolean);

      // Execute delete in batches of 100 to avoid query limits
      const batchSize = 100;
      for (let i = 0; i < idsToDelete.length; i += batchSize) {
        const batch = idsToDelete.slice(i, i + batchSize);
        const { error } = await supabase.from('orders').delete().in('id', batch);
        if (error) throw error;
      }

      // إعادة تصفير عدّاد الترقيم لـ 1 في حال تفريغ السجل
      let sequenceResetTo1 = false;
      if (resetSequence) {
        try {
          const { data: rpcRes, error: rpcErr } = await supabase.rpc('reset_orders_sequence');
          if (!rpcErr && rpcRes && (rpcRes as any).is_empty) {
            sequenceResetTo1 = true;
          }
        } catch (e) {
          console.warn('Reset sequence RPC warning:', e);
        }
      }

      setFeedback({
        type: 'success',
        text: sequenceResetTo1
          ? `تم تفريغ وحذف ${idsToDelete.length} طلباً بنجاح، وتصفير عدّاد الترقيم لتبدأ الطلبات الجديدة من رقم 1 (#1) ✨`
          : `تم حذف وتفريغ ${idsToDelete.length} طلباً بنجاح وتخفيف حجم قاعدة البيانات ✨`,
      });

      onOrdersCleaned();

      setTimeout(() => {
        onClose();
      }, 2500);
    } catch (err: any) {
      console.error('Error cleaning up orders:', err);
      setFeedback({
        type: 'error',
        text: `حدث خطأ أثناء حذف الطلبات: ${err.message || 'يرجى المحاولة مجدداً'}`,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // تصفير الترقيم يدوياً للبدء من 1
  const handleResetSequenceOnly = async () => {
    setIsDeleting(true);
    setFeedback(null);
    try {
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('reset_orders_sequence');
      if (rpcErr) throw rpcErr;
      setFeedback({
        type: 'success',
        text: 'تمت إعادة ضبط عدّاد ترقيم الطلبات بنجاح، وسيبدأ الطلب القادم من رقم #1 ✨',
      });
      onOrdersCleaned();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: `تعذر تصفير الترقيم: ${err.message || 'يرجى المحاولة مجدداً'}`,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const isDeleteReady =
    targetOrders.length > 0 &&
    isConfirmedCheckbox &&
    (confirmText.trim() === 'حذف' ||
      confirmText.trim() === 'تاكيد' ||
      confirmText.trim() === 'تأكيد');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-xl relative flex flex-col">
        {/* رأس النافذة */}
        <div className="flex items-center justify-between p-4 sm:p-5 px-6 border-b border-slate-200 bg-white sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 shadow-2xs">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                  تنظيف وأرشفة الطلبات القديمة
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 font-mono shadow-2xs">
                  تفريغ المساحة
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                مسح سجلات الطلبات المنتهية لتسريع النظام وتوفير استهلاك سعة Supabase
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          {/* تنبيه الأمان وضمان الحفظ */}
          <div className="bg-orange-50/80 border border-orange-200 rounded-xl p-3.5 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <div className="font-bold text-orange-950">
                ضمان أمان البيانات التام:
              </div>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                هذا الإجراء يقوم بحذف <strong>حركات وسجلات الطلبات القديمة فقط</strong>. بيانات الزبائن، أرقام هواتفهم، وعناوينهم المحفوظة، وحسابات المناديب <strong>لن تُحذف نهائياً وستبقى محفوظة 100%</strong>.
              </p>
            </div>
          </div>

          {/* في حال كان السجل فارغاً بالفعل */}
          {orders.length === 0 && (
            <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-emerald-950 shadow-2xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>سجل الطلبات فارغ حالياً! يمكنك تصفير العداد الآن للبدء من رقم <strong>#1</strong>.</span>
              </div>
              <button
                type="button"
                onClick={handleResetSequenceOnly}
                disabled={isDeleting}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-2xs cursor-pointer shrink-0 disabled:opacity-50"
              >
                تصفير الترقيم الآن لـ #1
              </button>
            </div>
          )}

          {/* رسائل التغذية الراجعة */}
          {feedback && (
            <div
              className={`p-3 rounded-xl border text-xs font-medium flex items-center gap-2 ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}

          {/* خيارات تحديد النطاق الزمني */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>تحديد النطاق الزمني للطلبات المراد حذفها:</span>
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <button
                type="button"
                onClick={() => setRange('30days')}
                className={`p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-center ${
                  range === '30days'
                    ? 'bg-orange-600 border-orange-600 text-white shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                الأقدم من شهر
              </button>
              <button
                type="button"
                onClick={() => setRange('60days')}
                className={`p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-center ${
                  range === '60days'
                    ? 'bg-orange-600 border-orange-600 text-white shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                الأقدم من شهرين
              </button>
              <button
                type="button"
                onClick={() => setRange('90days')}
                className={`p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-center ${
                  range === '90days'
                    ? 'bg-orange-600 border-orange-600 text-white shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                الأقدم من 3 أشهر
              </button>
              <button
                type="button"
                onClick={() => setRange('custom')}
                className={`p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-center ${
                  range === 'custom'
                    ? 'bg-orange-600 border-orange-600 text-white shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                تاريخ مخصص
              </button>
              <button
                type="button"
                onClick={() => setRange('all_orders')}
                className={`p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-center col-span-2 sm:col-span-1 ${
                  range === 'all_orders'
                    ? 'bg-rose-600 border-rose-600 text-white shadow-xs'
                    : 'bg-rose-50/70 border-rose-200 text-rose-800 hover:border-rose-300 hover:bg-rose-100/70'
                }`}
              >
                تفريغ شامل للكل
              </button>
            </div>

            {range === 'custom' && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-slate-700">حذف الطلبات المسجلة قبل تاريخ:</span>
                <input
                  type="date"
                  dir="ltr"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="bg-white border border-slate-300 text-xs text-slate-900 rounded-xl px-3 py-1.5 focus:outline-hidden focus:border-orange-500 shadow-2xs"
                />
              </div>
            )}
          </div>

          {/* فلتر حالة الطلبات */}
          <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-3.5 space-y-2">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyCompleted}
                onChange={(e) => setOnlyCompleted(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500/20 bg-white"
              />
              <span className="text-xs font-semibold text-slate-800">
                حذف الطلبات المنتهية فقط (المسلّمة والملغية) — موصى به جداً
              </span>
            </label>
            <p className="text-[11px] text-slate-500 pr-6">
              يضمن هذا الخيار عدم حذف أي طلب قيد الانتظار أو قيد التوصيل لم ينتهِ بعد.
            </p>
          </div>

          {/* خيار تصفير الترقيم والبدء من 1 */}
          <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50/70 border border-orange-300 rounded-xl p-3.5 space-y-1.5 shadow-2xs">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={resetSequence}
                onChange={(e) => setResetSequence(e.target.checked)}
                className="w-4 h-4 rounded border-orange-300 text-orange-600 focus:ring-orange-500/20 bg-white"
              />
              <span className="text-xs font-bold text-orange-950 flex items-center gap-2">
                <span>إعادة تصفير ترقيم الطلبات لتبدأ من رقم 1</span>
                <span className="text-[10px] bg-orange-200/90 text-orange-900 border border-orange-300 px-2 py-0.5 rounded-full font-mono font-bold">
                  يبدأ الطلب القادم بـ #1
                </span>
              </span>
            </label>
            <p className="text-[11px] text-orange-900/80 pr-6 leading-relaxed">
              عند تفريغ السجل بالكامل، سيعود عداد الترقيم تلقائياً إلى البداية بحيث يبدأ أول طلب جديد يُسجل في النظام من الرقم <strong>#1</strong> (مع الحفاظ الكامل على كافة بيانات الزبائن وعناوينهم السابقة في النظام دون أي مساس بها).
            </p>
          </div>

          {/* بطاقة ملخص التأثير والحسابات */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <div className="text-[11px] text-slate-500 font-medium">الطلبات المحددة للحذف</div>
              <div className="text-xl font-bold text-rose-600 font-mono mt-0.5">
                {targetOrders.length} <span className="text-xs font-normal text-slate-500">طلب</span>
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500 font-medium">إجمالي مبالغ التحصيل</div>
              <div className="text-lg font-bold text-slate-900 font-mono mt-0.5">
                {formatCurrency(totalCollections)} <span className="text-xs font-normal text-slate-500">ل.س</span>
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500 font-medium">إجمالي أرباح المكتب</div>
              <div className="text-lg font-bold text-emerald-600 font-mono mt-0.5">
                {formatCurrency(totalOfficeFees)} <span className="text-xs font-normal text-slate-500">ل.س</span>
              </div>
            </div>
          </div>

          {/* زر تصدير نسخة احتياطية قبل الحذف */}
          <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-2xs">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">
                  احفظ نسخة احتياطية على جهازك (Excel / CSV)
                </div>
                <div className="text-[11px] text-slate-500">
                  قم بتحميل ملف يحتوي كامل تفاصيل الطلبات قبل حذفها للرجوع إليها مستقبلاً
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleExportBackup}
              disabled={targetOrders.length === 0}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs hover:shadow cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تنزيل النسخة الاحتياطية</span>
            </button>
          </div>

          {/* إجراءات التأكيد النهائية */}
          <div className="border-t border-slate-200 pt-4 space-y-3">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isConfirmedCheckbox}
                onChange={(e) => setIsConfirmedCheckbox(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded border-slate-300 text-rose-600 focus:ring-rose-100 bg-white"
              />
              <span className="text-xs text-slate-700 leading-relaxed">
                أقر بأنني قمت بتنزيل نسخة احتياطية (أو لا أحتاج إليها)، وأرغب بحذف {targetOrders.length} طلب نهائياً من قاعدة البيانات لتفريغ المساحة.
              </span>
            </label>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-slate-600">
                لتفادي الحذف العرضي، اكتب كلمة <strong className="text-rose-600">"حذف"</strong> في الحقل أدناه:
              </label>
              <input
                type="text"
                placeholder='اكتب "حذف" هنا للتأكيد'
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-full bg-white border border-slate-300 focus:border-rose-500 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-rose-100 transition-all shadow-2xs"
              />
            </div>
          </div>
        </div>

        {/* أزرار الإجراء السفلية */}
        <div className="p-4 px-6 border-t border-slate-200 bg-slate-50/70 flex items-center justify-end gap-3 sticky bottom-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 transition-colors cursor-pointer shadow-2xs"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleDeleteOrders}
            disabled={!isDeleteReady || isDeleting}
            className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center gap-2 transition-all shadow-xs hover:shadow cursor-pointer"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري الحذف وتفريغ المساحة...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>تنفيذ حذف {targetOrders.length} طلب نهائياً</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
