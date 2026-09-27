import 'package:flutter_test/flutter_test.dart';
import 'package:driver_app/models/order_model.dart';

void main() {
  test('OrderModel parsing test', () {
    final order = OrderModel.fromJson({
      'id': 101,
      'customer_name': 'أحمد السوري',
      'customer_phone': '0933112233',
      'delivery_address': 'دمشق - المزة',
      'order_details': 'وجبة شاورما دجاج',
      'collection_amount': 45000,
      'delivery_fee': 10000,
      'driver_fee': 7000,
      'office_fee': 3000,
      'status': 'assigned',
    });

    expect(order.id, 101);
    expect(order.customerName, 'أحمد السوري');
    expect(order.status, 'assigned');
    expect(order.collectionAmount, 45000.0);
    expect(order.driverFee, 7000.0);
  });
}
