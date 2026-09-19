'use client';

import React, { useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Customer, Order } from '@/types/database';
import {
  Phone,
  User,
  MapPin,
  FileText,
  DollarSign,
  Send,
  Loader2,
  CheckCircle2,
  UserPlus,
  Compass,
  ExternalLink,
  RotateCcw,
  Lock,
  Coins,
  Receipt,
  PieChart,
} from 'lucide-react';

interface NewOrderFormProps {
  onOrderCreated: (order: Order) => void;
}

export function NewOrderForm({ onOrderCreated }: NewOrderFormProps) {
  // Form State
  const [phone, setPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [backupPhone, setBackupPhone] = useState('');
  const [orderDetails, setOrderDetails] = useState('');
  const [mapsUrl, setMapsUrl] = useState('');

  // Financial Fields
  const [collectionAmount, setCollectionAmount] = useState<string>('');
  const [deliveryFee, setDeliveryFee] = useState<string>('');

  // Customer Lookup State
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [customerFound, setCustomerFound] = useState<boolean | null>(null);
  const [lookupMessage, setLookupMessage] = useState<string>('');

  // Submission & UI State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // References for fast keyboard navigation
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const orderDetailsRef = useRef<HTMLTextAreaElement>(null);
  const lookupTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Automatic Background Calculation (70% Driver / 30% Office)
  const numericDeliveryFee = parseFloat(deliveryFee) || 0;
  const driverShare = Math.round(numericDeliveryFee * 0.7);
  const officeShare = Math.max(0, numericDeliveryFee - driverShare);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US').format(val || 0);
  };

  // Customer search function
  const searchCustomer = useCallback(async (phoneNumber: string) => {
    const cleanPhone = phoneNumber.trim();
    if (!cleanPhone || cleanPhone.length < 6) {
      setCustomerFound(null);
      setLookupMessage('');
      setCustomerId(null);
      return;
    }

    setIsSearchingCustomer(true);
    setLookupMessage('جاري البحث في سجل الزبائن...');

    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (error) {
        console.warn('Supabase customer lookup error:', error.message);
      }

      if (data) {
        setCustomerId(data.id);
        setCustomerName(data.name || '');
        setDeliveryAddress(data.address || '');
        setBackupPhone(data.backup_phone || '');
        setCustomerFound(true);
        setLookupMessage(`زبون مسجل: ${data.name}`);

        // تعبئة رابط الخريطة تلقائياً من سجل الزبون أو من آخر طلب له
        if (data.maps_url) {
          setMapsUrl(data.maps_url);
        } else {
          // البحث في آخر طلب مسجل لنفس هاتف الزبون يحتوي على رابط خريطة
          const { data: latestOrder } = await supabase
            .from('orders')
            .select('maps_url')
            .eq('customer_phone', cleanPhone)
            .not('maps_url', 'is', null)
            .neq('maps_url', '')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (latestOrder?.maps_url) {
            setMapsUrl(latestOrder.maps_url);
          }
        }
      } else {
        setCustomerId(null);
        setCustomerFound(false);
        setLookupMessage('زبون جديد، سيتم حفظ بياناته تلقائياً');
      }
    } catch (err: any) {
      console.error('Customer search error:', err);
      setCustomerFound(false);
      setLookupMessage('تعذر البحث اللحظي، يمكنك كتابة البيانات يدوياً');
    } finally {
      setIsSearchingCustomer(false);
    }
  }, []);

  // Handle phone change with debounce
  const handlePhoneChange = (val: string) => {
    setPhone(val);

    if (lookupTimeoutRef.current) {
      clearTimeout(lookupTimeoutRef.current);
    }

    if (val.trim().length >= 7) {
      lookupTimeoutRef.current = setTimeout(() => {
        searchCustomer(val);
      }, 500);
    } else {
      setCustomerFound(null);
      setLookupMessage('');
      setCustomerId(null);
    }
  };

  // Reset Form
  const resetForm = () => {
    setPhone('');
    setCustomerName('');
    setDeliveryAddress('');
    setBackupPhone('');
    setOrderDetails('');
    setMapsUrl('');
    setCollectionAmount('');
    setDeliveryFee('');
    setCustomerId(null);
    setCustomerFound(null);
    setLookupMessage('');
    setStatusMessage(null);
    phoneInputRef.current?.focus();
  };

  // Save/Update Customer profile
  const saveOrUpdateCustomer = async () => {
    const cleanPhone = phone.trim();
    if (!cleanPhone) return null;

    try {
      if (customerId) {
        const { error } = await supabase
          .from('customers')
          .update({
            name: customerName.trim(),
            address: deliveryAddress.trim(),
            backup_phone: backupPhone.trim() || null,
            maps_url: mapsUrl.trim() || null,
          })
          .eq('id', customerId);

        if (error) console.error('Error updating customer:', error.message);
        return customerId;
      } else {
        const { data, error } = await supabase
          .from('customers')
          .upsert(
            {
              phone: cleanPhone,
              name: customerName.trim(),
              address: deliveryAddress.trim(),
              backup_phone: backupPhone.trim() || null,
              maps_url: mapsUrl.trim() || null,
            },
            { onConflict: 'phone' }
          )
          .select('id')
          .single();

        if (error) {
          console.error('Error upserting customer:', error.message);
          return null;
        }
        return data?.id || null;
      }
    } catch (err) {
      console.error('Customer save error:', err);
      return null;
    }
  };

  // Form Submit Handler
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setStatusMessage(null);

    // Validation
    if (!phone.trim()) {
      setStatusMessage({ type: 'error', text: 'يرجى إدخال رقم هاتف الزبون الأساسي' });
      phoneInputRef.current?.focus();
      return;
    }
    if (!customerName.trim()) {
      setStatusMessage({ type: 'error', text: 'يرجى إدخال اسم الزبون' });
      return;
    }
    if (!deliveryAddress.trim()) {
      setStatusMessage({ type: 'error', text: 'يرجى تحديد عنوان التوصيل بالتفصيل' });
      return;
    }
    if (!orderDetails.trim()) {
      setStatusMessage({ type: 'error', text: 'يرجى كتابة تفاصيل الطلب والمواد المطلوبة' });
      orderDetailsRef.current?.focus();
      return;
    }
    // Amounts handling: allow any amount without restrictions; default empty to 0
    const parsedCollection = collectionAmount.trim() === '' ? 0 : Number(collectionAmount);
    const parsedDelivery = deliveryFee.trim() === '' ? 0 : Number(deliveryFee);

    if (isNaN(parsedCollection)) {
      setStatusMessage({ type: 'error', text: 'يرجى إدخال قيمة رقمية صحيحة للمبلغ المطلوب تحصيله' });
      return;
    }
    if (isNaN(parsedDelivery)) {
      setStatusMessage({ type: 'error', text: 'يرجى إدخال قيمة رقمية صحيحة لأجرة التوصيل' });
      return;
    }

    setIsSubmitting(true);

    try {
      const savedCustId = await saveOrUpdateCustomer();

      const calculatedDriverShare = Math.round(parsedDelivery * 0.7);
      const calculatedOfficeShare = Math.round(parsedDelivery * 0.3);

      const newOrderPayload = {
        customer_name: customerName.trim(),
        customer_phone: phone.trim(),
        backup_phone: backupPhone.trim() || null,
        delivery_address: deliveryAddress.trim(),
        maps_url: mapsUrl.trim() || null,
        order_details: orderDetails.trim(),
        collection_amount: parsedCollection,
        delivery_fee: parsedDelivery,
        driver_fee: calculatedDriverShare,
        office_fee: calculatedOfficeShare,
        status: 'pending',
        driver_id: null,
      };

      const { data, error } = await supabase
        .from('orders')
        .insert(newOrderPayload)
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        onOrderCreated(data as Order);
        resetForm();
        setStatusMessage({
          type: 'success',
          text: `تم تسجيل الطلب #${data.id} بنجاح وإدراجه في جدول الطلبات!`,
        });
      }
    } catch (err: any) {
      console.error('Error submitting order:', err);
      setStatusMessage({
        type: 'error',
        text: `حدث خطأ أثناء حفظ الطلب: ${err.message || 'يرجى المحاولة مجدداً'}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fast keyboard shortcut: Ctrl+Enter anywhere submits
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div
      onKeyDown={handleKeyDown}
      className="relative space-y-4"
    >
      {/* رأس النموذج الفرعي مع زر تفريغ سريع */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1b2234]">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">
            تلميح: يمكنك الحفظ السريع بالضغط على{' '}
            <kbd className="px-1.5 py-0.5 font-mono text-[11px] bg-[#141926] border border-[#212a3d] rounded text-slate-300">
              Ctrl + Enter
            </kbd>
          </span>
        </div>

        <button
          type="button"
          onClick={resetForm}
          className="self-end sm:self-center flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 px-2.5 py-1 rounded-lg hover:bg-[#141926] border border-transparent hover:border-[#212a3d] transition-all cursor-pointer active:scale-95"
          title="تفريغ الحقول للبدء من جديد"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>تفريغ الحقول</span>
        </button>
      </div>

      {/* رسائل التنبيه والنجاح */}
      {statusMessage && (
        <div
          className={`p-3 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2.5 transition-all shadow-sm animate-fadeIn ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-300'
              : 'bg-rose-950/40 border border-rose-500/30 text-rose-300'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <div className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          ) : (
            <div className="p-1 rounded-lg bg-rose-500/20 text-rose-400 shrink-0 font-bold">
              !
            </div>
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* قسم 1: بيانات الزبون والاتصال */}
        <div className="bg-[#0e131f] border border-[#1b2234] rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#1b2234] pb-3">
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                <User className="w-3.5 h-3.5" />
              </div>
              بيانات الزبون ومعلومات التوصيل
            </span>

            {/* مؤشر حالة الزبون الذكي */}
            {isSearchingCustomer && (
              <span className="text-xs text-indigo-400 flex items-center gap-1.5 font-medium">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                جاري البحث...
              </span>
            )}
            {!isSearchingCustomer && customerFound === true && (
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {lookupMessage}
              </span>
            )}
            {!isSearchingCustomer && customerFound === false && phone.trim().length >= 7 && (
              <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                <UserPlus className="w-3.5 h-3.5" />
                زبون جديد (سيتم الحفظ التلقائي)
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* رقم هاتف الزبون الأساسي */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                رقم هاتف الزبون <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  ref={phoneInputRef}
                  type="tel"
                  dir="ltr"
                  tabIndex={1}
                  required
                  placeholder="07XXXXXXXXX"
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  onBlur={() => searchCustomer(phone)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      searchCustomer(phone);
                    }
                  }}
                  className="w-full bg-[#121724] border border-[#212a3d] hover:border-slate-600 focus:border-blue-500 rounded-lg px-3 py-2 pl-9 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-all font-mono text-left"
                />
                <Phone className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
              </div>
            </div>

            {/* اسم الزبون */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                اسم الزبون <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  tabIndex={2}
                  required
                  placeholder="الاسم الكامل للزبون"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-[#121724] border border-[#212a3d] hover:border-slate-600 focus:border-blue-500 rounded-lg px-3 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-all"
                />
              </div>
            </div>

            {/* الرقم الاحتياطي */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                الرقم الاحتياطي (اختياري)
              </label>
              <div className="relative">
                <input
                  type="tel"
                  dir="ltr"
                  tabIndex={3}
                  placeholder="07XXXXXXXXX"
                  value={backupPhone}
                  onChange={(e) => setBackupPhone(e.target.value)}
                  className="w-full bg-[#121724] border border-[#212a3d] hover:border-slate-600 focus:border-blue-500 rounded-lg px-3 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-all font-mono text-left"
                />
              </div>
            </div>

            {/* رابط الموقع Google Maps */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-300">
                  رابط الخريطة (Google Maps)
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
              <div className="relative">
                <input
                  type="url"
                  dir="ltr"
                  tabIndex={4}
                  placeholder="https://maps.google.com/..."
                  value={mapsUrl}
                  onChange={(e) => setMapsUrl(e.target.value)}
                  className="w-full bg-[#121724] border border-[#212a3d] hover:border-slate-600 focus:border-blue-500 rounded-lg px-3 py-2 pl-9 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-all font-mono text-left truncate"
                />
                <Compass className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
              </div>
            </div>

            {/* عنوان التوصيل بالتفصيل */}
            <div className="md:col-span-2 lg:col-span-4">
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                عنوان التوصيل بالتفصيل <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  tabIndex={5}
                  required
                  placeholder="المدينة، المنطقة، اسم الشارع، أقرب نقطة دالة، رقم الزقاق أو الدار..."
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="w-full bg-[#121724] border border-[#212a3d] hover:border-slate-600 focus:border-blue-500 rounded-lg px-3 py-2 pr-9 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-all"
                />
                <MapPin className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* قسم 2: تفاصيل الطلب */}
        <div className="bg-[#0e131f] border border-[#1b2234] rounded-xl p-4 sm:p-5 shadow-sm space-y-2">
          <label className="block text-xs font-semibold text-slate-200 flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
              <FileText className="w-3.5 h-3.5" />
            </div>
            تفاصيل الطلب وقائمة المواد <span className="text-rose-400">*</span>
          </label>
          <textarea
            ref={orderDetailsRef}
            tabIndex={6}
            required
            rows={3}
            placeholder="اكتب اسم المتجر أو المطعم، تفاصيل المواد والأصناف، وأي ملاحظات خاصة بالتوصيل..."
            value={orderDetails}
            onChange={(e) => setOrderDetails(e.target.value)}
            className="w-full bg-[#121724] border border-[#212a3d] hover:border-slate-600 focus:border-blue-500 rounded-lg p-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-all leading-relaxed"
          />
        </div>

        {/* قسم 3: الحسابات المالية وأجور التوصيل */}
        <div className="bg-[#0e131f] border border-[#1b2234] rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1b2234] pb-3">
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Coins className="w-3.5 h-3.5" />
              </div>
              المبالغ وأجور التوصيل (ل.س)
            </span>

            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 bg-[#121724] px-2.5 py-1 rounded-md border border-[#212a3d]">
              <Lock className="w-3 h-3 text-slate-400" />
              <span>توزيع افتراضي: 70% مندوب / 30% مكتب</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* المبلغ المطلوب تحصيله من الزبون */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                المبلغ المطلوب تحصيله من الزبون
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  tabIndex={7}
                  placeholder="0"
                  value={collectionAmount}
                  onChange={(e) => setCollectionAmount(e.target.value)}
                  className="w-full bg-[#121724] border border-[#212a3d] hover:border-slate-600 focus:border-blue-500 rounded-lg px-3 py-2 pl-12 text-xs sm:text-sm text-white font-mono font-medium placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-all"
                />
                <span className="text-xs font-semibold text-slate-400 absolute left-3.5 top-2.5 pointer-events-none">
                  ل.س
                </span>
              </div>
            </div>

            {/* أجرة التوصيل الكلية */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                أجرة التوصيل الكلية
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  tabIndex={8}
                  placeholder="0"
                  value={deliveryFee}
                  onChange={(e) => setDeliveryFee(e.target.value)}
                  className="w-full bg-[#121724] border border-[#212a3d] hover:border-slate-600 focus:border-blue-500 rounded-lg px-3 py-2 pl-12 text-xs sm:text-sm text-white font-mono font-medium placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-all"
                />
                <span className="text-xs font-semibold text-slate-400 absolute left-3.5 top-2.5 pointer-events-none">
                  ل.س
                </span>
              </div>
            </div>
          </div>

          {/* بطاقة المعاينة اللحظية لتوزيع الأجرة */}
          {numericDeliveryFee > 0 && (
            <div className="mt-2.5 p-3 rounded-lg bg-[#101522] border border-[#1c2436] flex flex-col sm:flex-row items-center justify-between gap-3 animate-fadeIn">
              <div className="flex items-center gap-2">
                <PieChart className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-xs text-slate-300 font-medium">معاينة توزيع الأجرة:</span>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                  <span className="text-slate-400">حصة السائق (70%):</span>
                  <strong className="text-sky-300 font-medium">{formatCurrency(driverShare)} ل.س</strong>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                  <span className="text-slate-400">حصة المكتب (30%):</span>
                  <strong className="text-slate-200 font-medium">{formatCurrency(officeShare)} ل.س</strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* أزرار الحفظ والإرسال */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span>حالة الطلب الابتدائية:</span>
            <span className="font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              بانتظار مندوب
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={resetForm}
              className="w-1/3 sm:w-auto px-4 py-2 rounded-lg border border-[#222a3d] bg-[#131926] hover:bg-[#1a2233] text-slate-300 text-xs sm:text-sm font-medium transition-all cursor-pointer active:scale-95"
            >
              إلغاء
            </button>
            <button
              type="submit"
              tabIndex={9}
              disabled={isSubmitting}
              className="w-2/3 sm:w-auto flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs sm:text-sm font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري تسجيل الطلب...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>تسجيل الطلب</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
