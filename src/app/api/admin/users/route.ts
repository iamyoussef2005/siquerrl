import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Helper: verify if the caller is an authenticated admin
async function verifyAdminCaller(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'غير مصرح بالوصول: لم يتم تزويد توكن الجلسة', status: 401 };
  }

  const token = authHeader.replace('Bearer ', '').trim();

  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !user) {
    console.error('verifyAdminCaller failed auth.getUser:', userError);
    return { error: 'جلسة المستخدم غير صالحة أو منتهية', status: 401 };
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || profile?.role !== 'admin') {
    console.warn(`User ${user.id} tried to perform admin action with role: ${profile?.role}`);
    return { error: 'عذراً، هذه العملية محصورة فقط بحسابات المدير (Admin)', status: 403 };
  }

  return { user, adminClient: supabaseAdmin };
}

// POST: Create a new driver or call_center account
export async function POST(req: NextRequest) {
  try {
    const authCheck = await verifyAdminCaller(req);
    if ('error' in authCheck) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const { adminClient } = authCheck;
    const body = await req.json();

    const {
      email,
      password,
      fullName,
      phone,
      role,
      commissionPercentage,
    } = body;

    // Validation
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'يرجى إدخال بريد إلكتروني صحيح' }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'كلمة المرور يجب أن تكون 6 خانات على الأقل' }, { status: 400 });
    }
    if (!fullName || !fullName.trim()) {
      return NextResponse.json({ error: 'يرجى إدخال اسم المستخدم كاملاً' }, { status: 400 });
    }
    if (role !== 'driver' && role !== 'call_center') {
      return NextResponse.json({ error: 'الدور المحدد غير صالح (يجب أن يكون driver أو call_center)' }, { status: 400 });
    }

    // 1. Create auth user in Supabase Auth
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true, // Auto-confirm email so they can log in right away
      user_metadata: {
        full_name: fullName.trim(),
        phone: phone?.trim() || null,
        role,
      },
    });

    if (authError) {
      console.error('Error in auth.admin.createUser:', authError);
      if (authError.message.includes('already been registered')) {
        return NextResponse.json({ error: 'البريد الإلكتروني مسجل مسبقاً في النظام' }, { status: 400 });
      }
      return NextResponse.json({ error: authError.message || 'فشل في إنشاء الحساب' }, { status: 400 });
    }

    const newUserId = authData.user.id;

    // 2. Insert or update in public.profiles
    const commission = role === 'driver' ? Math.max(0, Math.min(100, Number(commissionPercentage) || 70)) : null;

    const { data: profileData, error: profileError } = await adminClient
      .from('profiles')
      .upsert({
        id: newUserId,
        full_name: fullName.trim(),
        phone: phone?.trim() || null,
        role,
        commission_percentage: commission,
      })
      .select()
      .single();

    if (profileError) {
      console.error('Error inserting into profiles:', profileError);
      return NextResponse.json(
        { error: `تم إنشاء حساب المصادقة لكن حدث خطأ في إعداد الملف الشخصي: ${profileError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `تم إنشاء حساب ${role === 'driver' ? 'المندوب' : 'الكول سنتر'} بنجاح ✨`,
      user: {
        ...profileData,
        email: authData.user.email,
      },
    });
  } catch (err: any) {
    console.error('Server error in /api/admin/users (POST):', err);
    return NextResponse.json(
      { error: err.message || 'حدث خطأ غير متوقع في الخادم' },
      { status: 500 }
    );
  }
}

// GET: List all staff (drivers & call_center) with auth emails
export async function GET(req: NextRequest) {
  try {
    const authCheck = await verifyAdminCaller(req);
    if ('error' in authCheck) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const { adminClient } = authCheck;

    // 1. Fetch profiles
    const { data: profiles, error: profilesError } = await adminClient
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (profilesError) throw profilesError;

    // 2. Fetch auth users list to map emails
    const { data: { users: authUsers }, error: authUsersError } = await adminClient.auth.admin.listUsers();
    if (authUsersError) throw authUsersError;

    const emailMap = new Map(authUsers.map((u) => [u.id, u.email]));

    const staffList = (profiles || []).map((p) => ({
      ...p,
      email: emailMap.get(p.id) || null,
    }));

    return NextResponse.json({ users: staffList });
  } catch (err: any) {
    console.error('Server error in /api/admin/users (GET):', err);
    return NextResponse.json(
      { error: err.message || 'حدث خطأ أثناء جلب قائمة المستخدمين' },
      { status: 500 }
    );
  }
}

// DELETE: Delete a staff member account (driver or call_center)
export async function DELETE(req: NextRequest) {
  try {
    const authCheck = await verifyAdminCaller(req);
    if ('error' in authCheck) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const { user: callerUser, adminClient } = authCheck;
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json({ error: 'معرّف المستخدم (ID) مطلوب للحذف' }, { status: 400 });
    }

    // 1. Prevent admin from deleting their own account
    if (userId === callerUser.id) {
      return NextResponse.json(
        { error: 'لا يمكنك حذف حسابك الشخصي الذي تستخدمه حالياً لتسجيل الدخول' },
        { status: 400 }
      );
    }

    // 2. Fetch the target profile to check role
    const { data: targetProfile, error: targetError } = await adminClient
      .from('profiles')
      .select('id, full_name, role')
      .eq('id', userId)
      .maybeSingle();

    if (targetError || !targetProfile) {
      return NextResponse.json({ error: 'لم يتم العثور على الحساب المطلوب حذفه' }, { status: 404 });
    }

    // 3. Prevent deleting another admin account
    if (targetProfile.role === 'admin') {
      return NextResponse.json(
        { error: 'لا يمكن حذف حسابات المدراء عبر هذه النافذة لحماية أمان النظام' },
        { status: 403 }
      );
    }

    // 4. Detach driver_id from any orders before deletion
    await adminClient
      .from('orders')
      .update({ driver_id: null })
      .eq('driver_id', userId);

    // 5. Delete the profile record from public.profiles
    const { error: deleteProfileError } = await adminClient
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (deleteProfileError) {
      console.error('Error deleting profile:', deleteProfileError);
      return NextResponse.json(
        { error: `حدث خطأ أثناء حذف الملف الشخصي: ${deleteProfileError.message}` },
        { status: 500 }
      );
    }

    // 6. Delete the user from Supabase Auth so they can no longer log in
    const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteAuthError) {
      console.warn('Notice: auth user deletion warning:', deleteAuthError);
    }

    return NextResponse.json({
      success: true,
      message: `تم حذف حساب ${targetProfile.role === 'driver' ? 'المندوب' : 'موظف الكول سنتر'} (${targetProfile.full_name}) نهائياً بنجاح 🗑️`,
    });
  } catch (err: any) {
    console.error('Server error in /api/admin/users (DELETE):', err);
    return NextResponse.json(
      { error: err.message || 'حدث خطأ غير متوقع أثناء حذف الحساب' },
      { status: 500 }
    );
  }
}

