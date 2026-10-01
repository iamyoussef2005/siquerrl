'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { notifyDriverAssignment } from '@/lib/notificationClient';
import { useAuth } from '@/contexts/AuthContext';
import { CustomerAddress, Order, Profile, OrderStatus } from '@/types/database';
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
  User,
  Phone,
  Lock,
  Pencil,
  Trash2,
  AlertTriangle,
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
  const { role } = useAuth();
  const isAdmin = role === 'admin';

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US').format(val || 0);
  };

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [backupPhone, setBackupPhone] = useState('');
  const [address, setAddress] = useState('');
  const [orderDetails, setOrderDetails] = useState('');
  const [mapsUrl, setMapsUrl] = useState('');
  const [collectionAmount, setCollectionAmount] = useState<string>('');
  const [itemsPrice, setItemsPrice] = useState<string>('');
  const [deliveryFee, setDeliveryFee] = useState<string>('');
  const [driverFee, setDriverFee] = useState<string>('');
  const [officeFee, setOfficeFee] = useState<string>('');
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus>('pending');
  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  // Address edit/delete state
  const [editingAddress, setEditingAddress] = useState<CustomerAddress | null>(null);
  const [editAddressText, setEditAddressText] = useState('');
  const [editAddressTitle, setEditAddressTitle] = useState('');
  const [editAddressMaps, setEditAddressMaps] = useState('');
  const [isUpdatingAddress, setIsUpdatingAddress] = useState(false);
  const [deletingAddressId, setDeletingAddressId] = useState<string | null>(null);
  const [isDeletingAddress, setIsDeletingAddress] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Populate form fields whenever order changes
  useEffect(() => {
    if (order) {
      setCustomerName(order.customer_name || '');
      setCustomerPhone(order.customer_phone || '');
      setBackupPhone(order.backup_phone || '');
      setAddress(order.delivery_address || '');
      setOrderDetails(order.order_details || '');
      setMapsUrl(order.maps_url || '');
      setItemsPrice(String(order.items_price ?? '0'));
      setCollectionAmount(String(order.collection_amount ?? ''));
      setDeliveryFee(String(order.delivery_fee ?? ''));
      setDriverFee(String(order.driver_fee ?? ''));
      setOfficeFee(String(order.office_fee ?? ''));
      setSelectedDriverId(order.driver_id || '');
      setSelectedStatus(order.status || 'pending');
      setSelectedAddressId(null);
      setEditingAddress(null);
      setDeletingAddressId(null);
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

  // حذف عنوان من قاعدة البيانات
  const handleDeleteAddress = async (addrId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!addrId) return;

    setIsDeletingAddress(true);
    try {
      const { error } = await supabase
        .from('customer_addresses')
        .delete()
        .eq('id', addrId);

      if (error) {
        console.error('Error deleting address:', error);
        alert('تعذر حذف العنوان: ' + error.message);
        return;
      }

      setSavedAddresses((prev) => prev.filter((a) => a.id !== addrId));
      setDeletingAddressId(null);
      if (selectedAddressId === addrId) {
        setSelectedAddressId(null);
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
      const { error } = await supabase
        .from('customer_addresses')
        .update({
          address: cleanText,
          title: cleanTitle,
          maps_url: cleanMaps,
        })
        .eq('id', editingAddress.id);

      if (error) throw error;

      setSavedAddresses((prev) =>
        prev.map((a) =>
          a.id === editingAddress.id
            ? { ...a, address: cleanText, title: cleanTitle, maps_url: cleanMaps }
            : a
        )
      );

      if (
        selectedAddressId === editingAddress.id ||
        address.trim().toLowerCase() === editingAddress.address.trim().toLowerCase()
      ) {
        setAddress(cleanText);
        setMapsUrl(cleanMaps || '');
        setSelectedAddressId(editingAddress.id);
      }

      setEditingAddress(null);
    } catch (err: any) {
      console.error('Error updating address:', err);
      alert('حدث خطأ أثناء تعديل العنوان: ' + (err.message || ''));
    } finally {
      setIsUpdatingAddress(false);
    }
  };

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
    const cleanCustomerName = customerName.trim();
    const cleanCustomerPhone = customerPhone.trim();
    const cleanBackupPhone = backupPhone.trim() || null;

    const parsedDelivery = parseFloat(deliveryFee) || 0;
    const parsedItems = isAdmin ? (parseFloat(itemsPrice) || 0) : (Number(order.items_price) || 0);
    const assignedDriverId = isAdmin ? (selectedDriverId || null) : order.driver_id;
    const assignedDriver = drivers?.find((d) => d.id === assignedDriverId);
    const rate = assignedDriver?.commission_percentage ?? 70;
    const calculatedDriverShare = Math.round((parsedDelivery * rate) / 100);
    const calculatedOfficeShare = Math.max(0, parsedDelivery - calculatedDriverShare);
    const totalCollection = parsedItems + parsedDelivery;

    // Call Center can edit delivery_fee (and customer details/address/order_details).
    // Admin can edit everything: delivery_fee, items_price, driver_id, status.
    const updatedPayload: Partial<Order> = {
      customer_name: cleanCustomerName,
      customer_phone: cleanCustomerPhone,
      backup_phone: cleanBackupPhone,
      delivery_address: cleanAddress,
      order_details: orderDetails.trim(),
      maps_url: cleanMaps,
      delivery_fee: parsedDelivery,
      collection_amount: totalCollection,
      driver_fee: assignedDriver ? calculatedDriverShare : 0,
      office_fee: assignedDriver ? calculatedOfficeShare : 0,
      ...(isAdmin
        ? {
            items_price: parsedItems,
            driver_id: assignedDriverId,
            status: selectedStatus,
            ...(assignedDriverId !== order.driver_id
              ? { assigned_at: assignedDriverId ? new Date().toISOString() : null }
              : {}),
          }
        : {}),
    };

    try {
      const { data, error } = await supabase
        .from('orders')
        .update(updatedPayload)
        .eq('id', order.id)
        .select()
        .single();

      if (error) throw error;

      // حفظ أو تحديث العنوان في سجل الزبون دون تكرار
      if (order.customer_id && cleanAddress) {
        if (selectedAddressId) {
          await supabase
            .from('customer_addresses')
            .update({
              address: cleanAddress,
              maps_url: cleanMaps,
              last_used_at: new Date().toISOString(),
            })
            .eq('id', selectedAddressId);
        } else {
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
          }
        }
      }

      // Notify driver if assigned/changed by admin
      if (isAdmin && assignedDriverId && order.id && assignedDriverId !== order.driver_id) {
        notifyDriverAssignment(order.id, assignedDriverId);
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
            <div className="p-2 rounded-xl bg-orange-50 border border-orange-100 text-orange-600 shadow-2xs">
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

          {/* بيانات الزبون والاتصال */}
          <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3">
            <span className="text-xs font-semibold text-slate-800 flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-orange-50 text-orange-600 border border-orange-100">
                <User className="w-3.5 h-3.5" />
              </div>
              بيانات الزبون والاتصال
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  اسم الزبون
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-white border border-slate-300 hover:border-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 rounded-xl p-2 text-xs sm:text-sm text-slate-900 focus:outline-hidden shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  رقم الهاتف الأساسي
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    dir="ltr"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full bg-white border border-slate-300 hover:border-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 rounded-xl p-2 pl-8 text-xs sm:text-sm text-slate-900 font-mono focus:outline-hidden shadow-2xs text-left"
                  />
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  رقم هاتف احتياطي (اختياري)
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    dir="ltr"
                    value={backupPhone}
                    onChange={(e) => setBackupPhone(e.target.value)}
                    placeholder="اختياري"
                    className="w-full bg-white border border-slate-300 hover:border-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 rounded-xl p-2 pl-8 text-xs sm:text-sm text-slate-900 font-mono focus:outline-hidden shadow-2xs text-left"
                  />
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* العنوان ورابط الخريطة */}
          <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3">
            {/* العناوين السابقة المحفوظة للزبون */}
            {savedAddresses.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 pb-1.5">
                  <span className="text-[11px] font-semibold text-slate-800 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-orange-600" />
                    <span>عناوين أخرى محفوظة لنفس الزبون ({savedAddresses.length}):</span>
                  </span>
                  <span className="text-[10px] text-slate-500">
                    انقر لتبديل العنوان، أو عدّل أو احذف العناوين غير المرغوبة
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {savedAddresses.map((addr, idx) => {
                    const isCurrent =
                      selectedAddressId === addr.id ||
                      address.trim().toLowerCase() === addr.address.trim().toLowerCase();
                    const isDeletingThis = deletingAddressId === addr.id;
                    return (
                      <div
                        key={addr.id || idx}
                        onClick={() => {
                          setSelectedAddressId(addr.id);
                          setAddress(addr.address);
                          if (addr.maps_url) setMapsUrl(addr.maps_url);
                        }}
                        className={`text-right p-2.5 rounded-xl border text-xs transition-all flex flex-col justify-between gap-1.5 cursor-pointer relative group ${
                          isCurrent
                            ? 'bg-orange-50/90 border-orange-500 text-orange-950 font-semibold shadow-2xs ring-1 ring-orange-500/20'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 w-full">
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            {isCurrent && <Check className="w-3 h-3 text-orange-600 shrink-0" />}
                            <span className="truncate font-semibold text-[11px] text-slate-900">
                              {addr.title || (idx === 0 ? 'العنوان الرئيسي' : `عنوان ${idx + 1}`)}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                            {addr.maps_url && (
                              <a
                                href={addr.maps_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[9px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 hover:bg-emerald-100 flex items-center gap-0.5"
                              >
                                <Compass className="w-2.5 h-2.5" />
                                موقع
                              </a>
                            )}
                            <button
                              type="button"
                              title="تعديل هذا العنوان"
                              onClick={(e) => handleOpenEditAddress(addr, e)}
                              className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
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

                        <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
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
                              <span>حذف هذا العنوان نهائياً؟</span>
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
                className="w-full bg-white border border-slate-300 hover:border-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 rounded-xl p-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden transition-all shadow-2xs"
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
                    className="text-[11px] text-orange-600 hover:underline flex items-center gap-1 font-medium"
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
                className="w-full bg-white border border-slate-300 hover:border-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 rounded-xl p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden font-mono text-left transition-all shadow-2xs"
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
              className="w-full bg-white border border-slate-300 hover:border-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 rounded-xl p-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden leading-relaxed transition-all shadow-2xs"
            />
          </div>

          {/* الحقول المالية: الكول سنتر يحدد ويعدل أجرة التوصيل فقط، والمدير يحدد ويعدل كل شيء */}
          {!isAdmin ? (
            <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <span className="text-xs font-semibold text-slate-800 flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                    <DollarSign className="w-3.5 h-3.5" />
                  </div>
                  أجرة التوصيل (صلاحية الكول سنتر)
                </span>
                <span className="text-[11px] text-zinc-500">
                  الكول سنتر يحدد أجرة التوصيل فقط • المندوب يسجل سعر الأغراض
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* أجرة التوصيل (قابلة للتعديل للكول سنتر) */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-900 mb-1 flex items-center justify-between">
                    <span>أجرة التوصيل (ل.س)</span>
                    <span className="text-[9px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded font-bold">قابل للتعديل</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      value={deliveryFee}
                      onChange={(e) => setDeliveryFee(e.target.value)}
                      className="w-full bg-white border-2 border-emerald-400 focus:border-emerald-500 rounded-xl p-2 pl-9 text-xs text-slate-900 font-mono font-bold focus:outline-hidden shadow-2xs"
                    />
                    <span className="text-[10px] text-slate-500 absolute left-2.5 top-2.5 pointer-events-none">ل.س</span>
                  </div>
                </div>

                {/* سعر الأغراض (عرض فقط للكول سنتر) */}
                <div>
                  <label className="block text-[11px] font-bold text-amber-900 mb-1 flex items-center justify-between">
                    <span>سعر الأغراض (المندوب)</span>
                    <span className="text-[9px] text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded font-bold">صلاحية المندوب</span>
                  </label>
                  <div className="p-2 rounded-xl bg-amber-50/80 border border-amber-200/90 text-xs text-amber-950 font-mono font-bold flex items-center justify-between min-h-[38px]">
                    <span>{formatCurrency(Number(order.items_price || 0))} ل.س</span>
                    <span className="text-[10px] text-amber-700 font-normal">
                      {Number(order.items_price) > 0 ? 'مسجل من المندوب' : 'لم يسجل بعد'}
                    </span>
                  </div>
                </div>

                {/* إجمالي التحصيل */}
                <div>
                  <label className="block text-[11px] font-bold text-emerald-900 mb-1 flex items-center justify-between">
                    <span>إجمالي التحصيل المحسوب</span>
                    <span className="text-[9px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded font-bold">تلقائي</span>
                  </label>
                  <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 font-mono font-black flex items-center justify-between min-h-[38px]">
                    <span>{formatCurrency((Number(order.items_price) || 0) + (parseFloat(deliveryFee) || 0))} ل.س</span>
                    <span className="text-[10px] text-emerald-700 font-normal">توصيل + أغراض</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* واجهة المدير: تعديل كامل للمبالغ والطلب والمندوب والحالة */
            <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <span className="text-xs font-semibold text-slate-800 flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-orange-50 text-orange-600 border border-orange-100">
                    <DollarSign className="w-3.5 h-3.5" />
                  </div>
                  الحسابات والمبالغ وإسناد المندوب (صلاحية الإدارة الكاملة)
                </span>

                <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  <Lock className="w-3 h-3 text-emerald-600" />
                  <span>المدير يحدد كل شيء (تعديل الطلب، الأجرة، والمبالغ)</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. أجرة التوصيل */}
                <div>
                  <label className="block text-[11px] font-bold text-orange-950 mb-1 flex items-center justify-between">
                    <span>أجرة التوصيل (ل.س)</span>
                    <span className="text-[9px] text-orange-700 bg-orange-100 px-1.5 py-0.2 rounded font-bold">قابل للتعديل</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      value={deliveryFee}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDeliveryFee(val);
                        const parsed = parseFloat(val) || 0;
                        const assignedDriver = drivers?.find((d) => d.id === selectedDriverId);
                        const rate = assignedDriver?.commission_percentage ?? 70;
                        const dr = Math.round((parsed * rate) / 100);
                        setDriverFee(dr.toString());
                        setOfficeFee(Math.max(0, parsed - dr).toString());
                      }}
                      className="w-full bg-white border-2 border-orange-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 rounded-xl p-2 pl-9 text-xs text-slate-900 font-mono font-bold focus:outline-hidden shadow-2xs"
                    />
                    <span className="text-[10px] text-slate-500 absolute left-2.5 top-2.5 pointer-events-none">ل.س</span>
                  </div>
                </div>

                {/* 2. سعر الأغراض (المشتريات) - متاح للتعديل الكامل من قبل المدير */}
                <div>
                  <label className="block text-[11px] font-bold text-amber-950 mb-1 flex items-center justify-between">
                    <span>سعر الأغراض (ل.س)</span>
                    <span className="text-[9px] text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded font-bold">صلاحية المدير</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      placeholder="0"
                      value={itemsPrice}
                      onChange={(e) => setItemsPrice(e.target.value)}
                      className="w-full bg-white border-2 border-amber-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-xl p-2 pl-9 text-xs text-slate-900 font-mono font-bold focus:outline-hidden shadow-2xs"
                    />
                    <span className="text-[10px] text-slate-500 absolute left-2.5 top-2.5 pointer-events-none">ل.س</span>
                  </div>
                </div>

                {/* 3. إسناد المندوب */}
                <div>
                  <label className="block text-[11px] font-bold text-blue-950 mb-1 flex items-center justify-between">
                    <span>المندوب المسند</span>
                    <span className="text-[9px] text-blue-700 bg-blue-100 px-1.5 py-0.2 rounded font-bold">اختياري</span>
                  </label>
                  <select
                    value={selectedDriverId}
                    onChange={(e) => {
                      const newDriverId = e.target.value;
                      setSelectedDriverId(newDriverId);
                      const parsed = parseFloat(deliveryFee) || 0;
                      const assignedDriver = drivers?.find((d) => d.id === newDriverId);
                      const rate = assignedDriver?.commission_percentage ?? 70;
                      const dr = Math.round((parsed * rate) / 100);
                      setDriverFee(dr.toString());
                      setOfficeFee(Math.max(0, parsed - dr).toString());
                    }}
                    className="w-full bg-white border border-slate-300 hover:border-slate-400 focus:border-orange-500 rounded-xl p-2 text-xs text-slate-900 font-semibold focus:outline-hidden cursor-pointer"
                  >
                    <option value="">-- بدون إسناد (بانتظار الإسناد) --</option>
                    {drivers?.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} {d.phone ? `(${d.phone})` : ''} - عمولة {d.commission_percentage ?? 70}%
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4. حالة الطلب */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-900 mb-1 flex items-center justify-between">
                    <span>حالة الطلب</span>
                    <span className="text-[9px] text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded font-bold">الإدارة</span>
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value as OrderStatus)}
                    className="w-full bg-white border border-slate-300 hover:border-slate-400 focus:border-orange-500 rounded-xl p-2 text-xs text-slate-900 font-semibold focus:outline-hidden cursor-pointer"
                  >
                    <option value="pending">بانتظار الإسناد</option>
                    <option value="assigned">تم الإسناد</option>
                    <option value="preparing">بانتظار تحضير الطلب</option>
                    <option value="delivering">قيد التوصيل</option>
                    <option value="delivered">مكتملة ومسلّمة</option>
                    <option value="cancelled">ملغي</option>
                  </select>
                </div>
              </div>

              {/* بطاقة ملخص المبالغ المحسوبة وتوزيع الأجرة */}
              <div className="p-3.5 rounded-xl bg-orange-50/70 border border-orange-200/90 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-800">إجمالي التحصيل المحسوب:</span>
                  <strong className="text-base font-black font-mono text-emerald-700">
                    {formatCurrency((parseFloat(deliveryFee) || 0) + (parseFloat(itemsPrice) || 0))} ل.س
                  </strong>
                  <span className="text-[11px] text-slate-500">
                    (أجرة: {formatCurrency(parseFloat(deliveryFee) || 0)} + مشتريات: {formatCurrency(parseFloat(itemsPrice) || 0)})
                  </span>
                </div>

                {parseFloat(deliveryFee) > 0 && (
                  <div className="flex items-center gap-3 text-xs font-mono">
                    <span className="text-slate-600">
                      سائق: <strong className="text-slate-900 font-bold">{formatCurrency(parseFloat(driverFee) || 0)} ل.س</strong>
                    </span>
                    <span className="text-orange-700">
                      مكتب: <strong className="text-orange-800 font-bold">{formatCurrency(parseFloat(officeFee) || 0)} ل.س</strong>
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

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
              className="btn-sinjab-primary flex items-center gap-1.5 px-5 py-2 rounded-xl active:scale-95 text-white text-xs font-semibold shadow-xs hover:shadow disabled:opacity-50 transition-all cursor-pointer"
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

      {/* نافذة تعديل عنوان الزبون */}
      {editingAddress && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-orange-50 to-amber-50">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-orange-100 text-orange-700">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">تعديل عنوان الزبون</h3>
                  <p className="text-[11px] text-slate-500">
                    الزبون: {customerName || customerPhone}
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
