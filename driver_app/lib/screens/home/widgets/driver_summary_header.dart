import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart' hide TextDirection;
import '../../../core/constants.dart';
import '../../../models/profile_model.dart';
import '../../../services/auth_service.dart';
import '../../../services/order_service.dart';
import '../../auth/login_screen.dart';
import '../../reports/driver_report_screen.dart';

class DriverSummaryHeader extends StatelessWidget {
  final ProfileModel driverProfile;
  final DriverStats stats;
  final VoidCallback onRefresh;

  const DriverSummaryHeader({
    super.key,
    required this.driverProfile,
    required this.stats,
    required this.onRefresh,
  });

  void _openReports(BuildContext context, {ReportPeriod period = ReportPeriod.today}) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => DriverReportScreen(
          driverProfile: driverProfile,
          initialPeriod: period,
        ),
      ),
    );
  }

  void _confirmLogout(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            const Icon(Icons.logout, color: AppConstants.errorRed, size: 22),
            const SizedBox(width: 8),
            Text(
              'تسجيل الخروج',
              style: GoogleFonts.alexandria(fontSize: 15, fontWeight: FontWeight.bold),
            ),
          ],
        ),
        content: Text(
          'هل أنت متأكد من رغبتك في تسجيل الخروج من حساب المندوب؟',
          style: GoogleFonts.alexandria(fontSize: 13, color: const Color(0xFF475569)),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(
              'إلغاء',
              style: GoogleFonts.alexandria(color: const Color(0xFF64748B), fontWeight: FontWeight.bold),
            ),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppConstants.errorRed,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            ),
            onPressed: () async {
              Navigator.pop(ctx);
              await AuthService.signOut();
              if (context.mounted) {
                Navigator.of(context).pushReplacement(
                  MaterialPageRoute(builder: (_) => const LoginScreen()),
                );
              }
            },
            child: Text('خروج', style: GoogleFonts.alexandria(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final currencyFormatter = NumberFormat('#,###');

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: const BorderRadius.vertical(bottom: Radius.circular(24)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Top Row: Profile info & Actions
          Row(
            children: [
              // Avatar
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: AppConstants.primaryLight,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFFFED7AA)),
                ),
                child: const Icon(
                  Icons.two_wheeler_rounded,
                  color: AppConstants.primaryOrange,
                  size: 26,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          driverProfile.fullName,
                          style: GoogleFonts.alexandria(
                            fontSize: 15,
                            fontWeight: FontWeight.w800,
                            color: const Color(0xFF0F172A),
                          ),
                        ),
                        const SizedBox(width: 6),
                        Container(
                          width: 8,
                          height: 8,
                          decoration: const BoxDecoration(
                            color: AppConstants.successGreen,
                            shape: BoxShape.circle,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      driverProfile.phone ?? 'مندوب توصيل نشط',
                      style: GoogleFonts.alexandria(
                        fontSize: 11,
                        color: const Color(0xFF64748B),
                        fontWeight: FontWeight.w500,
                      ),
                      textDirection: TextDirection.ltr,
                    ),
                  ],
                ),
              ),
              // Reports button
              IconButton(
                icon: const Icon(Icons.receipt_long_rounded, color: AppConstants.primaryOrange),
                onPressed: () => _openReports(context),
                tooltip: 'تقرير الأرباح والحسابات',
              ),
              // Refresh button
              IconButton(
                icon: const Icon(Icons.refresh_rounded, color: Color(0xFF64748B)),
                onPressed: onRefresh,
                tooltip: 'تحديث الطلبات',
              ),
              // Logout button
              IconButton(
                icon: const Icon(Icons.power_settings_new_rounded, color: Color(0xFFEF4444)),
                onPressed: () => _confirmLogout(context),
                tooltip: 'تسجيل الخروج',
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Stats Cards Grid
          Row(
            children: [
              // Active Orders
              Expanded(
                child: _buildMiniStat(
                  label: 'طلبات قيد التنفيذ',
                  value: '${stats.activeOrdersCount}',
                  unit: 'طلبات',
                  icon: Icons.inventory_2_outlined,
                  color: AppConstants.primaryOrange,
                  bgColor: AppConstants.primaryLight,
                ),
              ),
              const SizedBox(width: 10),
              // Completed Today (Clickable -> opens reports)
              Expanded(
                child: _buildMiniStat(
                  label: 'المكتملة اليوم',
                  value: '${stats.todayDeliveredCount}',
                  unit: 'طلب',
                  icon: Icons.check_circle_outline,
                  color: AppConstants.successGreen,
                  bgColor: const Color(0xFFF0FDF4),
                  onTap: () => _openReports(context, period: ReportPeriod.today),
                ),
              ),
              const SizedBox(width: 10),
              // Today's Earnings (Clickable -> opens reports)
              Expanded(
                child: _buildMiniStat(
                  label: 'مستحقاتك اليوم',
                  value: currencyFormatter.format(stats.todayEarnings),
                  unit: 'ل.س',
                  icon: Icons.payments_outlined,
                  color: const Color(0xFF0D9488),
                  bgColor: const Color(0xFFF0FDFA),
                  onTap: () => _openReports(context, period: ReportPeriod.today),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildMiniStat({
    required String label,
    required String value,
    required String unit,
    required IconData icon,
    required Color color,
    required Color bgColor,
    VoidCallback? onTap,
  }) {
    final content = Container(
      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color.withValues(alpha: 0.25)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Icon(icon, color: color, size: 18),
          const SizedBox(height: 4),
          FittedBox(
            fit: BoxFit.scaleDown,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.baseline,
              textBaseline: TextBaseline.alphabetic,
              children: [
                Text(
                  value,
                  style: GoogleFonts.alexandria(
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    color: color,
                  ),
                ),
                const SizedBox(width: 3),
                Text(
                  unit,
                  style: GoogleFonts.alexandria(
                    fontSize: 9,
                    fontWeight: FontWeight.w600,
                    color: color.withValues(alpha: 0.8),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: GoogleFonts.alexandria(
              fontSize: 9,
              color: const Color(0xFF475569),
              fontWeight: FontWeight.w600,
            ),
            textAlign: TextAlign.center,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );

    if (onTap != null) {
      return Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(14),
          child: content,
        ),
      );
    }

    return content;
  }
}
