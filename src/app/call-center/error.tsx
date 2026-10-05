'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AlertTriangle, RefreshCw, Headphones, LogIn, ArrowRight } from 'lucide-react';

export default function CallCenterErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Call Center Page Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#faf6ee] text-zinc-900 flex flex-col items-center justify-center p-4 selection:bg-orange-500 selection:text-white">
      <div className="bg-white border-2 border-[#cdbba2] rounded-3xl p-6 sm:p-8 max-w-lg w-full text-center space-y-5 shadow-lg shadow-orange-950/10 animate-fadeIn">
        {/* الشعار وأيقونة الكول سنتر */}
        <div className="flex items-center justify-center gap-3">
          <div className="relative h-12 w-12 rounded-2xl bg-orange-50 border-2 border-[#d5c3aa] p-1 flex items-center justify-center shadow-xs overflow-hidden">
            <Image
              src="/sinjab-logo.png"
              alt="Sinjab Delivery"
              width={42}
              height={42}
              className="object-contain"
            />
          </div>
          <div className="p-3 rounded-2xl bg-orange-500 text-white shadow-xs">
            <Headphones className="w-6 h-6" />
          </div>
        </div>

        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 border border-orange-300 text-orange-900 text-xs font-bold mb-2">
            <span>لوحة الكول سنتر واستقبال الطلبات</span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-zinc-900 tracking-tight">
            تعذر تحميل بيانات شاشة الكول سنتر
          </h2>
          <p className="text-xs sm:text-sm text-zinc-600 mt-1.5 leading-relaxed font-medium">
            حدث انقطاع مؤقت أثناء مزامنة بيانات الطلبات أو حالة المناديب. اضغط على زر إعادة المحاولة لاستئناف العمل فوراً دون فقدان أي بيانات.
          </p>
        </div>

        {/* تفاصيل الخطأ */}
        {error?.message && (
          <div className="bg-[#fcf8f0] p-3 rounded-xl border border-orange-200 text-right text-xs font-mono text-zinc-700 overflow-x-auto max-h-24">
            <p className="font-bold text-amber-800 mb-0.5 text-[11px]">رسالة النظام:</p>
            <p className="break-all">{error.message}</p>
          </div>
        )}

        {/* أزرار الإجراءات */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto flex-1 btn-sinjab-primary flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-md cursor-pointer active:scale-95 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            <span>إعادة المحاولة والمزامنة</span>
          </button>

          <Link
            href="/login"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 text-zinc-800 text-xs sm:text-sm font-bold transition-all cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>تسجيل الدخول مجدداً</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
