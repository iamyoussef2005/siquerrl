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
  Trash2,
  AlertTriangle,
} from 'lucide-react';

interface StaffManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserCreated?: (role: 'driver' | 'call_center') => void;
  onUserDeleted?: (role: 'driver' | 'call_center') => void;
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
  onUserDeleted,
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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<StaffMember | null>(null);

  // Helper to get freshest valid session token (auto-refreshes expired tokens)
  const getValidToken = async (): Promise<string | null> => {
    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.access_token) {
        return data.session.access_token;
      }
      const { data: refreshed } = await supabase.auth.refreshSession();
      if (refreshed?.session?.access_token) {
        return refreshed.session.access_token;
      }
    } catch (e) {
      console.warn('Error refreshing session:', e);
    }
    return session?.access_token || null;
  };

  // Fetch staff list from API (with direct database fallback)
  const fetchStaff = async () => {
    const token = await getValidToken();
    if (!token) return;
    setIsLoadingStaff(true);
    try {
      const res = await fetch('/api/admin/users', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok && data.users && data.users.length > 0) {
        setStaffList(data.users);
        return;
      }

      // Fallback to direct profiles query if API didn't return users
      const { data: directProfiles } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (directProfiles && directProfiles.length > 0) {
        setStaffList(directProfiles);
      }
    } catch (err) {
      console.error('Error fetching staff from API, falling back to direct query:', err);
      const { data: directProfiles } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (directProfiles && directProfiles.length > 0) {
        setStaffList(directProfiles);
      }
    } finally {
      setIsLoadingStaff(false);
    }
  };

  // Delete a staff member (driver or call_center)
  const handleDeleteMember = async (member: StaffMember) => {
    const token = await getValidToken();
    if (!token) {
      setFeedback({ type: 'error', text: 'جلسة المستخدم منتهية، يرجى إعادة تسجيل الدخول' });
      return;
    }

    setDeletingId(member.id);
    setFeedback(null);

    try {
      const res = await fetch(`/api/admin/users?id=${member.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'فشلت عملية حذف الحساب');
      }

      // Remove member from local state
      setStaffList((prev) => prev.filter((m) => m.id !== member.id));
      setFeedback({ type: 'success', text: data.message || 'تم حذف الحساب بنجاح' });
      setMemberToDelete(null);

      // Trigger parent callback to refresh driver lists if needed
      if (onUserDeleted) {
        onUserDeleted(member.role as 'driver' | 'call_center');
      }
    } catch (err: any) {
      console.error('Error deleting staff member:', err);
      setFeedback({ type: 'error', text: err.message || 'حدث خطأ أثناء محاولة حذف الحساب' });
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStaff();
      setFeedback(null);
      setMemberToDelete(null);
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

    const token = await getValidToken();
    if (!token) {
      setFeedback({ type: 'error', text: 'جلسة المستخدم غير صالحة أو منتهية، يرجى إعادة تسجيل الدخول للوحة التحكم' });
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl relative flex flex-col">
        {/* رأس النافذة */}
        <div className="flex items-center justify-between p-4 sm:p-5 px-6 border-b border-slate-200 sticky top-0 bg-white z-20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-50 border border-orange-100 text-orange-600">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                  إدارة فريق العمل والحسابات
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  صلاحيات المدير
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                إنشاء حسابات رسمية للمناديب والكول سنتر والتحكم بصلاحياتهم
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

        {/* أشرطة التبويب (إضافة حساب / قائمة الفريق) */}
        <div className="px-6 pt-3 border-b border-slate-200 bg-slate-50/80 flex items-center gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`pb-2.5 text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer border-b-2 ${
              activeTab === 'create'
                ? 'text-orange-600 border-orange-600'
                : 'text-slate-500 border-transparent hover:text-slate-800'
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
            className={`pb-2.5 text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer border-b-2 ${
              activeTab === 'list'
                ? 'text-orange-600 border-orange-600'
                : 'text-slate-500 border-transparent hover:text-slate-800'
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
                  className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all shadow-2xs ${
                    feedback.type === 'success'
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border border-rose-200 text-rose-800'
                  }`}
                >
                  {feedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  )}
                  <span>{feedback.text}</span>
                </div>
              )}

              {/* 1. اختيار نوع الحساب (مندوب توصيل أو كول سنتر) */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  نوع الحساب والصلاحية <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* خيار مندوب توصيل */}
                  <div
                    onClick={() => setRole('driver')}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                      role === 'driver'
                        ? 'bg-orange-50/70 border-orange-500 text-slate-900 ring-1 ring-orange-500/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50/50 shadow-2xs'
                    }`}
                  >
                    <div
                      className={`p-2.5 rounded-xl transition-colors ${
                        role === 'driver'
                          ? 'bg-orange-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <Bike className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-bold text-slate-900">
                        مندوب توصيل (Driver)
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        استلام الطلبات، إدارة التوصيل، واحتساب العمولات
                      </p>
                    </div>
                  </div>

                  {/* خيار موظف كول سنتر */}
                  <div
                    onClick={() => setRole('call_center')}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                      role === 'call_center'
                        ? 'bg-orange-50/70 border-orange-500 text-slate-900 ring-1 ring-orange-500/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50/50 shadow-2xs'
                    }`}
                  >
                    <div
                      className={`p-2.5 rounded-xl transition-colors ${
                        role === 'call_center'
                          ? 'bg-orange-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <Headphones className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-bold text-slate-900">
                        موظف كول سنتر (Call Center)
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        تسجيل طلبات الزبائن والبحث التلقائي في السجلات
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. بيانات الحساب الأساسية */}
              <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* الاسم الكامل */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      الاسم الكامل <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder="مثال: أحمد محمد علي"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 pl-10 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-colors shadow-2xs"
                      />
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                    </div>
                  </div>

                  {/* رقم الهاتف */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      رقم الهاتف
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        dir="ltr"
                        placeholder="07XXXXXXXXX"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 pl-10 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 font-mono text-left transition-colors shadow-2xs"
                      />
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                  {/* البريد الإلكتروني لتسجيل الدخول */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      البريد الإلكتروني لتسجيل الدخول <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        dir="ltr"
                        required
                        placeholder="user@delivery.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 pl-10 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 font-mono text-left transition-colors shadow-2xs"
                      />
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                    </div>
                  </div>

                  {/* كلمة المرور */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      كلمة المرور (6 خانات على الأقل) <span className="text-rose-500">*</span>
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
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 pr-10 pl-10 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 font-mono text-left transition-colors shadow-2xs"
                      />
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. نسبة عمولة المندوب (تظهر فقط عند اختيار دور المندوب) */}
                {role === 'driver' && (
                  <div className="pt-3 border-t border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-orange-700 flex items-center gap-1.5">
                        <Percent className="w-3.5 h-3.5" />
                        نسبة عمولة المندوب من أجرة التوصيل (%)
                      </label>
                      <span className="text-xs font-mono font-semibold text-slate-500">
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
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-sm font-bold text-slate-900 text-center focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 pl-6 font-mono shadow-2xs"
                        />
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none font-bold">
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
                            className={`px-3 py-1 text-xs rounded-lg border font-bold transition-colors cursor-pointer ${
                              commissionPercentage === preset
                                ? 'bg-orange-600 text-white border-orange-600 shadow-2xs'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
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
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  تفريغ
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-sinjab-primary flex items-center gap-2 px-5 py-2 rounded-xl text-white text-xs font-bold disabled:opacity-50 transition-colors cursor-pointer shadow-xs"
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
                <p className="text-xs font-medium text-slate-500">
                  قائمة بجميع المستخدمين المسجلين وأدوارهم ونسبهم في النظام
                </p>
                <button
                  onClick={fetchStaff}
                  disabled={isLoadingStaff}
                  className="flex items-center gap-1.5 text-xs font-bold text-orange-600 hover:text-orange-700 px-2.5 py-1 rounded-lg hover:bg-orange-50 transition-colors cursor-pointer"
                  title="تحديث القائمة"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingStaff ? 'animate-spin' : ''}`} />
                  <span>تحديث</span>
                </button>
              </div>

              {isLoadingStaff ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs font-medium">
                  <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
                  <span>جاري تحميل بيانات الفريق...</span>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[11px] font-bold">
                        <th className="py-2.5 px-4">المستخدم</th>
                        <th className="py-2.5 px-4">الدور والصلاحية</th>
                        <th className="py-2.5 px-4">البريد الإلكتروني</th>
                        <th className="py-2.5 px-4 text-center">العمولة</th>
                        <th className="py-2.5 px-4 text-center">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {staffList.map((member) => {
                        const isDriver = member.role === 'driver';
                        const isCallCenter = member.role === 'call_center';
                        const isAdmin = member.role === 'admin';

                        return (
                          <tr key={member.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2.5 px-4">
                              <div className="font-bold text-slate-900">{member.full_name}</div>
                              {member.phone && (
                                <div className="text-[11px] text-slate-500 font-mono" dir="ltr">
                                  {member.phone}
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-4">
                              {isAdmin && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 inline-flex items-center gap-1">
                                  <ShieldCheck className="w-3 h-3 text-orange-600" />
                                  مدير (Admin)
                                </span>
                              )}
                              {isDriver && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200 inline-flex items-center gap-1">
                                  <Bike className="w-3 h-3" />
                                  مندوب توصيل
                                </span>
                              )}
                              {isCallCenter && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                                  <Headphones className="w-3 h-3" />
                                  كول سنتر
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 font-mono text-[11px] text-slate-600" dir="ltr">
                              {member.email || '—'}
                            </td>
                            <td className="py-2.5 px-4 text-center font-mono font-bold">
                              {isDriver ? (
                                <span className="text-orange-600">
                                  {member.commission_percentage ?? 70}%
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              {isAdmin ? (
                                <span className="text-[10px] text-slate-400 font-medium px-2 py-0.5 rounded bg-slate-100">
                                  محمي
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setMemberToDelete(member)}
                                  disabled={deletingId === member.id}
                                  className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center justify-center"
                                  title={`حذف حساب ${member.full_name}`}
                                >
                                  {deletingId === member.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
                                  ) : (
                                    <Trash2 className="w-4 h-4" />
                                  )}
                                </button>
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

        {/* نافذة تأكيد حذف الموظف نهائياً */}
        {memberToDelete && (
          <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-rose-200 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center gap-3 text-rose-600 mb-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">تأكيد حذف الحساب</h4>
                  <p className="text-[11px] text-slate-500">هذا الإجراء نهائي ولا يمكن التراجع عنه</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 mb-4 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                هل أنت متأكد من رغبتك في حذف حساب{' '}
                <strong className="text-slate-900 font-bold">
                  {memberToDelete.full_name}
                </strong>{' '}
                ({memberToDelete.role === 'driver' ? 'مندوب توصيل' : 'موظف كول سنتر'})؟
                سيتم إلغاء صلاحية دخوله للنظام وسحب أي طلبات مرتبطة به.
              </p>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setMemberToDelete(null)}
                  disabled={deletingId !== null}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteMember(memberToDelete)}
                  disabled={deletingId !== null}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {deletingId ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>جاري الحذف...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>تأكيد الحذف نهائياً</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
