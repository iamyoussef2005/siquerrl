import 'package:flutter/material.dart';

class AppConstants {
  // Supabase Configuration
  static const String supabaseUrl = 'https://pnjqltmeygtlelrkmbdq.supabase.co';
  static const String supabaseAnonKey =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBuanFsdG1leWd0bGVscmttYmRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2NjE3MDMsImV4cCI6MjEwNTIzNzcwM30.2eRGQcEXzDgQVM9OluiFjbcVp18Iq0o4huORK9xuG48';

  // App Identity
  static const String appName = 'سنجاب دليفري';
  static const String appSubTitle = 'منظومة المناديب والتوصيل السريع';
  static const String logoAsset = 'assets/images/sinjab-logo.png';

  // Color Palette (Sinjab Delivery Signature Colors)
  static const Color primaryOrange = Color(0xFFFF5E00);
  static const Color primaryDark = Color(0xFFEA580C);
  static const Color primaryLight = Color(0xFFFFF7ED);
  static const Color primaryAmber = Color(0xFFF59E0B);

  static const Color bgDark = Color(0xFF0F172A);
  static const Color bgLight = Color(0xFFF8FAFC);
  static const Color cardBg = Color(0xFFFFFFFF);
  static const Color borderLight = Color(0xFFE2E8F0);

  // Status Colors
  static const Color statusAssignedBg = Color(0xFFEFF6FF);
  static const Color statusAssignedText = Color(0xFF1D4ED8);
  static const Color statusAssignedBorder = Color(0xFFBFDBFE);

  static const Color statusPreparingBg = Color(0xFFFFFBEB);
  static const Color statusPreparingText = Color(0xFFB45309);
  static const Color statusPreparingBorder = Color(0xFFFDE68A);

  static const Color statusDeliveringBg = Color(0xFFF0FDF4);
  static const Color statusDeliveringText = Color(0xFF15803D);
  static const Color statusDeliveringBorder = Color(0xFFBBF7D0);

  static const Color successGreen = Color(0xFF10B981);
  static const Color errorRed = Color(0xFFEF4444);
}
