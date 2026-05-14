import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:image_picker/image_picker.dart';
import 'payment_page.dart';
import 'select_event_sheet.dart'; // ✅ composant réutilisable

// ─────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────
const String kBaseUrl = 'http://localhost:5000/api';
const Color kIndigo = Color(0xFF4338CA);
const Color kPurple = Color(0xFF7C3AED);
const Color kGreen = Color(0xFF059669);
const Color kAmber = Color(0xFFF59E0B);
const Color kRed = Color(0xFFEF4444);
const Color kBg = Color(0xFFF7F8FF);

// ─────────────────────────────────────────
// MODELS
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
            .map((e) => Map<String, String>.from(e))
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

class EventModel {
  final String id;
  final String title;
  final String? dateDebut;
  final String? dateFin;
  final String? category;

  EventModel({
    required this.id,
    required this.title,
    this.dateDebut,
    this.dateFin,
    this.category,
  });

  factory EventModel.fromJson(Map<String, dynamic> j) => EventModel(
        id: j['_id'] ?? '',
        title: j['title'] ?? 'Sans titre',
        dateDebut: j['dateDebut'],
        dateFin: j['dateFin'],
        category: j['category'],
      );

  // ✅ Conversion vers SelectEventModel
  SelectEventModel toSelectModel() => SelectEventModel(
        id: id,
        title: title,
        dateDebut: dateDebut != null ? DateTime.tryParse(dateDebut!) : null,
        dateFin: dateFin != null ? DateTime.tryParse(dateFin!) : null,
        category: category,
      );
}

class Reservation {
  final String id;
  final String status;
  final String dateDebut;
  final String dateFin;
  final String payer;
  final String? paymentDate;
  final String? invoice;
  final String? eventTitle;
  final String? resourceName;
  final String? resourceType;
  final double? resourcePrice;
  final String? resourceId;

  Reservation({
    required this.id,
    required this.status,
    required this.dateDebut,
    required this.dateFin,
    required this.payer,
    this.paymentDate,
    this.invoice,
    this.eventTitle,
    this.resourceName,
    this.resourceType,
    this.resourcePrice,
    this.resourceId,
  });

  factory Reservation.fromJson(Map<String, dynamic> j) {
    final res = j['resource'] as Map<String, dynamic>?;
    final evt = j['event'] as Map<String, dynamic>?;
    return Reservation(
      id: j['_id'] ?? '',
      status: j['status'] ?? 'en attente',
      dateDebut: j['dateDebut'] ?? '',
      dateFin: j['dateFin'] ?? '',
      payer: j['payer'] ?? '',
      paymentDate: j['paymentDate'],
      invoice: j['invoice'],
      eventTitle: evt?['title'],
      resourceName: res?['name'],
      resourceType: res?['type'],
      resourcePrice: res?['price'] != null ? (res!['price'] as num).toDouble() : null,
      resourceId: res?['_id'],
    );
  }

  bool get isPaid => payer == 'payer';
  bool get isAccepted => status == 'acceptée';
  bool get isPending => status == 'en attente';
  bool get isRefused => status == 'refusée';
}

