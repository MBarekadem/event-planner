import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;

import 'mes_reservations_page.dart';

class ResourceDetailPage extends StatefulWidget {
  final String resourceId;
  final Map<String, dynamic> user;
  final String token;

  const ResourceDetailPage({
    super.key,
    required this.resourceId,
    required this.user,
    required this.token,
  });

  @override
  State<ResourceDetailPage> createState() => _ResourceDetailPageState();
}

class _ResourceDetailPageState extends State<ResourceDetailPage>
    with SingleTickerProviderStateMixin {
  dynamic _resource;
  bool _loading = true;
  List<dynamic> _comments = [];
  int _currentImageIndex = 0;
  final PageController _pageController = PageController();

  // Calendar
  DateTime _currentMonth = DateTime.now();
  DateTime? _selectedDate;
  List<String> _unavailableDates = [];
  List<Map<String, dynamic>> _unavailableSlots = [];

  // Time slots
  bool _showTimeSlots = false;
  bool _loadingTimeSlots = false;
  List<Map<String, dynamic>> _availableTimeSlots = [];
  List<Map<String, dynamic>> _selectedTimes = [];

  // Produit quantity
  int _productQuantity = 1;

  // Cart — stocké comme List<CartItem> pour rester synchronisé avec CartService
  List<CartItem> _cartItems = [];
  bool _addedToCart = false;

  // Comment form
  final TextEditingController _commentController = TextEditingController();
  int _newRating = 5;
  bool _showCommentForm = false;
  bool _submittingComment = false;

  static const String baseUrl = 'http://localhost:5000/api';
  static const Color _purple = Color(0xFF9C27B0);
  static const Color _darkPurple = Color(0xFF7B2FBE);

  // ── type helpers ──
  // Le backend renvoie 'produit' ; CartItem.type attend 'product' pour les produits
  // et 'service' pour les services. On normalise à la lecture/écriture.
  bool get _isProduct => (_resource?['type'] ?? '') == 'produit';

  /// Normalise le type backend → CartItem.type
  String _normalizeType(String backendType) {
    if (backendType == 'produit') return 'product';
    return 'service'; // tout le reste est un service
  }

  @override
  void initState() {
    super.initState();
    _loadCartFromStorage();
    _fetchResource();
  }

  @override
  void dispose() {
    _pageController.dispose();
    _commentController.dispose();
    super.dispose();
  }

  // ── Cart persistence ──────────────────────────────────

  Future<void> _loadCartFromStorage() async {
    final items = await CartService.load();
    if (mounted) setState(() => _cartItems = items);
  }

  Future<void> _persistCart(List<CartItem> items) async {
    await CartService.save(items);
    if (mounted) setState(() => _cartItems = items);
  }

  // Convertit un CartItem en Map<String,dynamic> pour l'affichage local
  // (le BottomSheet consomme des Map, on garde la compatibilité)
  List<Map<String, dynamic>> get _cartAsMaps =>
      _cartItems.map((i) => i.toJson()).toList();

  // ── Resource fetch ────────────────────────────────────

  Future<void> _fetchResource() async {
    try {
      final res = await http.get(
        Uri.parse('$baseUrl/ressources/get_by_id/${widget.resourceId}'),
      );
      if (res.statusCode == 200) {
        final data = json.decode(res.body);
        setState(() => _resource = data);
        _parseAvailability(data);
        await _fetchComments();
      }
    } catch (_) {
    } finally {
      setState(() => _loading = false);
    }
  }

  void _parseAvailability(dynamic data) {
    final avail = data['availability'] as List?;
    if (avail == null) return;
    final Set<String> unavailDates = {};
    final List<Map<String, dynamic>> slots = [];
    for (final period in avail) {
      if (period['satut_disp'] == false) {
        final start = DateTime.tryParse(period['date_deb']?.toString() ?? '');
        final end = DateTime.tryParse(period['date_fin']?.toString() ?? '');
        if (start != null && end != null) {
          slots.add({'start': start, 'end': end});
          if (start.hour == 0 && end.hour >= 23) {
            DateTime cur = start;
            while (!cur.isAfter(end)) {
              unavailDates.add(cur.toDateString());
              cur = cur.add(const Duration(days: 1));
            }
          }
        }
      }
    }
    setState(() {
      _unavailableDates = unavailDates.toList();
      _unavailableSlots = slots;
    });
  }

  Future<void> _fetchComments() async {
    try {
      final res = await http.get(
        Uri.parse('$baseUrl/comment/ressource/${widget.resourceId}'),
      );
      if (res.statusCode == 200) {
        setState(() => _comments = json.decode(res.body) as List);
      }
    } catch (_) {}
  }

  // ── Date / time helpers ───────────────────────────────

  bool _isDateAvailable(DateTime date) {
    final today = DateTime.now();
    final todayMidnight = DateTime(today.year, today.month, today.day);
    final check = DateTime(date.year, date.month, date.day);
    if (check.isBefore(todayMidnight)) return false;
    return !_unavailableDates.contains(check.toDateString());
  }

  Future<void> _fetchTimeSlots(DateTime date) async {
    setState(() {
      _loadingTimeSlots = true;
      _availableTimeSlots = [];
    });
    await Future.delayed(const Duration(milliseconds: 300));
    final slots = <Map<String, dynamic>>[];
    final base = DateTime(date.year, date.month, date.day);
    for (int h = 0; h < 24; h++) {
      final start = base.add(Duration(hours: h));
      final end = base.add(Duration(hours: h + 1));
      final unavail = _unavailableSlots.any((s) {
        final sStart = s['start'] as DateTime;
        final sEnd = s['end'] as DateTime;
        return start.isBefore(sEnd) && end.isAfter(sStart);
      });
      if (!unavail) {
        slots.add({
          'id': '${start.toIso8601String()}-${end.toIso8601String()}',
          'start': start,
          'end': end,
          'display':
              '${h.toString().padLeft(2, '0')}:00 - ${(h + 1).toString().padLeft(2, '0')}:00',
          'price': _resource?['price'] ?? 0,
        });
      }
    }
    setState(() {
      _availableTimeSlots = slots;
      _loadingTimeSlots = false;
    });
  }

  void _toggleTimeSlot(Map<String, dynamic> slot) {
    setState(() {
      final exists = _selectedTimes.any((s) => s['id'] == slot['id']);
      if (exists) {
        _selectedTimes.removeWhere((s) => s['id'] == slot['id']);
      } else {
        _selectedTimes.add(slot);
      }
    });
  }

  double _calculateTotal() {
    if (_isProduct) {
      return (_resource?['price'] ?? 0) * _productQuantity.toDouble();
    }
    return _selectedTimes.fold(
      0.0,
      (sum, s) => sum + (s['price'] as num).toDouble(),
    );
  }

  // ── Cart actions ──────────────────────────────────────

  Future<void> _addToCart() async {
    if (_resource == null) return;

    final resourceId = _resource['_id'] as String;
    final resourceName = _resource['name'] as String? ?? '';
    final price = (_resource['price'] as num?)?.toDouble() ?? 0.0;
    final backendType = _resource['type'] as String? ?? '';
    final normalizedType = _normalizeType(backendType);

    final updated = List<CartItem>.from(_cartItems);

    if (_isProduct) {
      // Produit : fusionner si déjà présent
      final idx = updated.indexWhere(
        (i) => i.resourceId == resourceId && i.type == 'product',
      );
      if (idx != -1) {
        final newQty = updated[idx].quantity + _productQuantity;
        updated[idx] = updated[idx].copyWith(
          quantity: newQty,
          totalPrice: price * newQty,
        );
        await _persistCart(updated);
        _showCartSnack('Quantité mise à jour dans le panier !');
      } else {
        updated.add(
          CartItem(
            resourceId: resourceId,
            resourceName: resourceName,
            price: price,
            type: normalizedType, // 'product'
            quantity: _productQuantity,
            totalPrice: _calculateTotal(),
            selectedDate: null,
            selectedTimes: const [],
          ),
        );
        await _persistCart(updated);
        _showCartSnack('Ajouté au panier !');
      }
    } else {
      // Service : vérifier doublon par date+créneaux
      final dateStr = _selectedDate?.toIso8601String().split('T')[0] ?? '';
      final slotsStr = _selectedTimes.map((s) => s['display']).join('|');
      final isDuplicate = updated.any(
        (i) =>
            i.resourceId == resourceId &&
            i.selectedDate == _selectedDate?.toIso8601String() &&
            i.selectedTimes.map((t) => t['display']).join('|') == slotsStr,
      );
      if (isDuplicate) {
        _showCartSnack('Déjà dans votre panier');
        return;
      }

      // Convertit les selectedTimes en Map<String,String> pour CartItem
      final timesForCart = _selectedTimes
          .map(
            (s) => <String, String>{
              'display': s['display']?.toString() ?? '',
              'start': (s['start'] as DateTime).toIso8601String(),
              'end': (s['end'] as DateTime).toIso8601String(),
              'price': (s['price'] ?? 0).toString(),
            },
          )
          .toList();

      updated.add(
        CartItem(
          resourceId: resourceId,
          resourceName: resourceName,
          price: price,
          type: normalizedType, // 'service'
          quantity: 1,
          totalPrice: _calculateTotal() > 0 ? _calculateTotal() : price,
          selectedDate: _selectedDate?.toIso8601String(),
          selectedTimes: timesForCart,
        ),
      );
      await _persistCart(updated);
      _showCartSnack('Ajouté au panier !');
    }

    setState(() => _addedToCart = true);
    Future.delayed(
      const Duration(seconds: 2),
      () {
        if (mounted) setState(() => _addedToCart = false);
      },
    );
  }

  Future<void> _removeFromCart(String resourceId) async {
    final updated =
        _cartItems.where((i) => i.resourceId != resourceId).toList();
    await _persistCart(updated);
  }

  Future<void> _updateCartQty(String resourceId, int newQty) async {
    if (newQty < 1) {
      await _removeFromCart(resourceId);
      return;
    }
    final updated = _cartItems.map((i) {
      if (i.resourceId != resourceId) return i;
      return i.copyWith(quantity: newQty, totalPrice: newQty * i.price);
    }).toList();
    await _persistCart(updated);
  }

  void _showCartSnack(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        backgroundColor: _purple,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  // ── Comment ───────────────────────────────────────────

  Future<void> _submitComment() async {
    if (_commentController.text.length < 10) {
      _showCartSnack('Minimum 10 caractères');
      return;
    }
    setState(() => _submittingComment = true);
    try {
      await http.post(
        Uri.parse('$baseUrl/comment/add'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${widget.token}',
        },
        body: json.encode({
          'contenue': _commentController.text,
          'nbr_stars': _newRating,
          'C_res': widget.resourceId,
        }),
      );
      _commentController.clear();
      setState(() {
        _showCommentForm = false;
        _newRating = 5;
      });
      await _fetchComments();
    } catch (_) {
    } finally {
      setState(() => _submittingComment = false);
    }
  }

  // ── Misc helpers ──────────────────────────────────────

  List<String> _getImages() {
    try {
      final media = _resource['media'] as List?;
      if (media != null) {
        return media.expand((m) => (m['img_vd'] as List? ?? [])).map((img) {
          final s = img.toString();
          return s.startsWith('http') ? s : 'http://localhost:5000/$s';
        }).toList();
      }
    } catch (_) {}
    return [
      'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800',
    ];
  }

  double get _averageRating {
    if (_comments.isEmpty) return 0;
    return _comments.fold(0.0, (s, c) => s + (c['nbr_stars'] ?? 0)) /
        _comments.length;
  }

  // ── Build ─────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator(color: _purple)),
      );
    }

    if (_resource == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Ressource')),
        body: const Center(child: Text('Ressource introuvable')),
      );
    }

    final images = _getImages();
    final isPrestataire = widget.user['role'] == 'prestataire';
    final canAdd = _isProduct || _selectedTimes.isNotEmpty;

    // Vérification doublon pour services
    final alreadyInCart = _isProduct
        ? false
        : canAdd &&
              _cartItems.any((i) {
                final slotsStr =
                    _selectedTimes.map((s) => s['display']).join('|');
                return i.resourceId == (_resource['_id'] as String) &&
                    i.selectedDate == _selectedDate?.toIso8601String() &&
                    i.selectedTimes.map((t) => t['display']).join('|') ==
                        slotsStr;
              });

    return Scaffold(
      backgroundColor: const Color(0xFFF5F0FF),
      body: CustomScrollView(
        physics: const BouncingScrollPhysics(),
        slivers: [
          // ── AppBar avec image ──
          SliverAppBar(
            expandedHeight: 280,
            pinned: true,
            backgroundColor: _darkPurple,
            leading: GestureDetector(
              onTap: () => Navigator.pop(context),
              child: Container(
                margin: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.black26,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(
                  Icons.arrow_back_ios_new,
                  color: Colors.white,
                  size: 16,
                ),
              ),
            ),
            actions: [
              if (!isPrestataire)
                GestureDetector(
                  onTap: () => _showCartBottomSheet(context),
                  child: Container(
                    margin: const EdgeInsets.all(8),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.black26,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Row(
                      children: [
                        const Icon(
                          Icons.shopping_cart_outlined,
                          color: Colors.white,
                          size: 16,
                        ),
                        if (_cartItems.isNotEmpty) ...[
                          const SizedBox(width: 4),
                          Container(
                            padding: const EdgeInsets.all(3),
                            decoration: const BoxDecoration(
                              color: Colors.red,
                              shape: BoxShape.circle,
                            ),
                            child: Text(
                              '${_cartItems.length}',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 9,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
            ],
            flexibleSpace: FlexibleSpaceBar(
              background: Stack(
                fit: StackFit.expand,
                children: [
                  PageView.builder(
                    controller: _pageController,
                    itemCount: images.length,
                    onPageChanged: (i) =>
                        setState(() => _currentImageIndex = i),
                    itemBuilder: (_, i) => Image.network(
                      images[i],
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Container(
                        color: const Color(0xFFF3E5F5),
                        child: const Icon(
                          Icons.image_not_supported,
                          color: _purple,
                          size: 48,
                        ),
                      ),
                    ),
                  ),
                  const DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [Colors.transparent, Colors.black45],
                      ),
                    ),
                  ),
                  if (images.length > 1)
                    Positioned(
                      bottom: 16,
                      right: 16,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.black54,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          '${_currentImageIndex + 1}/${images.length}',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                          ),
                        ),
                      ),
                    ),
                  if (images.length > 1)
                    Positioned(
                      bottom: 12,
                      left: 0,
                      right: 0,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: List.generate(
                          images.length,
                          (i) => GestureDetector(
                            onTap: () => _pageController.animateToPage(
                              i,
                              duration: const Duration(milliseconds: 300),
                              curve: Curves.easeInOut,
                            ),
                            child: Container(
                              margin: const EdgeInsets.symmetric(horizontal: 3),
                              width: i == _currentImageIndex ? 20 : 6,
                              height: 6,
                              decoration: BoxDecoration(
                                color: i == _currentImageIndex
                                    ? Colors.white
                                    : Colors.white54,
                                borderRadius: BorderRadius.circular(3),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),

          SliverToBoxAdapter(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildTitleCard(),
                const SizedBox(height: 12),
                _buildProviderCard(),
                const SizedBox(height: 12),
                _buildDescriptionCard(),
                const SizedBox(height: 12),
                if (_resource['attributes'] != null ||
                    _resource['customAttributes'] != null)
                  _buildAttributesCard(),
                const SizedBox(height: 12),
                if (!_isProduct) ...[
                  _buildCalendarCard(),
                  const SizedBox(height: 12),
                  if (_showTimeSlots && _selectedDate != null)
                    _buildTimeSlotsCard(),
                  if (_showTimeSlots && _selectedDate != null)
                    const SizedBox(height: 12),
                ],
                _buildBookingCard(isPrestataire, canAdd, alreadyInCart),
                const SizedBox(height: 12),
                _buildCommentsCard(),
                const SizedBox(height: 32),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── Cards ─────────────────────────────────────────────

  Widget _buildTitleCard() {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        boxShadow: [_boxShadow()],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  _resource['name'] ?? '',
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF1A1A2E),
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 4,
                ),
                decoration: BoxDecoration(
                  color: _isProduct
                      ? const Color(0xFFE8F5E9)
                      : const Color(0xFFF3E5F5),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  (_resource['type'] ?? '').toString().capitalize(),
                  style: TextStyle(
                    color: _isProduct ? Colors.green[700] : _purple,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          _StarRow(rating: _averageRating, reviewCount: _comments.length),
          const SizedBox(height: 8),
          if (_resource['locationname'] != null)
            Row(
              children: [
                const Icon(Icons.location_on, size: 14, color: Colors.grey),
                const SizedBox(width: 4),
                Text(
                  _resource['locationname'].toString(),
                  style: const TextStyle(fontSize: 13, color: Colors.grey),
                ),
              ],
            ),
        ],
      ),
    );
  }

  Widget _buildProviderCard() {
    final prest = _resource['prestataire'];
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        boxShadow: [_boxShadow()],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Informations du prestataire',
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.bold,
              color: Color(0xFF1A1A2E),
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              _InfoChip(
                icon: Icons.business,
                label: prest?['lastname'] ?? 'N/A',
                color: const Color(0xFF6366F1),
              ),
              const SizedBox(width: 8),
              _InfoChip(
                icon: Icons.phone,
                label: prest?['numTel'] ?? 'N/A',
                color: const Color(0xFF10B981),
              ),
            ],
          ),
          const SizedBox(height: 8),
          _InfoChip(
            icon: Icons.email,
            label: prest?['email'] ?? 'N/A',
            color: const Color(0xFF0EA5E9),
          ),
        ],
      ),
    );
  }

  Widget _buildDescriptionCard() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        boxShadow: [_boxShadow()],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Description',
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.bold,
              color: Color(0xFF1A1A2E),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            _resource['description'] ?? '',
            style: const TextStyle(
              fontSize: 13,
              color: Colors.grey,
              height: 1.6,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAttributesCard() {
    final attrs = <String, dynamic>{};
    final raw = _resource['attributes'];
    if (raw is Map) {
      raw.forEach((k, v) => attrs[k.toString()] = v);
    }
    final custom = _resource['customAttributes'] as List? ?? [];
    for (final a in custom) {
      if (a['name'] != null) attrs[a['name'].toString()] = a['value'];
    }
    if (attrs.isEmpty) return const SizedBox.shrink();

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        boxShadow: [_boxShadow()],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Caractéristiques',
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.bold,
              color: Color(0xFF1A1A2E),
            ),
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: attrs.entries.map((e) {
              final val = e.value is bool
                  ? (e.value ? 'Oui' : 'Non')
                  : e.value.toString();
              return Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFFBEB),
                  border: Border.all(color: const Color(0xFFFDE68A)),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  '${e.key.capitalize()} · $val',
                  style: const TextStyle(
                    fontSize: 12,
                    color: Color(0xFF92400E),
                    fontWeight: FontWeight.w500,
                  ),
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildCalendarCard() {
    final monthNames = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
    ];
    final weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    final days = _getDaysInMonth(_currentMonth);

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        boxShadow: [_boxShadow()],
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Sélectionner une date',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF1A1A2E),
                ),
              ),
              if (_selectedDate != null)
                GestureDetector(
                  onTap: () => setState(() {
                    _selectedDate = null;
                    _selectedTimes = [];
                    _showTimeSlots = false;
                    _availableTimeSlots = [];
                  }),
                  child: const Text(
                    'Réinitialiser',
                    style: TextStyle(color: Colors.grey, fontSize: 12),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              IconButton(
                icon: const Icon(Icons.chevron_left),
                onPressed: () => setState(() {
                  _currentMonth = DateTime(
                    _currentMonth.year,
                    _currentMonth.month - 1,
                    1,
                  );
                }),
              ),
              Text(
                '${monthNames[_currentMonth.month - 1]} ${_currentMonth.year}',
                style: const TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 14,
                ),
              ),
              IconButton(
                icon: const Icon(Icons.chevron_right),
                onPressed: () => setState(() {
                  _currentMonth = DateTime(
                    _currentMonth.year,
                    _currentMonth.month + 1,
                    1,
                  );
                }),
              ),
            ],
          ),
          GridView.count(
            crossAxisCount: 7,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            children: weekDays
                .map(
                  (d) => Center(
                    child: Text(
                      d,
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                        color: Colors.grey,
                      ),
                    ),
                  ),
                )
                .toList(),
          ),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 7,
            ),
            itemCount: days.length,
            itemBuilder: (_, i) {
              final item = days[i];
              final date = item['date'] as DateTime;
              final inMonth = item['inMonth'] as bool;
              if (!inMonth) return const SizedBox();
              final avail = _isDateAvailable(date);
              final isSelected =
                  _selectedDate?.toDateString() == date.toDateString();
              final isToday =
                  date.toDateString() == DateTime.now().toDateString();

              Color bgColor = Colors.transparent;
              Color textColor =
                  avail ? const Color(0xFF1A1A2E) : Colors.red[200]!;
              if (isSelected) {
                bgColor = _purple;
                textColor = Colors.white;
              } else if (isToday) {
                bgColor = const Color(0xFFF3E5F5);
              }

              return GestureDetector(
                onTap: avail && inMonth
                    ? () {
                        setState(() {
                          _selectedDate = date;
                          _selectedTimes = [];
                          _showTimeSlots = true;
                        });
                        _fetchTimeSlots(date);
                      }
                    : null,
                child: Container(
                  margin: const EdgeInsets.all(2),
                  decoration: BoxDecoration(
                    color: bgColor,
                    borderRadius: BorderRadius.circular(8),
                    border: isToday && !isSelected
                        ? Border.all(color: _purple.withOpacity(0.3))
                        : null,
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        '${date.day}',
                        style: TextStyle(
                          fontSize: 12,
                          color: textColor,
                          fontWeight: isSelected || isToday
                              ? FontWeight.bold
                              : FontWeight.normal,
                        ),
                      ),
                      if (avail && inMonth)
                        Container(
                          width: 3,
                          height: 3,
                          decoration: BoxDecoration(
                            color: isSelected
                                ? Colors.white70
                                : Colors.green[400],
                            shape: BoxShape.circle,
                          ),
                        ),
                    ],
                  ),
                ),
              );
            },
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              _LegendDot(color: Colors.green[400]!, label: 'Disponible'),
              const SizedBox(width: 12),
              _LegendDot(color: Colors.red[300]!, label: 'Indisponible'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildTimeSlotsCard() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        boxShadow: [_boxShadow()],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.access_time, color: _purple, size: 18),
              const SizedBox(width: 6),
              const Text(
                'Créneaux disponibles',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF1A1A2E),
                ),
              ),
              const Spacer(),
              if (_selectedTimes.isNotEmpty)
                GestureDetector(
                  onTap: () => setState(() => _selectedTimes = []),
                  child: const Text(
                    'Désélectionner tout',
                    style: TextStyle(color: Colors.grey, fontSize: 11),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 8),
          if (_selectedDate != null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFFF3E5F5),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                _selectedDate!.toLocaleFR(),
                style: const TextStyle(color: _purple, fontSize: 12),
              ),
            ),
          const SizedBox(height: 10),
          if (_loadingTimeSlots)
            const Center(child: CircularProgressIndicator(color: _purple))
          else if (_availableTimeSlots.isEmpty)
            const Center(
              child: Text(
                'Aucun créneau disponible',
                style: TextStyle(color: Colors.grey),
              ),
            )
          else
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 3,
                childAspectRatio: 2.5,
                crossAxisSpacing: 8,
                mainAxisSpacing: 8,
              ),
              itemCount: _availableTimeSlots.length,
              itemBuilder: (_, i) {
                final slot = _availableTimeSlots[i];
                final selected = _selectedTimes.any(
                  (s) => s['id'] == slot['id'],
                );
                return GestureDetector(
                  onTap: () => _toggleTimeSlot(slot),
                  child: Container(
                    decoration: BoxDecoration(
                      color: selected ? _purple : const Color(0xFFF3E5F5),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: selected ? _purple : Colors.transparent,
                      ),
                    ),
                    child: Center(
                      child: Text(
                        slot['display'],
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          color: selected ? Colors.white : _purple,
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
          if (_selectedTimes.isNotEmpty) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFF3E5F5),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    '${_selectedTimes.length} créneau(x)',
                    style: const TextStyle(
                      color: _purple,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  Text(
                    'Total : ${_calculateTotal().toStringAsFixed(0)} DT',
                    style: const TextStyle(
                      color: _purple,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildBookingCard(
    bool isPrestataire,
    bool canAdd,
    bool alreadyInCart,
  ) {
    final price = _resource['price'] ?? 0;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        boxShadow: [_boxShadow()],
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                '$price DT',
                style: const TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF1A1A2E),
                ),
              ),
              Text(
                _isProduct ? ' / unité' : ' / heure',
                style: const TextStyle(
                  fontSize: 14,
                  color: Colors.grey,
                  fontWeight: FontWeight.normal,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          if (isPrestataire)
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFFFFBEB),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFFDE68A)),
              ),
              child: const Column(
                children: [
                  Icon(Icons.info_outline, color: Color(0xFFD97706), size: 28),
                  SizedBox(height: 6),
                  Text(
                    'Réservation réservée aux particuliers',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: Color(0xFF92400E),
                      fontWeight: FontWeight.w600,
                      fontSize: 13,
                    ),
                  ),
                  SizedBox(height: 4),
                  Text(
                    'Les prestataires ne peuvent pas réserver.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Color(0xFFD97706), fontSize: 11),
                  ),
                ],
              ),
            )
          else if (_isProduct) ...[
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFF5F0FF),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Column(
                children: [
                  const Text(
                    'Quantité',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF1A1A2E),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      GestureDetector(
                        onTap: _productQuantity > 1
                            ? () => setState(() => _productQuantity--)
                            : null,
                        child: Container(
                          width: 40,
                          height: 40,
                          decoration: BoxDecoration(
                            color: _productQuantity > 1
                                ? _purple
                                : Colors.grey[300],
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Icon(
                            Icons.remove,
                            color: Colors.white,
                            size: 20,
                          ),
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 24),
                        child: Text(
                          '$_productQuantity',
                          style: const TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      GestureDetector(
                        onTap: () => setState(() => _productQuantity++),
                        child: Container(
                          width: 40,
                          height: 40,
                          decoration: BoxDecoration(
                            color: _purple,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Icon(
                            Icons.add,
                            color: Colors.white,
                            size: 20,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 8,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      'Total : ${_calculateTotal().toStringAsFixed(0)} DT',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: _purple,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _addToCart,
                icon: Icon(
                  _addedToCart ? Icons.check : Icons.shopping_cart_outlined,
                  size: 18,
                ),
                label: Text(
                  _addedToCart
                      ? 'Ajouté !'
                      : 'Ajouter au panier (${_calculateTotal().toStringAsFixed(0)} DT)',
                  style: const TextStyle(fontSize: 13),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: _addedToCart ? Colors.green : _purple,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
              ),
            ),
          ] else if (alreadyInCart)
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFEDE9FE),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Column(
                children: [
                  const Icon(Icons.check_circle, color: _purple, size: 28),
                  const SizedBox(height: 6),
                  const Text(
                    'Déjà dans votre panier',
                    style: TextStyle(
                      color: _purple,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  TextButton(
                    onPressed: () => _showCartBottomSheet(context),
                    child: const Text(
                      'Voir le panier →',
                      style: TextStyle(color: _purple, fontSize: 12),
                    ),
                  ),
                ],
              ),
            )
          else
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: canAdd ? _addToCart : null,
                icon: Icon(
                  _addedToCart ? Icons.check : Icons.shopping_cart_outlined,
                  size: 18,
                ),
                label: Text(
                  _addedToCart
                      ? 'Ajouté !'
                      : _selectedDate == null
                      ? 'Sélectionnez une date'
                      : _selectedTimes.isEmpty
                      ? 'Choisissez des créneaux'
                      : 'Ajouter au panier (${_calculateTotal().toStringAsFixed(0)} DT)',
                  style: const TextStyle(fontSize: 13),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: _addedToCart ? Colors.green : _purple,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                  disabledBackgroundColor: Colors.grey[300],
                  disabledForegroundColor: Colors.grey[500],
                ),
              ),
            ),

          if (!isPrestataire)
            const Padding(
              padding: EdgeInsets.only(top: 8),
              child: Text(
                'Connexion requise uniquement pour envoyer',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey, fontSize: 11),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildCommentsCard() {
    final hasToken = widget.token.isNotEmpty;
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        boxShadow: [_boxShadow()],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Icon(
                    Icons.chat_bubble_outline,
                    color: _purple,
                    size: 18,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    'Avis (${_comments.length})',
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF1A1A2E),
                    ),
                  ),
                ],
              ),
              if (hasToken)
                GestureDetector(
                  onTap: () =>
                      setState(() => _showCommentForm = !_showCommentForm),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF3E5F5),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      _showCommentForm ? 'Annuler' : 'Donner un avis',
                      style: const TextStyle(
                        color: _purple,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
            ],
          ),
          if (_averageRating > 0) ...[
            const SizedBox(height: 6),
            Text(
              'Note moyenne : ${_averageRating.toStringAsFixed(1)}/5',
              style: const TextStyle(color: Colors.grey, fontSize: 12),
            ),
          ],
          if (_showCommentForm && hasToken) ...[
            const SizedBox(height: 14),
            const Text(
              'Votre note',
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
            ),
            const SizedBox(height: 6),
            Row(
              children: List.generate(
                5,
                (i) => GestureDetector(
                  onTap: () => setState(() => _newRating = i + 1),
                  child: Icon(
                    i < _newRating ? Icons.star : Icons.star_border,
                    color: const Color(0xFFFFC107),
                    size: 28,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _commentController,
              maxLines: 3,
              decoration: InputDecoration(
                hintText: 'Minimum 10 caractères...',
                hintStyle: TextStyle(color: Colors.grey[400], fontSize: 13),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: Colors.grey[200]!),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: _purple),
                ),
                contentPadding: const EdgeInsets.all(12),
              ),
            ),
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _submittingComment ? null : _submitComment,
                style: ElevatedButton.styleFrom(
                  backgroundColor: _purple,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
                child: _submittingComment
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          color: Colors.white,
                          strokeWidth: 2,
                        ),
                      )
                    : const Text('Publier'),
              ),
            ),
          ],
          const SizedBox(height: 14),
          if (_comments.isEmpty)
            const Center(
              child: Padding(
                padding: EdgeInsets.all(20),
                child: Text(
                  'Aucun avis pour le moment',
                  style: TextStyle(color: Colors.grey),
                ),
              ),
            )
          else
            ..._comments.take(5).map(
              (c) => _CommentItem(
                comment: c,
                currentUserId: widget.user['id'] ?? widget.user['_id'],
                onDelete: (id) async {
                  await http.delete(Uri.parse('$baseUrl/comments/$id'));
                  await _fetchComments();
                },
              ),
            ),
        ],
      ),
    );
  }

  // ── Cart Bottom Sheet ─────────────────────────────────

  void _showCartBottomSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _CartBottomSheet(
        // On passe les Maps pour l'affichage (compatibilité UI existante)
        cartItems: _cartAsMaps,
        onRemove: (resourceId) async {
          await _removeFromCart(resourceId);
          if (mounted) Navigator.pop(context);
        },
        onUpdateQuantity: (resourceId, qty) async {
          await _updateCartQty(resourceId, qty);
          if (mounted) {
            Navigator.pop(context);
            _showCartBottomSheet(context);
          }
        },
        onNavigate: () {
          Navigator.pop(context);
        },
      ),
    );
  }

  // ── Utils ─────────────────────────────────────────────

  List<Map<String, dynamic>> _getDaysInMonth(DateTime month) {
    final year = month.year;
    final m = month.month;
    final first = DateTime(year, m, 1);
    final last = DateTime(year, m + 1, 0);
    final days = <Map<String, dynamic>>[];
    final fdow = first.weekday;
    for (var i = 0; i < fdow - 1; i++) {
      days.add({
        'date': first.subtract(Duration(days: fdow - 1 - i)),
        'inMonth': false,
      });
    }
    for (var d = 1; d <= last.day; d++) {
      days.add({'date': DateTime(year, m, d), 'inMonth': true});
    }
    return days;
  }

  BoxShadow _boxShadow() => BoxShadow(
    color: Colors.black.withOpacity(0.05),
    blurRadius: 10,
    offset: const Offset(0, 3),
  );
}

