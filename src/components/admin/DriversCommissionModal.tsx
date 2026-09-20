'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types/database';
import {
  X,
  Sliders,
  Percent,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Bike,
  Save,
  DollarSign,
} from 'lucide-react';

interface DriversCommissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  drivers: Profile[];
  onDriversUpdated: () => void;
}

export function DriversCommissionModal({
  isOpen,
  onClose,
  drivers,
  onDriversUpdated,
}: DriversCommissionModalProps) {
  const [rates, setRates] = useState<Record<string, number>>({});
  const [savingDriverId, setSavingDriverId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ id: string; type: 'success' | 'error'; text: string } | null>(null);

  // Sync state when drivers prop changes
  useEffect(() => {
    if (drivers && drivers.length > 0) {
      const initial: Record<string, number> = {};
      drivers.forEach((d) => {
        initial[d.id] = d.commission_percentage ?? 70;
      });
      setRates(initial);
    }
  }, [drivers, isOpen]);

  if (!isOpen) return null;

  const handleRateChange = (driverId: string, value: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(value)));
    setRates((prev) => ({ ...prev, [driverId]: clamped }));
  };

  const handleSaveDriverRate = async (driver: Profile) => {
    const rateToSave = rates[driver.id] ?? 70;
    setSavingDriverId(driver.id);
    setFeedback(null);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ commission_percentage: rateToSave })
        .eq('id', driver.id);

      if (error) throw error;

      setFeedback({
        id: driver.id,
        type: 'success',
        text: `تم حفظ نسبة ${driver.name} بنجاح (${rateToSave}%) ✨`,
      });

      onDriversUpdated();

      setTimeout(() => {
        setFeedback(null);
      }, 3500);
    } catch (err: any) {
      console.error('Error updating driver commission:', err);
      setFeedback({
        id: driver.id,
        type: 'error',
        text: `حدث خطأ أثناء الحفظ: ${err.message || 'يرجى المحاولة مجدداً'}`,
      });
    } finally {
      setSavingDriverId(null);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US').format(val || 0);
  };

  // Sample delivery fee for demonstration
  const sampleFee = 5000;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl relative">
        {/* رأس النافذة */}
        <div className="flex items-center justify-between p-4 sm:p-5 px-6 border-b border-slate-200 sticky top-0 bg-white z-20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-100 text-blue-600">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                  إدارة نسب وعمولات المناديب
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                  {drivers.length} مناديب
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                تحديد نسبة عمولة كل مندوب من أجور التوصيل وحفظها مباشرة في النظام
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* محتوى النافذة */}
        <div className="p-4 sm:p-6 space-y-4">
          <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3 text-xs text-blue-900 flex items-center gap-2.5 font-medium">
            <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700 shrink-0">
              <Percent className="w-4 h-4" />
            </div>
            <span>
              عند إسناد أي طلب للمندوب، سيتم توزيع أجرة التوصيل تلقائياً في قاعدة البيانات وفقاً للنسبة المحددة هنا.
            </span>
          </div>

          {drivers.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              لا يوجد مناديب مسجلين حالياً في النظام.
            </div>
          ) : (
            <div className="space-y-3">
              {drivers.map((driver) => {
                const currentRate = rates[driver.id] ?? driver.commission_percentage ?? 70;
                const officeRate = 100 - currentRate;
                const driverEst = Math.round((sampleFee * currentRate) / 100);
                const officeEst = Math.max(0, sampleFee - driverEst);
                const isSaving = savingDriverId === driver.id;
                const isFeedback = feedback?.id === driver.id;

                return (
                  <div
                    key={driver.id}
                    className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 space-y-3 shadow-2xs"
                  >
                    {/* معلومات المندوب وأدوات التحكم */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-200 text-sky-700 flex items-center justify-center">
                          <Bike className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-900">{driver.name}</h4>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200 font-mono">
                              {currentRate}% عمولة
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 font-mono mt-0.5" dir="ltr">
                            {driver.phone || 'بدون هاتف'}
                          </p>
                        </div>
                      </div>

                      {/* شريط الإدخال والتحكم بالنسبة */}
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="relative w-20">
                          <input
                            type="number"
                            step="any"
                            value={currentRate}
                            onChange={(e) => handleRateChange(driver.id, parseFloat(e.target.value) || 0)}
                            className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-900 text-center focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 pl-5 font-mono shadow-2xs"
                          />
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none font-bold">
                            %
                          </span>
                        </div>

                        {/* أزرار النسب السريعة */}
                        <div className="flex items-center gap-1">
                          {[70, 75, 80].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => handleRateChange(driver.id, preset)}
                              className={`px-2.5 py-1 text-xs rounded-lg border font-bold transition-colors cursor-pointer ${
                                currentRate === preset
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {preset}%
                            </button>
                          ))}
                        </div>

                        {/* زر الحفظ */}
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => handleSaveDriverRate(driver)}
                          className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                          title="حفظ النسبة في قاعدة البيانات"
                        >
                          {isSaving ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Save className="w-3.5 h-3.5" />
                          )}
                          <span>حفظ</span>
                        </button>
                      </div>
                    </div>

                    {/* شريط نسبة مئوية مرئي */}
                    <div className="space-y-1 pt-1">
                      <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden flex">
                        <div
                          style={{ width: `${currentRate}%` }}
                          className="bg-blue-600 h-full transition-all duration-300"
                        />
                        <div
                          style={{ width: `${officeRate}%` }}
                          className="bg-slate-400 h-full transition-all duration-300"
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-blue-700 font-bold">السائق: {currentRate}%</span>
                        <span className="text-slate-600 font-bold">المكتب: {officeRate}%</span>
                      </div>
                    </div>

                    {/* معاينة حية للتوزيع المالي الافتراضي */}
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div className="bg-white border border-slate-200 rounded-xl p-2.5 flex items-center justify-between shadow-2xs">
                        <span className="text-slate-500 font-medium">حصة المندوب ({currentRate}%):</span>
                        <span className="font-bold text-emerald-700">
                          {formatCurrency(driverEst)} ل.س{' '}
                          <span className="text-[10px] text-slate-400 font-normal">(من {formatCurrency(sampleFee)})</span>
                        </span>
                      </div>
                      <div className="bg-white border border-slate-200 rounded-xl p-2.5 flex items-center justify-between shadow-2xs">
                        <span className="text-slate-500 font-medium">حصة المكتب ({officeRate}%):</span>
                        <span className="font-bold text-slate-800">
                          {formatCurrency(officeEst)} ل.س{' '}
                          <span className="text-[10px] text-slate-400 font-normal">(من {formatCurrency(sampleFee)})</span>
                        </span>
                      </div>
                    </div>

                    {/* رسالة تأكيد الحفظ */}
                    {isFeedback && feedback && (
                      <div
                        className={`text-xs p-2.5 rounded-xl flex items-center gap-2 font-semibold shadow-2xs ${
                          feedback.type === 'success'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}
                      >
                        {feedback.type === 'success' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                        <span>{feedback.text}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
