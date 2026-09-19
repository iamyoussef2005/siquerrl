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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0e131f] border border-[#1e2739] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl relative flex flex-col">
        {/* رأس النافذة */}
        <div className="flex items-center justify-between p-4 sm:p-5 px-6 border-b border-[#1b2234] bg-[#0e131f] z-20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Bike className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
                  كادر مناديب التوصيل المتاحين
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                  {drivers.length} مناديب
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                متابعة المناديب الميدانيين والتواصل معهم للإجابة على استفسارات الزبائن
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* شريط البحث */}
        <div className="p-3.5 border-b border-[#1b2234] bg-[#0b0f19]">
          <div className="relative">
            <input
              type="text"
              placeholder="بحث باسم المندوب أو رقم الهاتف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#121724] border border-[#222c40] rounded-lg pr-9 pl-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-colors"
            />
            <Search className="w-4 h-4 text-slate-500 absolute right-3 top-2.5 pointer-events-none" />
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
                (o) => o.status === 'delivering' || o.status === 'assigned'
              ).length;
              const deliveredCount = driverOrders.filter((o) => o.status === 'delivered').length;

              return (
                <div
                  key={driver.id}
                  className="bg-[#0b0f19] border border-[#1b2234] rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors hover:border-slate-700"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
                      <Bike className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-white">{driver.name}</h4>
                        {activeCount > 0 ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {activeCount} قيد التوصيل
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            متاح حالياً
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                        <span className="font-mono text-[11px]" dir="ltr">
                          {driver.phone || 'بدون هاتف'}
                        </span>
                        <span className="text-slate-600">•</span>
                        <span>أنجز اليوم: {deliveredCount} طلب</span>
                      </div>
                    </div>
                  </div>

                  {/* زر الاتصال المباشر بالمندوب */}
                  {driver.phone ? (
                    <a
                      href={`tel:${driver.phone}`}
                      className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors"
                      title={`الاتصال بالمندوب ${driver.name}`}
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>اتصال بالمندوب</span>
                    </a>
                  ) : (
                    <span className="text-xs text-slate-500">لا يوجد رقم مسجل</span>
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