// ── Extensions ────────────────────────────────────────────
extension DateExt on DateTime {
  String toDateString() => '$year-$month-$day';
  String toLocaleFR() {
    const months = [
      'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
      'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
    ];
    const days = [
      'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche',
    ];
    return '${days[weekday - 1]} $day ${months[month - 1]} $year';
  }
}

extension StringExt on String {
  String capitalize() =>
      isEmpty ? this : '${this[0].toUpperCase()}${substring(1)}';
}

// ── Helper Widgets ────────────────────────────────────────
class _StarRow extends StatelessWidget {
  final double rating;
  final int reviewCount;
  const _StarRow({required this.rating, required this.reviewCount});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        ...List.generate(
          5,
          (i) => Icon(
            i < rating.round() ? Icons.star : Icons.star_border,
            size: 16,
            color: const Color(0xFFFFC107),
          ),
        ),
        const SizedBox(width: 6),
        Text(
          '${rating.toStringAsFixed(1)} ($reviewCount avis)',
          style: const TextStyle(fontSize: 12, color: Colors.grey),
        ),
      ],
    );
  }
}

class _InfoChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  const _InfoChip({required this.icon, required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 13, color: color),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              color: color,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}

class _LegendDot extends StatelessWidget {
  final Color color;
  final String label;
  const _LegendDot({required this.color, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 4),
        Text(label, style: const TextStyle(fontSize: 11, color: Colors.grey)),
      ],
    );
  }
}

