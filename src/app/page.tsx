'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Order, Profile } from '@/types/database';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { AdminAccountingCards } from '@/components/admin/AdminAccountingCards';
import { AdminOrdersTable } from '@/components/admin/AdminOrdersTable';
import { EditOrderModal } from '@/components/admin/EditOrderModal';
import { CreateOrderModal } from '@/components/admin/CreateOrderModal';
import { DriversCommissionModal } from '@/components/admin/DriversCommissionModal';
import { ReportsModal } from '@/components/admin/ReportsModal';
import { StaffManagementModal } from '@/components/admin/StaffManagementModal';
import { OrdersCleanupModal } from '@/components/admin/OrdersCleanupModal';
import { Bell, Calendar, Clock, Layers } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';

export type DateFilter = 'today' | '24h' | 'all';

export default function AdminHomePage() {
  const router = useRouter();
  const { role } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [drivers, setDrivers] = useState<Profile[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCommissionModalOpen, setIsCommissionModalOpen] = useState(false);
  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isCleanupModalOpen, setIsCleanupModalOpen] = useState(false);

  // If user is call_center, redirect immediately to /call-center
  useEffect(() => {
    if (role === 'call_center') {
      router.replace('/call-center');
    }
  }, [role, router]);

  const [isLoading, setIsLoading] = useState(true);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Notification toast
  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // Fetch Drivers from `profiles` where role = 'driver' directly from Supabase
  const fetchDrivers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'driver')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching drivers from Supabase:', error.message);
        setDrivers([]);
      } else if (data) {
        const mapped: Profile[] = data.map((d: any) => ({
          id: d.id,
          name: d.full_name || d.name || 'مندوب',
          full_name: d.full_name || d.name || 'مندوب',
          phone: d.phone,
          role: d.role,
          commission_percentage: d.commission_percentage !== null && d.commission_percentage !== undefined ? Number(d.commission_percentage) : 70,
          created_at: d.created_at,
        }));
        setDrivers(mapped);
      }
    } catch (err) {
      console.error('Fetch drivers error:', err);
      setDrivers([]);
    }
  }, []);

  // Fetch orders with date filter directly from Supabase
  const fetchOrders = useCallback(async (filterToUse?: DateFilter) => {
    const activeFilter = filterToUse ?? dateFilter;
    setIsLoading(true);
    try {
      let query = supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (activeFilter === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        query = query.gte('created_at', today.toISOString());
      } else if (activeFilter === '24h') {
        const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
        query = query.gte('created_at', last24h.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching orders from Supabase:', error.message);
        setOrders([]);
      } else if (data) {
        setOrders(data as Order[]);
      }
    } catch (err) {
      console.error('Fetch orders error:', err);
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, [dateFilter]);

  // Handle date filter tab change
  const handleDateFilterChange = (newFilter: DateFilter) => {
    setDateFilter(newFilter);
    fetchOrders(newFilter);
  };

  // Load drivers and orders when dateFilter changes
  useEffect(() => {
    fetchDrivers();
    fetchOrders(dateFilter);
  }, [dateFilter, fetchDrivers, fetchOrders]);

  // Persistent Realtime channel subscription
  useEffect(() => {
    const channel = supabase
      .channel('public:orders:admin_dashboard')
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
  }, []);

  // Handle local order creation
  const handleOrderCreated = (newOrder: Order) => {
    setOrders((prev) => {
      if (prev.some((o) => o.id === newOrder.id)) return prev;
      return [newOrder, ...prev];
    });
    showNotification(`✨ تم تسجيل الطلب بنجاح #${newOrder.id}`);
  };

  // Handle local updates
  const handleOrderUpdated = (updatedOrder: Order) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o))
    );
    showNotification(`✨ تم تحديث بيانات الطلب #${updatedOrder.id} بنجاح`);
  };

  // Find currently selected driver object if any
  const selectedDriver =
    selectedDriverId && selectedDriverId !== 'all'
      ? drivers.find((d) => d.id === selectedDriverId) || null
      : null;

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-orange-100 selection:text-orange-900 pb-16">
        {/* رأس صفحة الإدارة */}
        <AdminHeader
          realtimeConnected={realtimeConnected}
          onRefresh={() => {
            fetchDrivers();
            fetchOrders(dateFilter);
          }}
          isLoading={isLoading}
          onOpenCreateModal={() => setIsCreateModalOpen(true)}
          onOpenStaffModal={() => setIsStaffModalOpen(true)}
          onOpenCommissionModal={() => setIsCommissionModalOpen(true)}
          onOpenReportsModal={() => setIsReportsModalOpen(true)}
          onOpenCleanupModal={() => setIsCleanupModalOpen(true)}
        />

        {/* إشعارات التحديث اللحظي */}
        {notification && (
          <div className="fixed bottom-5 left-5 z-50 animate-fadeIn">
            <div className="bg-white text-slate-900 px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2.5 text-xs font-semibold border border-slate-200">
              <Bell className="w-4 h-4 text-orange-600" />
              <span>{notification}</span>
            </div>
          </div>
        )}

        {/* المحتوى الرئيسي للوحة الإدارة */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8">
          {/* شريط الفلترة الزمنية للمدير */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white border border-zinc-200/80 rounded-2xl p-3 px-4 shadow-xs mb-5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-orange-50 text-orange-600 border border-orange-100 shadow-2xs">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold text-zinc-900">النطاق الزمني للعمليات:</span>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 font-bold shadow-2xs">
                    {orders.length} {orders.length === 1 ? 'طلب معروض' : 'طلبات معروضة'}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  {dateFilter === 'today' && 'يتم عرض طلبات اليوم الحالي فقط'}
                  {dateFilter === '24h' && 'يتم عرض الطلبات المسجلة خلال آخر 24 ساعة'}
                  {dateFilter === 'all' && 'يتم عرض كافة الطلبات المسجلة في النظام'}
                </p>
              </div>
            </div>

            <div className="inline-flex p-1 bg-zinc-100 border border-zinc-200/80 rounded-xl text-xs gap-1 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => handleDateFilterChange('today')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  dateFilter === 'today'
                    ? 'bg-white text-orange-600 shadow-xs border border-orange-200/80'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>طلبات اليوم</span>
              </button>
              <button
                type="button"
                onClick={() => handleDateFilterChange('24h')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  dateFilter === '24h'
                    ? 'bg-white text-orange-600 shadow-xs border border-orange-200/80'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>آخر 24 ساعة</span>
              </button>
              <button
                type="button"
                onClick={() => handleDateFilterChange('all')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  dateFilter === 'all'
                    ? 'bg-white text-orange-600 shadow-xs border border-orange-200/80'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>كل الطلبات</span>
              </button>
            </div>
          </div>

          {/* 1. شريط إحصائيات وحسابات اليوم */}
          <AdminAccountingCards orders={orders} selectedDriver={selectedDriver} dateFilter={dateFilter} />

          {/* 2. جدول إدارة وتوزيع الطلبات */}
          <AdminOrdersTable
            orders={orders}
            drivers={drivers}
            onOrderUpdated={handleOrderUpdated}
            onOpenEditModal={(order) => setEditingOrder(order)}
            selectedDriverId={selectedDriverId}
            onSelectDriverId={setSelectedDriverId}
            isLoading={isLoading}
          />
        </main>

        {/* نافذة تسجيل طلب جديد للمدير */}
        <CreateOrderModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onOrderCreated={handleOrderCreated}
        />

        {/* نافذة إدارة فريق العمل والحسابات للمدير */}
        <StaffManagementModal
          isOpen={isStaffModalOpen}
          onClose={() => setIsStaffModalOpen(false)}
          onUserCreated={(createdRole) => {
            if (createdRole === 'driver') {
              fetchDrivers();
            }
            showNotification('✨ تم إنشاء الحساب بنجاح وتم تحديث قائمة المناديب!');
          }}
        />

        {/* نافذة تعديل تفاصيل وحسابات الطلب للمدير */}
        <EditOrderModal
          order={editingOrder}
          isOpen={Boolean(editingOrder)}
          onClose={() => setEditingOrder(null)}
          onOrderUpdated={handleOrderUpdated}
          drivers={drivers}
        />

        {/* نافذة إدارة وتحديد نسب عمولات المناديب للمدير */}
        <DriversCommissionModal
          isOpen={isCommissionModalOpen}
          onClose={() => setIsCommissionModalOpen(false)}
          drivers={drivers}
          onDriversUpdated={fetchDrivers}
        />

        {/* نافذة التقارير المالية والتشغيلية الشاملة */}
        <ReportsModal
          isOpen={isReportsModalOpen}
          onClose={() => setIsReportsModalOpen(false)}
          orders={orders}
          drivers={drivers}
        />

        {/* نافذة تنظيف وأرشفة الطلبات القديمة لتفريغ المساحة */}
        <OrdersCleanupModal
          isOpen={isCleanupModalOpen}
          onClose={() => setIsCleanupModalOpen(false)}
          orders={orders}
          onOrdersCleaned={() => {
            fetchOrders(dateFilter);
            showNotification('✨ تم تنظيف وحذف الطلبات المحددة وتفريغ المساحة بنجاح!');
          }}
        />
      </div>
    </ProtectedRoute>
  );
}
