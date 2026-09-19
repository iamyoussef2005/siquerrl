'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  X,
  UserPlus,
  Users,
  Bike,
  Headphones,
  Mail,
  Lock,
  Phone,
  User,
  Percent,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';

interface StaffManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserCreated?: (role: 'driver' | 'call_center') => void;
}

interface StaffMember {
  id: string;
  full_name: string;
  phone: string | null;
  role: 'admin' | 'call_center' | 'driver';
  commission_percentage?: number | null;
  email?: string | null;
  created_at?: string;
}

export function StaffManagementModal({
  isOpen,
  onClose,
  onUserCreated,
}: StaffManagementModalProps) {
  const { session } = useAuth();
  const [activeTab, setActiveTab] = useState<'create' | 'list'>('create');

  // Form State
  const [role, setRole] = useState<'driver' | 'call_center'>('driver');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [commissionPercentage, setCommissionPercentage] = useState<number>(70);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Staff List State
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);

  // Fetch staff list from API
  const fetchStaff = async () => {
    if (!session?.access_token) return;
    setIsLoadingStaff(true);
    try {
      const res = await fetch('/api/admin/users', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const data = await res.json();
      if (res.ok && data.users) {
        setStaffList(data.users);
      }
    } catch (err) {
      console.error('Error fetching staff:', err);
    } finally {
      setIsLoadingStaff(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStaff();
      setFeedback(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const resetForm = () => {
    setFullName('');
    setPhone('');
    setEmail('');
    setPassword('');
    setCommissionPercentage(70);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!session?.access_token) {
      setFeedback({ type: 'error', text: 'جلسة المستخدم غير صالحة، يرجى إعادة تسجيل الدخول' });
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          email,
          password,
          fullName,
          phone,
          role,
          commissionPercentage: role === 'driver' ? commissionPercentage : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'فشل في إنشاء الحساب');
      }

      setFeedback({
        type: 'success',
        text: `تم إنشاء حساب ${role === 'driver' ? 'المندوب' : 'الكول سنتر'} (${fullName}) بنجاح! يمكنه الآن تسجيل الدخول مباشرة ✨`,
      });

      resetForm();
      fetchStaff();
      if (onUserCreated) {
        onUserCreated(role);
      }
    } catch (err: any) {
      console.error('Create user error:', err);
      setFeedback({
        type: 'error',
        text: err.message || 'حدث خطأ أثناء إنشاء الحساب، يرجى المحاولة مجدداً',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0e131f] border border-[#1e2739] rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl relative flex flex-col">
        {/* رأس النافذة */}
        <div className="flex items-center justify-between p-4 sm:p-5 px-6 border-b border-[#1b2234] sticky top-0 bg-[#0e131f] z-20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
                  إدارة فريق العمل والحسابات
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                  صلاحيات المدير
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                إنشاء حسابات رسمية للمناديب والكول سنتر والتحكم بصلاحياتهم
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

        {/* أشرطة التبويب (إضافة حساب / قائمة الفريق) */}
        <div className="px-6 pt-3 border-b border-[#1b2234] bg-[#0b0f19] flex items-center gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`pb-2.5 text-xs sm:text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer border-b-2 ${
              activeTab === 'create'
                ? 'text-blue-400 border-blue-500'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>إضافة حساب جديد</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('list');
              fetchStaff();
            }}
            className={`pb-2.5 text-xs sm:text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer border-b-2 ${
              activeTab === 'list'
                ? 'text-blue-400 border-blue-500'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>فريق العمل الحالي ({staffList.length})</span>
          </button>
        </div>

        {/* محتوى النافذة */}
        <div className="p-4 sm:p-6 flex-1">
          {activeTab === 'create' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* إشعار وتنبيه النجاح أو الخطأ */}
              {feedback && (
                <div
                  className={`p-3 rounded-lg text-xs font-medium flex items-center gap-2.5 transition-all ${
                    feedback.type === 'success'
                      ? 'bg-emerald-950/40 border border-emerald-800/60 text-emerald-300'
                      : 'bg-rose-950/40 border border-rose-800/60 text-rose-300'
                  }`}
                >
                  {feedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  )}
                  <span>{feedback.text}</span>
                </div>
              )}

              {/* 1. اختيار نوع الحساب (مندوب توصيل أو كول سنتر) */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-300">
                  نوع الحساب والصلاحية <span className="text-rose-400">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* خيار مندوب توصيل */}
                  <div
                    onClick={() => setRole('driver')}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                      role === 'driver'
                        ? 'bg-blue-500/10 border-blue-500/80 text-white'
                        : 'bg-[#121724] border-[#1b2234] hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg ${
                        role === 'driver'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-[#1a2234] text-slate-500'
                      }`}
                    >
                      <Bike className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-semibold text-white">
                        مندوب توصيل (Driver)
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        استلام الطلبات، إدارة التوصيل، واحتساب العمولات
                      </p>
                    </div>
                  </div>

                  {/* خيار موظف كول سنتر */}
                  <div
                    onClick={() => setRole('call_center')}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                      role === 'call_center'
                        ? 'bg-blue-500/10 border-blue-500/80 text-white'
                        : 'bg-[#121724] border-[#1b2234] hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg ${
                        role === 'call_center'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-[#1a2234] text-slate-500'
                      }`}
                    >
                      <Headphones className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-semibold text-white">
                        موظف كول سنتر (Call Center)
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        تسجيل طلبات الزبائن والبحث التلقائي في السجلات
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. بيانات الحساب الأساسية */}
              <div className="bg-[#0b0f19] border border-[#1b2234] rounded-xl p-4 sm:p-5 space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* الاسم الكامل */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      الاسم الكامل <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder="مثال: أحمد محمد علي"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full bg-[#121724] border border-[#222c40] rounded-lg px-3 py-2 pl-10 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-colors"
                      />
                      <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
                    </div>
                  </div>

                  {/* رقم الهاتف */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      رقم الهاتف
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        dir="ltr"
                        placeholder="07XXXXXXXXX"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full bg-[#121724] border border-[#222c40] rounded-lg px-3 py-2 pl-10 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 font-mono text-left transition-colors"
                      />
                      <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                  {/* البريد الإلكتروني لتسجيل الدخول */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      البريد الإلكتروني لتسجيل الدخول <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        dir="ltr"
                        required
                        placeholder="user@delivery.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-[#121724] border border-[#222c40] rounded-lg px-3 py-2 pl-10 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 font-mono text-left transition-colors"
                      />
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
                    </div>
                  </div>

                  {/* كلمة المرور */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      كلمة المرور (6 خانات على الأقل) <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        dir="ltr"
                        required
                        minLength={6}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-[#121724] border border-[#222c40] rounded-lg px-3 py-2 pr-10 pl-10 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 font-mono text-left transition-colors"
                      />
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. نسبة عمولة المندوب (تظهر فقط عند اختيار دور المندوب) */}
                {role === 'driver' && (
                  <div className="pt-3 border-t border-[#1b2234] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-blue-400 flex items-center gap-1.5">
                        <Percent className="w-3.5 h-3.5" />
                        نسبة عمولة المندوب من أجرة التوصيل (%)
                      </label>
                      <span className="text-xs font-mono font-medium text-slate-400">
                        حصة المكتب: {100 - commissionPercentage}%
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="relative w-24">
                        <input
                          type="number"
                          step="any"
                          value={commissionPercentage}
                          onChange={(e) =>
                            setCommissionPercentage(
                              Math.max(0, Math.min(100, parseFloat(e.target.value) || 0))
                            )
                          }
                          className="w-full bg-[#121724] border border-[#222c40] rounded-lg px-3 py-1.5 text-sm font-bold text-white text-center focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 pl-6 font-mono"
                        />
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                          %
                        </span>
                      </div>

                      {/* أزرار النسب السريعة */}
                      <div className="flex items-center gap-1.5">
                        {[70, 75, 80, 85].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setCommissionPercentage(preset)}
                            className={`px-2.5 py-1 text-xs rounded-lg border font-medium transition-colors cursor-pointer ${
                              commissionPercentage === preset
                                ? 'bg-blue-600/20 text-blue-300 border-blue-500/40'
                                : 'bg-[#121724] text-slate-400 border-[#222c40] hover:text-white'
                            }`}
                          >
                            {preset}%
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* أزرار الحفظ */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#1b2234]">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 rounded-lg bg-[#121724] hover:bg-[#1a2234] border border-[#1b2234] text-slate-300 text-xs font-medium transition-colors cursor-pointer"
                >
                  تفريغ
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري إنشاء الحساب...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>إنشاء الحساب رسمياً</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* تبويب استعراض فريق العمل الحالي */
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-slate-400">
                  قائمة بجميع المستخدمين المسجلين وأدوارهم ونسبهم في النظام
                </p>
                <button
                  onClick={fetchStaff}
                  disabled={isLoadingStaff}
                  className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 px-2 py-1 rounded hover:bg-slate-800 transition-colors"
                  title="تحديث القائمة"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingStaff ? 'animate-spin' : ''}`} />
                  <span>تحديث</span>
                </button>
              </div>

              {isLoadingStaff ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                  <span>جاري تحميل بيانات الفريق...</span>
                </div>
              ) : (
                <div className="border border-[#1b2234] rounded-xl overflow-hidden bg-[#0b0f19]">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-[#0e131f] text-slate-400 border-b border-[#1b2234] text-[11px] font-medium">
                        <th className="py-2.5 px-4">المستخدم</th>
                        <th className="py-2.5 px-4">الدور والصلاحية</th>
                        <th className="py-2.5 px-4">البريد الإلكتروني</th>
                        <th className="py-2.5 px-4 text-center">العمولة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1b2234] text-slate-300">
                      {staffList.map((member) => {
                        const isDriver = member.role === 'driver';
                        const isCallCenter = member.role === 'call_center';
                        const isAdmin = member.role === 'admin';

                        return (
                          <tr key={member.id} className="hover:bg-[#121724] transition-colors">
                            <td className="py-2.5 px-4">
                              <div className="font-semibold text-white">{member.full_name}</div>
                              {member.phone && (
                                <div className="text-[11px] text-slate-400 font-mono" dir="ltr">
                                  {member.phone}
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-4">
                              {isAdmin && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700 inline-flex items-center gap-1">
                                  <ShieldCheck className="w-3 h-3 text-blue-400" />
                                  مدير (Admin)
                                </span>
                              )}
                              {isDriver && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-sky-500/10 text-sky-400 border border-sky-500/20 inline-flex items-center gap-1">
                                  <Bike className="w-3 h-3" />
                                  مندوب توصيل
                                </span>
                              )}
                              {isCallCenter && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1">
                                  <Headphones className="w-3 h-3" />
                                  كول سنتر
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 font-mono text-[11px] text-slate-300" dir="ltr">
                              {member.email || '—'}
                            </td>
                            <td className="py-2.5 px-4 text-center font-mono font-medium">
                              {isDriver ? (
                                <span className="text-sky-400 font-bold">
                                  {member.commission_percentage ?? 70}%
                                </span>
                              ) : (
                                <span className="text-slate-500">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
