'use client';

import React, { useState } from 'react';
import { Profile, Order } from '@/types/database';
import {
  X,
  Bike,
  Phone,
  Search,
  CheckCircle2,
  Truck,
  Users,
  Clock,
} from 'lucide-react';

interface AvailableDriversModalProps {
  isOpen: boolean;
  onClose: () => void;
  drivers: Profile[];
  orders: Order[];
}

export function AvailableDriversModal({
  isOpen,
  onClose,
  drivers,
  orders,
}: AvailableDriversModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  // Filter drivers based on search
  const filteredDrivers = drivers.filter((driver) => {
    const q = searchQuery.trim().toLowerCase();
    return (
      !q ||
      driver.name.toLowerCase().includes(q) ||
      (driver.phone && driver.phone.includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-xl relative flex flex-col">
        {/* رأس النافذة */}
        <div className="flex items-center justify-between p-4 sm:p-5 px-6 border-b border-slate-200 bg-white z-20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-orange-50 border border-orange-100 text-orange-600 shadow-2xs">
              <Bike className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                  كادر مناديب التوصيل المتاحين
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 font-mono shadow-2xs">
                  {drivers.length} مناديب
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                متابعة المناديب الميدانيين والتواصل معهم للإجابة على استفسارات الزبائن
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

        {/* شريط البحث */}
        <div className="p-3.5 border-b border-slate-200 bg-slate-50/70">
          <div className="relative">
            <input
              type="text"
              placeholder="بحث باسم المندوب أو رقم الهاتف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl pr-9 pl-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all shadow-2xs"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
          </div>
        </div>

        {/* قائمة المناديب */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-2.5 flex-1">
          {filteredDrivers.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              لا يوجد مناديب يطابقون عبارة البحث.
            </div>
          ) : (
            filteredDrivers.map((driver) => {
              const driverOrders = orders.filter((o) => o.driver_id === driver.id);
              const activeCount = driverOrders.filter(
                (o) => o.status === 'delivering' || o.status === 'assigned' || o.status === 'pending'
              ).length;
              const deliveredCount = driverOrders.filter((o) => o.status === 'delivered').length;

              return (
                <div
                  key={driver.id}
                  className="bg-slate-50/70 border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors hover:border-slate-300 hover:bg-slate-50 shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100 text-orange-600 flex items-center justify-center shadow-2xs">
                      <Bike className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900">{driver.name}</h4>
                        {activeCount > 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {activeCount} قيد التوصيل
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            متاح حالياً
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                        <span className="font-mono text-[11px]" dir="ltr">
                          {driver.phone || 'بدون هاتف'}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span>أنجز اليوم: {deliveredCount} طلب</span>
                      </div>
                    </div>
                  </div>

                  {/* زر الاتصال المباشر بالمندوب */}
                  {driver.phone ? (
                    <a
                      href={`tel:${driver.phone}`}
                      className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-xs font-semibold shadow-xs hover:shadow transition-all"
                      title={`الاتصال بالمندوب ${driver.name}`}
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>اتصال بالمندوب</span>
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400">لا يوجد رقم مسجل</span>
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
