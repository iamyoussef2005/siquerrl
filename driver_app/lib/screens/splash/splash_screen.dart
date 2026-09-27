import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/constants.dart';
import '../../services/auth_service.dart';
import '../auth/login_screen.dart';
import '../home/driver_home_screen.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> with TickerProviderStateMixin {
  late AnimationController _entryController;
  late AnimationController _pulseController;

  late Animation<double> _scaleAnimation;
  late Animation<double> _fadeAnimation;
  late Animation<Offset> _slideAnimation;
  late Animation<double> _glowAnimation;

  @override
  void initState() {
    super.initState();

    // Entry entrance animation
    _entryController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    );

    _scaleAnimation = Tween<double>(begin: 0.82, end: 1.0).animate(
      CurvedAnimation(parent: _entryController, curve: Curves.easeOutBack),
    );

    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _entryController, curve: const Interval(0.0, 0.7, curve: Curves.easeIn)),
    );

    _slideAnimation = Tween<Offset>(begin: const Offset(0, 0.12), end: Offset.zero).animate(
      CurvedAnimation(parent: _entryController, curve: Curves.easeOutCubic),
    );

    // Continuous subtle breathing pulse for the ambient logo glow
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1800),
    )..repeat(reverse: true);

    _glowAnimation = Tween<double>(begin: 0.15, end: 0.35).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    _entryController.forward();
    _checkInitialAuth();
  }

  Future<void> _checkInitialAuth() async {
    // Keep splash visible briefly for a smooth brand impression
    await Future.delayed(const Duration(milliseconds: 2000));

    if (!mounted) return;

    if (AuthService.isAuthenticated) {
      final profile = await AuthService.getProfile();
      if (profile != null && profile.role == 'driver') {
        if (!mounted) return;
        Navigator.of(context).pushReplacement(
          PageRouteBuilder(
            transitionDuration: const Duration(milliseconds: 600),
            pageBuilder: (context, anim, secondaryAnim) => DriverHomeScreen(driverProfile: profile),
            transitionsBuilder: (context, animation, secondaryAnimation, child) {
              return FadeTransition(opacity: animation, child: child);
            },
          ),
        );
        return;
      }
    }

    if (!mounted) return;
    Navigator.of(context).pushReplacement(
      PageRouteBuilder(
        transitionDuration: const Duration(milliseconds: 600),
        pageBuilder: (context, anim, secondaryAnim) => const LoginScreen(),
        transitionsBuilder: (context, animation, secondaryAnimation, child) {
          return FadeTransition(opacity: animation, child: child);
        },
      ),
    );
  }

  @override
  void dispose() {
    _entryController.dispose();
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;

    return Scaffold(
      backgroundColor: const Color(0xFFFAFBFD),
      body: Stack(
        children: [
          // 1. Ambient Background Glow Orbs
          Positioned(
            top: -size.width * 0.35,
            right: -size.width * 0.25,
            child: Container(
              width: size.width * 0.9,
              height: size.width * 0.9,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    AppConstants.primaryOrange.withValues(alpha: 0.14),
                    AppConstants.primaryAmber.withValues(alpha: 0.05),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),
          Positioned(
            bottom: -size.width * 0.4,
            left: -size.width * 0.3,
            child: Container(
              width: size.width * 0.95,
              height: size.width * 0.95,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    AppConstants.primaryAmber.withValues(alpha: 0.12),
                    AppConstants.primaryOrange.withValues(alpha: 0.03),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),

          // 2. Main Content
          SafeArea(
            child: Center(
              child: AnimatedBuilder(
                animation: Listenable.merge([_entryController, _pulseController]),
                builder: (context, child) {
                  return FadeTransition(
                    opacity: _fadeAnimation,
                    child: SlideTransition(
                      position: _slideAnimation,
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Spacer(flex: 3),

                          // Animated Pulsing Logo Container (Clean App Icon without circle)
                          ScaleTransition(
                            scale: _scaleAnimation,
                            child: Container(
                              width: 130,
                              height: 130,
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(30),
                                boxShadow: [
                                  BoxShadow(
                                    color: AppConstants.primaryOrange
                                        .withValues(alpha: _glowAnimation.value),
                                    blurRadius: 32,
                                    offset: const Offset(0, 10),
                                  ),
                                ],
                              ),
                              child: ClipRRect(
                                borderRadius: BorderRadius.circular(30),
                                child: Image.asset(
                                  AppConstants.logoAsset,
                                  fit: BoxFit.cover,
                                ),
                              ),
                            ),
                          ),

                          const SizedBox(height: 32),

                          // App Title & Brand Identity
                          Text(
                            AppConstants.appName,
                            style: GoogleFonts.alexandria(
                              fontSize: 28,
                              fontWeight: FontWeight.w900,
                              color: const Color(0xFF0F172A),
                              letterSpacing: -0.5,
                            ),
                          ),

                          const SizedBox(height: 10),

                          // Smart Delivery Badge
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                            decoration: BoxDecoration(
                              color: const Color(0xFFFFF7ED),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(color: const Color(0xFFFFEDD5)),
                              boxShadow: [
                                BoxShadow(
                                  color: AppConstants.primaryOrange.withValues(alpha: 0.04),
                                  blurRadius: 8,
                                  offset: const Offset(0, 2),
                                ),
                              ],
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(
                                  Icons.electric_moped_rounded,
                                  size: 16,
                                  color: AppConstants.primaryOrange,
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  'منظومة مناديب التوصيل الفوري',
                                  style: GoogleFonts.alexandria(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w700,
                                    color: AppConstants.primaryDark,
                                  ),
                                ),
                              ],
                            ),
                          ),

                          const Spacer(flex: 2),

                          // Loading Bar & Status Indicator
                          Column(
                            children: [
                              SizedBox(
                                width: 130,
                                child: ClipRRect(
                                  borderRadius: BorderRadius.circular(8),
                                  child: const LinearProgressIndicator(
                                    minHeight: 4,
                                    backgroundColor: Color(0xFFF1F5F9),
                                    valueColor: AlwaysStoppedAnimation<Color>(
                                      AppConstants.primaryOrange,
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(height: 12),
                              Text(
                                'جاري الاتصال والتحقق من الجلسة...',
                                style: GoogleFonts.alexandria(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w500,
                                  color: const Color(0xFF94A3B8),
                                ),
                              ),
                            ],
                          ),

                          const Spacer(flex: 1),

                          // Footer Security Notice
                          Padding(
                            padding: const EdgeInsets.only(bottom: 20),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(
                                  Icons.verified_user_outlined,
                                  size: 13,
                                  color: Color(0xFF94A3B8),
                                ),
                                const SizedBox(width: 5),
                                Text(
                                  'اتصال سحابي مشفر وآمن • إصدار 1.0.0',
                                  style: GoogleFonts.alexandria(
                                    fontSize: 10.5,
                                    fontWeight: FontWeight.w600,
                                    color: const Color(0xFF94A3B8),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}
