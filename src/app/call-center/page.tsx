'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Order, Profile } from '@/types/database';
import { CallCenterHeader } from '@/components/CallCenterHeader';
import { NewOrderForm } from '@/components/NewOrderForm';
import { TodayOrdersTable } from '@/components/TodayOrdersTable';
import { AvailableDriversModal } from '@/components/callcenter/AvailableDriversModal';
import { EditOrderModal } from '@/components/admin/EditOrderModal';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import {
  Bell,
  Clock,
  Truck,
  CheckCircle2,
  Package,
  Headphones,
  PlusCircle,
  Layers,
} from 'lucide-react';

export default function CallCenterPage() {
  const [activeView, setActiveView] = useState<'create' | 'table'>('create');
  const [orders, setOrders] = useState<Order[]>([]);
  const [drivers, setDrivers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [highlightedOrderId, setHighlightedOrderId] = useState<string | number | null>(null);
  const [isDriversModalOpen, setIsDriversModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  // Notification Toast
  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // Fetch Drivers for call center inquiry reference
  const fetchDrivers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'driver')
        .order('full_name', { ascending: true });

      if (error) {
        console.error('Error fetching drivers in call center:', error.message);
        setDrivers([]);
      } else if (data) {
        const mapped: Profile[] = data.map((d: any) => ({
          id: d.id,
          name: d.full_name || d.name || 'مندوب',
          full_name: d.full_name || d.name || 'مندوب',
          phone: d.phone,
          role: d.role,
          commission_percentage: Number(d.commission_percentage) || 70,
          created_at: d.created_at,
        }));
        setDrivers(mapped);
      }
    } catch (err) {
      console.error('Fetch drivers error:', err);
    }
  }, []);

  // Fetch Today's Orders
  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching call center orders:', error.message);
        setOrders([]);
      } else if (data) {
        setOrders(data as Order[]);
      }
    } catch (err) {
      console.error('Fetch orders error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Realtime subscription
  useEffect(() => {
    fetchDrivers();
    fetchOrders();

    const channel = supabase
      .channel('public:orders:call_center_live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newOrder = payload.new as Order;
            setOrders((prev) => {
              if (prev.some((o) => o.id === newOrder.id)) return prev;
              return [newOrder, ...prev];
            });
            setHighlightedOrderId(newOrder.id ?? null);
            showNotification(`🔔 تم استلام طلب جديد #${newOrder.id} - ${newOrder.customer_name}`);
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Order;
            setOrders((prev) =>
              prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o))
            );
            showNotification(`🔄 تم تحديث الطلب #${updated.id} (${updated.status})`);
          } else if (payload.eventType === 'DELETE') {
            const deleted = payload.old as Partial<Order>;
            if (deleted.id) {
              setOrders((prev) => prev.filter((o) => o.id !== deleted.id));
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setRealtimeConnected(true);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setRealtimeConnected(false);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchDrivers, fetchOrders]);

  // Handle local order creation
  const handleOrderCreated = (newOrder: Order) => {
    setOrders((prev) => {
      if (prev.some((o) => o.id === newOrder.id)) return prev;
      return [newOrder, ...prev];
    });
    setHighlightedOrderId(newOrder.id ?? null);
    showNotification(`✨ تم تسجيل الطلب #${newOrder.id} بنجاح!`);
  };

  // Handle local order update
  const handleOrderUpdated = (updatedOrder: Order) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o))
    );
    showNotification(`✨ تم حفظ وتعديل بيانات الطلب #${updatedOrder.id} بنجاح`);
  };

  // Status stats calculations
  const totalCount = orders.length;
  const pendingCount = orders.filter((o) => o.status === 'pending').length;
  const inDeliveryCount = orders.filter(
    (o) => o.status === 'delivering' || o.status === 'assigned'
  ).length;
  const deliveredCount = orders.filter((o) => o.status === 'delivered').length;

  return (
    <ProtectedRoute allowedRoles={['call_center', 'admin']}>
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-orange-100 selection:text-orange-900 pb-16">
        {/* رأس شاشة الكول سنتر */}
        <CallCenterHeader
          realtimeConnected={realtimeConnected}
          onRefresh={() => {
            fetchDrivers();
            fetchOrders();
          }}
          isLoading={isLoading}
          onOpenDriversModal={() => setIsDriversModalOpen(true)}
          ordersCountToday={totalCount}
          activeView={activeView}
          onChangeView={setActiveView}
        />

        {/* إشعار عائم للتحديثات اللحظية */}
        {notification && (
          <div className="fixed bottom-5 left-5 z-50 animate-fadeIn">
            <div className="bg-white text-slate-900 px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2.5 text-xs font-semibold border border-slate-200">
              <Bell className="w-4 h-4 text-orange-600" />
              <span>{notification}</span>
            </div>
          </div>
        )}

        {/* المحتوى الرئيسي لكول سنتر */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 space-y-6">
          {/* 1. الواجهة الرئيسية: شاشة إضافة وتسجيل الطلب */}
          <div className={activeView === 'create' ? 'space-y-4 animate-fadeIn' : 'hidden'}>
            {/* شريط الإجراءات والزر للدخول لجدول الطلبات والتفاصيل */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl p-3.5 px-4 sm:px-5 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-orange-50 border border-orange-100 text-orange-600 shadow-2xs">
                  <Headphones className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-sm sm:text-base font-bold text-slate-900">
                      تسجيل واستقبال طلب جديد
                    </h1>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold shadow-2xs">
                      الرئيسية
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    ادخل هاتف الزبون للبحث التلقائي عن عنوانه ورابط خريطته وتثبيت الطلب فوراً
                  </p>
                </div>
              </div>

              {/* زر الانتقال لجدول الطلبات وتفاصيل اليوم */}
              <button
                type="button"
                onClick={() => setActiveView('table')}
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-xs font-semibold text-slate-700 hover:text-slate-900 transition-all shadow-2xs cursor-pointer group active:scale-95"
              >
                <Layers className="w-4 h-4 text-orange-600 group-hover:scale-110 transition-transform" />
                <span>جدول طلبات اليوم والتفاصيل</span>
                <span className="bg-orange-50 border border-orange-200 text-orange-700 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full mr-1">
                  {totalCount} طلبات
                </span>
              </button>
            </div>

            {/* نموذج تسجيل الطلب السريع */}
            <NewOrderForm onOrderCreated={handleOrderCreated} />
          </div>

          {/* 2. واجهة جدول متابعة طلبات اليوم والتفاصيل */}
          <div className={activeView === 'table' ? 'space-y-6 animate-fadeIn' : 'hidden'}>
            {/* شريط رأس جدول الطلبات وزر العودة لتسجيل طلب */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl p-3.5 px-4 sm:px-5 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-orange-50 border border-orange-100 text-orange-600 shadow-2xs">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm sm:text-base font-bold text-slate-900">
                      جدول ومتابعة طلبات اليوم
                    </h2>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 font-mono font-semibold shadow-2xs">
                      {totalCount} إجمالي اليوم
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    متابعة حالات التوصيل والمندوب المسند وتفاصيل طلبات زبائن اليوم
                  </p>
                </div>
              </div>

              {/* زر العودة المباشر لشاشة تسجيل الطلب */}
              <button
                type="button"
                onClick={() => setActiveView('create')}
                className="btn-sinjab-primary flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-xs hover:shadow cursor-pointer active:scale-95"
              >
                <PlusCircle className="w-4 h-4" />
                <span>العودة لشاشة تسجيل طلب جديد</span>
              </button>
            </div>

            {/* شريط إحصائيات سريعة للطلبات */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* إجمالي طلبات اليوم */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-orange-50 border border-orange-100 text-orange-600 shadow-2xs">
                    <Package className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 font-medium">إجمالي الطلبات اليوم</div>
                    <div className="text-xl font-bold text-slate-900 font-mono">{totalCount}</div>
                  </div>
                </div>
              </div>

              {/* بانتظار إسناد مندوب */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 shadow-2xs">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 font-medium">بانتظار إسناد مندوب</div>
                    <div className="text-xl font-bold text-amber-600 font-mono">{pendingCount}</div>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-amber-700 font-mono bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  Pending
                </span>
              </div>

              {/* قيد التوصيل والتحرك */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-sky-50 border border-sky-100 text-sky-600 shadow-2xs">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 font-medium">قيد التوصيل للزبون</div>
                    <div className="text-xl font-bold text-sky-600 font-mono">{inDeliveryCount}</div>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-sky-700 font-mono bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
                  Delivering
                </span>
              </div>

              {/* الطلبات المكتملة */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 shadow-2xs">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 font-medium">تم تسليمها بنجاح</div>
                    <div className="text-xl font-bold text-emerald-600 font-mono">{deliveredCount}</div>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-emerald-700 font-mono bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Delivered
                </span>
              </div>
            </div>

            {/* جدول متابعة وحالات وتعديل الطلبات اللحظي */}
            <TodayOrdersTable
              orders={orders}
              drivers={drivers}
              onRefresh={fetchOrders}
              isLoading={isLoading}
              highlightedOrderId={highlightedOrderId}
              onOpenEditModal={(order) => setEditingOrder(order)}
            />
          </div>
        </main>

        {/* نافذة تعديل تفاصيل وحسابات الطلب للكول سنتر */}
        <EditOrderModal
          order={editingOrder}
          isOpen={Boolean(editingOrder)}
          onClose={() => setEditingOrder(null)}
          onOrderUpdated={handleOrderUpdated}
          drivers={drivers}
        />

        {/* نافذة استعراض المناديب المتاحين والتواصل معهم */}
        <AvailableDriversModal
          isOpen={isDriversModalOpen}
          onClose={() => setIsDriversModalOpen(false)}
          drivers={drivers}
          orders={orders}
        />
      </div>
    </ProtectedRoute>
  );
}
