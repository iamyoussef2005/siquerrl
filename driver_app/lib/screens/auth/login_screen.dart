import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/constants.dart';
import '../../services/auth_service.dart';
import '../home/driver_home_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  bool _obscurePassword = true;
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    setState(() {
      _errorMessage = null;
    });

    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      final profile = await AuthService.signIn(
        email: _emailController.text.trim(),
        password: _passwordController.text,
      );

      if (!mounted) return;

      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => DriverHomeScreen(driverProfile: profile),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() {
        if (e.toString().contains('Invalid login credentials')) {
          _errorMessage = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
        } else {
          _errorMessage = e.toString().replaceAll('Exception: ', '');
        }
      });
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppConstants.bgLight,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Logo & Header (Clean App Icon without circle)
                Container(
                  width: 90,
                  height: 90,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(22),
                    boxShadow: [
                      BoxShadow(
                        color: AppConstants.primaryOrange.withValues(alpha: 0.22),
                        blurRadius: 20,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(22),
                    child: Image.asset(
                      AppConstants.logoAsset,
                      fit: BoxFit.cover,
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  AppConstants.appName,
                  style: GoogleFonts.alexandria(
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    color: const Color(0xFF0F172A),
                  ),
                ),
                const SizedBox(height: 4),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                  decoration: BoxDecoration(
                    color: AppConstants.primaryLight,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: const Color(0xFFFED7AA)),
                  ),
                  child: Text(
                    'بوابة تسجيل دخول المناديب',
                    style: GoogleFonts.alexandria(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: AppConstants.primaryDark,
                    ),
                  ),
                ),
                const SizedBox(height: 28),

                // Login Form Card
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(22.0),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          if (_errorMessage != null) ...[
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: const Color(0xFFFEF2F2),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: const Color(0xFFFECACA)),
                              ),
                              child: Row(
                                children: [
                                  const Icon(Icons.error_outline, color: Color(0xFFDC2626), size: 20),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      _errorMessage!,
                                      style: GoogleFonts.alexandria(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600,
                                        color: const Color(0xFFB91C1C),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 16),
                          ],

                          // Email Field
                          Text(
                            'البريد الإلكتروني',
                            style: GoogleFonts.alexandria(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: const Color(0xFF334155),
                            ),
                          ),
                          const SizedBox(height: 6),
                          TextFormField(
                            controller: _emailController,
                            keyboardType: TextInputType.emailAddress,
                            textDirection: TextDirection.ltr,
                            textAlign: TextAlign.left,
                            decoration: const InputDecoration(
                              hintText: 'driver@sinjab.com',
                              prefixIcon: Icon(Icons.email_outlined, size: 20),
                            ),
                            validator: (val) {
                              if (val == null || val.trim().isEmpty) {
                                return 'يرجى إدخال البريد الإلكتروني';
                              }
                              if (!val.contains('@')) {
                                return 'صيغة البريد الإلكتروني غير صحيحة';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 18),

                          // Password Field
                          Text(
                            'كلمة المرور',
                            style: GoogleFonts.alexandria(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: const Color(0xFF334155),
                            ),
                          ),
                          const SizedBox(height: 6),
                          TextFormField(
                            controller: _passwordController,
                            obscureText: _obscurePassword,
                            textDirection: TextDirection.ltr,
                            textAlign: TextAlign.left,
                            decoration: InputDecoration(
                              hintText: '••••••••',
                              prefixIcon: const Icon(Icons.lock_outline, size: 20),
                              suffixIcon: IconButton(
                                icon: Icon(
                                  _obscurePassword ? Icons.visibility_off : Icons.visibility,
                                  size: 20,
                                  color: const Color(0xFF94A3B8),
                                ),
                                onPressed: () {
                                  setState(() {
                                    _obscurePassword = !_obscurePassword;
                                  });
                                },
                              ),
                            ),
                            validator: (val) {
                              if (val == null || val.isEmpty) {
                                return 'يرجى إدخال كلمة المرور';
                              }
                              if (val.length < 6) {
                                return 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 24),

                          // Login Button
                          ElevatedButton(
                            onPressed: _isLoading ? null : _handleLogin,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppConstants.primaryOrange,
                              padding: const EdgeInsets.symmetric(vertical: 14),
                            ),
                            child: _isLoading
                                ? const SizedBox(
                                    height: 20,
                                    width: 20,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2.2,
                                      valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                    ),
                                  )
                                : Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      const Icon(Icons.login_rounded, size: 18),
                                      const SizedBox(width: 8),
                                      Text(
                                        'تسجيل الدخول للمنظومة',
                                        style: GoogleFonts.alexandria(
                                          fontSize: 14,
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
                ),
                const SizedBox(height: 20),
                Text(
                  'سنجاب دليفري • نظام المزامنة اللحظية والتحصيل',
                  style: GoogleFonts.alexandria(
                    fontSize: 11,
                    color: const Color(0xFF94A3B8),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