class _CommentItem extends StatelessWidget {
  final dynamic comment;
  final String currentUserId;
  final Function(String) onDelete;
  const _CommentItem({
    required this.comment,
    required this.currentUserId,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    final user = comment['C_user'];
    final name =
        '${user?['firstname'] ?? ''} ${user?['lastname'] ?? ''}'.trim();
    final stars = comment['nbr_stars'] ?? 0;
    final content = comment['contenue'] ?? '';
    final isOwner = user?['_id'] == currentUserId;

    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(
            radius: 18,
            backgroundColor: const Color(0xFFF3E5F5),
            child: Text(
              name.isNotEmpty ? name[0].toUpperCase() : 'U',
              style: const TextStyle(
                color: Color(0xFF9C27B0),
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      name.isNotEmpty ? name : 'Utilisateur',
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 13,
                      ),
                    ),
                    if (isOwner) ...[
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 6,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEDE9FE),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Text(
                          'Vous',
                          style: TextStyle(
                            color: Color(0xFF9C27B0),
                            fontSize: 9,
                          ),
                        ),
                      ),
                    ],
                    const Spacer(),
                    if (isOwner)
                      GestureDetector(
                        onTap: () => onDelete(comment['_id']),
                        child: const Icon(
                          Icons.delete_outline,
                          size: 14,
                          color: Colors.red,
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 3),
                Row(
                  children: List.generate(
                    5,
                    (i) => Icon(
                      i < stars ? Icons.star : Icons.star_border,
                      size: 12,
                      color: const Color(0xFFFFC107),
                    ),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  content,
                  style: const TextStyle(
                    fontSize: 12,
                    color: Colors.grey,
                    height: 1.5,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ── Cart Bottom Sheet ─────────────────────────────────────
// Reçoit des Map<String,dynamic> pour l'affichage
// onRemove et onUpdateQuantity reçoivent le resourceId
class _CartBottomSheet extends StatefulWidget {
  final List<Map<String, dynamic>> cartItems;
  final Function(String resourceId) onRemove;
  final Function(String resourceId, int qty) onUpdateQuantity;
  final VoidCallback onNavigate;

  const _CartBottomSheet({
    required this.cartItems,
    required this.onRemove,
    required this.onUpdateQuantity,
    required this.onNavigate,
  });

  @override
  State<_CartBottomSheet> createState() => _CartBottomSheetState();
}

class _CartBottomSheetState extends State<_CartBottomSheet> {
  @override
  Widget build(BuildContext context) {
    final total = widget.cartItems.fold<double>(
      0.0,
      (s, i) => s + ((i['totalPrice'] ?? i['price'] ?? 0) as num).toDouble(),
    );

    return Container(
      padding: const EdgeInsets.all(20),
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.75,
      ),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 40,
            height: 4,
            margin: const EdgeInsets.only(bottom: 16),
            decoration: BoxDecoration(
              color: Colors.grey[300],
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          Row(
            children: [
              const Icon(
                Icons.shopping_cart_outlined,
                color: Color(0xFF9C27B0),
              ),
              const SizedBox(width: 8),
              Text(
                'Mon panier (${widget.cartItems.length})',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          if (widget.cartItems.isEmpty)
            const Padding(
              padding: EdgeInsets.all(20),
              child: Text(
                'Votre panier est vide',
                style: TextStyle(color: Colors.grey),
              ),
            )
          else
            Flexible(
              child: ListView.builder(
                shrinkWrap: true,
                itemCount: widget.cartItems.length,
                itemBuilder: (context, idx) {
                  final item = widget.cartItems[idx];
                  // CartItem.type est 'product' ou 'service'
                  final isProduct = (item['type'] ?? '') == 'product';
                  final qty = (item['quantity'] ?? 1) as int;
                  final unitPrice = (item['price'] ?? 0) as num;
                  final resourceId = item['resourceId'] as String? ?? '';

                  return Container(
                    margin: const EdgeInsets.only(bottom: 10),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF5F0FF),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                item['resourceName'] ?? '',
                                style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF1A1A2E),
                                ),
                              ),
                            ),
                            GestureDetector(
                              onTap: () => widget.onRemove(resourceId),
                              child: const Icon(
                                Icons.close,
                                size: 16,
                                color: Colors.red,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: isProduct
                                ? const Color(0xFFE8F5E9)
                                : const Color(0xFFF3E5F5),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            isProduct ? 'Produit' : 'Service',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                              color: isProduct
                                  ? Colors.green[700]
                                  : const Color(0xFF9C27B0),
                            ),
                          ),
                        ),
                        const SizedBox(height: 8),
                        if (isProduct) ...[
                          Row(
                            children: [
                              const Text(
                                'Qté :',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Colors.grey,
                                ),
                              ),
                              const SizedBox(width: 10),
                              GestureDetector(
                                onTap: qty > 1
                                    ? () => widget.onUpdateQuantity(
                                        resourceId, qty - 1)
                                    : null,
                                child: Container(
                                  padding: const EdgeInsets.all(4),
                                  decoration: BoxDecoration(
                                    color: qty > 1
                                        ? const Color(0xFF9C27B0)
                                        : Colors.grey[300],
                                    shape: BoxShape.circle,
                                  ),
                                  child: const Icon(
                                    Icons.remove,
                                    size: 14,
                                    color: Colors.white,
                                  ),
                                ),
                              ),
                              Padding(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 12,
                                ),
                                child: Text(
                                  '$qty',
                                  style: const TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                              GestureDetector(
                                onTap: () => widget.onUpdateQuantity(
                                  resourceId, qty + 1),
                                child: Container(
                                  padding: const EdgeInsets.all(4),
                                  decoration: const BoxDecoration(
                                    color: Color(0xFF9C27B0),
                                    shape: BoxShape.circle,
                                  ),
                                  child: const Icon(
                                    Icons.add,
                                    size: 14,
                                    color: Colors.white,
                                  ),
                                ),
                              ),
                              const Spacer(),
                              Text(
                                '${(unitPrice * qty).toStringAsFixed(0)} DT',
                                style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF9C27B0),
                                ),
                              ),
                            ],
                          ),
                        ] else ...[
                          if (item['selectedDate'] != null)
                            Text(
                              'Date : ${_formatDate(item['selectedDate'])}',
                              style: const TextStyle(
                                fontSize: 11,
                                color: Colors.grey,
                              ),
                            ),
                          if (item['selectedTimes'] != null &&
                              (item['selectedTimes'] as List).isNotEmpty) ...[
                            const SizedBox(height: 4),
                            Wrap(
                              spacing: 4,
                              runSpacing: 4,
                              children: (item['selectedTimes'] as List)
                                  .map(
                                    (t) => Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 8,
                                        vertical: 3,
                                      ),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFF3E5F5),
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: Text(
                                        (t is Map ? t['display'] : t)
                                                ?.toString() ??
                                            '',
                                        style: const TextStyle(
                                          fontSize: 10,
                                          color: Color(0xFF9C27B0),
                                        ),
                                      ),
                                    ),
                                  )
                                  .toList(),
                            ),
                          ],
                          const SizedBox(height: 6),
                          Align(
                            alignment: Alignment.centerRight,
                            child: Text(
                              '${(item['totalPrice'] ?? item['price'] ?? 0)} DT',
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF9C27B0),
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  );
                },
              ),
            ),
          if (widget.cartItems.isNotEmpty) ...[
            const Divider(),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Total estimé',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                Text(
                  '${total.toStringAsFixed(0)} DT',
                  style: const TextStyle(
                    color: Color(0xFF9C27B0),
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                // ── FIX PRINCIPAL : navigation vers MesReservationsPage ──
                // Le panier est déjà persisté dans SharedPreferences via
                // CartService, donc MesReservationsPage._init() le chargera
                // automatiquement sans qu'on ait besoin de passer de données.
                onPressed: () {
                  Navigator.pop(context); // ferme le bottom sheet d'abord
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => const MesReservationsPage(),
                    ),
                  );
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF9C27B0),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                child: const Text('Continuer mes réservations'),
              ),
            ),
          ],
          SizedBox(height: MediaQuery.of(context).padding.bottom),
        ],
      ),
    );
  }

  String _formatDate(String isoDate) {
    try {
      final dt = DateTime.parse(isoDate);
      const months = [
        'jan', 'fév', 'mar', 'avr', 'mai', 'jun',
        'jul', 'aoû', 'sep', 'oct', 'nov', 'déc',
      ];
      return '${dt.day} ${months[dt.month - 1]} ${dt.year}';
    } catch (_) {
      return isoDate;
    }
  }
}