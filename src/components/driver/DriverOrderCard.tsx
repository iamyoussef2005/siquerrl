'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Order, OrderStatus } from '@/types/database';
import {
  Phone,
  MapPin,
  FileText,
  DollarSign,
  MessageSquare,
  Navigation,
  CheckCircle2,
  Clock,
  Truck,
  Loader2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface DriverOrderCardProps {
  order: Order;
  onStatusUpdated: (updatedOrder: Order) => void;
}

export function DriverOrderCard({ order, onStatusUpdated }: DriverOrderCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Format currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US').format(val || 0);
  };

  // Format phone for international WhatsApp link (Syria default: 09xxxxxxxx -> 9639xxxxxxxx)
  const formatWhatsAppPhone = (phoneStr: string) => {
    let clean = phoneStr.replace(/\D/g, '');
    if (clean.startsWith('00')) {
      clean = clean.substring(2);
    }
    if (clean.startsWith('0')) {
      clean = '963' + clean.substring(1);
    } else if (!clean.startsWith('963') && clean.length === 9 && clean.startsWith('9')) {
      clean = '963' + clean;
    }
    return clean;
  };

  // Generate WhatsApp Click-to-Chat URL
  const getWhatsAppUrl = () => {
    const waPhone = formatWhatsAppPhone(order.customer_phone);
    const msg = `مرحباً ${order.customer_name}، طلبك رقم #${order.id} أصبح قيد التوصيل معي الآن وسيصلك قريباً.`;
    return `https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`;
  };

  // Get Google Maps URL (either existing maps_url or search query from delivery address)
  const getMapsUrl = () => {
    if (order.maps_url && order.maps_url.trim().length > 0) {
      return order.maps_url;
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.delivery_address)}`;
  };

  // Update order status in Supabase
  const handleUpdateStatus = async (newStatus: OrderStatus, openWhatsApp = false) => {
    setIsUpdating(true);

    try {
      const { data, error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', order.id)
        .select()
        .single();

      if (error) throw error;
      if (data) {
        onStatusUpdated(data as Order);
      } else {
        onStatusUpdated({ ...order, status: newStatus });
      }

      // If transition to 'delivering', open WhatsApp automatically
      if (openWhatsApp) {
        const waUrl = getWhatsAppUrl();
        window.open(waUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err: any) {
      console.error('Error updating status by driver:', err);
      alert('حدث خطأ أثناء تحديث حالة الطلب: ' + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  // Status Badge
  const getStatusBadge = () => {
    switch (order.status) {
      case 'assigned':
        return {
          label: 'جديد: بانتظار استلامك',
          className: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
          icon: Clock,
        };
      case 'delivering':
        return {
          label: 'قيد التوصيل معك الآن',
          className: 'bg-sky-500/15 text-sky-300 border-sky-500/30 animate-pulse',
          icon: Truck,
        };
      case 'delivered':
        return {
          label: 'تم التسليم بنجاح',
          className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
          icon: CheckCircle2,
        };
      default:
        return {
          label: order.status,
          className: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
          icon: Clock,
        };
    }
  };

  const badge = getStatusBadge();
  const BadgeIcon = badge.icon;

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 shadow-xl overflow-hidden ${
        order.status === 'delivering'
          ? 'bg-slate-900 border-sky-600/50 ring-1 ring-sky-500/30'
          : order.status === 'assigned'
          ? 'bg-slate-900 border-indigo-600/40'
          : 'bg-slate-900/80 border-slate-800'
      }`}
    >
      {/* رأس بطاقة الطلب */}
      <div className="p-4 border-b border-slate-800/80 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-base font-black text-white font-mono">#{order.id}</span>
          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border inline-flex items-center gap-1 ${badge.className}`}>
            <BadgeIcon className="w-3.5 h-3.5" />
            {badge.label}
          </span>
        </div>

        <div className="text-left font-mono">
          <span className="text-[11px] text-slate-400 block">حصة المندوب</span>
          <span className="text-sm font-extrabold text-sky-400">
            {formatCurrency(Number(order.driver_fee))} ل.س
          </span>
        </div>
      </div>

      {/* محتوى البطاقة الأساسي */}
      <div className="p-4 space-y-3.5">
        {/* بيانات الزبون والاتصال */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-white leading-tight">
              {order.customer_name}
            </h3>
            <div className="flex items-center gap-1 text-xs text-slate-400 font-mono mt-0.5" dir="ltr">
              <Phone className="w-3 h-3 text-slate-500" />
              <span>{order.customer_phone}</span>
              {order.backup_phone && (
                <span className="text-slate-500">({order.backup_phone})</span>
              )}
            </div>
          </div>

          {/* أزرار الاتصال السريع */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* زر اتصال مباشر */}
            <a
              href={`tel:${order.customer_phone}`}
              className="p-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 active:scale-95 transition-all"
              title="اتصال هاتفي بالزبون"
            >
              <Phone className="w-4 h-4" />
            </a>

            {/* زر واتساب مباشر */}
            <a
              href={getWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-xl bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-500/30 active:scale-95 transition-all"
              title="محادثة واتساب"
            >
              <MessageSquare className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* عنوان التوصيل وزر الخريطة الكبير */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <MapPin className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="text-[10px] text-slate-400 block font-medium">عنوان التوصيل</span>
              <p className="text-xs text-slate-200 font-semibold leading-relaxed break-words">
                {order.delivery_address}
              </p>
            </div>
          </div>

          {/* زر التوجيه عبر خرائط جوجل */}
          <a
            href={getMapsUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 active:scale-95 transition-all shrink-0 text-center"
            title="فتح في Google Maps"
          >
            <Navigation className="w-4 h-4" />
            <span className="text-[10px] font-bold">الخريطة</span>
          </a>
        </div>

        {/* تفاصيل الطلب والمواد المطلوبة */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-1">
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            <span>المطلوب شراؤه / تفاصيل الطلب:</span>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line">
            {order.order_details}
          </p>
        </div>

        {/* البطاقة المالية المميزة للتحصيل */}
        <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-800/40 rounded-xl p-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-emerald-400 font-medium block">
              المبلغ المطلوب تحصيله من الزبون
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-black text-white font-mono tracking-tight">
                {formatCurrency(Number(order.collection_amount))}
              </span>
              <span className="text-xs text-emerald-400 font-bold">ل.س</span>
            </div>
          </div>

          <div className="text-left text-xs font-mono">
            <span className="text-[10px] text-slate-400 block">أجرة التوصيل الكلية</span>
            <span className="text-slate-200 font-semibold">
              {formatCurrency(Number(order.delivery_fee))} ل.س
            </span>
          </div>
        </div>

        {/* أزرار تغيير الحالة الكبيرة (صلاحية حصرية للمندوب) */}
        <div className="pt-1">
          {order.status === 'assigned' && (
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => handleUpdateStatus('delivering', true)}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 active:scale-[0.98] text-white text-sm font-extrabold shadow-lg shadow-sky-600/30 flex items-center justify-center gap-2.5 disabled:opacity-50 transition-all touch-manipulation"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>جاري تحديث الحالة وفتح واتساب...</span>
                </>
              ) : (
                <>
                  <Truck className="w-5 h-5" />
                  <span>استلام الطلب والبدء بالتوصيل (مع إشعار واتساب)</span>
                </>
              )}
            </button>
          )}

          {order.status === 'delivering' && (
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => handleUpdateStatus('delivered', false)}
              className="w-full py-4 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.98] text-white text-base font-black shadow-xl shadow-emerald-600/35 flex items-center justify-center gap-2.5 disabled:opacity-50 transition-all touch-manipulation animate-pulse"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>جاري تسجيل التسليم...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-6 h-6" />
                  <span>تم تسليم الطلب للزبون بنجاح ✅</span>
                </>
              )}
            </button>
          )}

          {order.status === 'delivered' && (
            <div className="py-2.5 px-3 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>مكتمل: تم تسليم هذا الطلب بنجاح</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
