import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/constants.dart';
import '../../models/order_model.dart';
import '../../models/profile_model.dart';
import '../../services/order_service.dart';
import '../../services/presence_service.dart';
import 'widgets/driver_summary_header.dart';
import 'widgets/empty_orders_view.dart';
import 'widgets/order_card.dart';

class DriverHomeScreen extends StatefulWidget {
  final ProfileModel driverProfile;

  const DriverHomeScreen({super.key, required this.driverProfile});

  @override
  State<DriverHomeScreen> createState() => _DriverHomeScreenState();
}

class _DriverHomeScreenState extends State<DriverHomeScreen> with WidgetsBindingObserver {
  List<OrderModel> _orders = [];
  DriverStats _stats = DriverStats(
    activeOrdersCount: 0,
    todayDeliveredCount: 0,
    todayEarnings: 0.0,
  );
  bool _isLoading = true;
  RealtimeChannel? _realtimeChannel;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    PresenceService.startPresence(driverName: widget.driverProfile.fullName);
    _loadData();
    _setupRealtime();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    super.didChangeAppLifecycleState(state);
    switch (state) {
      case AppLifecycleState.resumed:
        PresenceService.resumePresence();
        break;
      case AppLifecycleState.inactive:
      case AppLifecycleState.paused:
      case AppLifecycleState.detached:
      case AppLifecycleState.hidden:
        PresenceService.pausePresence();
        break;
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    PresenceService.pausePresence();
    _realtimeChannel?.unsubscribe();
    super.dispose();
  }

  // Load orders and stats from Supabase
  Future<void> _loadData() async {
    try {
      final orders = await OrderService.fetchMyActiveOrders();
      final stats = await OrderService.fetchTodayDriverStats(orders.length);

      if (mounted) {
        setState(() {
          _orders = orders;
          _stats = stats;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'خطأ أثناء جلب الطلبات: $e',
              textDirection: TextDirection.rtl,
              style: GoogleFonts.alexandria(fontSize: 12),
            ),
            backgroundColor: AppConstants.errorRed,
          ),
        );
      }
    }
  }

  // Setup Realtime listener
  void _setupRealtime() {
    _realtimeChannel = OrderService.subscribeToDriverOrders(
      onOrdersChanged: () {
        debugPrint('Realtime change detected on orders table, refreshing...');
        _loadData();
      },
    );
  }

  // Handle local status update
  void _handleOrderUpdated(OrderModel updatedOrder) {
    setState(() {
      final index = _orders.indexWhere((o) => o.id == updatedOrder.id);
      if (index != -1) {
        _orders[index] = updatedOrder;
      }
    });
  }

  // Handle order delivered -> remove from active list immediately
  void _handleOrderDelivered(int orderId) {
    setState(() {
      _orders.removeWhere((o) => o.id == orderId);
    });
    // Refresh stats to include the newly delivered order
    OrderService.fetchTodayDriverStats(_orders.length).then((newStats) {
      if (mounted) {
        setState(() {
          _stats = newStats;
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppConstants.bgLight,
      body: SafeArea(
        child: Column(
          children: [
            // Top Summary Header
            DriverSummaryHeader(
              driverProfile: widget.driverProfile,
              stats: _stats,
              onRefresh: _loadData,
            ),

            // Orders List / Empty State with Pull to Refresh
            Expanded(
              child: RefreshIndicator(
                onRefresh: _loadData,
                color: AppConstants.primaryOrange,
                child: _isLoading
                    ? const Center(
                        child: CircularProgressIndicator(
                          valueColor: AlwaysStoppedAnimation<Color>(AppConstants.primaryOrange),
                        ),
                      )
                    : _orders.isEmpty
                        ? EmptyOrdersView(onRefresh: _loadData)
                        : ListView.builder(
                            padding: const EdgeInsets.only(top: 8, bottom: 24),
                            itemCount: _orders.length,
                            itemBuilder: (ctx, index) {
                              final order = _orders[index];
                              return OrderCard(
                                key: ValueKey(order.id),
                                order: order,
                                onOrderUpdated: _handleOrderUpdated,
                                onOrderDelivered: _handleOrderDelivered,
                              );
                            },
                          ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
