'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Order, Profile } from '@/types/database';
import { NewOrderForm } from '@/components/NewOrderForm';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import {
  ArrowRight,
  PlusCircle,
  CheckCircle2,
  ListOrdered,
  Sparkles,
} from 'lucide-react';

export default function AdminNewOrderPage() {
  const router = useRouter();
  const [drivers, setDrivers] = useState<Profile[]>([]);
  const [isLoadingDrivers, setIsLoadingDrivers] = useState(true);
  const [lastCreatedOrder, setLastCreatedOrder] = useState<Order | null>(null);

  // Fetch Drivers from Supabase
  const fetchDrivers = useCallback(async () => {
    try {
      setIsLoadingDrivers(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'driver')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching drivers in admin new-order page:', error.message);
        setDrivers([]);
      } else if (data) {
        const mapped: Profile[] = data.map((d: any) => ({
          id: d.id,
          name: d.full_name || d.name || 'مندوب',
          full_name: d.full_name || d.name || 'مندوب',
          phone: d.phone,
          role: d.role,
          commission_percentage:
            d.commission_percentage !== null && d.commission_percentage !== undefined
              ? Number(d.commission_percentage)
              : 70,
          created_at: d.created_at,
          last_seen_at: d.last_seen_at,
          is_online: d.is_online,
        }));
        setDrivers(mapped);
      }
    } catch (err) {
      console.error('Fetch drivers error:', err);
      setDrivers([]);
    } finally {
      setIsLoadingDrivers(false);
    }
  }, []);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  const handleOrderCreated = (newOrder: Order) => {
    setLastCreatedOrder(newOrder);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="min-h-screen bg-slate-50/50 text-slate-900 flex flex-col selection:bg-orange-100 selection:text-orange-900 pb-16">
        {/* شريط الرأس المخصص لصفحة تسجيل الطلب */}
        <header className="border-b border-orange-200/80 bg-[#fffcf7]/95 backdrop-blur-md sticky top-0 z-30 px-4 lg:px-8 py-3 mb-6 shadow-xs shadow-orange-950/5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 max-w-5xl mx-auto">
            {/* الشعار وعنوان الصفحة */}
            <div className="flex items-center gap-3">
              <Link
                href="/admin"
                className="relative h-10 w-10 rounded-2xl bg-orange-50 border border-orange-200/90 p-1 flex items-center justify-center shadow-xs overflow-hidden shrink-0 hover:scale-105 transition-transform"
                title="العودة للوحة الإدارة"
              >
                <Image
                  src="/sinjab-logo.png"
                  alt="Sinjab Delivery"
                  width={38}
                  height={38}
                  className="object-contain"
                />
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm sm:text-base font-extrabold text-zinc-900 tracking-tight">
                    تسجيل طلب جديد
                  </h1>
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-300 rounded-md">
                    لوحة الإدارة
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 font-medium">
                  صفحة مخصصة لإدخال الطلبات ومطابقة الحسابات المالية وإسناد المناديب
                </p>
              </div>
            </div>

            {/* أزرار التنقل السريع */}
            <div className="flex items-center gap-2">
              <Link
                href="/admin"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-xs font-bold text-slate-700 shadow-2xs transition-all duration-150 cursor-pointer active:scale-95"
              >
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                <span>العودة إلى جدول الطلبات</span>
              </Link>
            </div>
          </div>
        </header>

        {/* الحاوية الرئيسية للنموذج */}
        <main className="flex-1 max-w-5xl w-full mx-auto px-4 lg:px-6 space-y-5">
          {/* بطاقة التنبيه عند تسجيل طلب بنجاح */}
          {lastCreatedOrder && (
            <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-300/80 rounded-2xl p-4 sm:p-5 shadow-sm animate-in fade-in slide-in-from-top-4 duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700 shrink-0 mt-0.5">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-emerald-950 flex items-center gap-2">
                      <span>تم تسجيل وإدراج الطلب #{lastCreatedOrder.id} بنجاح!</span>
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                    </h3>
                    <p className="text-xs text-emerald-800 mt-1">
                      الزبون: <span className="font-semibold">{lastCreatedOrder.customer_name}</span> •{' '}
                      العنوان: <span className="font-semibold">{lastCreatedOrder.delivery_address}</span>
                      {lastCreatedOrder.driver_id && (
                        <span>
                          {' '}• المندوب المسند:{' '}
                          <span className="font-semibold text-emerald-900">
                            {drivers.find((d) => d.id === lastCreatedOrder.driver_id)?.name || 'مسند'}
                          </span>
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => setLastCreatedOrder(null)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-xs font-bold transition-all cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>تسجيل طلب آخر</span>
                  </button>
                  <Link
                    href="/admin"
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                  >
                    <ListOrdered className="w-3.5 h-3.5" />
                    <span>جدول الطلبات</span>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* الحاوية الأنيقة لنموذج تسجيل الطلب */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-7 shadow-xs">
            <div className="border-b border-slate-100 pb-4 mb-5">
              <div className="flex items-center gap-2 text-xs font-semibold text-orange-600 mb-1">
                <PlusCircle className="w-4 h-4" />
                <span>نموذج إضافة طلب جديد كامل</span>
              </div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                تفاصيل الطلب والبيانات المالية
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                يمكنك البحث عن الزبون برقم الهاتف لاسترجاع عناوينه السابقة، وتعديل العناوين أو إضافة عناوين جديدة، وتحديد أجور التوصيل وسعر الأغراض وإسناد المندوب فورياً.
              </p>
            </div>

            <NewOrderForm
              drivers={drivers}
              onOrderCreated={handleOrderCreated}
            />
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
