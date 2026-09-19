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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0e131f] border border-[#1b2234] rounded-xl w-full max-w-4xl max-h-[92vh] overflow-y-auto shadow-2xl relative">
        {/* رأس النافذة */}
        <div className="flex items-center justify-between p-3.5 sm:p-4 px-5 sm:px-6 border-b border-[#1b2234] sticky top-0 bg-[#0e131f]/95 backdrop-blur-md z-20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <PlusCircle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-white leading-tight">
                تسجيل طلب جديد
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                أدخل بيانات الزبون والمواد لإدراج الطلب فورياً في المنظومة
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#141926] border border-transparent hover:border-[#212a3d] transition-all cursor-pointer active:scale-95"
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