// ─────────────────────────────────────────
// API SERVICE
// ─────────────────────────────────────────
class ApiService {
  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('token');
  }

  static Future<Map<String, dynamic>?> getUser() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString('user');
    if (raw == null) return null;
    return jsonDecode(raw) as Map<String, dynamic>;
  }

  static Future<Map<String, String>> authHeaders() async {
    final tok = await getToken();
    return {
      'Content-Type': 'application/json',
      if (tok != null) 'Authorization': 'Bearer $tok',
    };
  }

  static Future<Map<String, dynamic>?> getResource(String id) async {
    try {
      final res = await http.get(Uri.parse('$kBaseUrl/ressources/get_by_id/$id'));
      if (res.statusCode == 200) return jsonDecode(res.body);
    } catch (_) {}
    return null;
  }

  static Future<List<Reservation>> getMyReservations() async {
    final headers = await authHeaders();
    final res = await http.get(Uri.parse('$kBaseUrl/location/get_my_locations'), headers: headers);
    if (res.statusCode == 200) {
      final List data = jsonDecode(res.body);
      return data.map((e) => Reservation.fromJson(e)).toList();
    }
    return [];
  }

  static Future<List<EventModel>> getUserEvents() async {
    final headers = await authHeaders();
    final user = await getUser();
    final uid = user?['_id'] ?? user?['id'];
    if (uid == null) return [];
    final res = await http.get(Uri.parse('$kBaseUrl/event/user_event/$uid'), headers: headers);
    if (res.statusCode == 200) {
      final List data = jsonDecode(res.body);
      return data.map((e) => EventModel.fromJson(e)).toList();
    }
    return [];
  }

  static Future<bool> createLocation({
    required String eventId,
    required String resourceId,
    required String dateDebut,
    required String dateFin,
    File? cinFile,
  }) async {
    final tok = await getToken();
    final uri = Uri.parse('$kBaseUrl/location/create');

    if (cinFile != null) {
      final request = http.MultipartRequest('POST', uri);
      if (tok != null) request.headers['Authorization'] = 'Bearer $tok';
      request.fields['event'] = eventId;
      request.fields['resource'] = resourceId;
      request.fields['dateDebut'] = dateDebut;
      request.fields['dateFin'] = dateFin;
      request.files.add(await http.MultipartFile.fromPath('cin', cinFile.path));
      final streamed = await request.send();
      return streamed.statusCode == 200 || streamed.statusCode == 201;
    } else {
      final headers = await authHeaders();
      final res = await http.post(uri,
          headers: headers,
          body: jsonEncode({
            'event': eventId,
            'resource': resourceId,
            'dateDebut': dateDebut,
            'dateFin': dateFin,
          }));
      return res.statusCode == 200 || res.statusCode == 201;
    }
  }

  static Future<Map<String, dynamic>?> login(String email, String password) async {
    final res = await http.post(Uri.parse('$kBaseUrl/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email, 'password': password}));
    if (res.statusCode == 200) return jsonDecode(res.body);
    return null;
  }

  static Future<Map<String, dynamic>?> register(Map<String, dynamic> body) async {
    final res = await http.post(Uri.parse('$kBaseUrl/auth/register'),
        headers: {'Content-Type': 'application/json'}, body: jsonEncode(body));
    if (res.statusCode == 200 || res.statusCode == 201) return jsonDecode(res.body);
    return null;
  }

  static Future<String?> createEvent(Map<String, dynamic> body, String token) async {
    final res = await http.post(Uri.parse('$kBaseUrl/event/addEvent'),
        headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer $token'},
        body: jsonEncode(body));
    if (res.statusCode == 200 || res.statusCode == 201) {
      final data = jsonDecode(res.body);
      return data['_id'] ?? data['id'];
    }
    return null;
  }
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
        .map((e) => CartItem.fromJson(e))
        .where((i) => i.resourceId.isNotEmpty && i.resourceId != 'undefined')
        .toList();
  }

  static Future<void> save(List<CartItem> items) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_key, jsonEncode(items.map((e) => e.toJson()).toList()));
  }
}

// ─────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────
class MesReservationsPage extends StatefulWidget {
  const MesReservationsPage({super.key});

  @override
  State<MesReservationsPage> createState() => _MesReservationsPageState();
}

