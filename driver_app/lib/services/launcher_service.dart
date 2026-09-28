import 'package:flutter/material.dart';
import 'package:intl/intl.dart' hide TextDirection;
import 'package:url_launcher/url_launcher.dart';

class LauncherService {
  // Format phone number for WhatsApp Click-to-Chat (Syria default: 09xxxxxxxx -> 9639xxxxxxxx)
  static String formatWhatsAppPhone(String rawPhone) {
    String clean = rawPhone.replaceAll(RegExp(r'\D'), '');
    if (clean.startsWith('00')) {
      clean = clean.substring(2);
    }
    if (clean.startsWith('0')) {
      clean = '963${clean.substring(1)}';
    } else if (!clean.startsWith('963') && clean.length == 9 && clean.startsWith('9')) {
      clean = '963$clean';
    }
    return clean;
  }

  // Open WhatsApp with pre-filled order details message
  static Future<bool> openWhatsApp({
    required BuildContext context,
    required String phone,
    required int orderId,
    required String customerName,
    required String details,
    required double collectionAmount,
    double itemsPrice = 0.0,
    double deliveryFee = 0.0,
  }) async {
    final waPhone = formatWhatsAppPhone(phone);
    final currencyFormatter = NumberFormat('#,###');
    final formattedAmount = currencyFormatter.format(collectionAmount.round());

    final message = '''Sinjab Delivery 🐿️
مرحباً $customerName 🍁
طلبك رقم #$orderId أصبح قيد التوصيل الآن مع مندوب سنجاب دليفري وسيصلك قريباً🕞.

📦 المطلوب:
${details.trim()}

💵 المبلغ المطلوب تحصيله: $formattedAmount ل.س''';

    final waUrl = Uri.parse('https://wa.me/$waPhone?text=${Uri.encodeComponent(message)}');

    try {
      final launched = await launchUrl(waUrl, mode: LaunchMode.externalApplication);
      if (!launched) {
        // Fallback to whatsapp scheme
        final schemeUrl = Uri.parse('whatsapp://send?phone=$waPhone&text=${Uri.encodeComponent(message)}');
        return await launchUrl(schemeUrl, mode: LaunchMode.externalApplication);
      }
      return launched;
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('تعذر فتح واتساب: $e', textDirection: TextDirection.rtl),
            backgroundColor: Colors.red.shade700,
          ),
        );
      }
      return false;
    }
  }

  // Make direct phone call
  static Future<bool> makePhoneCall({
    required BuildContext context,
    required String phone,
  }) async {
    final clean = phone.replaceAll(RegExp(r'\s+'), '');
    final telUrl = Uri.parse('tel:$clean');

    try {
      if (await canLaunchUrl(telUrl)) {
        return await launchUrl(telUrl);
      } else {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('تعذر إجراء الاتصال من هذا الجهاز', textDirection: TextDirection.rtl),
            ),
          );
        }
        return false;
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('خطأ أثناء الاتصال: $e', textDirection: TextDirection.rtl),
            backgroundColor: Colors.red.shade700,
          ),
        );
      }
      return false;
    }
  }

  // Open Google Maps navigation
  static Future<bool> openMap({
    required BuildContext context,
    String? mapsUrl,
    required String address,
  }) async {
    Uri targetUri;

    if (mapsUrl != null && mapsUrl.trim().isNotEmpty && mapsUrl.startsWith('http')) {
      targetUri = Uri.parse(mapsUrl.trim());
    } else {
      targetUri = Uri.parse(
        'https://www.google.com/maps/search/?api=1&query=${Uri.encodeComponent(address)}',
      );
    }

    try {
      final launched = await launchUrl(targetUri, mode: LaunchMode.externalApplication);
      if (!launched) {
        return await launchUrl(targetUri, mode: LaunchMode.platformDefault);
      }
      return launched;
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('تعذر فتح تطبيق الخرائط: $e', textDirection: TextDirection.rtl),
            backgroundColor: Colors.red.shade700,
          ),
        );
      }
      return false;
    }
  }
}
