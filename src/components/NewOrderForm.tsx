'use client';

import React, { useState, useRef, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { notifyDriverAssignment } from '@/lib/notificationClient';
import { Customer, CustomerAddress, Order, Profile } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { useDriversPresence } from '@/hooks/useDriversPresence';
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
  History,
  Plus,
  Check,
  Bike,
  Pencil,
  Trash2,
  AlertTriangle,
  X,
  Save,
} from 'lucide-react';

interface NewOrderFormProps {
  onOrderCreated: (order: Order) => void;
  drivers?: Profile[];
  isDriverOnline?: (driverId?: string | null) => boolean;
  formatLastSeen?: (lastSeenAt?: string | null, isOnline?: boolean) => string;
  sortDriversByPresence?: (drivers: Profile[]) => Profile[];
}

export function NewOrderForm({
  onOrderCreated,
  drivers = [],
  isDriverOnline: propIsDriverOnline,
  formatLastSeen: propFormatLastSeen,
  sortDriversByPresence: propSortDriversByPresence,
}: NewOrderFormProps) {
  const { role } = useAuth();
  const isAdmin = role === 'admin';

  // Fallback to hook only if props not provided
  const internalPresence = useDriversPresence(propSortDriversByPresence ? [] : drivers);

  const isDriverOnline = propIsDriverOnline || internalPresence.isDriverOnline;
  const formatLastSeen = propFormatLastSeen || internalPresence.formatLastSeen;
  const sortDriversByPresence = propSortDriversByPresence || internalPresence.sortDriversByPresence;

  const sortedDrivers = useMemo(() => {
    if (!drivers || !Array.isArray(drivers)) return [];
    return sortDriversByPresence ? sortDriversByPresence(drivers) : drivers;
  }, [drivers, sortDriversByPresence]);

  // Form State
  const [phone, setPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [backupPhone, setBackupPhone] = useState('');
  const [orderDetails, setOrderDetails] = useState('');
  const [mapsUrl, setMapsUrl] = useState('');

  // Financial Fields
  // Call Center specifies deliveryFee ONLY.
  // Admin can specify deliveryFee AND itemsPrice AND driverId.
  const [deliveryFee, setDeliveryFee] = useState<string>('');
  const [itemsPrice, setItemsPrice] = useState<string>('');
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');

  // Customer Lookup & Multiple Addresses State
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | 'new'>('new');
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [customerFound, setCustomerFound] = useState<boolean | null>(null);
  const [lookupMessage, setLookupMessage] = useState<string>('');

  // Address Editing & Deletion State
  const [editingAddress, setEditingAddress] = useState<CustomerAddress | null>(null);
  const [editAddressText, setEditAddressText] = useState('');
  const [editAddressTitle, setEditAddressTitle] = useState('');
  const [editAddressMaps, setEditAddressMaps] = useState('');
  const [isUpdatingAddress, setIsUpdatingAddress] = useState(false);
  const [deletingAddressId, setDeletingAddressId] = useState<string | null>(null);
  const [isDeletingAddress, setIsDeletingAddress] = useState(false);

  // Submission & UI State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // References for fast keyboard navigation
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const orderDetailsRef = useRef<HTMLTextAreaElement>(null);
  const lookupTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Automatic Background Calculation
  const numericDeliveryFee = parseFloat(deliveryFee) || 0;
  const numericItemsPrice = parseFloat(itemsPrice) || 0;
  const assignedDriver = selectedDriverId ? drivers.find((d) => d.id === selectedDriverId) : null;
  const activeCommission = assignedDriver?.commission_percentage ?? 70;
  const driverShare = Math.round((numericDeliveryFee * activeCommission) / 100);
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
      setSavedAddresses([]);
      setSelectedAddressId('new');
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
        setBackupPhone(data.backup_phone || '');
        setCustomerFound(true);
        setLookupMessage(`زبون مسجل: ${data.name}`);

        // جلب قائمة العناوين المحفوظة لهذا الزبون من customer_addresses
        const { data: addressesData, error: addrError } = await supabase
          .from('customer_addresses')
          .select('*')
          .eq('customer_id', data.id)
          .order('last_used_at', { ascending: false });

        if (addrError) {
          console.warn('Error fetching customer addresses:', addrError.message);
        }

        let addressList: CustomerAddress[] = addressesData || [];

        // إذا لم توجد عناوين في الجدول الجديد ولكن يوجد عنوان في جدول customers
        if (addressList.length === 0 && data.address && data.address.trim()) {
          addressList = [
            {
              id: 'fallback-profile-addr',
              customer_id: data.id,
              address: data.address.trim(),
              maps_url: data.maps_url || null,
              is_default: true,
              last_used_at: new Date().toISOString(),
            },
          ];
        }

        setSavedAddresses(addressList);

        if (addressList.length > 0) {
          // اختيار العنوان الافتراضي أو الأحدث استخداماً
          const defaultOrLatest = addressList.find((a) => a.is_default) || addressList[0];
          setSelectedAddressId(defaultOrLatest.id);
          setDeliveryAddress(defaultOrLatest.address);
          setMapsUrl(defaultOrLatest.maps_url || '');
        } else {
          setSelectedAddressId('new');
          setDeliveryAddress('');
          setMapsUrl('');
        }
      } else {
        setCustomerId(null);
        setCustomerFound(false);
        setSavedAddresses([]);
        setSelectedAddressId('new');
        setLookupMessage('زبون جديد، سيتم حفظ بياناته تلقائياً');
      }
    } catch (err: any) {
      console.error('Customer search error:', err);
      setCustomerFound(false);
      setSavedAddresses([]);
      setSelectedAddressId('new');
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
      setSavedAddresses([]);
      setSelectedAddressId('new');
    }
  };

  // اختيار عنوان من العناوين السابقة
  const handleSelectAddress = (addr: CustomerAddress) => {
    setSelectedAddressId(addr.id);
    setDeliveryAddress(addr.address);
    setMapsUrl(addr.maps_url || '');
  };

  // اختيار إضافة عنوان جديد
  const handleAddNewAddressOption = () => {
    setSelectedAddressId('new');
    setDeliveryAddress('');
    setMapsUrl('');
  };

  // حذف عنوان من قاعدة البيانات والقائمة
  const handleDeleteAddress = async (addrId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!addrId) return;

    setIsDeletingAddress(true);
    try {
      if (addrId !== 'fallback-profile-addr') {
        const { error } = await supabase
          .from('customer_addresses')
          .delete()
          .eq('id', addrId);

        if (error) {
          console.error('Error deleting address:', error);
          alert('تعذر حذف العنوان: ' + error.message);
          return;
        }
      }

      // تحديث القائمة المحلية
      const updatedList = savedAddresses.filter((a) => a.id !== addrId);
      setSavedAddresses(updatedList);
      setDeletingAddressId(null);

      // في حال كان العنوان المحذوف هو المحدد حالياً
      if (selectedAddressId === addrId) {
        if (updatedList.length > 0) {
          const next = updatedList.find((a) => a.is_default) || updatedList[0];
          setSelectedAddressId(next.id);
          setDeliveryAddress(next.address);
          setMapsUrl(next.maps_url || '');
        } else {
          setSelectedAddressId('new');
          setDeliveryAddress('');
          setMapsUrl('');
        }
      }
    } catch (err: any) {
      console.error('Delete address error:', err);
    } finally {
      setIsDeletingAddress(false);
    }
  };

  // فتح نافذة تعديل العنوان
  const handleOpenEditAddress = (addr: CustomerAddress, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingAddress(addr);
    setEditAddressText(addr.address);
    setEditAddressTitle(addr.title || '');
    setEditAddressMaps(addr.maps_url || '');
  };

  // حفظ التعديلات على العنوان مباشرة
  const handleSaveEditedAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAddress || !editAddressText.trim()) return;

    setIsUpdatingAddress(true);
    const cleanText = editAddressText.trim();
    const cleanTitle = editAddressTitle.trim() || null;
    const cleanMaps = editAddressMaps.trim() || null;

    try {
      let finalId = editingAddress.id;

      if (editingAddress.id !== 'fallback-profile-addr') {
        const { error } = await supabase
          .from('customer_addresses')
          .update({
            address: cleanText,
            title: cleanTitle,
            maps_url: cleanMaps,
          })
          .eq('id', editingAddress.id);

        if (error) throw error;
      } else if (customerId) {
        // تحويل العنوان المؤقت إلى عنوان دائم في customer_addresses
        const { data: newRow, error } = await supabase
          .from('customer_addresses')
          .insert({
            customer_id: customerId,
            address: cleanText,
            title: cleanTitle,
            maps_url: cleanMaps,
            is_default: true,
            last_used_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) throw error;
        if (newRow) {
          finalId = newRow.id;
        }
      }

      // تحديث الحالة في الواجهة فورياً
      setSavedAddresses((prev) =>
        prev.map((a) =>
          a.id === editingAddress.id
            ? { ...a, id: finalId, address: cleanText, title: cleanTitle, maps_url: cleanMaps }
            : a
        )
      );

      // في حال كان هذا العنوان هو المحدد في النموذج
      if (selectedAddressId === editingAddress.id || selectedAddressId === finalId) {
        setSelectedAddressId(finalId);
        setDeliveryAddress(cleanText);
        setMapsUrl(cleanMaps || '');
      }

      setEditingAddress(null);
    } catch (err: any) {
      console.error('Error updating address:', err);
      alert('حدث خطأ أثناء تعديل العنوان: ' + (err.message || ''));
    } finally {
      setIsUpdatingAddress(false);
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
    setDeliveryFee('');
    setItemsPrice('');
    setSelectedDriverId('');
    setCustomerId(null);
    setSavedAddresses([]);
    setSelectedAddressId('new');
    setCustomerFound(null);
    setLookupMessage('');
    setStatusMessage(null);
    phoneInputRef.current?.focus();
  };

  // Save/Update Customer profile & addresses
  const saveOrUpdateCustomer = async () => {
    const cleanPhone = phone.trim();
    if (!cleanPhone) return null;

    try {
      let resolvedCustomerId = customerId;

      if (resolvedCustomerId) {
        const { error } = await supabase
          .from('customers')
          .update({
            name: customerName.trim(),
            address: deliveryAddress.trim(),
            backup_phone: backupPhone.trim() || null,
            maps_url: mapsUrl.trim() || null,
          })
          .eq('id', resolvedCustomerId);

        if (error) console.error('Error updating customer:', error.message);
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
        resolvedCustomerId = data?.id || null;
      }

      // حفظ أو تحديث العنوان في جدول customer_addresses
      const cleanAddress = deliveryAddress.trim();
      const cleanMaps = mapsUrl.trim() || null;

      if (resolvedCustomerId && cleanAddress) {
        if (selectedAddressId && selectedAddressId !== 'new') {
          // الحالة 1: تم تعديل أو استخدام عنوان موجود مسبقاً -> تحديث العنوان نفسه (لا تكرار ولا مربعات جديدة)
          if (selectedAddressId !== 'fallback-profile-addr') {
            await supabase
              .from('customer_addresses')
              .update({
                address: cleanAddress,
                maps_url: cleanMaps,
                last_used_at: new Date().toISOString(),
              })
              .eq('id', selectedAddressId);
          } else {
            // تحويل العنوان المؤقت إلى دائم
            await supabase
              .from('customer_addresses')
              .insert({
                customer_id: resolvedCustomerId,
                address: cleanAddress,
                maps_url: cleanMaps,
                is_default: true,
                last_used_at: new Date().toISOString(),
              });
          }
        } else {
          // الحالة 2: اختار المستخدم عمداً إضافة عنوان جديد (+ إضافة عنوان جديد)
          // نتحقق أولاً هل العنوان موجود بنفس النص تماماً لتجنب أي تكرار
          const existingExact = savedAddresses.find(
            (a) => a.address.trim().toLowerCase() === cleanAddress.toLowerCase()
          );

          if (existingExact && existingExact.id !== 'fallback-profile-addr') {
            await supabase
              .from('customer_addresses')
              .update({
                last_used_at: new Date().toISOString(),
                maps_url: cleanMaps || existingExact.maps_url,
              })
              .eq('id', existingExact.id);
          } else {
            await supabase
              .from('customer_addresses')
              .insert({
                customer_id: resolvedCustomerId,
                address: cleanAddress,
                maps_url: cleanMaps,
                is_default: savedAddresses.length === 0,
                last_used_at: new Date().toISOString(),
              });
          }
        }
      }

      return resolvedCustomerId;
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

    // Amounts handling:
    // Call Center sets delivery fee ONLY (items price is 0).
    // Admin can set delivery fee AND items price AND assign a driver.
    // Driver sets items price upon purchase.
    const parsedDelivery = deliveryFee.trim() !== '' ? Number(deliveryFee) : 0;
    const parsedItems = isAdmin && itemsPrice.trim() !== '' ? Number(itemsPrice) : 0;

    if (isNaN(parsedDelivery)) {
      setStatusMessage({ type: 'error', text: 'يرجى إدخال قيمة رقمية صحيحة لأجرة التوصيل' });
      return;
    }
    if (isAdmin && isNaN(parsedItems)) {
      setStatusMessage({ type: 'error', text: 'يرجى إدخال قيمة رقمية صحيحة لسعر الأغراض' });
      return;
    }

    setIsSubmitting(true);

    try {
      const savedCustId = await saveOrUpdateCustomer();

      const assignedDriver = selectedDriverId ? drivers.find((d) => d.id === selectedDriverId) : null;
      const driverRate = assignedDriver?.commission_percentage ?? 70;
      const calculatedDriverShare = Math.round((parsedDelivery * driverRate) / 100);
      const calculatedOfficeShare = Math.max(0, parsedDelivery - calculatedDriverShare);
      const totalCollection = parsedDelivery + parsedItems;

      const newOrderPayload = {
        customer_name: customerName.trim(),
        customer_phone: phone.trim(),
        backup_phone: backupPhone.trim() || null,
        delivery_address: deliveryAddress.trim(),
        maps_url: mapsUrl.trim() || null,
        order_details: orderDetails.trim(),
        delivery_fee: parsedDelivery,
        items_price: parsedItems,
        collection_amount: totalCollection,
        driver_fee: assignedDriver ? calculatedDriverShare : 0,
        office_fee: assignedDriver ? calculatedOfficeShare : 0,
        status: assignedDriver ? 'assigned' : 'pending',
        driver_id: assignedDriver ? assignedDriver.id : null,
        assigned_at: assignedDriver ? new Date().toISOString() : null,
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
        if (assignedDriver && data.id) {
          notifyDriverAssignment(data.id, assignedDriver.id);
        }
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">
            تلميح: يمكنك الحفظ السريع بالضغط على{' '}
            <kbd className="px-1.5 py-0.5 font-mono text-[11px] bg-slate-100 border border-slate-300 rounded text-slate-700 shadow-2xs font-semibold">
              Ctrl + Enter
            </kbd>
          </span>
        </div>

        <button
          type="button"
          onClick={resetForm}
          className="self-end sm:self-center flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 px-2.5 py-1 rounded-lg hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all cursor-pointer active:scale-95"
          title="تفريغ الحقول للبدء من جديد"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>تفريغ الحقول</span>
        </button>
      </div>

      {/* رسائل التنبيه والنجاح */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2.5 transition-all shadow-xs animate-fadeIn ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <div className="p-1 rounded-lg bg-emerald-100 text-emerald-600 shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          ) : (
            <div className="p-1 rounded-lg bg-rose-100 text-rose-600 shrink-0 font-bold">
              !
            </div>
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* قسم 1: بيانات الزبون والاتصال */}
        <div className="bg-white rounded-2xl border-2 border-[#cdbba2] p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b-2 border-[#dfceba] pb-3">
            <span className="text-xs font-bold text-zinc-900 flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-orange-100/90 text-orange-700 border border-orange-200/80">
                <User className="w-3.5 h-3.5" />
              </div>
              بيانات الزبون ومعلومات التوصيل
            </span>

            {/* مؤشر حالة الزبون الذكي */}
            {isSearchingCustomer && (
              <span className="text-xs text-indigo-600 flex items-center gap-1.5 font-medium">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                جاري البحث...
              </span>
            )}
            {!isSearchingCustomer && customerFound === true && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                {lookupMessage}
              </span>
            )}
            {!isSearchingCustomer && customerFound === false && phone.trim().length >= 7 && (
              <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-2xs">
                <UserPlus className="w-3.5 h-3.5 text-amber-600" />
                زبون جديد (سيتم الحفظ التلقائي)
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* رقم هاتف الزبون الأساسي */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                رقم هاتف الزبون <span className="text-rose-500">*</span>
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
                  className="w-full bg-slate-50 border border-slate-300 hover:border-slate-400 focus:bg-white focus:border-orange-500 rounded-xl px-3 py-2 pl-9 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-4 focus:ring-orange-500/10 transition-all font-mono text-left font-semibold"
                />
                <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              </div>
            </div>

            {/* اسم الزبون */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                اسم الزبون <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  tabIndex={2}
                  required
                  placeholder="الاسم الكامل للزبون"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 hover:border-slate-400 focus:bg-white focus:border-orange-500 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-4 focus:ring-orange-500/10 transition-all font-semibold"
                />
              </div>
            </div>

            {/* الرقم الاحتياطي */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
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
                  className="w-full bg-slate-50 border border-slate-300 hover:border-slate-400 focus:bg-white focus:border-orange-500 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-4 focus:ring-orange-500/10 transition-all font-mono text-left"
                />
              </div>
            </div>

            {/* رابط الموقع Google Maps */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  رابط الخريطة (Google Maps)
                </label>
                {mapsUrl && (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-orange-600 hover:underline flex items-center gap-1 font-medium"
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
                  className="w-full bg-slate-50 border border-slate-300 hover:border-slate-400 focus:bg-white focus:border-orange-500 rounded-xl px-3 py-2 pl-9 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-4 focus:ring-orange-500/10 transition-all font-mono text-left truncate"
                />
                <Compass className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              </div>
            </div>

            {/* قائمة العناوين السابقة المحفوظة للزبون */}
            {savedAddresses.length > 0 && (
              <div className="md:col-span-2 lg:col-span-4 bg-slate-50/80 border border-slate-200 rounded-xl p-3 sm:p-3.5 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-200 pb-2">
                  <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-orange-600" />
                    <span>العناوين المحفوظة لهذا الزبون ({savedAddresses.length})</span>
                  </span>
                  <span className="text-[11px] text-slate-500">
                    اختر عنواناً لتعديله أو استخدامه، أو انقر على القلم لتعديل تفاصيله أو سلة المهملات لحذفه
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {savedAddresses.map((addr, idx) => {
                    const isSelected = selectedAddressId === addr.id;
                    const isDeletingThis = deletingAddressId === addr.id;
                    return (
                      <div
                        key={addr.id || idx}
                        onClick={() => handleSelectAddress(addr)}
                        className={`text-right p-2.5 rounded-xl border text-xs transition-all flex flex-col justify-between gap-2 relative cursor-pointer group ${
                          isSelected
                            ? 'bg-orange-50/90 border-orange-500 text-orange-950 shadow-xs ring-1 ring-orange-500/30'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 w-full">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div
                              className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                isSelected
                                  ? 'border-orange-500 bg-orange-500 text-white'
                                  : 'border-slate-300 bg-white'
                              }`}
                            >
                              {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            </div>
                            <span className="font-semibold text-xs text-slate-900 truncate">
                              {addr.title || (idx === 0 ? 'العنوان الرئيسي' : `عنوان ${idx + 1}`)}
                            </span>
                            {addr.is_default && (
                              <span className="text-[9px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded border border-orange-200 font-medium shrink-0">
                                افتراضي
                              </span>
                            )}
                          </div>

                          {/* إجراءات العنوان: موقع، تعديل، حذف */}
                          <div
                            className="flex items-center gap-1 shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {addr.maps_url && (
                              <a
                                href={addr.maps_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="عرض الموقع على الخريطة"
                                className="text-[10px] text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200 flex items-center gap-0.5 transition-colors"
                              >
                                <Compass className="w-2.5 h-2.5" />
                                موقع
                              </a>
                            )}

                            {/* زر تعديل العنوان */}
                            <button
                              type="button"
                              title="تعديل هذا العنوان"
                              onClick={(e) => handleOpenEditAddress(addr, e)}
                              className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>

                            {/* زر حذف العنوان */}
                            <button
                              type="button"
                              title="حذف هذا العنوان"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingAddressId(addr.id);
                              }}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed pr-5">
                          {addr.address}
                        </p>

                        {/* تأكيد الحذف السريع داخل الكرت */}
                        {isDeletingThis && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute inset-0 bg-white/95 backdrop-blur-2xs rounded-xl border border-rose-300 p-2 flex flex-col justify-between z-10 animate-in fade-in zoom-in-95 duration-150"
                          >
                            <div className="text-[11px] text-rose-700 font-medium flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                              <span>حذف هذا العنوان من سجل الزبون؟</span>
                            </div>
                            <div className="flex items-center justify-end gap-1.5 pt-1">
                              <button
                                type="button"
                                onClick={() => setDeletingAddressId(null)}
                                className="px-2 py-0.5 text-[10px] rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium cursor-pointer"
                              >
                                إلغاء
                              </button>
                              <button
                                type="button"
                                disabled={isDeletingAddress}
                                onClick={(e) => handleDeleteAddress(addr.id, e)}
                                className="px-2.5 py-0.5 text-[10px] rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-medium flex items-center gap-1 shadow-2xs cursor-pointer"
                              >
                                {isDeletingAddress ? (
                                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                ) : (
                                  <Trash2 className="w-2.5 h-2.5" />
                                )}
                                نعم، احذف
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* زر إضافة عنوان جديد */}
                  <button
                    type="button"
                    onClick={handleAddNewAddressOption}
                    className={`text-right p-2.5 rounded-xl border text-xs transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[58px] ${
                      selectedAddressId === 'new'
                        ? 'bg-amber-50 border-amber-400 text-amber-800 shadow-xs ring-1 ring-amber-400/40 font-semibold'
                        : 'bg-white border-dashed border-slate-300 text-slate-600 hover:text-slate-900 hover:border-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    <Plus className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      {selectedAddressId === 'new' ? 'إدخال عنوان جديد إضافي (محدد)' : '+ إضافة عنوان جديد'}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* عنوان التوصيل بالتفصيل */}
            <div className="md:col-span-2 lg:col-span-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <span>عنوان التوصيل بالتفصيل</span>
                  <span className="text-rose-500">*</span>
                </label>

                {savedAddresses.length > 0 && (
                  selectedAddressId === 'new' ? (
                    <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md font-medium flex items-center gap-1 self-start sm:self-auto">
                      <Plus className="w-2.5 h-2.5" />
                      سيتم حفظ هذا كعنوان جديد إضافي في سجل الزبون
                    </span>
                  ) : (
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <span className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md font-medium flex items-center gap-1">
                        <Pencil className="w-2.5 h-2.5 text-blue-600" />
                        تعديل العنوان المحدد (سيتم تحديثه نفسه في سجل الزبون)
                      </span>
                      <button
                        type="button"
                        onClick={handleAddNewAddressOption}
                        className="text-[10px] text-amber-700 hover:text-amber-800 underline cursor-pointer font-medium"
                      >
                        حفظ كعنوان جديد بدلاً من تعديله
                      </button>
                    </div>
                  )
                )}
              </div>
              <div className="relative">
                <input
                  type="text"
                  tabIndex={5}
                  required
                  placeholder="المدينة، المنطقة، اسم الشارع، أقرب نقطة دالة، رقم الزقاق أو الدار..."
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 hover:border-slate-400 focus:bg-white focus:border-orange-500 rounded-xl px-3 py-2 pr-9 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-4 focus:ring-orange-500/10 transition-all"
                />
                <MapPin className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* قسم 2: تفاصيل الطلب */}
        <div className="bg-white rounded-2xl border-2 border-[#cdbba2] p-4 sm:p-5 shadow-xs space-y-2">
          <label className="block text-xs font-bold text-zinc-900 flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-orange-100/90 text-orange-700 border border-orange-200/80">
              <FileText className="w-3.5 h-3.5" />
            </div>
            تفاصيل الطلب وقائمة المواد <span className="text-rose-500">*</span>
          </label>
          <textarea
            ref={orderDetailsRef}
            tabIndex={6}
            required
            rows={3}
            placeholder="اكتب اسم المتجر أو المطعم، تفاصيل المواد والأصناف، وأي ملاحظات خاصة بالتوصيل..."
            value={orderDetails}
            onChange={(e) => setOrderDetails(e.target.value)}
            className="w-full bg-[#fbf9f5] border-2 border-[#d5c3aa] hover:border-orange-400 focus:bg-white focus:border-orange-500 rounded-xl p-3 text-xs sm:text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-hidden focus:ring-4 focus:ring-orange-500/10 transition-all leading-relaxed"
          />
        </div>

        {/* قسم 3: الحسابات وأجرة التوصيل (الكول سنتر يحدد أجرة التوصيل فقط، والمدير يحدد كل شيء) */}
        <div className="bg-white rounded-2xl border-2 border-[#cdbba2] p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-[#dfceba] pb-3">
            <span className="text-xs font-bold text-zinc-800 flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-100/90 text-emerald-700 border border-emerald-200/80">
                <Coins className="w-3.5 h-3.5" />
              </div>
              {isAdmin ? 'الحسابات والمبالغ وإسناد المندوب (صلاحية الإدارة)' : 'أجرة التوصيل وإسناد المندوب للطلب (الكول سنتر)'}
            </span>

            <div className="flex items-center gap-1.5 text-[11px] text-zinc-600 bg-orange-50/80 px-2.5 py-1 rounded-md border border-orange-200/70">
              <Lock className="w-3 h-3 text-orange-500" />
              {isAdmin ? (
                <span>المدير يحدد كل شيء (أجرة التوصيل، سعر الأغراض، إسناد المندوب)</span>
              ) : (
                <span>الكول سنتر يحدد أجرة التوصيل ويمكنه إسناد مندوب • المندوب يسجل سعر الأغراض</span>
              )}
            </div>
          </div>

          {!isAdmin ? (
            /* واجهة الكول سنتر: يحدد أجرة التوصيل ويسند المندوب (اختياري) */
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                {/* 1. حقل أجرة التوصيل */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                    <span>
                      أجرة التوصيل للطلب (ل.س) <span className="text-rose-500">*</span>
                    </span>
                    <span className="text-[10px] text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded font-bold">
                      مطلوب
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      tabIndex={7}
                      required
                      placeholder="0"
                      value={deliveryFee}
                      onChange={(e) => setDeliveryFee(e.target.value)}
                      className="w-full bg-slate-50 border-2 border-emerald-300 hover:border-emerald-400 focus:bg-white focus:border-emerald-500 rounded-xl px-3 py-2.5 pl-12 text-sm text-slate-900 font-mono font-bold placeholder:text-slate-400 focus:outline-hidden focus:ring-4 focus:ring-emerald-500/10 transition-all shadow-2xs"
                    />
                    <span className="text-xs font-bold text-slate-500 absolute left-3.5 top-3 pointer-events-none">
                      ل.س
                    </span>
                  </div>
                </div>

                {/* 2. إسناد المندوب */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span>إسناد المندوب</span>
                      {selectedDriverId && (
                        isDriverOnline(selectedDriverId) ? (
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-bold border border-emerald-200 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            متصل الآن
                          </span>
                        ) : (
                          <span className="text-[9px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded font-mono">
                            {formatLastSeen(
                              drivers.find((d) => d.id === selectedDriverId)?.last_seen_at,
                              false
                            ) || 'غير متصل'}
                          </span>
                        )
                      )}
                    </label>
                    <span className="text-[10px] text-blue-700 bg-blue-100 px-1.5 py-0.2 rounded font-bold">اختياري</span>
                  </div>
                  <select
                    value={selectedDriverId}
                    onChange={(e) => setSelectedDriverId(e.target.value)}
                    className="w-full bg-white border-2 border-blue-300 hover:border-blue-400 focus:border-blue-500 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-semibold focus:outline-hidden cursor-pointer shadow-2xs"
                  >
                    <option value="">-- بدون إسناد (بانتظار الإسناد) --</option>
                    {sortedDrivers.map((d) => {
                      const isOnline = isDriverOnline(d.id);
                      const lastSeen = formatLastSeen(d.last_seen_at, isOnline);
                      return (
                        <option key={d.id} value={d.id}>
                          {isOnline ? '🟢' : '⚪'} {d.name} {isOnline ? '(متصل)' : `(${lastSeen})`} - عمولة {d.commission_percentage ?? 70}%
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* بطاقة توضيحية وحسابات للكول سنتر */}
              <div className="p-3.5 rounded-xl bg-orange-50/80 border border-orange-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-orange-950 shadow-2xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold">أجرة التوصيل المحددة:</span>
                  <strong className="text-base font-black font-mono text-emerald-700">
                    {formatCurrency(numericDeliveryFee)} ل.س
                  </strong>
                  <span className="text-[11px] text-slate-500">(يسجل المندوب ثمن المواد فور الشراء)</span>
                </div>

                {numericDeliveryFee > 0 && assignedDriver && (
                  <div className="flex items-center gap-3 text-xs font-mono">
                    <span className="text-slate-600">
                      سائق ({activeCommission}%):{' '}
                      <strong className="text-slate-900 font-bold">{formatCurrency(driverShare)} ل.س</strong>
                    </span>
                    <span className="text-orange-700">
                      مكتب ({100 - activeCommission}%):{' '}
                      <strong className="text-orange-800 font-bold">{formatCurrency(officeShare)} ل.س</strong>
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* واجهة المدير: يحدد كل شيء (أجرة التوصيل، سعر الأغراض، إسناد المندوب) */
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {/* 1. أجرة التوصيل */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                    <span>أجرة التوصيل (ل.س)</span>
                    <span className="text-[10px] text-orange-700 bg-orange-100 px-1.5 py-0.2 rounded font-bold">صلاحية المدير</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      tabIndex={7}
                      placeholder="0"
                      value={deliveryFee}
                      onChange={(e) => setDeliveryFee(e.target.value)}
                      className="w-full bg-white border border-slate-300 hover:border-slate-400 focus:border-orange-500 rounded-xl px-3 py-2 pl-12 text-xs sm:text-sm text-slate-900 font-mono font-bold focus:outline-hidden"
                    />
                    <span className="text-xs font-semibold text-slate-500 absolute left-3.5 top-2.5 pointer-events-none">
                      ل.س
                    </span>
                  </div>
                </div>

                {/* 2. سعر الأغراض (المشتريات) */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                    <span>سعر الأغراض (ل.س)</span>
                    <span className="text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded font-bold">اختياري</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      tabIndex={8}
                      placeholder="0 (أو يسجله المندوب)"
                      value={itemsPrice}
                      onChange={(e) => setItemsPrice(e.target.value)}
                      className="w-full bg-white border border-slate-300 hover:border-slate-400 focus:border-orange-500 rounded-xl px-3 py-2 pl-12 text-xs sm:text-sm text-slate-900 font-mono font-bold focus:outline-hidden"
                    />
                    <span className="text-xs font-semibold text-slate-500 absolute left-3.5 top-2.5 pointer-events-none">
                      ل.س
                    </span>
                  </div>
                </div>

                {/* 3. إسناد المندوب مباشرة */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span>إسناد المندوب</span>
                      {selectedDriverId && (
                        isDriverOnline(selectedDriverId) ? (
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-bold border border-emerald-200 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            متصل الآن
                          </span>
                        ) : (
                          <span className="text-[9px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded font-mono">
                            {formatLastSeen(
                              drivers.find((d) => d.id === selectedDriverId)?.last_seen_at,
                              false
                            ) || 'غير متصل'}
                          </span>
                        )
                      )}
                    </label>
                    <span className="text-[10px] text-blue-700 bg-blue-100 px-1.5 py-0.2 rounded font-bold">اختياري</span>
                  </div>
                  <select
                    value={selectedDriverId}
                    onChange={(e) => setSelectedDriverId(e.target.value)}
                    className="w-full bg-white border border-slate-300 hover:border-slate-400 focus:border-orange-500 rounded-xl px-3 py-2 text-xs text-slate-900 font-semibold focus:outline-hidden cursor-pointer"
                  >
                    <option value="">-- بدون إسناد (بانتظار الإسناد) --</option>
                    {sortedDrivers.map((d) => {
                      const isOnline = isDriverOnline(d.id);
                      const lastSeen = formatLastSeen(d.last_seen_at, isOnline);
                      return (
                        <option key={d.id} value={d.id}>
                          {isOnline ? '🟢' : '⚪'} {d.name} {isOnline ? '(متصل)' : `(${lastSeen})`} - عمولة {d.commission_percentage ?? 70}%
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* بطاقة إجمالي التحصيل وتوزيع الأجرة */}
              <div className="p-3.5 rounded-xl bg-orange-50/70 border border-orange-200/90 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-800">إجمالي التحصيل المحسوب:</span>
                  <strong className="text-base font-black font-mono text-emerald-700">
                    {formatCurrency(numericDeliveryFee + numericItemsPrice)} ل.س
                  </strong>
                  <span className="text-[11px] text-slate-500">(أجرة: {formatCurrency(numericDeliveryFee)} + مشتريات: {formatCurrency(numericItemsPrice)})</span>
                </div>

                {numericDeliveryFee > 0 && (
                  <div className="flex items-center gap-3 text-xs font-mono">
                    <span className="text-slate-600">
                      سائق ({activeCommission}%):{' '}
                      <strong className="text-slate-900 font-bold">{formatCurrency(driverShare)} ل.س</strong>
                    </span>
                    <span className="text-orange-700">
                      مكتب ({100 - activeCommission}%):{' '}
                      <strong className="text-orange-800 font-bold">{formatCurrency(officeShare)} ل.س</strong>
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* أزرار الحفظ والإرسال */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span>حالة الطلب الابتدائية:</span>
            <span className={`font-bold px-2.5 py-0.5 rounded-full border ${
              selectedDriverId
                ? 'text-blue-800 bg-blue-50 border-blue-200'
                : 'text-amber-800 bg-amber-50 border-amber-200'
            }`}>
              {selectedDriverId ? 'تم الإسناد للمندوب' : 'بانتظار مندوب'}
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={resetForm}
              className="w-1/3 sm:w-auto px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-medium transition-all cursor-pointer active:scale-95 shadow-2xs"
            >
              إلغاء
            </button>
            <button
              type="submit"
              tabIndex={9}
              disabled={isSubmitting}
              className="w-2/3 sm:w-auto flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl btn-sinjab-primary text-xs sm:text-sm font-bold shadow-md shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer active:scale-95"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري تسجيل الطلب...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>تثبيت وإرسال الطلب فوراً</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* نافذة تعديل عنوان الزبون */}
      {editingAddress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-orange-50 to-amber-50">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-orange-100 text-orange-700">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">تعديل عنوان الزبون</h3>
                  <p className="text-[11px] text-slate-500">
                    الزبون: {customerName || phone}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingAddress(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedAddress} className="p-4 sm:p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  تسمية العنوان (اختياري)
                </label>
                <input
                  type="text"
                  placeholder="مثال: المنزل، المكتب، المعمل، بيت الأهل..."
                  value={editAddressTitle}
                  onChange={(e) => setEditAddressTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-orange-500 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-4 focus:ring-orange-500/10 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  نص العنوان بالتفصيل <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="المدينة، الحي، الشارع، البناء، الطابق..."
                  value={editAddressText}
                  onChange={(e) => setEditAddressText(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-orange-500 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-4 focus:ring-orange-500/10 transition-all leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  رابط موقع الخريطة (Google Maps - اختياري)
                </label>
                <input
                  type="url"
                  placeholder="https://maps.app.goo.gl/..."
                  value={editAddressMaps}
                  onChange={(e) => setEditAddressMaps(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-orange-500 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-4 focus:ring-orange-500/10 transition-all dir-ltr text-left font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingAddress(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-all cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingAddress}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-xs disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isUpdatingAddress ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>حفظ التعديلات</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
