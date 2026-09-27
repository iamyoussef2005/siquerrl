import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'constants.dart';

class AppTheme {
  static ThemeData get lightTheme {
    final baseFont = GoogleFonts.alexandriaTextTheme();

    return ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: AppConstants.primaryOrange,
        primary: AppConstants.primaryOrange,
        secondary: AppConstants.primaryAmber,
        surface: AppConstants.cardBg,
        brightness: Brightness.light,
      ),
      scaffoldBackgroundColor: AppConstants.bgLight,
      textTheme: baseFont.apply(
        bodyColor: const Color(0xFF1E293B),
        displayColor: const Color(0xFF0F172A),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF0F172A),
        elevation: 0,
        centerTitle: true,
        titleTextStyle: GoogleFonts.alexandria(
          fontSize: 16,
          fontWeight: FontWeight.w700,
          color: const Color(0xFF0F172A),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppConstants.primaryOrange,
          foregroundColor: Colors.white,
          elevation: 2,
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 20),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          textStyle: GoogleFonts.alexandria(
            fontSize: 14,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppConstants.primaryOrange, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppConstants.errorRed),
        ),
        labelStyle: GoogleFonts.alexandria(fontSize: 13, color: const Color(0xFF64748B)),
        hintStyle: GoogleFonts.alexandria(fontSize: 13, color: const Color(0xFF94A3B8)),
      ),
      cardTheme: CardThemeData(
        color: AppConstants.cardBg,
        elevation: 1,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
          side: const BorderSide(color: Color(0xFFE2E8F0), width: 1),
        ),
      ),
    );
  }
}