class _MesReservationsPageState extends State<MesReservationsPage> {
  List<CartItem> _cart = [];
  List<Reservation> _reservations = [];
  List<EventModel> _events = [];
  Map<String, int> _stockLimits = {};
  bool _loading = true;
  String? _sendingId;
  String? _token;
  Map<String, dynamic>? _user;

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString('token');
    final userRaw = prefs.getString('user');
    if (userRaw != null) _user = jsonDecode(userRaw);
    await _loadCart();
    if (_token != null) {
      await Future.wait([_fetchReservations(), _fetchEvents()]);
    }
    setState(() => _loading = false);
  }

  // ── CART ──────────────────────────────────────────────

  Future<void> _loadCart() async {
    final items = await CartService.load();
    final stocks = <String, int>{};
    await Future.wait(items.map((i) async {
      final r = await ApiService.getResource(i.resourceId);
      stocks[i.resourceId] = r != null ? (r['quantity'] as int?) ?? 999 : (i.type == 'service' ? 1 : 999);
    }));
    setState(() { _cart = items; _stockLimits = stocks; });
  }

  Future<void> _removeItem(String resourceId) async {
    final updated = _cart.where((i) => i.resourceId != resourceId).toList();
    await CartService.save(updated);
    setState(() => _cart = updated);
  }

  Future<void> _updateQty(String resourceId, int newQty) async {
    final max = _stockLimits[resourceId] ?? 999;
    if (newQty < 1) { await _removeItem(resourceId); return; }
    if (newQty > max) { _toast('Stock disponible : $max unité(s) seulement', isError: true); return; }
    final updated = _cart.map((i) {
      if (i.resourceId != resourceId) return i;
      return i.copyWith(quantity: newQty, totalPrice: newQty * i.price);
    }).toList();
    await CartService.save(updated);
    setState(() => _cart = updated);
  }

  // ── API ───────────────────────────────────────────────

  Future<void> _fetchReservations() async {
    final data = await ApiService.getMyReservations();
    setState(() => _reservations = data);
  }

  Future<void> _fetchEvents() async {
    final data = await ApiService.getUserEvents();
    setState(() => _events = data);
  }

  // ── SEND FLOW ─────────────────────────────────────────

  Future<void> _openSendFlow(CartItem item) async {
    if (_token == null) {
      final ok = await _showAuthModal();
      if (!ok) return;
    }
    if (!mounted) return;
    await _showSelectEventModal(item);
  }

  Future<void> _sendRequest(CartItem item, String eventId, File? cinFile) async {
    setState(() => _sendingId = item.resourceId);
    final date = item.selectedDate ?? DateTime.now().toIso8601String();
    final slots = item.selectedTimes.isNotEmpty
        ? item.selectedTimes
        : [{'start': date, 'end': date}];

    bool allOk = true;
    for (final slot in slots) {
      final ok = await ApiService.createLocation(
        eventId: eventId,
        resourceId: item.resourceId,
        dateDebut: slot['start'] ?? date,
        dateFin: slot['end'] ?? date,
        cinFile: cinFile,
      );
      if (!ok) allOk = false;
    }

    await _removeItem(item.resourceId);
    await _fetchReservations();
    setState(() => _sendingId = null);
    _toast(
      allOk ? 'Demande envoyée pour "${item.resourceName}" !' : 'Erreur lors de l\'envoi.',
      isError: !allOk,
    );
  }

  // ─────────────────────────────────────
  // MODALS
  // ─────────────────────────────────────

  Future<bool> _showAuthModal() async {
    final result = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _AuthSheet(
        onSuccess: (token, user) async {
          final prefs = await SharedPreferences.getInstance();
          await prefs.setString('token', token);
          await prefs.setString('user', jsonEncode(user));
          setState(() { _token = token; _user = user; });
          await Future.wait([_fetchReservations(), _fetchEvents()]);
          if (mounted) Navigator.pop(context, true);
          _toast('Bienvenue ${user['firstname'] ?? ''} !');
        },
      ),
    );
    return result ?? false;
  }

  // ✅ Utilise SelectEventSheet du fichier select_event_sheet.dart
  Future<void> _showSelectEventModal(CartItem item) async {
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => SelectEventSheet(
        // ✅ Convertir EventModel → SelectEventModel via .toSelectModel()
        events: _events.map((e) => e.toSelectModel()).toList(),
        resourceName: item.resourceName,
        resourceDate: item.selectedDate != null ? DateTime.tryParse(item.selectedDate!) : null,
        onConfirm: (eventId, cinNumber) {
          Navigator.pop(context);
          // La CIN a déjà été vérifiée par SelectEventSheet via n8n
          // On envoie la réservation sans cinFile (fichier géré côté n8n)
          _sendRequest(item, eventId, null);
        },
        onCreateNew: () {
          Navigator.pop(context);
          _showCreateEventModal(item);
        },
      ),
    );
  }

  Future<void> _showCreateEventModal(CartItem item) async {
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _QuickEventSheet(
        token: _token!,
        item: item,
        onCreated: (eventId, cinFile) {
          Navigator.pop(context);
          _sendRequest(item, eventId, cinFile);
        },
      ),
    );
  }

  void _toast(String msg, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Row(children: [
        Icon(isError ? Icons.error_outline : Icons.check_circle_outline, color: Colors.white, size: 18),
        const SizedBox(width: 8),
        Expanded(child: Text(msg, style: const TextStyle(fontSize: 13))),
      ]),
      backgroundColor: isError ? kRed : kGreen,
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      margin: const EdgeInsets.all(12),
      duration: const Duration(seconds: 3),
    ));
  }

  // ─────────────────────────────────────
  // STATS
  // ─────────────────────────────────────
  int get _totalCart => _cart.fold(0, (s, i) => s + i.quantity);
  int get _totalSent => _reservations.length;
  int get _totalAccepted => _reservations.where((r) => r.isAccepted).length;

  // ─────────────────────────────────────
  // BUILD
  // ─────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(backgroundColor: kBg, body: Center(child: CircularProgressIndicator(color: kIndigo)));
    }
    return Scaffold(
      backgroundColor: kBg,
      body: SafeArea(
        child: Column(children: [
          _buildTopBar(),
          Expanded(
            child: RefreshIndicator(
              color: kIndigo,
              onRefresh: () async {
                await _loadCart();
                if (_token != null) await _fetchReservations();
              },
              child: ListView(
                padding: const EdgeInsets.fromLTRB(14, 14, 14, 32),
                children: [
                  _buildStats(),
                  const SizedBox(height: 14),
                  if (_token == null && _cart.isNotEmpty) ...[_buildLockBanner(), const SizedBox(height: 14)],
                  if (_cart.isEmpty && _reservations.isEmpty)
                    _buildEmptyState()
                  else ...[
                    if (_cart.isNotEmpty) ...[
                      _buildSectionHeader('Ressources sélectionnées',
                          '$_totalCart article${_totalCart > 1 ? 's' : ''}', Colors.green.shade50, Colors.green.shade800),
                      const SizedBox(height: 8),
                      _buildCartList(),
                      const SizedBox(height: 18),
                    ],
                    if (_token != null && _reservations.isNotEmpty) ...[
                      _buildSectionHeader('Mes demandes envoyées',
                          '$_totalSent demande${_totalSent > 1 ? 's' : ''}',
                          const Color(0xFFEDE9FE), const Color(0xFF5B21B6)),
                      const SizedBox(height: 8),
                      _buildReservationList(),
                    ],
                  ],
                ],
              ),
            ),
          ),
        ]),
      ),
    );
  }

  // ─────────────────────────────────────
  // WIDGETS
  // ─────────────────────────────────────

  Widget _buildTopBar() {
    return Container(
      width: double.infinity,
      decoration: const BoxDecoration(
        gradient: LinearGradient(colors: [Color(0xFF6D28D9), Color(0xFF9C27B0)],
            begin: Alignment.topLeft, end: Alignment.bottomRight),
        borderRadius: BorderRadius.only(bottomLeft: Radius.circular(28), bottomRight: Radius.circular(28)),
      ),
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 28),
      child: const Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('Mes réservations', style: TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.bold)),
        SizedBox(height: 4),
        Text('Gérez vos réservations', style: TextStyle(color: Colors.white70, fontSize: 14)),
      ]),
    );
  }

  Widget _buildStats() {
    return Row(children: [
      Expanded(child: _StatCard(label: 'Panier', value: '$_totalCart', color: kIndigo)),
      const SizedBox(width: 8),
      Expanded(child: _StatCard(label: 'Envoyées', value: '$_totalSent', color: kPurple)),
      const SizedBox(width: 8),
      Expanded(child: _StatCard(label: 'Acceptées', value: '$_totalAccepted', color: kGreen)),
    ]);
  }

  Widget _buildLockBanner() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(color: const Color(0xFFEEF2FF),
          border: Border.all(color: const Color(0xFFC7D2FE)), borderRadius: BorderRadius.circular(12)),
      child: const Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Icon(Icons.lock_outline, color: Color(0xFF6366F1), size: 20),
        SizedBox(width: 10),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Connexion requise pour envoyer',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF3730A3))),
          SizedBox(height: 2),
          Text('Cliquez "Envoyer" sur un article pour vous connecter.',
              style: TextStyle(fontSize: 11, color: Color(0xFF6366F1))),
        ])),
      ]),
    );
  }

  Widget _buildSectionHeader(String title, String badge, Color badgeBg, Color badgeFg) {
    return Row(children: [
      Text(title, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
      const SizedBox(width: 8),
      Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
        decoration: BoxDecoration(color: badgeBg, borderRadius: BorderRadius.circular(20)),
        child: Text(badge, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: badgeFg)),
      ),
    ]);
  }

  Widget _buildCartList() {
    return Container(
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.grey.shade100)),
      child: Column(
        children: _cart.asMap().entries.map((entry) {
          final i = entry.key;
          final item = entry.value;
          final stockMax = item.type == 'service' ? 1 : (_stockLimits[item.resourceId] ?? 1);
          return Column(children: [
            _CartRow(item: item, stockMax: stockMax, isSending: _sendingId == item.resourceId,
                onQty: _updateQty, onRemove: _removeItem, onSend: _openSendFlow),
            if (i < _cart.length - 1) Divider(height: 1, color: Colors.grey.shade100),
          ]);
        }).toList(),
      ),
    );
  }

  Widget _buildReservationList() {
    return Column(
      children: _reservations.map((r) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: _ReservationCard(
          res: r,
          onPay: () => Navigator.push(context,
              MaterialPageRoute(builder: (_) => PaymentPage(amount: r.resourcePrice ?? 0, locationId: r.id))),
        ),
      )).toList(),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 60),
        child: Column(children: [
          Container(width: 64, height: 64,
              decoration: BoxDecoration(color: Colors.grey.shade100, borderRadius: BorderRadius.circular(20)),
              child: Icon(Icons.shopping_bag_outlined, size: 30, color: Colors.grey.shade300)),
          const SizedBox(height: 16),
          const Text('Aucune réservation', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15, color: Colors.black87)),
          const SizedBox(height: 6),
          Text('Vous n\'avez encore rien dans votre panier.', style: TextStyle(fontSize: 13, color: Colors.grey.shade500)),
          const SizedBox(height: 20),
          ElevatedButton.icon(
            onPressed: () => Navigator.pushNamed(context, '/les_ressources'),
            icon: const Icon(Icons.search, size: 16),
            label: const Text('Découvrir les ressources'),
            style: ElevatedButton.styleFrom(backgroundColor: kIndigo, foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12)),
          ),
        ]),
      ),
    );
  }
}

