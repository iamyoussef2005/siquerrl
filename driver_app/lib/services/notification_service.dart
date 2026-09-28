import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

// Top-level background message handler required by FirebaseMessaging
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  debugPrint("Handling a background message: ${message.messageId}");
}

class NotificationService {
  static final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  static final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();

  static const AndroidNotificationChannel _channel = AndroidNotificationChannel(
    'high_importance_channel', // id must match AndroidManifest metadata
    'إشعارات الطلبات الفورية', // title
    description: 'قناة التنبيه بالطلبات الجديدة المسندة للمندوب بصوت واهتزاز عالي الأولوية',
    importance: Importance.max,
    playSound: true,
    enableVibration: true,
  );

  static bool _isInitialized = false;

  /// Initialize Firebase, FCM, and Local Notifications
  static Future<void> initialize() async {
    if (_isInitialized) return;

    try {
      // 1. Initialize Firebase
      await Firebase.initializeApp();

      // 2. Set background message handler
      FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

      // 3. Configure Android Local Notification Channel
      const AndroidInitializationSettings androidSettings =
          AndroidInitializationSettings('@mipmap/ic_launcher');
      const InitializationSettings initSettings =
          InitializationSettings(android: androidSettings);

      await _localNotifications.initialize(
        initSettings,
        onDidReceiveNotificationResponse: (NotificationResponse details) {
          debugPrint('Notification clicked with payload: ${details.payload}');
        },
      );

      // Create the high importance channel on Android
      await _localNotifications
          .resolvePlatformSpecificImplementation<
              AndroidFlutterLocalNotificationsPlugin>()
          ?.createNotificationChannel(_channel);

      // 4. Request Permissions (Android 13+ and iOS)
      final settings = await _messaging.requestPermission(
        alert: true,
        announcement: true,
        badge: true,
        carPlay: false,
        criticalAlert: true,
        provisional: false,
        sound: true,
      );
      debugPrint('Notification permission status: ${settings.authorizationStatus}');

      // 5. Set foreground notification presentation options
      await _messaging.setForegroundNotificationPresentationOptions(
        alert: true,
        badge: true,
        sound: true,
      );

      // 6. Listen for foreground messages
      FirebaseMessaging.onMessage.listen((RemoteMessage message) {
        debugPrint('Got a message whilst in the foreground: ${message.messageId}');
        _showForegroundNotification(message);
      });

      // 7. Listen for token refreshes
      _messaging.onTokenRefresh.listen((newToken) {
        debugPrint('FCM Token refreshed: $newToken');
        syncTokenToDatabase(token: newToken);
      });

      _isInitialized = true;
    } catch (e) {
      debugPrint('Error initializing NotificationService: $e');
    }
  }

  /// Show a Heads-Up local notification when message arrives while app is in foreground
  static void _showForegroundNotification(RemoteMessage message) {
    final notification = message.notification;
    if (notification != null) {
      _localNotifications.show(
        notification.hashCode,
        notification.title ?? 'طلب جديد مسند إليك! 📦',
        notification.body ?? 'لديك طلب توصيل جديد، افتح التطبيق للتفاصيل',
        NotificationDetails(
          android: AndroidNotificationDetails(
            _channel.id,
            _channel.name,
            channelDescription: _channel.description,
            importance: Importance.max,
            priority: Priority.high,
            icon: '@mipmap/ic_launcher',
            playSound: true,
            enableVibration: true,
          ),
        ),
        payload: message.data['order_id']?.toString(),
      );
    }
  }

  /// Retrieve current FCM token and save to Supabase profiles
  static Future<String?> syncTokenToDatabase({String? token}) async {
    try {
      final fcmToken = token ?? await _messaging.getToken();
      if (fcmToken == null) return null;

      final user = Supabase.instance.client.auth.currentUser;
      if (user != null) {
        debugPrint('Saving FCM token for user ${user.id} -> $fcmToken');
        try {
          await Supabase.instance.client.rpc(
            'save_fcm_token',
            params: {'p_fcm_token': fcmToken},
          );
          debugPrint('FCM token saved successfully via RPC');
        } catch (rpcErr) {
          debugPrint('save_fcm_token RPC error: $rpcErr');
        }

        try {
          await Supabase.instance.client
              .from('profiles')
              .update({'fcm_token': fcmToken})
              .eq('id', user.id);
          debugPrint('FCM token saved successfully via direct update');
        } catch (updateErr) {
          debugPrint('profiles update error: $updateErr');
        }
      }
      return fcmToken;
    } catch (e) {
      debugPrint('Error syncing FCM token: $e');
      return null;
    }
  }

  /// Remove FCM token on logout
  static Future<void> clearToken() async {
    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user != null) {
        await Supabase.instance.client
            .from('profiles')
            .update({'fcm_token': null})
            .eq('id', user.id);
      }
      await _messaging.deleteToken();
    } catch (e) {
      debugPrint('Error clearing FCM token: $e');
    }
  }
}
