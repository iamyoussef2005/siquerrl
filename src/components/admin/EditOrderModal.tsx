'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Order, Profile } from '@/types/database';
import {
  X,
  Save,
  Loader2,
  MapPin,
  FileText,
  DollarSign,
  Compass,
  RotateCcw,
  Edit3,
  ExternalLink,
} from 'lucide-react';

interface EditOrderModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onOrderUpdated: (updatedOrder: Order) => void;
  drivers?: Profile[];
}

export function EditOrderModal({
  order,
  isOpen,
  onClose,
  onOrderUpdated,
  drivers,
}: EditOrderModalProps) {
  const [address, setAddress] = useState('');
  const [orderDetails, setOrderDetails] = useState('');
  const [mapsUrl, setMapsUrl] = useState('');
  const [collectionAmount, setCollectionAmount] = useState<string>('');
  const [deliveryFee, setDeliveryFee] = useState<string>('');
  const [driverFee, setDriverFee] = useState<string>('');
  const [officeFee, setOfficeFee] = useState<string>('');

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Populate form fields whenever order changes
  useEffect(() => {
    if (order) {
      setAddress(order.delivery_address || '');
      setOrderDetails(order.order_details || '');
      setMapsUrl(order.maps_url || '');
      setCollectionAmount(String(order.collection_amount ?? ''));
      setDeliveryFee(String(order.delivery_fee ?? ''));
      setDriverFee(String(order.driver_fee ?? ''));
      setOfficeFee(String(order.office_fee ?? ''));
      setErrorMsg(null);
    }
  }, [order]);

  if (!isOpen || !order) return null;

  // Reset to driver commission split based on assigned driver percentage
  const resetToDefaultSplit = () => {
    const dFee = parseFloat(deliveryFee) || 0;
    const assignedDriver = drivers?.find((d) => d.id === order.driver_id);
    const rate = assignedDriver?.commission_percentage ?? 70;
    const drShare = Math.round((dFee * rate) / 100);
    const offShare = Math.max(0, dFee - drShare);
    setDriverFee(drShare.toString());
    setOfficeFee(offShare.toString());
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);

    const updatedPayload: Partial<Order> = {
      delivery_address: address.trim(),
      order_details: orderDetails.trim(),
      maps_url: mapsUrl.trim() || null,
      collection_amount: parseFloat(collectionAmount) || 0,
      delivery_fee: parseFloat(deliveryFee) || 0,
      driver_fee: parseFloat(driverFee) || 0,
      office_fee: parseFloat(officeFee) || 0,
    };

    try {
      const { data, error } = await supabase
        .from('orders')
        .update(updatedPayload)
        .eq('id', order.id)
        .select()
        .single();

      if (error) throw error;
      if (data) {
        onOrderUpdated(data as Order);
      } else {
        onOrderUpdated({ ...order, ...updatedPayload });
      }

      onClose();
    } catch (err: any) {
      console.error('Error updating order:', err);
      setErrorMsg(err.message || 'حدث خطأ أثناء حفظ التعديلات');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0e131f] border border-[#1b2234] rounded-xl w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl relative">
        {/* رأس النافذة */}
        <div className="flex items-center justify-between p-3.5 sm:p-4 px-5 sm:px-6 border-b border-[#1b2234] sticky top-0 bg-[#0e131f]/95 backdrop-blur-md z-20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-semibold text-white leading-tight">
                  تعديل تفاصيل وحسابات الطلب
                </h3>
                <span className="px-2 py-0.5 rounded bg-[#161d2d] text-slate-300 border border-[#222c42] font-mono text-[11px] font-medium">
                  #{order.id}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                الزبون: <strong className="text-slate-200 font-medium">{order.customer_name}</strong> • الهاتف: <span className="font-mono text-slate-300" dir="ltr">{order.customer_phone}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#141926] border border-transparent hover:border-[#212a3d] transition-all cursor-pointer active:scale-95"
            title="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* نموذج التعديل */}
        <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs font-medium animate-fadeIn">
              {errorMsg}
            </div>
          )}

          {/* العنوان ورابط الخريطة */}
          <div className="bg-[#0a0e18] border border-[#1b2234] rounded-xl p-4 sm:p-5 space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                عنوان التوصيل
              </label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-[#121724] border border-[#212a3d] hover:border-slate-600 focus:border-blue-500 rounded-lg p-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-all"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-slate-400" />
                  رابط خرائط جوجل (Google Maps)
                </label>
                {mapsUrl && (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-blue-400 hover:underline flex items-center gap-1 font-medium"
                  >
                    <span>فتح الرابط</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
              <input
                type="url"
                dir="ltr"
                value={mapsUrl}
                onChange={(e) => setMapsUrl(e.target.value)}
                placeholder="https://maps.google.com/..."
                className="w-full bg-[#121724] border border-[#212a3d] hover:border-slate-600 focus:border-blue-500 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30 font-mono text-left transition-all"
              />
            </div>
          </div>

          {/* تفاصيل الطلب */}
          <div className="bg-[#0a0e18] border border-[#1b2234] rounded-xl p-4 sm:p-5">
            <label className="block text-xs font-medium text-slate-300 mb-2 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              تفاصيل ومواد الطلب
            </label>
            <textarea
              rows={3}
              required
              value={orderDetails}
              onChange={(e) => setOrderDetails(e.target.value)}
              className="w-full bg-[#121724] border border-[#212a3d] hover:border-slate-600 focus:border-blue-500 rounded-lg p-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30 leading-relaxed transition-all"
            />
          </div>

          {/* الحقول المالية وتعديل الحصص للمدير */}
          <div className="bg-[#0a0e18] border border-[#1b2234] rounded-xl p-4 sm:p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1b2234] pb-3">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <DollarSign className="w-3.5 h-3.5" />
                </div>
                تعديل المبالغ وتخصيص الحصص
              </span>

              <button
                type="button"
                onClick={resetToDefaultSplit}
                className="text-[11px] font-medium text-slate-300 hover:text-white flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#131926] border border-[#212a3d] hover:bg-[#1a2233] transition-all cursor-pointer active:scale-95"
                title="إعادة توزيع النسبة الافتراضية للسائق والمكتب"
              >
                <RotateCcw className="w-3 h-3" />
                <span>إعادة الحساب التلقائي</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* المبلغ المطلوب تحصيله */}
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  المبلغ المطلوب تحصيله
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    value={collectionAmount}
                    onChange={(e) => setCollectionAmount(e.target.value)}
                    className="w-full bg-[#121724] border border-[#212a3d] hover:border-slate-600 focus:border-blue-500 rounded-lg p-2 pl-9 text-xs text-emerald-400 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                  />
                  <span className="text-[10px] text-emerald-500/70 absolute left-2.5 top-2.5 pointer-events-none">ل.س</span>
                </div>
              </div>

              {/* أجرة التوصيل الكلية */}
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  أجرة التوصيل الكلية
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    value={deliveryFee}
                    onChange={(e) => setDeliveryFee(e.target.value)}
                    className="w-full bg-[#121724] border border-[#212a3d] hover:border-slate-600 focus:border-blue-500 rounded-lg p-2 pl-9 text-xs text-white font-mono font-bold focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                  />
                  <span className="text-[10px] text-slate-400 absolute left-2.5 top-2.5 pointer-events-none">ل.س</span>
                </div>
              </div>

              {/* حصة المندوب المعدلة */}
              <div>
                <label className="block text-[11px] font-medium text-sky-400 mb-1">
                  حصة المندوب (Driver Fee)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    value={driverFee}
                    onChange={(e) => setDriverFee(e.target.value)}
                    className="w-full bg-[#121724] border border-sky-800/60 focus:border-sky-500 rounded-lg p-2 pl-9 text-xs text-sky-300 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-sky-500/30"
                  />
                  <span className="text-[10px] text-sky-500/70 absolute left-2.5 top-2.5 pointer-events-none">ل.س</span>
                </div>
              </div>

              {/* حصة المكتب المعدلة */}
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  حصة المكتب (Office Fee)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    value={officeFee}
                    onChange={(e) => setOfficeFee(e.target.value)}
                    className="w-full bg-[#121724] border border-[#212a3d] hover:border-slate-600 focus:border-blue-500 rounded-lg p-2 pl-9 text-xs text-slate-200 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                  />
                  <span className="text-[10px] text-slate-400 absolute left-2.5 top-2.5 pointer-events-none">ل.س</span>
                </div>
              </div>
            </div>
          </div>

          {/* أزرار الحفظ والإغلاق */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1b2234]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-[#131926] hover:bg-[#1a2233] border border-[#212a3d] text-slate-300 text-xs font-medium transition-all cursor-pointer active:scale-95"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-medium shadow-sm disabled:opacity-50 transition-all cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>جاري الحفظ...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>حفظ التعديلات</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