// ─────────────────────────────────────────
// CART ROW
// ─────────────────────────────────────────
class _CartRow extends StatelessWidget {
  final CartItem item;
  final int stockMax;
  final bool isSending;
  final void Function(String, int) onQty;
  final void Function(String) onRemove;
  final void Function(CartItem) onSend;

  const _CartRow({required this.item, required this.stockMax, required this.isSending,
      required this.onQty, required this.onRemove, required this.onSend});

  @override
  Widget build(BuildContext context) {
    final isService = item.type == 'service';
    return Padding(
      padding: const EdgeInsets.all(14),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          _TypeBadge(type: item.type),
          const SizedBox(width: 6),
          Expanded(child: Text(item.resourceName,
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600), overflow: TextOverflow.ellipsis)),
        ]),
        const SizedBox(height: 4),
        Text(
          '${item.price.toStringAsFixed(0)} DT / ${isService ? 'prestation' : 'unité'}'
          '${!isService ? ' · Stock : $stockMax' : ''}'
          '${item.selectedDate != null ? ' · ${DateFormat('dd/MM/yyyy').format(DateTime.parse(item.selectedDate!))}' : ''}',
          style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
        ),
        const SizedBox(height: 10),
        Row(children: [
          if (!isService) ...[
            _QtyControl(value: item.quantity, max: stockMax,
                onDec: () => onQty(item.resourceId, item.quantity - 1),
                onInc: () => onQty(item.resourceId, item.quantity + 1)),
            const SizedBox(width: 8),
          ] else ...[
            Container(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(border: Border.all(color: Colors.grey.shade200), borderRadius: BorderRadius.circular(8)),
                child: Text('1 prestation', style: TextStyle(fontSize: 11, color: Colors.grey.shade500))),
            const SizedBox(width: 8),
          ],
          Text('${item.totalPrice.toStringAsFixed(0)} DT',
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: kIndigo)),
          const Spacer(),
          SizedBox(height: 34,
            child: ElevatedButton.icon(
              onPressed: isSending ? null : () => onSend(item),
              icon: isSending
                  ? const SizedBox(width: 12, height: 12, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Icon(Icons.send, size: 13),
              label: Text(isSending ? 'Envoi...' : 'Envoyer', style: const TextStyle(fontSize: 12)),
              style: ElevatedButton.styleFrom(backgroundColor: kIndigo, foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)), elevation: 0),
            ),
          ),
          const SizedBox(width: 6),
          GestureDetector(
            onTap: () => onRemove(item.resourceId),
            child: Container(width: 30, height: 30,
                decoration: BoxDecoration(border: Border.all(color: Colors.grey.shade200), borderRadius: BorderRadius.circular(8)),
                child: Icon(Icons.delete_outline, size: 16, color: Colors.grey.shade400)),
          ),
        ]),
      ]),
    );
  }
}

