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
  XCircle,
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
          label: 'بانتظار تحضير الطلب واستلامك',
          className: 'bg-orange-50 text-orange-700 border-orange-200 font-bold',
          icon: Clock,
        };
      case 'pending':
        return {
          label: 'بانتظار الإسناد',
          className: 'bg-amber-50 text-amber-700 border-amber-200 font-bold',
          icon: Clock,
        };
      case 'delivering':
        return {
          label: 'قيد التوصيل معك الآن',
          className: 'bg-amber-50 text-amber-800 border-amber-200 animate-pulse font-bold',
          icon: Truck,
        };
      case 'delivered':
        return {
          label: 'مكتملة ومسلّمة بنجاح',
          className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: CheckCircle2,
        };
      case 'cancelled':
        return {
          label: 'طلب ملغي',
          className: 'bg-rose-50 text-rose-700 border-rose-200',
          icon: XCircle,
        };
      default:
        return {
          label: order.status,
          className: 'bg-slate-100 text-slate-700 border-slate-200',
          icon: Clock,
        };
    }
  };

  const badge = getStatusBadge();
  const BadgeIcon = badge.icon;

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 shadow-xs overflow-hidden ${
        order.status === 'delivering'
          ? 'bg-white border-orange-500 ring-2 ring-orange-500/20 shadow-md'
          : order.status === 'assigned' || order.status === 'pending'
          ? 'bg-white border-orange-200 shadow-xs'
          : order.status === 'cancelled'
          ? 'bg-slate-50 border-rose-200 opacity-80'
          : 'bg-white border-slate-200'
      }`}
    >
      {/* رأس بطاقة الطلب */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-2 bg-slate-50/60">
        <div className="flex items-center gap-2">
          <span className="text-base font-black text-slate-900 font-mono">#{order.id}</span>
          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border inline-flex items-center gap-1 ${badge.className}`}>
            <BadgeIcon className="w-3.5 h-3.5" />
            {badge.label}
          </span>
        </div>

        <div className="text-left font-mono">
          <span className="text-[11px] text-slate-500 font-medium block">حصة المندوب</span>
          <span className="text-sm font-black text-orange-600">
            {formatCurrency(Number(order.driver_fee))} ل.س
          </span>
        </div>
      </div>

      {/* محتوى البطاقة الأساسي */}
      <div className="p-4 space-y-3.5">
        {/* بيانات الزبون والاتصال */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 leading-tight">
              {order.customer_name}
            </h3>
            <div className="flex items-center gap-1 text-xs text-slate-500 font-mono mt-0.5" dir="ltr">
              <Phone className="w-3 h-3 text-slate-400" />
              <span>{order.customer_phone}</span>
              {order.backup_phone && (
                <span className="text-slate-400">({order.backup_phone})</span>
              )}
            </div>
          </div>

          {/* أزرار الاتصال السريع */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* زر اتصال مباشر */}
            <a
              href={`tel:${order.customer_phone}`}
              className="p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 active:scale-95 transition-all shadow-2xs"
              title="اتصال هاتفي بالزبون"
            >
              <Phone className="w-4 h-4" />
            </a>

            {/* زر واتساب مباشر */}
            <a
              href={getWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-xl bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 active:scale-95 transition-all shadow-2xs"
              title="محادثة واتساب"
            >
              <MessageSquare className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* عنوان التوصيل وزر الخريطة الكبير */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-start justify-between gap-2 shadow-2xs">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="text-[10px] text-slate-500 block font-medium">عنوان التوصيل</span>
              <p className="text-xs text-slate-800 font-semibold leading-relaxed break-words">
                {order.delivery_address}
              </p>
            </div>
          </div>

          {/* زر التوجيه عبر خرائط جوجل */}
          <a
            href={getMapsUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 active:scale-95 transition-all shrink-0 text-center shadow-2xs"
            title="فتح في Google Maps"
          >
            <Navigation className="w-4 h-4" />
            <span className="text-[10px] font-bold">الخريطة</span>
          </a>
        </div>

        {/* تفاصيل الطلب والمواد المطلوبة */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 shadow-2xs">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1">
            <FileText className="w-3.5 h-3.5 text-amber-600" />
            <span>المطلوب شراؤه / تفاصيل الطلب:</span>
          </div>
          <p className="text-xs text-slate-800 font-medium leading-relaxed whitespace-pre-line">
            {order.order_details}
          </p>
        </div>

        {/* البطاقة المالية المميزة للتحصيل */}
        <div className="bg-gradient-to-r from-emerald-50/80 via-teal-50/60 to-emerald-50/80 border border-emerald-200 rounded-xl p-3 flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[10px] text-emerald-800 font-bold block">
              المبلغ المطلوب تحصيله من الزبون
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-black text-emerald-900 font-mono tracking-tight">
                {formatCurrency(Number(order.collection_amount))}
              </span>
              <span className="text-xs text-emerald-700 font-bold">ل.س</span>
            </div>
          </div>

          <div className="text-left text-xs font-mono">
            <span className="text-[10px] text-slate-500 font-medium block">أجرة التوصيل الكلية</span>
            <span className="text-slate-800 font-bold">
              {formatCurrency(Number(order.delivery_fee))} ل.س
            </span>
          </div>
        </div>

        {/* أزرار تغيير الحالة الكبيرة (صلاحية حصرية للمندوب) */}
        <div className="pt-1">
          {(order.status === 'assigned' || order.status === 'pending') && (
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => handleUpdateStatus('delivering', true)}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 active:scale-[0.98] text-white text-sm font-bold shadow-md shadow-orange-500/20 flex items-center justify-center gap-2.5 disabled:opacity-50 transition-all cursor-pointer touch-manipulation"
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
              className="w-full py-4 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-[0.98] text-white text-base font-black shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2.5 disabled:opacity-50 transition-all cursor-pointer touch-manipulation animate-pulse"
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
            <div className="py-2.5 px-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-center gap-2 shadow-2xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>مكتمل: تم تسليم هذا الطلب بنجاح</span>
            </div>
          )}

          {order.status === 'cancelled' && (
            <div className="py-2.5 px-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center justify-center gap-2 shadow-2xs">
              <XCircle className="w-4 h-4 text-rose-600" />
              <span>تم إلغاء هذا الطلب من قبل الإدارة</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
