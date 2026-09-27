import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart' hide TextDirection;
import '../../core/constants.dart';
import '../../models/profile_model.dart';
import '../../services/order_service.dart';

enum ReportPeriod {
  today,
  last7Days,
  thisMonth,
  allTime,
}

class DriverReportScreen extends StatefulWidget {
  final ProfileModel driverProfile;
  final ReportPeriod initialPeriod;

  const DriverReportScreen({
    super.key,
    required this.driverProfile,
    this.initialPeriod = ReportPeriod.today,
  });

  @override
  State<DriverReportScreen> createState() => _DriverReportScreenState();
}

class _DriverReportScreenState extends State<DriverReportScreen> {
  late ReportPeriod _selectedPeriod;
  DriverReportData? _reportData;
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _selectedPeriod = widget.initialPeriod;
    _loadReport();
  }

  // Calculate start and end date based on selected period
  (DateTime?, DateTime?) _getDateRange(ReportPeriod period) {
    final now = DateTime.now();
    switch (period) {
      case ReportPeriod.today:
        final start = DateTime(now.year, now.month, now.day);
        return (start, null);
      case ReportPeriod.last7Days:
        final start = DateTime(now.year, now.month, now.day).subtract(const Duration(days: 6));
        return (start, null);
      case ReportPeriod.thisMonth:
        final start = DateTime(now.year, now.month, 1);
        return (start, null);
      case ReportPeriod.allTime:
        return (null, null);
    }
  }

  String _getPeriodTitle(ReportPeriod period) {
    switch (period) {
      case ReportPeriod.today:
        return 'اليوم';
      case ReportPeriod.last7Days:
        return 'آخر 7 أيام';
      case ReportPeriod.thisMonth:
        return 'هذا الشهر';
      case ReportPeriod.allTime:
        return 'كافة الفترات';
    }
  }

  Future<void> _loadReport() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final (startDate, endDate) = _getDateRange(_selectedPeriod);
      final data = await OrderService.fetchDriverReport(
        startDate: startDate,
        endDate: endDate,
      );

      if (mounted) {
        setState(() {
          _reportData = data;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  String _formatCurrency(double val) {
    return NumberFormat('#,###').format(val);
  }

  String _formatArabicDate(DateTime date) {
    try {
      return DateFormat('EEEE، d MMMM y', 'ar').format(date);
    } catch (_) {
      return '${date.year}/${date.month}/${date.day}';
    }
  }

  void _copyReportSummary() {
    if (_reportData == null) return;

    final periodLabel = _getPeriodTitle(_selectedPeriod);
    final count = _reportData!.totalOrdersCount;
    final total = _formatCurrency(_reportData!.totalEarnings);

    final summaryText = '''📊 تقرير حسابات وأرباح المندوب
👤 المندوب: ${widget.driverProfile.fullName}
📅 الفترة: $periodLabel
━━━━━━━━━━━━━━━━━━━━
✅ إجمالي الطلبات المسلّمة: $count طلب
💰 إجمالي الأرباح المستحقة: $total ل.س
━━━━━━━━━━━━━━━━━━━━
سنجاب دليفري • Sinjab Delivery''';

    Clipboard.setData(ClipboardData(text: summaryText));

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          'تم نسخ ملخص التقرير للحافظة بنجاح 📋',
          textDirection: TextDirection.rtl,
          style: GoogleFonts.alexandria(fontSize: 12, fontWeight: FontWeight.bold),
        ),
        backgroundColor: AppConstants.successGreen,
        duration: const Duration(seconds: 3),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppConstants.bgLight,
      appBar: AppBar(
        title: Text(
          'تقرير الأرباح والحسابات',
          style: GoogleFonts.alexandria(fontSize: 16, fontWeight: FontWeight.w800),
        ),
        centerTitle: true,
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF0F172A),
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
          onPressed: () => Navigator.of(context).pop(),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.copy_rounded, size: 20),
            tooltip: 'نسخ ملخص التقرير',
            onPressed: _reportData != null ? _copyReportSummary : null,
          ),
          IconButton(
            icon: const Icon(Icons.refresh_rounded, size: 22),
            tooltip: 'تحديث التقرير',
            onPressed: _loadReport,
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Top Filter Tabs & Driver info
            Container(
              color: Colors.white,
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Driver Info Chip
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(6),
                            decoration: BoxDecoration(
                              color: AppConstants.primaryLight,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Icon(Icons.person_rounded, size: 16, color: AppConstants.primaryOrange),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            widget.driverProfile.fullName,
                            style: GoogleFonts.alexandria(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: const Color(0xFF1E293B),
                            ),
                          ),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          'كشف حساب خاص',
                          style: GoogleFonts.alexandria(
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                            color: const Color(0xFF64748B),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Segmented Tabs
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: ReportPeriod.values.map((period) {
                        final isSelected = _selectedPeriod == period;
                        return Padding(
                          padding: const EdgeInsets.only(left: 8),
                          child: InkWell(
                            onTap: () {
                              if (_selectedPeriod != period) {
                                setState(() {
                                  _selectedPeriod = period;
                                });
                                _loadReport();
                              }
                            },
                            borderRadius: BorderRadius.circular(12),
                            child: AnimatedContainer(
                              duration: const Duration(milliseconds: 200),
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                              decoration: BoxDecoration(
                                color: isSelected ? AppConstants.primaryOrange : const Color(0xFFF8FAFC),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                  color: isSelected ? AppConstants.primaryOrange : const Color(0xFFE2E8F0),
                                ),
                              ),
                              child: Text(
                                _getPeriodTitle(period),
                                style: GoogleFonts.alexandria(
                                  fontSize: 12,
                                  fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                                  color: isSelected ? Colors.white : const Color(0xFF475569),
                                ),
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                ],
              ),
            ),

            // Content Area
            Expanded(
              child: _isLoading
                  ? const Center(
                      child: CircularProgressIndicator(
                        valueColor: AlwaysStoppedAnimation<Color>(AppConstants.primaryOrange),
                      ),
                    )
                  : _errorMessage != null
                      ? Center(
                          child: Padding(
                            padding: const EdgeInsets.all(24.0),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(Icons.error_outline_rounded, color: AppConstants.errorRed, size: 40),
                                const SizedBox(height: 12),
                                Text(
                                  'تعذر تحميل بيانات التقرير',
                                  style: GoogleFonts.alexandria(fontSize: 14, fontWeight: FontWeight.bold),
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  _errorMessage!,
                                  style: GoogleFonts.alexandria(fontSize: 11, color: const Color(0xFF64748B)),
                                  textAlign: TextAlign.center,
                                ),
                                const SizedBox(height: 16),
                                ElevatedButton(
                                  onPressed: _loadReport,
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: AppConstants.primaryOrange,
                                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                                  ),
                                  child: Text(
                                    'إعادة المحاولة',
                                    style: GoogleFonts.alexandria(color: Colors.white, fontWeight: FontWeight.bold),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        )
                      : _reportData == null
                          ? const SizedBox()
                          : RefreshIndicator(
                              onRefresh: _loadReport,
                              color: AppConstants.primaryOrange,
                              child: ListView(
                                padding: const EdgeInsets.all(16),
                                children: [
                                  // 1. Two Main KPI Cards (Orders Count & Total Earnings)
                                  Row(
                                    children: [
                                      // Card 1: Completed Orders Count
                                      Expanded(
                                        child: Container(
                                          padding: const EdgeInsets.all(16),
                                          decoration: BoxDecoration(
                                            color: Colors.white,
                                            borderRadius: BorderRadius.circular(18),
                                            border: Border.all(color: const Color(0xFFE2E8F0)),
                                            boxShadow: [
                                              BoxShadow(
                                                color: Colors.black.withValues(alpha: 0.02),
                                                blurRadius: 8,
                                                offset: const Offset(0, 2),
                                              ),
                                            ],
                                          ),
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Container(
                                                padding: const EdgeInsets.all(8),
                                                decoration: BoxDecoration(
                                                  color: const Color(0xFFF0FDF4),
                                                  borderRadius: BorderRadius.circular(10),
                                                  border: Border.all(color: const Color(0xFFBBF7D0)),
                                                ),
                                                child: const Icon(
                                                  Icons.check_circle_rounded,
                                                  color: AppConstants.successGreen,
                                                  size: 20,
                                                ),
                                              ),
                                              const SizedBox(height: 12),
                                              Text(
                                                'عدد الطلبات المسلّمة',
                                                style: GoogleFonts.alexandria(
                                                  fontSize: 11,
                                                  color: const Color(0xFF64748B),
                                                  fontWeight: FontWeight.w600,
                                                ),
                                              ),
                                              const SizedBox(height: 4),
                                              Row(
                                                crossAxisAlignment: CrossAxisAlignment.baseline,
                                                textBaseline: TextBaseline.alphabetic,
                                                children: [
                                                  Text(
                                                    '${_reportData!.totalOrdersCount}',
                                                    style: GoogleFonts.alexandria(
                                                      fontSize: 24,
                                                      fontWeight: FontWeight.w900,
                                                      color: const Color(0xFF0F172A),
                                                    ),
                                                  ),
                                                  const SizedBox(width: 4),
                                                  Text(
                                                    'طلب',
                                                    style: GoogleFonts.alexandria(
                                                      fontSize: 11,
                                                      color: const Color(0xFF64748B),
                                                      fontWeight: FontWeight.w600,
                                                    ),
                                                  ),
                                                ],
                                              ),
                                            ],
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 12),

                                      // Card 2: Total Driver Earnings (أرباحك ومستحقاتك)
                                      Expanded(
                                        child: Container(
                                          padding: const EdgeInsets.all(16),
                                          decoration: BoxDecoration(
                                            color: Colors.white,
                                            borderRadius: BorderRadius.circular(18),
                                            border: Border.all(color: const Color(0xFFFED7AA)),
                                            gradient: const LinearGradient(
                                              colors: [Color(0xFFFFFBEB), Colors.white],
                                              begin: Alignment.topRight,
                                              end: Alignment.bottomLeft,
                                            ),
                                            boxShadow: [
                                              BoxShadow(
                                                color: AppConstants.primaryOrange.withValues(alpha: 0.04),
                                                blurRadius: 10,
                                                offset: const Offset(0, 3),
                                              ),
                                            ],
                                          ),
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Container(
                                                padding: const EdgeInsets.all(8),
                                                decoration: BoxDecoration(
                                                  color: AppConstants.primaryLight,
                                                  borderRadius: BorderRadius.circular(10),
                                                  border: Border.all(color: const Color(0xFFFED7AA)),
                                                ),
                                                child: const Icon(
                                                  Icons.payments_rounded,
                                                  color: AppConstants.primaryOrange,
                                                  size: 20,
                                                ),
                                              ),
                                              const SizedBox(height: 12),
                                              Text(
                                                'إجمالي أرباحك',
                                                style: GoogleFonts.alexandria(
                                                  fontSize: 11,
                                                  color: const Color(0xFF92400E),
                                                  fontWeight: FontWeight.w700,
                                                ),
                                              ),
                                              const SizedBox(height: 4),
                                              FittedBox(
                                                fit: BoxFit.scaleDown,
                                                child: Row(
                                                  crossAxisAlignment: CrossAxisAlignment.baseline,
                                                  textBaseline: TextBaseline.alphabetic,
                                                  children: [
                                                    Text(
                                                      _formatCurrency(_reportData!.totalEarnings),
                                                      style: GoogleFonts.alexandria(
                                                        fontSize: 22,
                                                        fontWeight: FontWeight.w900,
                                                        color: AppConstants.primaryDark,
                                                      ),
                                                    ),
                                                    const SizedBox(width: 4),
                                                    Text(
                                                      'ل.س',
                                                      style: GoogleFonts.alexandria(
                                                        fontSize: 11,
                                                        color: const Color(0xFF92400E),
                                                        fontWeight: FontWeight.w700,
                                                      ),
                                                    ),
                                                  ],
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 20),

                                  // Privacy Notice
                                  Container(
                                    padding: const EdgeInsets.all(12),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFF1F5F9),
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(color: const Color(0xFFE2E8F0)),
                                    ),
                                    child: Row(
                                      children: [
                                        const Icon(Icons.shield_outlined, size: 18, color: Color(0xFF64748B)),
                                        const SizedBox(width: 8),
                                        Expanded(
                                          child: Text(
                                            'هذا التقرير يوضح ملخص طلباتك المكتملة وأرباحك المستحقة فقط دون تفاصيل الزبائن لحماية الخصوصية.',
                                            style: GoogleFonts.alexandria(
                                              fontSize: 10.5,
                                              color: const Color(0xFF475569),
                                              fontWeight: FontWeight.w500,
                                              height: 1.4,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(height: 20),

                                  // 2. Daily Summary Section Header
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        'السجل اليومي للأرباح',
                                        style: GoogleFonts.alexandria(
                                          fontSize: 14,
                                          fontWeight: FontWeight.w800,
                                          color: const Color(0xFF0F172A),
                                        ),
                                      ),
                                      Text(
                                        '${_reportData!.dailySummaries.length} أيام مسجلة',
                                        style: GoogleFonts.alexandria(
                                          fontSize: 11,
                                          color: const Color(0xFF64748B),
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 12),

                                  // 3. Daily Breakdown List
                                  if (_reportData!.dailySummaries.isEmpty)
                                    Container(
                                      padding: const EdgeInsets.all(32),
                                      decoration: BoxDecoration(
                                        color: Colors.white,
                                        borderRadius: BorderRadius.circular(16),
                                        border: Border.all(color: const Color(0xFFE2E8F0)),
                                      ),
                                      child: Column(
                                        children: [
                                          Icon(Icons.event_busy_rounded, size: 40, color: Colors.grey.shade400),
                                          const SizedBox(height: 10),
                                          Text(
                                            'لا توجد طلبات مسلمة في هذه الفترة',
                                            style: GoogleFonts.alexandria(
                                              fontSize: 13,
                                              fontWeight: FontWeight.w700,
                                              color: const Color(0xFF475569),
                                            ),
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            'اختر فترة زمنية أخرى للاطلاع على سجلاتك السابقة',
                                            style: GoogleFonts.alexandria(
                                              fontSize: 11,
                                              color: const Color(0xFF94A3B8),
                                            ),
                                          ),
                                        ],
                                      ),
                                    )
                                  else
                                    ..._reportData!.dailySummaries.map((day) {
                                      return Container(
                                        margin: const EdgeInsets.only(bottom: 10),
                                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                                        decoration: BoxDecoration(
                                          color: Colors.white,
                                          borderRadius: BorderRadius.circular(14),
                                          border: Border.all(color: const Color(0xFFE2E8F0)),
                                        ),
                                        child: Row(
                                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                          children: [
                                            // Date & Count
                                            Expanded(
                                              child: Column(
                                                crossAxisAlignment: CrossAxisAlignment.start,
                                                children: [
                                                  Text(
                                                    _formatArabicDate(day.date),
                                                    style: GoogleFonts.alexandria(
                                                      fontSize: 13,
                                                      fontWeight: FontWeight.w700,
                                                      color: const Color(0xFF1E293B),
                                                    ),
                                                  ),
                                                  const SizedBox(height: 3),
                                                  Row(
                                                    children: [
                                                      const Icon(
                                                        Icons.inventory_2_outlined,
                                                        size: 13,
                                                        color: Color(0xFF64748B),
                                                      ),
                                                      const SizedBox(width: 4),
                                                      Text(
                                                        '${day.ordersCount} طلبات مكتملة',
                                                        style: GoogleFonts.alexandria(
                                                          fontSize: 11,
                                                          color: const Color(0xFF64748B),
                                                          fontWeight: FontWeight.w600,
                                                        ),
                                                      ),
                                                    ],
                                                  ),
                                                ],
                                              ),
                                            ),

                                            // Day Earnings Badge
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                              decoration: BoxDecoration(
                                                color: const Color(0xFFF0FDF4),
                                                borderRadius: BorderRadius.circular(10),
                                                border: Border.all(color: const Color(0xFFBBF7D0)),
                                              ),
                                              child: Text(
                                                '${_formatCurrency(day.totalEarnings)} ل.س',
                                                style: GoogleFonts.alexandria(
                                                  fontSize: 13,
                                                  fontWeight: FontWeight.w800,
                                                  color: const Color(0xFF047857),
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                      );
                                    }),
                                  const SizedBox(height: 16),

                                  // Quick Copy Button
                                  ElevatedButton.icon(
                                    onPressed: _copyReportSummary,
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: Colors.white,
                                      foregroundColor: const Color(0xFF0F172A),
                                      elevation: 0,
                                      side: const BorderSide(color: Color(0xFFCBD5E1)),
                                      padding: const EdgeInsets.symmetric(vertical: 14),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                                    ),
                                    icon: const Icon(Icons.share_outlined, size: 18),
                                    label: Text(
                                      'مشاركة / نسخ تقرير الحساب',
                                      style: GoogleFonts.alexandria(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
            ),
          ],
        ),
      ),
    );
  }
}