// ─────────────────────────────────────────
// QTY CONTROL
// ─────────────────────────────────────────
class _QtyControl extends StatelessWidget {
  final int value;
  final int max;
  final VoidCallback onDec;
  final VoidCallback onInc;
  const _QtyControl({required this.value, required this.max, required this.onDec, required this.onInc});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(border: Border.all(color: Colors.grey.shade200), borderRadius: BorderRadius.circular(8)),
      child: Row(children: [
        _QtyBtn(icon: Icons.remove, onTap: value <= 1 ? null : onDec),
        SizedBox(width: 28, child: Text('$value', textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700))),
        _QtyBtn(icon: Icons.add, onTap: value >= max ? null : onInc),
      ]),
    );
  }
}

class _QtyBtn extends StatelessWidget {
  final IconData icon;
  final VoidCallback? onTap;
  const _QtyBtn({required this.icon, this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(width: 28, height: 28, color: Colors.grey.shade50,
          child: Icon(icon, size: 14, color: onTap == null ? Colors.grey.shade300 : Colors.grey.shade600)),
    );
  }
}

// ─────────────────────────────────────────
// RESERVATION CARD
// ─────────────────────────────────────────
class _ReservationCard extends StatelessWidget {
  final Reservation res;
  final VoidCallback onPay;
  const _ReservationCard({required this.res, required this.onPay});

  @override
  Widget build(BuildContext context) {
    Color borderColor = Colors.grey.shade100;
    if (res.isPaid) borderColor = const Color(0xFFC4B5FD);
    else if (res.isAccepted) borderColor = const Color(0xFFA7F3D0);
    else if (res.isRefused) borderColor = const Color(0xFFFECACA);

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: Colors.white, border: Border.all(color: borderColor), borderRadius: BorderRadius.circular(16)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Wrap(spacing: 6, runSpacing: 4, children: [
          Text(res.resourceName ?? 'Ressource', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
          _StatusPill(status: res.status),
          if (res.resourceType != null) _TypeBadge(type: res.resourceType!),
          if (res.isPaid) Container(
            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
            decoration: BoxDecoration(color: const Color(0xFFEDE9FE), borderRadius: BorderRadius.circular(20)),
            child: const Row(mainAxisSize: MainAxisSize.min, children: [
              Icon(Icons.check, size: 10, color: Color(0xFF6D28D9)),
              SizedBox(width: 3),
              Text('Payé', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: Color(0xFF6D28D9))),
            ]),
          ),
        ]),
        const SizedBox(height: 8),
        Wrap(spacing: 10, runSpacing: 6, children: [
          SizedBox(width: MediaQuery.of(context).size.width * 0.65,
            child: Row(children: [
              Icon(Icons.calendar_today_outlined, size: 12, color: Colors.grey.shade400),
              const SizedBox(width: 4),
              Expanded(child: Text('${_fmt(res.dateDebut)} → ${_fmt(res.dateFin)}',
                  overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 11, color: Colors.grey.shade400))),
            ]),
          ),
          Text('${res.resourcePrice?.toStringAsFixed(0) ?? '-'} DT',
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: res.isPaid ? kPurple : kIndigo)),
          if (res.eventTitle != null)
            Text('· ${res.eventTitle}', style: TextStyle(fontSize: 11, color: Colors.grey.shade400)),
        ]),
        const SizedBox(height: 10),
        if (res.isPaid)
          _ActionButton(label: 'Voir la facture', icon: Icons.description_outlined, color: kPurple,
              onTap: () async {
                if (res.invoice != null && res.invoice!.isNotEmpty) {
                  await launchUrl(Uri.parse('http://localhost:5000/${res.invoice}'), mode: LaunchMode.externalApplication);
                }
              })
        else if (res.isAccepted)
          _ActionButton(label: 'Payer ${res.resourcePrice?.toStringAsFixed(0) ?? ''} DT',
              icon: Icons.credit_card, color: kGreen, onTap: onPay)
        else if (res.isPending)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 8),
            decoration: BoxDecoration(border: Border.all(color: Colors.grey.shade200), borderRadius: BorderRadius.circular(8)),
            child: Text('En attente de réponse', textAlign: TextAlign.center,
                style: TextStyle(fontSize: 12, color: Colors.grey.shade400, fontWeight: FontWeight.w500)),
          ),
      ]),
    );
  }

  String _fmt(String iso) {
    try { return DateFormat('dd MMM yyyy', 'fr_FR').format(DateTime.parse(iso)); } catch (_) { return iso; }
  }
}

