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
import { useDriversPresence } from '@/hooks/useDriversPresence';
import {
  Bell,
  Clock,
  Truck,
  CheckCircle2,
  Package,
  Headphones,
  PlusCircle,
  Layers,
  UserCheck,
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

  // Driver presence tracking
  const { onlineCount } = useDriversPresence(drivers);

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
          last_seen_at: d.last_seen_at,
          is_online: d.is_online,
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
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          fetchDrivers();
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
  const pendingAssignmentCount = orders.filter((o) => o.status === 'pending').length;
  const assignedCount = orders.filter((o) => o.status === 'assigned').length;
  const preparingCount = orders.filter((o) => o.status === 'preparing').length;
  const inDeliveryCount = orders.filter((o) => o.status === 'delivering').length;
  const deliveredCount = orders.filter((o) => o.status === 'delivered').length;

  return (
    <ProtectedRoute allowedRoles={['call_center', 'admin']}>
      <div className="min-h-screen bg-transparent text-zinc-900 flex flex-col selection:bg-orange-100 selection:text-orange-900 pb-16">
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
          onlineDriversCount={onlineCount}
        />

        {/* إشعار عائم للتحديثات اللحظية */}
        {notification && (
          <div className="fixed bottom-5 left-5 z-50 animate-fadeIn">
            <div className="bg-white/95 text-zinc-900 px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2.5 text-xs font-semibold border border-orange-200/80">
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
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-gradient-to-r from-[#faeada] via-[#f7f0e3] to-[#faf4eb] border-2 border-[#cdbba2] rounded-2xl p-3.5 px-4 sm:px-5 shadow-sm shadow-orange-950/5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-orange-500 text-white shadow-xs">
                  <Headphones className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-sm sm:text-base font-bold text-zinc-900">
                      تسجيل واستقبال طلب جديد
                    </h1>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold shadow-2xs">
                      الرئيسية
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 mt-0.5 font-medium">
                    ادخل هاتف الزبون للبحث التلقائي عن عنوانه ورابط خريطته وتثبيت الطلب فوراً
                  </p>
                </div>
              </div>

              {/* زر الانتقال لجدول الطلبات وتفاصيل اليوم */}
              <button
                type="button"
                onClick={() => setActiveView('table')}
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-orange-50/80 border-2 border-[#d5c3aa] hover:border-orange-400 text-xs font-bold text-zinc-800 transition-all shadow-2xs cursor-pointer group active:scale-95"
              >
                <Layers className="w-4 h-4 text-orange-600 group-hover:scale-110 transition-transform" />
                <span>سجل وبطاقات طلبات اليوم</span>
                <span className="bg-orange-100 border border-orange-300 text-orange-900 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full mr-1">
                  {totalCount} طلبات
                </span>
              </button>
            </div>

            {/* نموذج تسجيل الطلب السريع */}
            <NewOrderForm onOrderCreated={handleOrderCreated} drivers={drivers} />
          </div>

          {/* 2. واجهة متابعة طلبات اليوم والتفاصيل */}
          <div className={activeView === 'table' ? 'space-y-6 animate-fadeIn' : 'hidden'}>
            {/* شريط رأس متابعة الطلبات وزر العودة لتسجيل طلب */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-gradient-to-r from-[#faeada] via-[#f7f0e3] to-[#faf4eb] border-2 border-[#cdbba2] rounded-2xl p-3.5 px-4 sm:px-5 shadow-sm shadow-orange-950/5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-orange-500 text-white shadow-xs">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm sm:text-base font-bold text-zinc-900">
                      متابعة وسجل طلبات اليوم
                    </h2>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-900 border border-orange-300 font-mono font-bold shadow-2xs">
                      {totalCount} إجمالي اليوم
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 mt-0.5 font-medium">
                    متابعة حالات التوصيل والمندوب المسند وتفاصيل طلبات زبائن اليوم
                  </p>
                </div>
              </div>

              {/* زر العودة المباشر لشاشة تسجيل الطلب */}
              <button
                type="button"
                onClick={() => setActiveView('create')}
                className="btn-sinjab-primary flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-xs hover:shadow-md hover:shadow-orange-500/20 cursor-pointer active:scale-95"
              >
                <PlusCircle className="w-4 h-4" />
                <span>العودة لشاشة تسجيل طلب جديد</span>
              </button>
            </div>

            {/* شريط إحصائيات سريعة للطلبات مصغرة وجنب بعض */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 sm:gap-2">
              {/* إجمالي طلبات اليوم */}
              <div className="bg-gradient-to-br from-orange-50 to-amber-50/70 border-2 border-orange-300 rounded-xl p-2 sm:p-2.5 flex items-center justify-between hover:border-orange-400 transition-all shadow-2xs">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <div className="p-1 sm:p-1.5 rounded-lg bg-orange-100 text-orange-800 border border-orange-300 shadow-2xs shrink-0">
                    <Package className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] sm:text-[11px] text-orange-950 font-bold truncate">إجمالي اليوم</div>
                    <div className="text-xs sm:text-sm font-black text-orange-900 font-mono leading-none mt-0.5">{totalCount}</div>
                  </div>
                </div>
              </div>

              {/* بانتظار الإسناد */}
              <div className="bg-gradient-to-br from-amber-50 to-yellow-50/70 border-2 border-amber-300 rounded-xl p-2 sm:p-2.5 flex items-center justify-between hover:border-amber-400 transition-all shadow-2xs">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <div className="p-1 sm:p-1.5 rounded-lg bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs shrink-0">
                    <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] sm:text-[11px] text-amber-950 font-bold truncate">بانتظار الإسناد</div>
                    <div className="text-xs sm:text-sm font-black text-amber-800 font-mono leading-none mt-0.5">{pendingAssignmentCount}</div>
                  </div>
                </div>
              </div>

              {/* تم الإسناد */}
              <div className="bg-gradient-to-br from-blue-50 to-sky-50/70 border-2 border-blue-300 rounded-xl p-2 sm:p-2.5 flex items-center justify-between hover:border-blue-400 transition-all shadow-2xs">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <div className="p-1 sm:p-1.5 rounded-lg bg-blue-100 text-blue-800 border border-blue-300 shadow-2xs shrink-0">
                    <UserCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] sm:text-[11px] text-blue-950 font-bold truncate">تم الإسناد</div>
                    <div className="text-xs sm:text-sm font-black text-blue-800 font-mono leading-none mt-0.5">{assignedCount}</div>
                  </div>
                </div>
              </div>

              {/* بانتظار تحضير الطلب */}
              <div className="bg-gradient-to-br from-orange-50 to-amber-50/70 border-2 border-orange-300 rounded-xl p-2 sm:p-2.5 flex items-center justify-between hover:border-orange-400 transition-all shadow-2xs">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <div className="p-1 sm:p-1.5 rounded-lg bg-orange-100 text-orange-800 border border-orange-300 shadow-2xs shrink-0">
                    <Package className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] sm:text-[11px] text-orange-950 font-bold truncate">بانتظار التحضير</div>
                    <div className="text-xs sm:text-sm font-black text-orange-800 font-mono leading-none mt-0.5">{preparingCount}</div>
                  </div>
                </div>
              </div>

              {/* قيد التوصيل والتحرك */}
              <div className="bg-gradient-to-br from-sky-50 to-indigo-50/60 border-2 border-sky-300 rounded-xl p-2 sm:p-2.5 flex items-center justify-between hover:border-sky-400 transition-all shadow-2xs">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <div className="p-1 sm:p-1.5 rounded-lg bg-sky-100 text-sky-800 border border-sky-300 shadow-2xs shrink-0">
                    <Truck className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] sm:text-[11px] text-sky-950 font-bold truncate">قيد التوصيل</div>
                    <div className="text-xs sm:text-sm font-black text-sky-800 font-mono leading-none mt-0.5">{inDeliveryCount}</div>
                  </div>
                </div>
              </div>

              {/* الطلبات المكتملة */}
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50/60 border-2 border-emerald-300 rounded-xl p-2 sm:p-2.5 flex items-center justify-between hover:border-emerald-400 transition-all shadow-2xs">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <div className="p-1 sm:p-1.5 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs shrink-0">
                    <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] sm:text-[11px] text-emerald-950 font-bold truncate">تم التسليم</div>
                    <div className="text-xs sm:text-sm font-black text-emerald-800 font-mono leading-none mt-0.5">{deliveredCount}</div>
                  </div>
                </div>
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
