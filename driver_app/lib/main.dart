import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'core/constants.dart';
import 'core/theme.dart';
import 'screens/splash/splash_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Set preferred orientation to portrait
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  // Set system UI overlay style
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
    ),
  );

  // Initialize Supabase
  await Supabase.initialize(
    url: AppConstants.supabaseUrl,
    // ignore: deprecated_member_use
    anonKey: AppConstants.supabaseAnonKey,
  );

  runApp(const SinjabDriverApp());
}

class SinjabDriverApp extends StatelessWidget {
  const SinjabDriverApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'سنجاب دليفري - المندوب',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      // Arabic RTL localization
      locale: const Locale('ar', 'SY'),
      supportedLocales: const [
        Locale('ar', 'SY'),
        Locale('ar', ''),
        Locale('en', ''),
      ],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      home: const SplashScreen(),
    );
  }
}