class _ActionButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;
  const _ActionButton({required this.label, required this.icon, required this.color, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return SizedBox(width: double.infinity,
      child: ElevatedButton.icon(
        onPressed: onTap, icon: Icon(icon, size: 14),
        label: Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
        style: ElevatedButton.styleFrom(backgroundColor: color, foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 10),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)), elevation: 0),
      ),
    );
  }
}

// ─────────────────────────────────────────
// STATUS PILL
// ─────────────────────────────────────────
class _StatusPill extends StatelessWidget {
  final String status;
  const _StatusPill({required this.status});

  @override
  Widget build(BuildContext context) {
    final cfg = switch (status) {
      'acceptée' => (bg: const Color(0xFFD1FAE5), fg: const Color(0xFF065F46), icon: Icons.check, label: 'Acceptée'),
      'refusée'  => (bg: const Color(0xFFFEE2E2), fg: const Color(0xFF991B1B), icon: Icons.close, label: 'Refusée'),
      _          => (bg: const Color(0xFFFEF3C7), fg: const Color(0xFF92400E), icon: Icons.access_time, label: 'En attente'),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
      decoration: BoxDecoration(color: cfg.bg, borderRadius: BorderRadius.circular(20)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Icon(cfg.icon, size: 10, color: cfg.fg),
        const SizedBox(width: 3),
        Text(cfg.label, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: cfg.fg)),
      ]),
    );
  }
}

// ─────────────────────────────────────────
// TYPE BADGE
// ─────────────────────────────────────────
class _TypeBadge extends StatelessWidget {
  final String type;
  const _TypeBadge({required this.type});

  @override
  Widget build(BuildContext context) {
    final isProduct = type == 'product';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
      decoration: BoxDecoration(
          color: isProduct ? const Color(0xFFDCFCE7) : const Color(0xFFEDE9FE),
          borderRadius: BorderRadius.circular(20)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Icon(isProduct ? Icons.inventory_2_outlined : Icons.group_outlined, size: 10,
            color: isProduct ? const Color(0xFF166534) : const Color(0xFF5B21B6)),
        const SizedBox(width: 3),
        Text(isProduct ? 'Produit' : 'Service',
            style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600,
                color: isProduct ? const Color(0xFF166534) : const Color(0xFF5B21B6))),
      ]),
    );
  }
}

// ─────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────
class _StatCard extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  const _StatCard({required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(10, 10, 10, 12),
      decoration: BoxDecoration(color: Colors.white, border: Border.all(color: Colors.grey.shade100), borderRadius: BorderRadius.circular(12)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(label.toUpperCase(), style: TextStyle(fontSize: 9, color: Colors.grey.shade400, fontWeight: FontWeight.w600, letterSpacing: .5)),
        const SizedBox(height: 4),
        Text(value, style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: color)),
      ]),
    );
  }
}

// ─────────────────────────────────────────
// AUTH SHEET
// ─────────────────────────────────────────
class _AuthSheet extends StatefulWidget {
  final void Function(String token, Map<String, dynamic> user) onSuccess;
  const _AuthSheet({required this.onSuccess});

  @override
  State<_AuthSheet> createState() => _AuthSheetState();
}

class _AuthSheetState extends State<_AuthSheet> {
  bool _isLogin = true;
  bool _loading = false;
  String? _error;
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  final _firstCtrl = TextEditingController();
  final _lastCtrl = TextEditingController();

