import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/profile_model.dart';
import 'notification_service.dart';
import 'presence_service.dart';

class AuthService {
  static final SupabaseClient _supabase = Supabase.instance.client;

  // Get current auth user
  static User? get currentUser => _supabase.auth.currentUser;

  // Check if authenticated
  static bool get isAuthenticated => currentUser != null;

  // Sign In with email & password and verify driver role
  static Future<ProfileModel> signIn({
    required String email,
    required String password,
  }) async {
    final response = await _supabase.auth.signInWithPassword(
      email: email.trim(),
      password: password,
    );

    final user = response.user;
    if (user == null) {
      throw Exception('فشل تسجيل الدخول، لم يتم استرجاع بيانات المستخدم.');
    }

    // Verify role in `profiles` table
    final profileData = await _supabase
        .from('profiles')
        .select()
        .eq('id', user.id)
        .maybeSingle();

    if (profileData == null) {
      await _supabase.auth.signOut();
      throw Exception('لم يتم العثور على الملف الشخصي لهذا الحساب.');
    }

    final role = profileData['role']?.toString();
    if (role != 'driver') {
      await _supabase.auth.signOut();
      throw Exception('عذراً، هذا التطبيق مخصص لحسابات المناديب الميدانيين فقط.');
    }

    return ProfileModel.fromJson(profileData);
  }

  // Fetch current user's profile
  static Future<ProfileModel?> getProfile() async {
    final user = currentUser;
    if (user == null) return null;

    try {
      final profileData = await _supabase
          .from('profiles')
          .select()
          .eq('id', user.id)
          .maybeSingle();

      if (profileData != null) {
        return ProfileModel.fromJson(profileData);
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  // Sign out
  static Future<void> signOut() async {
    try {
      await PresenceService.stopPresence();
    } catch (_) {}
    try {
      await NotificationService.clearToken();
    } catch (_) {}
    await _supabase.auth.signOut();
  }
}
