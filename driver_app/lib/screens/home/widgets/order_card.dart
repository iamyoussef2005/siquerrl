import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart' hide TextDirection;
import '../../../core/constants.dart';
import '../../../models/order_model.dart';
import '../../../services/launcher_service.dart';
import '../../../services/order_service.dart';

class OrderCard extends StatefulWidget {
  final OrderModel order;
  final Function(OrderModel updatedOrder) onOrderUpdated;
  final Function(int orderId) onOrderDelivered;

  const OrderCard({
    super.key,
    required this.order,
    required this.onOrderUpdated,
    required this.onOrderDelivered,
  });

  @override
  State<OrderCard> createState() => _OrderCardState();
}

class _OrderCardState extends State<OrderCard> {
  bool _isUpdating = false;

  // Format currency with commas
  String _formatCurrency(double val) {
    return NumberFormat('#,###').format(val);
  }

  // Handle status update
  Future<void> _updateStatus(String newStatus, {bool openWhatsApp = false}) async {
    setState(() {
      _isUpdating = true;
    });

    try {
      final updated = await OrderService.updateOrderStatus(
        orderId: widget.order.id,
        newStatus: newStatus,
      );

      if (newStatus == 'delivered') {
        // Delivered: immediately remove from screen and hide customer info
        widget.onOrderDelivered(widget.order.id);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                'تم تسليم الطلب #${widget.order.id} بنجاح وتم تحصيل المبلغ ✅',
                textDirection: TextDirection.rtl,
                style: GoogleFonts.alexandria(fontSize: 12, fontWeight: FontWeight.w700),
              ),
              backgroundColor: AppConstants.successGreen,
              duration: const Duration(seconds: 3),
            ),
          );
        }
      } else if (updated != null) {
        widget.onOrderUpdated(updated);

        // Open WhatsApp when changing to delivering
        if (openWhatsApp && mounted) {
          await LauncherService.openWhatsApp(
            context: context,
            phone: updated.customerPhone,
            orderId: updated.id,
            customerName: updated.customerName,
            details: updated.orderDetails,
            collectionAmount: updated.collectionAmount,
            itemsPrice: updated.itemsPrice,
            deliveryFee: updated.deliveryFee,
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'تعذر تحديث حالة الطلب: $e',
              textDirection: TextDirection.rtl,
              style: GoogleFonts.alexandria(fontSize: 12),
            ),
            backgroundColor: AppConstants.errorRed,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isUpdating = false;
        });
      }
    }
  }

  // Dialog allowing driver to enter / update items price
  void _showSetItemsPriceDialog() {
    final controller = TextEditingController(
      text: widget.order.itemsPrice > 0 ? widget.order.itemsPrice.toStringAsFixed(0) : '',
    );
    double previewItems = widget.order.itemsPrice;
    bool isSaving = false;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => StatefulBuilder(
        builder: (dialogCtx, setDialogState) {
          final totalPreview = previewItems + widget.order.deliveryFee;

          return AlertDialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            title: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFF7ED),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.sell_outlined, color: AppConstants.primaryOrange, size: 22),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'تسجيل ثمن الأغراض',
                    style: GoogleFonts.alexandria(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    'أدخل ثمن الأغراض الفعلي الذي دفعته للمحل/المتجر (بدون أجرة التوصيل):',
                    style: GoogleFonts.alexandria(fontSize: 12, color: const Color(0xFF475569), height: 1.4),
                  ),
                  const SizedBox(height: 14),

                  // Text Field
                  TextField(
                    controller: controller,
                    autofocus: true,
                    keyboardType: TextInputType.number,
                    style: GoogleFonts.alexandria(fontSize: 18, fontWeight: FontWeight.bold),
                    decoration: InputDecoration(
                      labelText: 'ثمن الأغراض',
                      hintText: '0',
                      suffixText: 'ل.س',
                      suffixStyle: GoogleFonts.alexandria(fontSize: 13, fontWeight: FontWeight.bold, color: const Color(0xFF64748B)),
                      prefixIcon: const Icon(Icons.payments_outlined, color: AppConstants.primaryOrange),
                      filled: true,
                      fillColor: const Color(0xFFF8FAFC),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: AppConstants.primaryOrange, width: 2),
                      ),
                    ),
                    onChanged: (val) {
                      setDialogState(() {
                        previewItems = double.tryParse(val.replaceAll(RegExp(r'[^0-9.]'), '')) ?? 0.0;
                      });
                    },
                  ),
                  const SizedBox(height: 14),

                  // Live Preview Calculation Box
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF0FDF4),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFBBF7D0)),
                    ),
                    child: Column(
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'ثمن الأغراض (المشتريات):',
                              style: GoogleFonts.alexandria(fontSize: 11, color: const Color(0xFF166534)),
                            ),
                            Text(
                              '${_formatCurrency(previewItems)} ل.س',
                              style: GoogleFonts.alexandria(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF166534)),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              '+ أجرة التوصيل (محددة من الإدارة):',
                              style: GoogleFonts.alexandria(fontSize: 11, color: const Color(0xFF166534)),
                            ),
                            Text(
                              '${_formatCurrency(widget.order.deliveryFee)} ل.س',
                              style: GoogleFonts.alexandria(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF166534)),
                            ),
                          ],
                        ),
                        const Divider(height: 12, color: Color(0xFFBBF7D0)),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              '= إجمالي المطلوب تحصيله:',
                              style: GoogleFonts.alexandria(fontSize: 12, fontWeight: FontWeight.w800, color: const Color(0xFF15803D)),
                            ),
                            Text(
                              '${_formatCurrency(totalPreview)} ل.س',
                              style: GoogleFonts.alexandria(fontSize: 14, fontWeight: FontWeight.w900, color: const Color(0xFF15803D)),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: isSaving ? null : () => Navigator.pop(ctx),
                child: Text(
                  'إلغاء',
                  style: GoogleFonts.alexandria(color: const Color(0xFF64748B), fontWeight: FontWeight.w600),
                ),
              ),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppConstants.primaryOrange,
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                onPressed: isSaving
                    ? null
                    : () async {
                        setDialogState(() {
                          isSaving = true;
                        });

                        final scaffoldMessenger = ScaffoldMessenger.of(context);
                        final navigator = Navigator.of(ctx);

                        try {
                          final updated = await OrderService.updateOrderItemsPrice(
                            orderId: widget.order.id,
                            itemsPrice: previewItems,
                          );

                          navigator.pop();

                          if (updated != null) {
                            widget.onOrderUpdated(updated);
                          }

                          scaffoldMessenger.showSnackBar(
                            SnackBar(
                              content: Text(
                                'تم حفظ ثمن الأغراض (${_formatCurrency(previewItems)} ل.س) وتحديث التحصيل بنجاح ✅',
                                textDirection: TextDirection.rtl,
                                style: GoogleFonts.alexandria(fontSize: 12, fontWeight: FontWeight.w700),
                              ),
                              backgroundColor: AppConstants.successGreen,
                            ),
                          );
                        } catch (e) {
                          setDialogState(() {
                            isSaving = false;
                          });
                          scaffoldMessenger.showSnackBar(
                            SnackBar(
                              content: Text(
                                'تعذر حفظ ثمن الأغراض: $e',
                                textDirection: TextDirection.rtl,
                                style: GoogleFonts.alexandria(fontSize: 12),
                              ),
                              backgroundColor: AppConstants.errorRed,
                            ),
                          );
                        }
                      },
                child: isSaving
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : Text(
                        'حفظ السعر',
                        style: GoogleFonts.alexandria(color: Colors.white, fontWeight: FontWeight.bold),
                      ),
              ),
            ],
          );
        },
      ),
    );
  }

  // Confirm delivery dialog
  void _confirmDelivered() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: Row(
          children: [
            const Icon(Icons.check_circle_rounded, color: AppConstants.successGreen, size: 24),
            const SizedBox(width: 8),
            Text(
              'تأكيد تسليم الطلب',
              style: GoogleFonts.alexandria(fontSize: 16, fontWeight: FontWeight.bold),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'هل تم تسليم الطلب للزبون بالكامل وتحصيل المبلغ؟',
              style: GoogleFonts.alexandria(fontSize: 13, color: const Color(0xFF334155)),
            ),
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFF0FDF4),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFBBF7D0)),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'ثمن الأغراض:',
                        style: GoogleFonts.alexandria(fontSize: 11, color: const Color(0xFF475569)),
                      ),
                      Text(
                        '${_formatCurrency(widget.order.itemsPrice)} ل.س',
                        style: GoogleFonts.alexandria(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF334155)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'أجرة التوصيل:',
                        style: GoogleFonts.alexandria(fontSize: 11, color: const Color(0xFF475569)),
                      ),
                      Text(
                        '${_formatCurrency(widget.order.deliveryFee)} ل.س',
                        style: GoogleFonts.alexandria(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF334155)),
                      ),
                    ],
                  ),
                  const Divider(height: 12, color: Color(0xFFBBF7D0)),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'المبلغ المطلوب تحصيله:',
                        style: GoogleFonts.alexandria(fontSize: 12, fontWeight: FontWeight.w800, color: const Color(0xFF15803D)),
                      ),
                      Text(
                        '${_formatCurrency(widget.order.collectionAmount)} ل.س',
                        style: GoogleFonts.alexandria(
                          fontSize: 15,
                          fontWeight: FontWeight.w900,
                          color: const Color(0xFF15803D),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            if (widget.order.itemsPrice == 0) ...[
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFFBEB),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFFFDE68A)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.info_outline, color: Color(0xFFB45309), size: 16),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        'تنبيه: ثمن الأغراض مسجل 0 ل.س. هل هذا توصيل فقط أم نسيت تسجيل ثمن الأغراض؟',
                        style: GoogleFonts.alexandria(fontSize: 10.5, color: const Color(0xFF92400E)),
                      ),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 8),
            Text(
              'ملاحظة: سيتم حذف الطلب وحجب بيانات هذا الزبون عن شاشتك فور التأكيد.',
              style: GoogleFonts.alexandria(fontSize: 11, color: const Color(0xFF64748B)),
            ),
          ],
        ),
        actions: [
          if (widget.order.itemsPrice == 0)
            TextButton.icon(
              onPressed: () {
                Navigator.pop(ctx);
                _showSetItemsPriceDialog();
              },
              icon: const Icon(Icons.sell_outlined, size: 15, color: AppConstants.primaryOrange),
              label: Text(
                'تسجيل سعر الأغراض أولاً',
                style: GoogleFonts.alexandria(color: AppConstants.primaryOrange, fontWeight: FontWeight.bold, fontSize: 11),
              ),
            ),
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(
              'تراجع',
              style: GoogleFonts.alexandria(color: const Color(0xFF64748B), fontWeight: FontWeight.w600),
            ),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppConstants.successGreen,
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
            ),
            onPressed: () {
              Navigator.pop(ctx);
              _updateStatus('delivered');
            },
            child: Text(
              'نعم، تم التسليم والتحصيل',
              style: GoogleFonts.alexandria(color: Colors.white, fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );
  }

  // Status badge styling
  Widget _buildStatusBadge() {
    String label;
    Color bg;
    Color text;
    Color border;
    IconData icon;

    switch (widget.order.status) {
      case 'assigned':
        label = 'تم الإسناد إليك';
        bg = AppConstants.statusAssignedBg;
        text = AppConstants.statusAssignedText;
        border = AppConstants.statusAssignedBorder;
        icon = Icons.assignment_ind_outlined;
        break;
      case 'preparing':
        label = 'في انتظار التحضير';
        bg = AppConstants.statusPreparingBg;
        text = AppConstants.statusPreparingText;
        border = AppConstants.statusPreparingBorder;
        icon = Icons.inventory_2_outlined;
        break;
      case 'delivering':
        label = 'في طريقي للزبون (قيد التوصيل)';
        bg = const Color(0xFFFFF7ED);
        text = AppConstants.primaryOrange;
        border = const Color(0xFFFED7AA);
        icon = Icons.delivery_dining_rounded;
        break;
      default:
        label = widget.order.status;
        bg = Colors.grey.shade100;
        text = Colors.grey.shade800;
        border = Colors.grey.shade300;
        icon = Icons.info_outline;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 13, color: text),
          const SizedBox(width: 4),
          Flexible(
            child: Text(
              label,
              style: GoogleFonts.alexandria(
                fontSize: 10.5,
                fontWeight: FontWeight.w700,
                color: text,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final order = widget.order;
    final isDelivering = order.status == 'delivering';

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isDelivering ? AppConstants.primaryOrange : const Color(0xFFE2E8F0),
          width: isDelivering ? 1.8 : 1.0,
        ),
        boxShadow: [
          BoxShadow(
            color: isDelivering
                ? AppConstants.primaryOrange.withValues(alpha: 0.08)
                : Colors.black.withValues(alpha: 0.03),
            blurRadius: isDelivering ? 16 : 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // 1. Header: Order ID & Status & Driver share
          Container(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
            decoration: BoxDecoration(
              color: isDelivering ? const Color(0xFFFFF7ED).withValues(alpha: 0.6) : const Color(0xFFF8FAFC),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(19)),
              border: const Border(bottom: BorderSide(color: Color(0xFFF1F5F9))),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Row(
                    children: [
                      Text(
                        '#${order.id}',
                        style: GoogleFonts.alexandria(
                          fontSize: 15,
                          fontWeight: FontWeight.w900,
                          color: const Color(0xFF0F172A),
                        ),
                      ),
                      const SizedBox(width: 6),
                      Flexible(child: _buildStatusBadge()),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                // Driver fee
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      'أجرتك',
                      style: GoogleFonts.alexandria(fontSize: 10, color: const Color(0xFF64748B)),
                    ),
                    Text(
                      '${_formatCurrency(order.driverFee)} ل.س',
                      style: GoogleFonts.alexandria(
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        color: AppConstants.primaryDark,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // 2. Body Details
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Customer Name & Quick Action Icons (Call & WhatsApp)
                Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            order.customerName,
                            style: GoogleFonts.alexandria(
                              fontSize: 15,
                              fontWeight: FontWeight.w800,
                              color: const Color(0xFF0F172A),
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 2),
                          Row(
                            children: [
                              const Icon(Icons.phone_outlined, size: 13, color: Color(0xFF64748B)),
                              const SizedBox(width: 4),
                              Text(
                                order.customerPhone,
                                style: GoogleFonts.alexandria(
                                  fontSize: 12,
                                  color: const Color(0xFF64748B),
                                  fontWeight: FontWeight.w600,
                                ),
                                textDirection: TextDirection.ltr,
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),

                    // Quick Action Buttons: Phone & WhatsApp
                    Row(
                      children: [
                        // Direct Call Button
                        InkWell(
                          onTap: () => LauncherService.makePhoneCall(
                            context: context,
                            phone: order.customerPhone,
                          ),
                          borderRadius: BorderRadius.circular(12),
                          child: Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: const Color(0xFFECFDF5),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: const Color(0xFFA7F3D0)),
                            ),
                            child: const Icon(Icons.phone_in_talk_rounded, color: Color(0xFF059669), size: 20),
                          ),
                        ),
                        const SizedBox(width: 8),

                        // WhatsApp Button
                        InkWell(
                          onTap: () => LauncherService.openWhatsApp(
                            context: context,
                            phone: order.customerPhone,
                            orderId: order.id,
                            customerName: order.customerName,
                            details: order.orderDetails,
                            collectionAmount: order.collectionAmount,
                            itemsPrice: order.itemsPrice,
                            deliveryFee: order.deliveryFee,
                          ),
                          borderRadius: BorderRadius.circular(12),
                          child: Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF0FDF4),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: const Color(0xFF86EFAC)),
                            ),
                            child: const Icon(Icons.chat_bubble_outline_rounded, color: Color(0xFF16A34A), size: 20),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // Delivery Address with Google Maps Button
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.location_on_rounded, color: Color(0xFFEF4444), size: 20),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'عنوان التوصيل:',
                              style: GoogleFonts.alexandria(fontSize: 10, color: const Color(0xFF64748B)),
                            ),
                            Text(
                              order.deliveryAddress,
                              style: GoogleFonts.alexandria(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: const Color(0xFF1E293B),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      // Open Map Button
                      ElevatedButton.icon(
                        onPressed: () => LauncherService.openMap(
                          context: context,
                          mapsUrl: order.mapsUrl,
                          address: order.deliveryAddress,
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.white,
                          foregroundColor: AppConstants.primaryOrange,
                          elevation: 0,
                          side: const BorderSide(color: Color(0xFFFED7AA)),
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        icon: const Icon(Icons.map_rounded, size: 16),
                        label: Text(
                          'الخريطة',
                          style: GoogleFonts.alexandria(fontSize: 11, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 10),

                // Order Details (Items to purchase / delivery instructions)
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFFBEB),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFFFDE68A)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.shopping_bag_outlined, color: Color(0xFFB45309), size: 16),
                          const SizedBox(width: 6),
                          Text(
                            'المطلوب / تفاصيل الطلب:',
                            style: GoogleFonts.alexandria(
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                              color: const Color(0xFF92400E),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        order.orderDetails,
                        style: GoogleFonts.alexandria(
                          fontSize: 12,
                          color: const Color(0xFF78350F),
                          fontWeight: FontWeight.w600,
                          height: 1.5,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),

                // Financial Box: Detailed Breakdown (Items Price by Driver, Delivery Fee by Admin)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFFECFDF5), Color(0xFFF0FDF4)],
                    ),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFFA7F3D0)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Header Row: Delivery Fee (Admin set) & Driver Fee
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.local_shipping_outlined, size: 15, color: Color(0xFF065F46)),
                              const SizedBox(width: 4),
                              Text(
                                'أجرة التوصيل (الإدارة):',
                                style: GoogleFonts.alexandria(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  color: const Color(0xFF065F46),
                                ),
                              ),
                              const SizedBox(width: 4),
                              Text(
                                '${_formatCurrency(order.deliveryFee)} ل.س',
                                style: GoogleFonts.alexandria(
                                  fontSize: 11.5,
                                  fontWeight: FontWeight.w800,
                                  color: const Color(0xFF047857),
                                ),
                              ),
                            ],
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: AppConstants.primaryLight,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: const Color(0xFFFED7AA)),
                            ),
                            child: Text(
                              'أجرتك: ${_formatCurrency(order.driverFee)} ل.س',
                              style: GoogleFonts.alexandria(
                                fontSize: 10.5,
                                fontWeight: FontWeight.w800,
                                color: AppConstants.primaryDark,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),

                      // Items Price Box (Determined by Driver) with interactive Set/Edit button
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                        decoration: BoxDecoration(
                          color: order.itemsPrice > 0
                              ? Colors.white.withValues(alpha: 0.85)
                              : const Color(0xFFFFFBEB),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: order.itemsPrice > 0
                                ? const Color(0xFFCBD5E1)
                                : const Color(0xFFFDE68A),
                          ),
                        ),
                        child: Row(
                          children: [
                            Icon(
                              Icons.sell_outlined,
                              size: 16,
                              color: order.itemsPrice > 0 ? const Color(0xFF334155) : const Color(0xFFB45309),
                            ),
                            const SizedBox(width: 6),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'سعر الأغراض (المشتريات):',
                                    style: GoogleFonts.alexandria(
                                      fontSize: 10.5,
                                      fontWeight: FontWeight.w600,
                                      color: order.itemsPrice > 0 ? const Color(0xFF475569) : const Color(0xFF92400E),
                                    ),
                                  ),
                                  Text(
                                    order.itemsPrice > 0
                                        ? '${_formatCurrency(order.itemsPrice)} ل.س'
                                        : 'لم يُسجل بعد (اضغط لتحديده)',
                                    style: GoogleFonts.alexandria(
                                      fontSize: order.itemsPrice > 0 ? 13 : 11,
                                      fontWeight: FontWeight.w800,
                                      color: order.itemsPrice > 0 ? const Color(0xFF0F172A) : const Color(0xFFB45309),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            ElevatedButton.icon(
                              onPressed: () => _showSetItemsPriceDialog(),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: order.itemsPrice > 0
                                    ? const Color(0xFFF1F5F9)
                                    : AppConstants.primaryOrange,
                                foregroundColor: order.itemsPrice > 0
                                    ? const Color(0xFF334155)
                                    : Colors.white,
                                elevation: 0,
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                              ),
                              icon: Icon(order.itemsPrice > 0 ? Icons.edit_outlined : Icons.add_rounded, size: 14),
                              label: Text(
                                order.itemsPrice > 0 ? 'تعديل' : 'تحديد السعر',
                                style: GoogleFonts.alexandria(fontSize: 11, fontWeight: FontWeight.bold),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 10),

                      const Divider(height: 1, color: Color(0xFFBBF7D0)),
                      const SizedBox(height: 8),

                      // Total Collection Amount
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          Text(
                            'إجمالي المطلوب تحصيله:',
                            style: GoogleFonts.alexandria(
                              fontSize: 11.5,
                              fontWeight: FontWeight.w800,
                              color: const Color(0xFF065F46),
                            ),
                          ),
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            crossAxisAlignment: CrossAxisAlignment.baseline,
                            textBaseline: TextBaseline.alphabetic,
                            children: [
                              Text(
                                _formatCurrency(order.collectionAmount),
                                style: GoogleFonts.alexandria(
                                  fontSize: 20,
                                  fontWeight: FontWeight.w900,
                                  color: const Color(0xFF047857),
                                ),
                              ),
                              const SizedBox(width: 4),
                              Text(
                                'ل.س',
                                style: GoogleFonts.alexandria(
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                  color: const Color(0xFF059669),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // 3. Dynamic Action Buttons (Driver progression)
                if (_isUpdating)
                  const Center(
                    child: Padding(
                      padding: EdgeInsets.all(8.0),
                      child: CircularProgressIndicator(
                        strokeWidth: 2.5,
                        valueColor: AlwaysStoppedAnimation<Color>(AppConstants.primaryOrange),
                      ),
                    ),
                  )
                else ...[
                  // State 1: Assigned -> Preparing (or directly delivering)
                  if (order.status == 'assigned') ...[
                    ElevatedButton(
                      onPressed: () => _updateStatus('preparing'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFF59E0B),
                        padding: const EdgeInsets.symmetric(vertical: 13, horizontal: 16),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.inventory_2_rounded, size: 18),
                          const SizedBox(width: 8),
                          Flexible(
                            child: Text(
                              'تأكيد الطلب ⬅️ في انتظار التحضير',
                              style: GoogleFonts.alexandria(fontSize: 13, fontWeight: FontWeight.w800),
                              textAlign: TextAlign.center,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 8),
                    OutlinedButton(
                      onPressed: () => _updateStatus('delivering', openWhatsApp: true),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: Color(0xFFFED7AA)),
                        backgroundColor: AppConstants.primaryLight,
                        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.electric_moped_rounded, size: 18, color: AppConstants.primaryOrange),
                          const SizedBox(width: 8),
                          Flexible(
                            child: Text(
                              'الطلب جاهز بالفعل؟ استلام وبدء التوصيل فوراً',
                              style: GoogleFonts.alexandria(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: AppConstants.primaryDark,
                              ),
                              textAlign: TextAlign.center,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],

                  // State 2: Preparing -> Delivering (Opens WhatsApp automatically)
                  if (order.status == 'preparing') ...[
                    ElevatedButton(
                      onPressed: () => _updateStatus('delivering', openWhatsApp: true),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppConstants.primaryOrange,
                        padding: const EdgeInsets.symmetric(vertical: 13, horizontal: 16),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.delivery_dining_rounded, size: 22),
                          const SizedBox(width: 8),
                          Flexible(
                            child: Text(
                              'تم تجهيز الطلب ⬅️ في طريقي للزبون (مع واتساب)',
                              style: GoogleFonts.alexandria(fontSize: 13, fontWeight: FontWeight.w800),
                              textAlign: TextAlign.center,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],

                  // State 3: Delivering -> Delivered (Completes order & removes from screen)
                  if (order.status == 'delivering') ...[
                    ElevatedButton(
                      onPressed: _confirmDelivered,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppConstants.successGreen,
                        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
                        elevation: 3,
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.check_circle_rounded, size: 22),
                          const SizedBox(width: 8),
                          Flexible(
                            child: Text(
                              'تم تسليم الطلب للزبون بنجاح ✅',
                              style: GoogleFonts.alexandria(fontSize: 14, fontWeight: FontWeight.w900),
                              textAlign: TextAlign.center,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