  Future<void> _submit() async {
    setState(() { _loading = true; _error = null; });
    try {
      Map<String, dynamic>? res;
      if (_isLogin) {
        res = await ApiService.login(_emailCtrl.text.trim(), _passCtrl.text);
      } else {
        res = await ApiService.register({'email': _emailCtrl.text.trim(), 'password': _passCtrl.text,
            'firstname': _firstCtrl.text.trim(), 'lastname': _lastCtrl.text.trim()});
      }
      if (res != null && res['token'] != null) {
        widget.onSuccess(res['token'], res['user'] ?? res);
      } else {
        setState(() => _error = 'Identifiants incorrects.');
      }
    } catch (_) {
      setState(() => _error = 'Erreur de connexion.');
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.fromLTRB(20, 20, 20, MediaQuery.of(context).viewInsets.bottom + 20),
      decoration: const BoxDecoration(color: Colors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          const Text('Connexion requise', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
          const Spacer(),
          GestureDetector(onTap: () => Navigator.pop(context), child: const Icon(Icons.close, size: 20)),
        ]),
        const SizedBox(height: 16),
        Row(children: [
          _TabBtn(label: 'Se connecter', active: _isLogin, onTap: () => setState(() => _isLogin = true)),
          const SizedBox(width: 8),
          _TabBtn(label: 'S\'inscrire', active: !_isLogin, onTap: () => setState(() => _isLogin = false)),
        ]),
        const SizedBox(height: 16),
        if (!_isLogin) ...[
          _Field(ctrl: _firstCtrl, hint: 'Prénom'),
          const SizedBox(height: 10),
          _Field(ctrl: _lastCtrl, hint: 'Nom'),
          const SizedBox(height: 10),
        ],
        _Field(ctrl: _emailCtrl, hint: 'Email', keyboardType: TextInputType.emailAddress),
        const SizedBox(height: 10),
        _Field(ctrl: _passCtrl, hint: 'Mot de passe', obscure: true),
        if (_error != null) ...[const SizedBox(height: 10), Text(_error!, style: const TextStyle(fontSize: 12, color: kRed))],
        const SizedBox(height: 16),
        SizedBox(width: double.infinity,
          child: ElevatedButton(
            onPressed: _loading ? null : _submit,
            style: ElevatedButton.styleFrom(backgroundColor: kIndigo, foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 13),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)), elevation: 0),
            child: _loading
                ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                : Text(_isLogin ? 'Se connecter' : 'S\'inscrire', style: const TextStyle(fontWeight: FontWeight.w600)),
          ),
        ),
      ]),
    );
  }
}

class _TabBtn extends StatelessWidget {
  final String label;
  final bool active;
  final VoidCallback onTap;
  const _TabBtn({required this.label, required this.active, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
        decoration: BoxDecoration(color: active ? kIndigo : Colors.grey.shade100, borderRadius: BorderRadius.circular(8)),
        child: Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600,
            color: active ? Colors.white : Colors.grey.shade600)),
      ),
    );
  }
}

class _Field extends StatelessWidget {
  final TextEditingController ctrl;
  final String hint;
  final bool obscure;
  final TextInputType? keyboardType;
  const _Field({required this.ctrl, required this.hint, this.obscure = false, this.keyboardType});

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: ctrl, obscureText: obscure, keyboardType: keyboardType,
      style: const TextStyle(fontSize: 14),
      decoration: InputDecoration(
        hintText: hint, hintStyle: TextStyle(color: Colors.grey.shade400, fontSize: 14),
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: Colors.grey.shade200)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: Colors.grey.shade200)),
        focusedBorder: const OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(10)), borderSide: BorderSide(color: kIndigo, width: 1.5)),
      ),
    );
  }
}

// ─────────────────────────────────────────
// PICKER OPTION (utilisé par _QuickEventSheet)
// ─────────────────────────────────────────
class _PickerOption extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  const _PickerOption({required this.icon, required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(color: const Color(0xFFEEF2FF), borderRadius: BorderRadius.circular(10)),
        child: Column(children: [
          Icon(icon, color: kIndigo, size: 22),
          const SizedBox(height: 6),
          Text(label, textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: kIndigo)),
        ]),
      ),
    );
  }
}

// ─────────────────────────────────────────
// QUICK CREATE EVENT SHEET
// ─────────────────────────────────────────
class _QuickEventSheet extends StatefulWidget {
  final String token;
  final CartItem item;
  final void Function(String eventId, File? cinFile) onCreated;
  const _QuickEventSheet({required this.token, required this.item, required this.onCreated});

  @override
  State<_QuickEventSheet> createState() => _QuickEventSheetState();
}

class _QuickEventSheetState extends State<_QuickEventSheet> {
  final _titleCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  DateTime? _date;
  bool _loading = false;
  String? _error;
  bool _contractAccepted = false;
  File? _cinFile;
  final _picker = ImagePicker();

  Future<void> _pickCin(ImageSource source) async {
    final picked = await _picker.pickImage(source: source, imageQuality: 80);
    if (picked != null) setState(() => _cinFile = File(picked.path));
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(context: context,
        initialDate: DateTime.now(), firstDate: DateTime.now(),
        lastDate: DateTime.now().add(const Duration(days: 365 * 3)));
    if (picked != null) setState(() => _date = picked);
  }

