'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Order, Profile } from '@/types/database';
import { CallCenterHeader } from '@/components/CallCenterHeader';
import { NewOrderForm } from '@/components/NewOrderForm';
import { TodayOrdersTable } from '@/components/TodayOrdersTable';
import { AvailableDriversModal } from '@/components/callcenter/AvailableDriversModal';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import {
  Bell,
  Clock,
  Truck,
  CheckCircle2,
  Package,
  Headphones,
} from 'lucide-react';

export default function CallCenterPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [drivers, setDrivers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [highlightedOrderId, setHighlightedOrderId] = useState<string | number | null>(null);
  const [isDriversModalOpen, setIsDriversModalOpen] = useState(false);

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

  // Status stats calculations
  const totalCount = orders.length;
  const pendingCount = orders.filter((o) => o.status === 'pending').length;
  const inDeliveryCount = orders.filter(
    (o) => o.status === 'delivering' || o.status === 'assigned'
  ).length;
  const deliveredCount = orders.filter((o) => o.status === 'delivered').length;

  return (
    <ProtectedRoute allowedRoles={['call_center', 'admin']}>
      <div className="min-h-screen bg-[#090c13] text-slate-100 flex flex-col selection:bg-blue-600/30 selection:text-white pb-16">
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
        />

        {/* إشعار عائم للتحديثات اللحظية */}
        {notification && (
          <div className="fixed bottom-5 left-5 z-50 animate-fadeIn">
            <div className="bg-[#0e131f] text-slate-100 px-4 py-2.5 rounded-lg shadow-xl flex items-center gap-2.5 text-xs font-medium border border-[#1e2739]">
              <Bell className="w-4 h-4 text-blue-400" />
              <span>{notification}</span>
            </div>
          </div>
        )}

        {/* المحتوى الرئيسي لكول سنتر */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 space-y-6">
          {/* 1. شريط إحصائيات سريعة للطلبات */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* إجمالي طلبات اليوم */}
            <div className="bg-[#0e131f] border border-[#1b2234] rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs text-slate-400 font-medium">إجمالي الطلبات اليوم</div>
                  <div className="text-xl font-bold text-white font-mono">{totalCount}</div>
                </div>
              </div>
            </div>

            {/* بانتظار إسناد مندوب */}
            <div className="bg-[#0e131f] border border-[#1b2234] rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs text-slate-400 font-medium">بانتظار إسناد مندوب</div>
                  <div className="text-xl font-bold text-amber-400 font-mono">{pendingCount}</div>
                </div>
              </div>
              <span className="text-[10px] font-medium text-amber-400 font-mono bg-amber-500/10 px-2 py-0.5 rounded">
                Pending
              </span>
            </div>

            {/* قيد التوصيل والتحرك */}
            <div className="bg-[#0e131f] border border-[#1b2234] rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs text-slate-400 font-medium">قيد التوصيل للزبون</div>
                  <div className="text-xl font-bold text-sky-400 font-mono">{inDeliveryCount}</div>
                </div>
              </div>
              <span className="text-[10px] font-medium text-sky-400 font-mono bg-sky-500/10 px-2 py-0.5 rounded">
                Delivering
              </span>
            </div>

            {/* الطلبات المكتملة */}
            <div className="bg-[#0e131f] border border-[#1b2234] rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs text-slate-400 font-medium">تم تسليمها بنجاح</div>
                  <div className="text-xl font-bold text-emerald-400 font-mono">{deliveredCount}</div>
                </div>
              </div>
              <span className="text-[10px] font-medium text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded">
                Delivered
              </span>
            </div>
          </div>

          {/* 2. نموذج تسجيل الطلب السريع */}
          <div className="bg-[#0e131f] border border-[#1b2234] rounded-xl p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-[#1b2234]">
              <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
                <Headphones className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">
                  تسجيل طلب جديد من الزبون
                </h2>
                <p className="text-xs text-slate-400">
                  ادخل هاتف الزبون للبحث التلقائي عن عنوانه ورابط خريطته، وسيتم إدراجه فوراً بحالة قيد الانتظار
                </p>
              </div>
            </div>

            <NewOrderForm onOrderCreated={handleOrderCreated} />
          </div>

          {/* 3. جدول متابعة وحالات الطلبات اللحظي (قراءة فقط) */}
          <TodayOrdersTable
            orders={orders}
            drivers={drivers}
            onRefresh={fetchOrders}
            isLoading={isLoading}
            highlightedOrderId={highlightedOrderId}
          />
        </main>

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
