'use client';

import React from 'react';
import { Order } from '@/types/database';
import { NewOrderForm } from '@/components/NewOrderForm';
import { X, PlusCircle } from 'lucide-react';

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated: (order: Order) => void;
}

export function CreateOrderModal({
  isOpen,
  onClose,
  onOrderCreated,
}: CreateOrderModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto shadow-xl relative">
        {/* رأس النافذة */}
        <div className="flex items-center justify-between p-3.5 sm:p-4 px-5 sm:px-6 border-b border-slate-200 sticky top-0 bg-white/95 backdrop-blur-md z-20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-50 border border-orange-100 text-orange-600 shadow-2xs">
              <PlusCircle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                تسجيل طلب جديد
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                أدخل بيانات الزبون والمواد لإدراج الطلب فورياً في المنظومة
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all cursor-pointer active:scale-95"
            title="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* نموذج إدخال الطلب */}
        <div className="p-4 sm:p-6">
          <NewOrderForm
            onOrderCreated={(newOrder) => {
              onOrderCreated(newOrder);
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
}
