import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/constants.dart';

class EmptyOrdersView extends StatelessWidget {
  final VoidCallback onRefresh;

  const EmptyOrdersView({super.key, required this.onRefresh});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 40),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                color: AppConstants.primaryLight,
                shape: BoxShape.circle,
                border: Border.all(color: const Color(0xFFFED7AA), width: 1.5),
              ),
              child: const Icon(
                Icons.check_circle_outline_rounded,
                color: AppConstants.primaryOrange,
                size: 52,
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'لا توجد طلبات نشطة حالياً',
              style: GoogleFonts.alexandria(
                fontSize: 17,
                fontWeight: FontWeight.w800,
                color: const Color(0xFF0F172A),
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              'أنت متفرغ الآن! بمجرد أن تقوم إدارة العمليات بإسناد طلب جديد إليك سيظهر هنا فوراً وبشكل لحظي.',
              style: GoogleFonts.alexandria(
                fontSize: 12,
                color: const Color(0xFF64748B),
                height: 1.6,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            OutlinedButton.icon(
              onPressed: onRefresh,
              icon: const Icon(Icons.refresh_rounded, size: 18),
              label: Text(
                'تحديث القائمة الآن',
                style: GoogleFonts.alexandria(fontSize: 12, fontWeight: FontWeight.w700),
              ),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppConstants.primaryOrange,
                side: const BorderSide(color: AppConstants.primaryOrange),
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
