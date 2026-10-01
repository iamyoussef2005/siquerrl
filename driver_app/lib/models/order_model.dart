class OrderModel {
  final int id;
  final String? customerId;
  final String? driverId;
  final String customerName;
  final String customerPhone;
  final String deliveryAddress;
  final String? backupPhone;
  final String orderDetails;
  final String? mapsUrl;
  final double itemsPrice;
  final double collectionAmount;
  final double deliveryFee;
  final double driverFee;
  final double officeFee;
  final String status;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final DateTime? assignedAt;

  OrderModel({
    required this.id,
    this.customerId,
    this.driverId,
    required this.customerName,
    required this.customerPhone,
    required this.deliveryAddress,
    this.backupPhone,
    required this.orderDetails,
    this.mapsUrl,
    this.itemsPrice = 0.0,
    required this.collectionAmount,
    required this.deliveryFee,
    required this.driverFee,
    required this.officeFee,
    required this.status,
    this.createdAt,
    this.updatedAt,
    this.assignedAt,
  });

  factory OrderModel.fromJson(Map<String, dynamic> json) {
    return OrderModel(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id'].toString()) ?? 0,
      customerId: json['customer_id']?.toString(),
      driverId: json['driver_id']?.toString(),
      customerName: json['customer_name'] ?? 'بدون اسم',
      customerPhone: json['customer_phone'] ?? '',
      deliveryAddress: json['delivery_address'] ?? '',
      backupPhone: json['backup_phone']?.toString(),
      orderDetails: json['order_details'] ?? '',
      mapsUrl: json['maps_url']?.toString(),
      itemsPrice: (json['items_price'] != null)
          ? double.tryParse(json['items_price'].toString()) ?? 0.0
          : 0.0,
      collectionAmount: (json['collection_amount'] != null)
          ? double.tryParse(json['collection_amount'].toString()) ?? 0.0
          : 0.0,
      deliveryFee: (json['delivery_fee'] != null)
          ? double.tryParse(json['delivery_fee'].toString()) ?? 0.0
          : 0.0,
      driverFee: (json['driver_fee'] != null)
          ? double.tryParse(json['driver_fee'].toString()) ?? 0.0
          : 0.0,
      officeFee: (json['office_fee'] != null)
          ? double.tryParse(json['office_fee'].toString()) ?? 0.0
          : 0.0,
      status: json['status']?.toString() ?? 'pending',
      createdAt: json['created_at'] != null ? DateTime.tryParse(json['created_at']) : null,
      updatedAt: json['updated_at'] != null ? DateTime.tryParse(json['updated_at']) : null,
      assignedAt: json['assigned_at'] != null ? DateTime.tryParse(json['assigned_at']) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'customer_id': customerId,
      'driver_id': driverId,
      'customer_name': customerName,
      'customer_phone': customerPhone,
      'delivery_address': deliveryAddress,
      'backup_phone': backupPhone,
      'order_details': orderDetails,
      'maps_url': mapsUrl,
      'items_price': itemsPrice,
      'collection_amount': collectionAmount,
      'delivery_fee': deliveryFee,
      'driver_fee': driverFee,
      'office_fee': officeFee,
      'status': status,
      'assigned_at': assignedAt?.toIso8601String(),
    };
  }

  OrderModel copyWith({
    double? itemsPrice,
    double? collectionAmount,
    String? status,
    DateTime? updatedAt,
    DateTime? assignedAt,
  }) {
    return OrderModel(
      id: id,
      customerId: customerId,
      driverId: driverId,
      customerName: customerName,
      customerPhone: customerPhone,
      deliveryAddress: deliveryAddress,
      backupPhone: backupPhone,
      orderDetails: orderDetails,
      mapsUrl: mapsUrl,
      itemsPrice: itemsPrice ?? this.itemsPrice,
      collectionAmount: collectionAmount ?? this.collectionAmount,
      deliveryFee: deliveryFee,
      driverFee: driverFee,
      officeFee: officeFee,
      status: status ?? this.status,
      createdAt: createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      assignedAt: assignedAt ?? this.assignedAt,
    );
  }
}