  Future<void> _submit() async {
    if (_titleCtrl.text.trim().isEmpty) { setState(() => _error = 'Le titre est requis.'); return; }
    if (!_contractAccepted) { setState(() => _error = 'Veuillez accepter les conditions du contrat.'); return; }
    if (_cinFile == null) { setState(() => _error = 'Veuillez importer votre photo CIN.'); return; }
    setState(() { _loading = true; _error = null; });
    final id = await ApiService.createEvent({
      'title': _titleCtrl.text.trim(),
      'description': _descCtrl.text.trim(),
      if (_date != null) 'date': _date!.toIso8601String(),
    }, widget.token);
    setState(() => _loading = false);
    if (id != null) widget.onCreated(id, _cinFile);
    else setState(() => _error = 'Impossible de créer l\'événement.');
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.fromLTRB(20, 20, 20, MediaQuery.of(context).viewInsets.bottom + 24),
      constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.9),
      decoration: const BoxDecoration(color: Colors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      child: SingleChildScrollView(
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            const Text('Nouvel événement', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
            const Spacer(),
            GestureDetector(onTap: () => Navigator.pop(context), child: const Icon(Icons.close, size: 20)),
          ]),
          const SizedBox(height: 16),
          _Field(ctrl: _titleCtrl, hint: 'Titre de l\'événement *'),
          const SizedBox(height: 10),
          _Field(ctrl: _descCtrl, hint: 'Description (optionnel)'),
          const SizedBox(height: 10),
          GestureDetector(
            onTap: _pickDate,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
              decoration: BoxDecoration(border: Border.all(color: Colors.grey.shade200), borderRadius: BorderRadius.circular(10)),
              child: Row(children: [
                Icon(Icons.calendar_today_outlined, size: 16, color: Colors.grey.shade400),
                const SizedBox(width: 8),
                Text(_date != null ? DateFormat('dd/MM/yyyy').format(_date!) : 'Date de l\'événement',
                    style: TextStyle(fontSize: 14, color: _date != null ? Colors.black87 : Colors.grey.shade400)),
              ]),
            ),
          ),
          const SizedBox(height: 16),
          const Divider(),
          const SizedBox(height: 12),
          // Contrat
          GestureDetector(
            onTap: () => setState(() => _contractAccepted = !_contractAccepted),
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                  color: _contractAccepted ? const Color(0xFFECFDF5) : Colors.grey.shade50,
                  border: Border.all(color: _contractAccepted ? kGreen : Colors.grey.shade200),
                  borderRadius: BorderRadius.circular(12)),
              child: Row(children: [
                AnimatedContainer(duration: const Duration(milliseconds: 200), width: 22, height: 22,
                    decoration: BoxDecoration(color: _contractAccepted ? kGreen : Colors.transparent,
                        border: Border.all(color: _contractAccepted ? kGreen : Colors.grey.shade400, width: 2),
                        borderRadius: BorderRadius.circular(6)),
                    child: _contractAccepted ? const Icon(Icons.check, color: Colors.white, size: 14) : null),
                const SizedBox(width: 10),
                const Expanded(child: Text('J\'accepte les conditions générales du contrat de réservation',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500))),
              ]),
            ),
          ),
          const SizedBox(height: 12),
          // CIN
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
                color: _cinFile != null ? const Color(0xFFECFDF5) : Colors.grey.shade50,
                border: Border.all(color: _cinFile != null ? kGreen : Colors.grey.shade200),
                borderRadius: BorderRadius.circular(12)),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Icon(Icons.credit_card_outlined, size: 16, color: _cinFile != null ? kGreen : Colors.grey.shade600),
                const SizedBox(width: 6),
                Text('Photo CIN *', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700,
                    color: _cinFile != null ? kGreen : Colors.black87)),
              ]),
              const SizedBox(height: 10),
              if (_cinFile != null) ...[
                ClipRRect(borderRadius: BorderRadius.circular(8),
                    child: Image.file(_cinFile!, height: 100, width: double.infinity, fit: BoxFit.cover)),
                const SizedBox(height: 8),
                GestureDetector(onTap: () => setState(() => _cinFile = null),
                    child: Text('Supprimer', style: TextStyle(fontSize: 11, color: Colors.grey.shade400))),
              ] else ...[
                Row(children: [
                  Expanded(child: _PickerOption(icon: Icons.camera_alt_outlined, label: 'Caméra',
                      onTap: () => _pickCin(ImageSource.camera))),
                  const SizedBox(width: 8),
                  Expanded(child: _PickerOption(icon: Icons.photo_library_outlined, label: 'Galerie',
                      onTap: () => _pickCin(ImageSource.gallery))),
                ]),
              ],
            ]),
          ),
          if (_error != null) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: const Color(0xFFFEF2F2), borderRadius: BorderRadius.circular(8)),
              child: Row(children: [
                const Icon(Icons.error_outline, color: kRed, size: 16),
                const SizedBox(width: 6),
                Expanded(child: Text(_error!, style: const TextStyle(fontSize: 12, color: kRed))),
              ]),
            ),
          ],
          const SizedBox(height: 16),
          SizedBox(width: double.infinity,
            child: ElevatedButton(
              onPressed: _loading ? null : _submit,
              style: ElevatedButton.styleFrom(backgroundColor: kIndigo, foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 13),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)), elevation: 0),
              child: _loading
                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Text('Créer et envoyer la demande', style: TextStyle(fontWeight: FontWeight.w600)),
            ),
          ),
        ]),
      ),
    );
  }
}