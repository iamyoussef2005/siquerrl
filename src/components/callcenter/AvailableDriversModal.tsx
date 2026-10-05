'use client';

import React, { useState, useMemo } from 'react';
import { Profile, Order } from '@/types/database';
import { useDriversPresence } from '@/hooks/useDriversPresence';
import {
  X,
  Bike,
  Phone,
  Search,
  CheckCircle2,
  Clock,
  Wifi,
  WifiOff,
  UserCheck,
} from 'lucide-react';

interface AvailableDriversModalProps {
  isOpen: boolean;
  onClose: () => void;
  drivers?: Profile[];
  orders?: Order[];
  isDriverOnline?: (driverId?: string | null) => boolean;
  formatLastSeen?: (lastSeenAt?: string | null, isOnline?: boolean) => string;
  sortDriversByPresence?: (drivers: Profile[]) => Profile[];
  onlineCount?: number;
}

export function AvailableDriversModal({
  isOpen,
  onClose,
  drivers = [],
  orders = [],
  isDriverOnline: propIsDriverOnline,
  formatLastSeen: propFormatLastSeen,
  sortDriversByPresence: propSortDriversByPresence,
  onlineCount: propOnlineCount,
}: AvailableDriversModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'online' | 'offline'>('all');

  // Fallback to hook only if props not provided
  const internalPresence = useDriversPresence(propSortDriversByPresence ? [] : drivers);

  const isDriverOnline = propIsDriverOnline || internalPresence.isDriverOnline;
  const formatLastSeen = propFormatLastSeen || internalPresence.formatLastSeen;
  const sortDriversByPresence = propSortDriversByPresence || internalPresence.sortDriversByPresence;
  const onlineCount = propOnlineCount !== undefined ? propOnlineCount : internalPresence.onlineCount;

  // Sort drivers: online first, then by last seen
  const sortedDrivers = useMemo(() => {
    if (!drivers || !Array.isArray(drivers)) return [];
    return sortDriversByPresence ? sortDriversByPresence(drivers) : drivers;
  }, [drivers, sortDriversByPresence]);

  // Filter drivers based on search and online filter tab
  const filteredDrivers = useMemo(() => {
    if (!sortedDrivers) return [];
    return sortedDrivers.filter((driver) => {
      if (!driver) return false;
      const q = searchQuery.trim().toLowerCase();
      const driverName = String(driver.name || driver.full_name || 'مندوب');
      const matchesSearch =
        !q ||
        driverName.toLowerCase().includes(q) ||
        (driver.phone && String(driver.phone).includes(q));

      if (!matchesSearch) return false;

      const online = isDriverOnline ? isDriverOnline(driver.id) : false;
      if (filterMode === 'online') return online;
      if (filterMode === 'offline') return !online;
      return true;
    });
  }, [sortedDrivers, searchQuery, filterMode, isDriverOnline]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-xl relative flex flex-col">
        {/* رأس النافذة */}
        <div className="flex items-center justify-between p-4 sm:p-5 px-6 border-b border-slate-200 bg-white z-20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-50 border border-orange-100 text-orange-600 shadow-2xs">
              <Bike className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                  كادر مناديب التوصيل ومتابعة النشاط
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  {onlineCount} متصل الآن
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 font-mono shadow-2xs">
                  {drivers.length} كلي
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                متابعة المناديب النشطين الذين لديهم تطبيق المندوب مفتوح حالياً والتواصل المباشر معهم
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* شريط البحث وفلاتر الحالة */}
        <div className="p-3.5 border-b border-slate-200 bg-slate-50/70 space-y-2.5">
          <div className="relative">
            <input
              type="text"
              placeholder="بحث باسم المندوب أو رقم الهاتف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl pr-9 pl-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all shadow-2xs"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* تبويبات التصفية السريعة */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              الكل ({drivers.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('online')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                filterMode === 'online'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>المتصلين فقط ({onlineCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('offline')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filterMode === 'offline'
                  ? 'bg-slate-700 text-white shadow-2xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              غير المتصلين ({Math.max(0, drivers.length - onlineCount)})
            </button>
          </div>
        </div>

        {/* قائمة المناديب */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-2.5 flex-1">
          {filteredDrivers.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              لا يوجد مناديب يطابقون خيارات البحث المحددة.
            </div>
          ) : (
            filteredDrivers.map((driver) => {
              const isOnline = isDriverOnline ? isDriverOnline(driver.id) : false;
              const driverOrders = (orders || []).filter((o) => o && o.driver_id === driver.id);
              const activeCount = driverOrders.filter(
                (o) =>
                  o &&
                  (o.status === 'delivering' ||
                    o.status === 'preparing' ||
                    o.status === 'assigned' ||
                    o.status === 'pending')
              ).length;
              const deliveredCount = driverOrders.filter((o) => o && o.status === 'delivered').length;
              const driverName = driver.name || driver.full_name || 'مندوب';

              return (
                <div
                  key={driver.id}
                  className={`border rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors shadow-2xs ${
                    isOnline
                      ? 'bg-emerald-50/30 border-emerald-200/80 hover:border-emerald-300'
                      : 'bg-slate-50/70 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* أيقونة المندوب مع شارة الاتصال */}
                    <div className="relative">
                      <div
                        className={`w-10 h-10 rounded-xl border flex items-center justify-center shadow-2xs ${
                          isOnline
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                            : 'bg-orange-50 border-orange-100 text-orange-600'
                        }`}
                      >
                        <Bike className="w-5 h-5" />
                      </div>
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                          isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                        }`}
                        title={isOnline ? 'متصل الآن' : 'غير متصل'}
                      />
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900">{driver.name}</h4>

                        {/* حالة الاتصال الحي */}
                        {isOnline ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                            متصل الآن (التطبيق مفتوح)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                            آخر ظهور: {formatLastSeen(driver.last_seen_at, false)}
                          </span>
                        )}

                        {/* حالة الطلبات */}
                        {activeCount > 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {activeCount} قيد التوصيل
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            متاح لطلبات جديدة
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                        <span className="font-mono text-[11px]" dir="ltr">
                          {driver.phone || 'بدون هاتف'}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span>أنجز اليوم: {deliveredCount} طلب</span>
                        <span className="text-slate-300">•</span>
                        <span>عمولة: {driver.commission_percentage ?? 70}%</span>
                      </div>
                    </div>
                  </div>

                  {/* زر الاتصال المباشر بالمندوب */}
                  {driver.phone ? (
                    <a
                      href={`tel:${driver.phone}`}
                      className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-xs font-semibold shadow-xs hover:shadow transition-all shrink-0"
                      title={`الاتصال بالمندوب ${driver.name}`}
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>اتصال بالمندوب</span>
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400 shrink-0">لا يوجد رقم مسجل</span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
