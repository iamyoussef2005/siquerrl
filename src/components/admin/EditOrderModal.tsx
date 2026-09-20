'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { CustomerAddress, Order, Profile } from '@/types/database';
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
  History,
  Check,
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
  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([]);

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

      // جلب عناوين الزبون المسجلة إن وجد معرف للزبون
      if (order.customer_id) {
        supabase
          .from('customer_addresses')
          .select('*')
          .eq('customer_id', order.customer_id)
          .order('last_used_at', { ascending: false })
          .then(({ data, error }) => {
            if (!error && data) {
              setSavedAddresses(data);
            } else {
              setSavedAddresses([]);
            }
          });
      } else {
        setSavedAddresses([]);
      }
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

    const cleanAddress = address.trim();
    const cleanMaps = mapsUrl.trim() || null;

    const updatedPayload: Partial<Order> = {
      delivery_address: cleanAddress,
      order_details: orderDetails.trim(),
      maps_url: cleanMaps,
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

      // حفظ أو تحديث العنوان الجديد في سجل الزبون
      if (order.customer_id && cleanAddress) {
        const existing = savedAddresses.find(
          (a) => a.address.trim().toLowerCase() === cleanAddress.toLowerCase()
        );
        if (existing) {
          await supabase
            .from('customer_addresses')
            .update({
              last_used_at: new Date().toISOString(),
              maps_url: cleanMaps || existing.maps_url,
            })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('customer_addresses')
            .insert({
              customer_id: order.customer_id,
              address: cleanAddress,
              maps_url: cleanMaps,
              last_used_at: new Date().toISOString(),
            });
        }
      }

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-xl relative">
        {/* رأس النافذة */}
        <div className="flex items-center justify-between p-3.5 sm:p-4 px-5 sm:px-6 border-b border-slate-200 sticky top-0 bg-white/95 backdrop-blur-md z-20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 shadow-2xs">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                  تعديل تفاصيل وحسابات الطلب
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 font-mono text-[11px] font-semibold">
                  #{order.id}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                الزبون: <strong className="text-slate-800 font-bold">{order.customer_name}</strong> • الهاتف: <span className="font-mono text-slate-600" dir="ltr">{order.customer_phone}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all cursor-pointer active:scale-95"
            title="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* نموذج التعديل */}
        <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium animate-fadeIn">
              {errorMsg}
            </div>
          )}

          {/* العنوان ورابط الخريطة */}
          <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3">
            {/* العناوين السابقة المحفوظة للزبون */}
            {savedAddresses.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-800 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-blue-600" />
                    <span>عناوين أخرى محفوظة لنفس الزبون ({savedAddresses.length}):</span>
                  </span>
                  <span className="text-[10px] text-slate-500">
                    انقر لتبديل عنوان هذا الطلب فورياً
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {savedAddresses.map((addr, idx) => {
                    const isCurrent = address.trim().toLowerCase() === addr.address.trim().toLowerCase();
                    return (
                      <button
                        key={addr.id || idx}
                        type="button"
                        onClick={() => {
                          setAddress(addr.address);
                          if (addr.maps_url) setMapsUrl(addr.maps_url);
                        }}
                        className={`text-right p-2 rounded-lg border text-xs transition-all flex items-center justify-between gap-2 cursor-pointer ${
                          isCurrent
                            ? 'bg-blue-50 border-blue-500 text-blue-900 font-semibold shadow-2xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          {isCurrent && <Check className="w-3 h-3 text-blue-600 shrink-0" />}
                          <span className="truncate">{addr.address}</span>
                        </div>
                        {addr.maps_url && (
                          <span className="text-[9px] text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200 shrink-0">
                            موقع
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                عنوان التوصيل
              </label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-white border border-slate-300 hover:border-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 rounded-xl p-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden transition-all shadow-2xs"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-slate-400" />
                  رابط خرائط جوجل (Google Maps)
                </label>
                {mapsUrl && (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 font-medium"
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
                className="w-full bg-white border border-slate-300 hover:border-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 rounded-xl p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden font-mono text-left transition-all shadow-2xs"
              />
            </div>
          </div>

          {/* تفاصيل الطلب */}
          <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 sm:p-5">
            <label className="block text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              تفاصيل ومواد الطلب
            </label>
            <textarea
              rows={3}
              required
              value={orderDetails}
              onChange={(e) => setOrderDetails(e.target.value)}
              className="w-full bg-white border border-slate-300 hover:border-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 rounded-xl p-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden leading-relaxed transition-all shadow-2xs"
            />
          </div>

          {/* الحقول المالية وتعديل الحصص للمدير */}
          <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <span className="text-xs font-semibold text-slate-800 flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <DollarSign className="w-3.5 h-3.5" />
                </div>
                تعديل المبالغ وتخصيص الحصص
              </span>

              <button
                type="button"
                onClick={resetToDefaultSplit}
                className="text-[11px] font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-slate-200 hover:bg-slate-100 transition-all cursor-pointer active:scale-95 shadow-2xs"
                title="إعادة توزيع النسبة الافتراضية للسائق والمكتب"
              >
                <RotateCcw className="w-3 h-3" />
                <span>إعادة الحساب التلقائي</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* المبلغ المطلوب تحصيله */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  المبلغ المطلوب تحصيله
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    value={collectionAmount}
                    onChange={(e) => setCollectionAmount(e.target.value)}
                    className="w-full bg-white border border-slate-300 hover:border-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 rounded-xl p-2 pl-9 text-xs text-emerald-700 font-mono font-bold focus:outline-hidden shadow-2xs"
                  />
                  <span className="text-[10px] text-emerald-600 absolute left-2.5 top-2.5 pointer-events-none">ل.س</span>
                </div>
              </div>

              {/* أجرة التوصيل الكلية */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  أجرة التوصيل الكلية
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    value={deliveryFee}
                    onChange={(e) => setDeliveryFee(e.target.value)}
                    className="w-full bg-white border border-slate-300 hover:border-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 rounded-xl p-2 pl-9 text-xs text-slate-900 font-mono font-bold focus:outline-hidden shadow-2xs"
                  />
                  <span className="text-[10px] text-slate-500 absolute left-2.5 top-2.5 pointer-events-none">ل.س</span>
                </div>
              </div>

              {/* حصة المندوب المعدلة */}
              <div>
                <label className="block text-[11px] font-semibold text-sky-700 mb-1">
                  حصة المندوب (Driver Fee)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    value={driverFee}
                    onChange={(e) => setDriverFee(e.target.value)}
                    className="w-full bg-white border border-sky-300 focus:border-sky-600 focus:ring-2 focus:ring-sky-100 rounded-xl p-2 pl-9 text-xs text-sky-700 font-mono font-bold focus:outline-hidden shadow-2xs"
                  />
                  <span className="text-[10px] text-sky-600 absolute left-2.5 top-2.5 pointer-events-none">ل.س</span>
                </div>
              </div>

              {/* حصة المكتب المعدلة */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  حصة المكتب (Office Fee)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    value={officeFee}
                    onChange={(e) => setOfficeFee(e.target.value)}
                    className="w-full bg-white border border-slate-300 hover:border-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 rounded-xl p-2 pl-9 text-xs text-slate-800 font-mono font-bold focus:outline-hidden shadow-2xs"
                  />
                  <span className="text-[10px] text-slate-500 absolute left-2.5 top-2.5 pointer-events-none">ل.س</span>
                </div>
              </div>
            </div>
          </div>

          {/* أزرار الحفظ والإغلاق */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold transition-all cursor-pointer active:scale-95 shadow-2xs"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-semibold shadow-xs hover:shadow disabled:opacity-50 transition-all cursor-pointer"
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
