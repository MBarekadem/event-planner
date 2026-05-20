import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

// ─────────────────────────────────────────
// CART ITEM MODEL
// ─────────────────────────────────────────
class CartItem {
  final String resourceId;
  final String resourceName;
  final double price;
  final String type;
  int quantity;
  double totalPrice;
  final String? selectedDate;
  final List<Map<String, String>> selectedTimes;

  CartItem({
    required this.resourceId,
    required this.resourceName,
    required this.price,
    required this.type,
    required this.quantity,
    required this.totalPrice,
    this.selectedDate,
    this.selectedTimes = const [],
  });

  factory CartItem.fromJson(Map<String, dynamic> j) => CartItem(
        resourceId: j['resourceId'] ?? '',
        resourceName: j['resourceName'] ?? '',
        price: (j['price'] as num).toDouble(),
        type: j['type'] ?? 'product',
        quantity: j['quantity'] ?? 1,
        totalPrice: (j['totalPrice'] as num).toDouble(),
        selectedDate: j['selectedDate'],
        selectedTimes: (j['selectedTimes'] as List? ?? [])
            .map((e) => Map<String, String>.from(e as Map))
            .toList(),
      );

  Map<String, dynamic> toJson() => {
        'resourceId': resourceId,
        'resourceName': resourceName,
        'price': price,
        'type': type,
        'quantity': quantity,
        'totalPrice': totalPrice,
        'selectedDate': selectedDate,
        'selectedTimes': selectedTimes,
      };

  CartItem copyWith({int? quantity, double? totalPrice}) => CartItem(
        resourceId: resourceId,
        resourceName: resourceName,
        price: price,
        type: type,
        quantity: quantity ?? this.quantity,
        totalPrice: totalPrice ?? this.totalPrice,
        selectedDate: selectedDate,
        selectedTimes: selectedTimes,
      );
}

// ─────────────────────────────────────────
// CART SERVICE
// ─────────────────────────────────────────
class CartService {
  static const _key = 'reservationCart';

  static Future<List<CartItem>> load() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_key);
    if (raw == null) return [];
    final List data = jsonDecode(raw);
    return data
        .map((e) => CartItem.fromJson(e as Map<String, dynamic>))
        .where((i) => i.resourceId.isNotEmpty && i.resourceId != 'undefined')
        .toList();
  }

  static Future<void> save(List<CartItem> items) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
        _key, jsonEncode(items.map((e) => e.toJson()).toList()));
  }
}