import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/order_model.dart';
import 'auth_service.dart';

class DriverStats {
  final int activeOrdersCount;
  final int todayDeliveredCount;
  final double todayEarnings;

  DriverStats({
    required this.activeOrdersCount,
    required this.todayDeliveredCount,
    required this.todayEarnings,
  });
}

class OrderService {
  static final SupabaseClient _supabase = Supabase.instance.client;

  // Active statuses visible to the driver
  static const List<String> activeStatuses = ['assigned', 'preparing', 'delivering'];

  // Fetch only active, undelivered orders assigned to the logged-in driver
  static Future<List<OrderModel>> fetchMyActiveOrders() async {
    final user = AuthService.currentUser;
    if (user == null) return [];

    try {
      final List<dynamic> data = await _supabase
          .from('orders')
          .select('*')
          .eq('driver_id', user.id)
          .inFilter('status', activeStatuses)
          .order('created_at', ascending: false);

      return data.map((json) => OrderModel.fromJson(json)).toList();
    } catch (e) {
      debugPrint('Error fetching driver active orders: $e');
      rethrow;
    }
  }

  // Update order status (strictly following database triggers and business rules)
  // Transition path: assigned -> preparing -> delivering -> delivered
  static Future<OrderModel?> updateOrderStatus({
    required int orderId,
    required String newStatus,
  }) async {
    final user = AuthService.currentUser;
    if (user == null) {
      throw Exception('المستخدم غير مسجل الدخول');
    }

    try {
      final response = await _supabase
          .from('orders')
          .update({
            'status': newStatus,
            'updated_at': DateTime.now().toIso8601String(),
          })
          .eq('id', orderId)
          .eq('driver_id', user.id)
          .select()
          .maybeSingle();

      if (response != null) {
        return OrderModel.fromJson(response);
      }
      return null;
    } catch (e) {
      debugPrint('Error updating order status: $e');
      rethrow;
    }
  }

  // Update order items price set by the driver
  static Future<OrderModel?> updateOrderItemsPrice({
    required int orderId,
    required double itemsPrice,
  }) async {
    final user = AuthService.currentUser;
    if (user == null) {
      throw Exception('المستخدم غير مسجل الدخول');
    }

    try {
      final response = await _supabase
          .from('orders')
          .update({
            'items_price': itemsPrice,
            'updated_at': DateTime.now().toIso8601String(),
          })
          .eq('id', orderId)
          .eq('driver_id', user.id)
          .select()
          .maybeSingle();

      if (response != null) {
        return OrderModel.fromJson(response);
      }
      return null;
    } catch (e) {
      debugPrint('Error updating order items price: $e');
      rethrow;
    }
  }

  // Fetch today's financial totals for the driver WITHOUT exposing customer information
  static Future<DriverStats> fetchTodayDriverStats(int activeCount) async {
    final user = AuthService.currentUser;
    if (user == null) {
      return DriverStats(
        activeOrdersCount: 0,
        todayDeliveredCount: 0,
        todayEarnings: 0.0,
      );
    }

    try {
      final now = DateTime.now();
      final todayMidnight = DateTime(now.year, now.month, now.day).toIso8601String();

      // Only query delivered orders for driver fee accumulation
      final List<dynamic> data = await _supabase
          .from('orders')
          .select('driver_fee')
          .eq('driver_id', user.id)
          .eq('status', 'delivered')
          .gte('created_at', todayMidnight);

      double earnings = 0.0;
      for (final row in data) {
        if (row['driver_fee'] != null) {
          earnings += (double.tryParse(row['driver_fee'].toString()) ?? 0.0);
        }
      }

      return DriverStats(
        activeOrdersCount: activeCount,
        todayDeliveredCount: data.length,
        todayEarnings: earnings,
      );
    } catch (e) {
      debugPrint('Error fetching driver stats: $e');
      return DriverStats(
        activeOrdersCount: activeCount,
        todayDeliveredCount: 0,
        todayEarnings: 0.0,
      );
    }
  }

  // Listen to realtime changes for the driver's orders
  static RealtimeChannel subscribeToDriverOrders({
    required VoidCallback onOrdersChanged,
  }) {
    final user = AuthService.currentUser;
    final channelName = 'public:orders:driver_${user?.id ?? "guest"}_${DateTime.now().millisecondsSinceEpoch}';

    final channel = _supabase
        .channel(channelName)
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'orders',
          callback: (payload) {
            onOrdersChanged();
          },
        )
        .subscribe();

    return channel;
  }

  // Fetch financial summary report for the driver (order counts & driver earnings ONLY, zero order details)
  static Future<DriverReportData> fetchDriverReport({
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    final user = AuthService.currentUser;
    if (user == null) {
      return DriverReportData(
        totalOrdersCount: 0,
        totalEarnings: 0.0,
        dailySummaries: [],
      );
    }

    try {
      var query = _supabase
          .from('orders')
          .select('id, driver_fee, created_at')
          .eq('driver_id', user.id)
          .eq('status', 'delivered');

      if (startDate != null) {
        query = query.gte('created_at', startDate.toIso8601String());
      }
      if (endDate != null) {
        query = query.lte('created_at', endDate.toIso8601String());
      }

      final List<dynamic> data = await query.order('created_at', ascending: false);

      int count = data.length;
      double earnings = 0.0;
      final Map<String, List<double>> byDate = {};

      for (final row in data) {
        final fee = (row['driver_fee'] != null)
            ? double.tryParse(row['driver_fee'].toString()) ?? 0.0
            : 0.0;
        earnings += fee;

        if (row['created_at'] != null) {
          final d = DateTime.tryParse(row['created_at'].toString())?.toLocal();
          if (d != null) {
            final dateKey = '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
            byDate.putIfAbsent(dateKey, () => []).add(fee);
          }
        }
      }

      final List<DriverDailySummary> summaries = [];
      byDate.forEach((key, fees) {
        final parts = key.split('-');
        final dateObj = DateTime(int.parse(parts[0]), int.parse(parts[1]), int.parse(parts[2]));
        final dayTotal = fees.fold(0.0, (sum, f) => sum + f);
        summaries.add(DriverDailySummary(
          date: dateObj,
          ordersCount: fees.length,
          totalEarnings: dayTotal,
        ));
      });

      summaries.sort((a, b) => b.date.compareTo(a.date));

      return DriverReportData(
        totalOrdersCount: count,
        totalEarnings: earnings,
        dailySummaries: summaries,
      );
    } catch (e) {
      debugPrint('Error fetching driver report: $e');
      rethrow;
    }
  }
}

class DriverDailySummary {
  final DateTime date;
  final int ordersCount;
  final double totalEarnings;

  DriverDailySummary({
    required this.date,
    required this.ordersCount,
    required this.totalEarnings,
  });
}

class DriverReportData {
  final int totalOrdersCount;
  final double totalEarnings;
  final List<DriverDailySummary> dailySummaries;

  DriverReportData({
    required this.totalOrdersCount,
    required this.totalEarnings,
    required this.dailySummaries,
  });
}
