class ProfileModel {
  final String id;
  final String fullName;
  final String role;
  final String? phone;
  final double commissionPercentage;
  final DateTime? createdAt;

  ProfileModel({
    required this.id,
    required this.fullName,
    required this.role,
    this.phone,
    this.commissionPercentage = 70.0,
    this.createdAt,
  });

  factory ProfileModel.fromJson(Map<String, dynamic> json) {
    return ProfileModel(
      id: json['id']?.toString() ?? '',
      fullName: json['full_name'] ?? json['name'] ?? 'مندوب',
      role: json['role']?.toString() ?? 'driver',
      phone: json['phone']?.toString(),
      commissionPercentage: json['commission_percentage'] != null
          ? double.tryParse(json['commission_percentage'].toString()) ?? 70.0
          : 70.0,
      createdAt: json['created_at'] != null ? DateTime.tryParse(json['created_at']) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'full_name': fullName,
      'role': role,
      'phone': phone,
      'commission_percentage': commissionPercentage,
    };
  }
}
