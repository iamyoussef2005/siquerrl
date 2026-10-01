import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'auth_service.dart';

class PresenceService {
  static final SupabaseClient _supabase = Supabase.instance.client;
  static RealtimeChannel? _presenceChannel;
  static Timer? _heartbeatTimer;
  static bool _isTracking = false;

  /// Start tracking presence when driver logs in or opens the app
  static Future<void> startPresence({String? driverName}) async {
    final user = AuthService.currentUser;
    if (user == null) return;

    // Avoid duplicate subscriptions
    if (_presenceChannel != null) {
      await resumePresence();
      return;
    }

    try {
      final channel = _supabase.channel('drivers-presence');
      _presenceChannel = channel;

      channel.subscribe((status, [error]) async {
        if (status == RealtimeSubscribeStatus.subscribed) {
          await _track(user.id, driverName: driverName);
        }
      });

      // Update database status immediately
      await _updateDbPresence(isOnline: true);

      // Start periodic heartbeat every 60 seconds to refresh last_seen_at
      _startHeartbeat();
    } catch (e) {
      debugPrint('Error starting driver presence: $e');
    }
  }

  /// App resumed to foreground
  static Future<void> resumePresence() async {
    final user = AuthService.currentUser;
    if (user == null) return;

    if (_presenceChannel == null) {
      await startPresence();
      return;
    }

    await _track(user.id);
    await _updateDbPresence(isOnline: true);
    _startHeartbeat();
  }

  /// App paused / sent to background
  static Future<void> pausePresence() async {
    _heartbeatTimer?.cancel();
    _heartbeatTimer = null;

    await _untrack();
    await _updateDbPresence(isOnline: false);
  }

  /// Driver logged out or app terminated
  static Future<void> stopPresence() async {
    _heartbeatTimer?.cancel();
    _heartbeatTimer = null;

    await _untrack();
    await _updateDbPresence(isOnline: false);

    if (_presenceChannel != null) {
      try {
        await _supabase.removeChannel(_presenceChannel!);
      } catch (e) {
        debugPrint('Error removing presence channel: $e');
      }
      _presenceChannel = null;
    }
  }

  static Future<void> _track(String userId, {String? driverName}) async {
    if (_presenceChannel == null) return;
    try {
      final payload = <String, dynamic>{
        'driver_id': userId,
        'online_at': DateTime.now().toIso8601String(),
      };
      if (driverName != null) {
        payload['name'] = driverName;
      }
      await _presenceChannel!.track(payload);
      _isTracking = true;
      debugPrint('🟢 Driver presence tracked successfully for user $userId');
    } catch (e) {
      debugPrint('Error tracking presence: $e');
    }
  }

  static Future<void> _untrack() async {
    if (_presenceChannel != null && _isTracking) {
      try {
        await _presenceChannel!.untrack();
        _isTracking = false;
        debugPrint('⚪ Driver presence untracked');
      } catch (e) {
        debugPrint('Error untracking presence: $e');
      }
    }
  }

  static void _startHeartbeat() {
    _heartbeatTimer?.cancel();
    _heartbeatTimer = Timer.periodic(const Duration(seconds: 60), (_) async {
      final user = AuthService.currentUser;
      if (user != null) {
        await _updateDbPresence(isOnline: true);
      }
    });
  }

  static Future<void> _updateDbPresence({required bool isOnline}) async {
    final user = AuthService.currentUser;
    if (user == null) return;

    try {
      await _supabase.from('profiles').update({
        'is_online': isOnline,
        'last_seen_at': DateTime.now().toIso8601String(),
      }).eq('id', user.id);
    } catch (e) {
      debugPrint('Error updating profiles presence in DB: $e');
    }
  }
}
