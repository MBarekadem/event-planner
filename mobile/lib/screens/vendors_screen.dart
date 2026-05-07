import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'resource_detail_screen.dart';

class VendorsScreen extends StatefulWidget {
  final Map<String, dynamic> user;
  final String token;
  final String? initialCategory;
  final String? searchQuery;

  const VendorsScreen({
    super.key,
    required this.user,
    required this.token,
    this.initialCategory,
    this.searchQuery,
  });

  @override
  State<VendorsScreen> createState() => _VendorsScreenState();
}

class _VendorsScreenState extends State<VendorsScreen>
    with SingleTickerProviderStateMixin {
  List<dynamic> _allResources = [];
  List<dynamic> _filtered = [];
  bool _loading = true;
  String _search = '';
  String _selectedCategory = '';
  String _sortBy = '';
  double? _maxPrice;
  final TextEditingController _searchController = TextEditingController();
  final TextEditingController _priceController = TextEditingController();
  bool _showFilters = false;
  late TabController _tabController;

  static const String baseUrl = 'http://localhost:5000/api';

  final List<Map<String, dynamic>> _tabs = [
    {'label': 'Tous', 'value': ''},
    {'label': 'Photo', 'value': 'photographe'},
    {'label': 'Traiteur', 'value': 'traiteur'},
    {'label': 'Salle', 'value': 'salle'},
    {'label': 'DJ', 'value': 'dj'},
    {'label': 'Décor', 'value': 'decoration'},
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _tabs.length, vsync: this);

    if (widget.initialCategory != null) {
      final idx = _tabs.indexWhere((t) => t['value'] == widget.initialCategory);
      if (idx != -1) {
        _selectedCategory = widget.initialCategory!;
        _tabController.animateTo(idx);
      }
    }

    if (widget.searchQuery != null && widget.searchQuery!.isNotEmpty) {
      _search = widget.searchQuery!;
      _searchController.text = widget.searchQuery!;
    }

    _tabController.addListener(() {
      if (!_tabController.indexIsChanging) {
        setState(() {
          _selectedCategory = _tabs[_tabController.index]['value'];
          _applyFilters();
        });
      }
    });
    _fetchResources();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    _priceController.dispose();
    super.dispose();
  }

  Future<void> _fetchResources() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/ressources/get_all_ressources'),
        headers: {'Content-Type': 'application/json'},
      );
      if (response.statusCode == 200) {
        final data = json.decode(response.body) as List;
        setState(() {
          _allResources = data;
          _applyFilters();
          _loading = false;
        });
      } else {
        setState(() => _loading = false);
      }
    } catch (e) {
      debugPrint('Erreur chargement ressources: $e');
      setState(() => _loading = false);
    }
  }

  void _applyFilters() {
    List<dynamic> f = List.from(_allResources);

    if (_search.isNotEmpty) {
      final t = _search.toLowerCase();
      f = f.where((r) {
        final name = (r['name'] ?? '').toString().toLowerCase();
        final desc = (r['description'] ?? '').toString().toLowerCase();
        final loc = (r['locationname'] ?? '').toString().toLowerCase();
        final category = (r['category'] ?? '').toString().toLowerCase();
        return name.contains(t) ||
            desc.contains(t) ||
            loc.contains(t) ||
            category.contains(t);
      }).toList();
    }

    if (_selectedCategory.isNotEmpty) {
      f = f.where((r) => r['category'] == _selectedCategory).toList();
    }

    if (_maxPrice != null) {
      f = f.where((r) => (r['price'] ?? 0) <= _maxPrice!).toList();
    }

    switch (_sortBy) {
      case 'price_asc':
        f.sort((a, b) => (a['price'] ?? 0).compareTo(b['price'] ?? 0));
        break;
      case 'price_desc':
        f.sort((a, b) => (b['price'] ?? 0).compareTo(a['price'] ?? 0));
        break;
      case 'name_asc':
        f.sort((a, b) =>
            (a['name'] ?? '').toString().compareTo(b['name']?.toString() ?? ''));
        break;
    }

    setState(() => _filtered = f);
  }

  String _getResourceImage(dynamic resource) {
    try {
      final media = resource['media'] as List?;
      if (media != null && media.isNotEmpty) {
        final imgs = media[0]['img_vd'] as List?;
        if (imgs != null && imgs.isNotEmpty) {
          final img = imgs[0].toString();
          return img.startsWith('http') ? img : 'http://localhost:5000/$img';
        }
      }
    } catch (_) {}
    return 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=400';
  }

  String _getPriceRange(dynamic price) {
    final p = (price ?? 0) as num;
    if (p < 100) return '\$';
    if (p < 300) return '\$\$';
    return '\$\$\$';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F0FF),
      body: Column(
        children: [
          _buildHeader(),
          _buildTabBar(),
          Expanded(
            child: _loading
                ? const Center(
                    child: CircularProgressIndicator(
                        color: Color(0xFF9C27B0)))
                : _filtered.isEmpty
                    ? _buildEmpty()
                    : RefreshIndicator(
                        color: const Color(0xFF9C27B0),
                        onRefresh: _fetchResources,
                        child: ListView.builder(
                          physics: const BouncingScrollPhysics(),
                          padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                          itemCount: _filtered.length + 1,
                          itemBuilder: (context, index) {
                            if (index == 0) {
                              return _buildResultsCount();
                            }
                            return _ResourceListTile(
                              resource: _filtered[index - 1],
                              imageUrl:
                                  _getResourceImage(_filtered[index - 1]),
                              priceRange:
                                  _getPriceRange(_filtered[index - 1]['price']),
                              onTap: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) => ResourceDetailPage(
                                      resourceId: _filtered[index - 1]['_id']
                                              ?.toString() ??
                                          '',
                                      user: widget.user,
                                      token: widget.token,
                                    ),
                                  ),
                                );
                              },
                            );
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFF7B2FBE), Color(0xFF9C27B0)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.only(
          bottomLeft: Radius.circular(24),
          bottomRight: Radius.circular(24),
        ),
      ),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  if (Navigator.canPop(context))
                    GestureDetector(
                      onTap: () => Navigator.pop(context),
                      child: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(Icons.arrow_back_ios_new,
                            color: Colors.white, size: 16),
                      ),
                    ),
                  if (Navigator.canPop(context)) const SizedBox(width: 10),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // ← "Prestataires" → "Ressources"
                        Text('Ressources',
                            style: TextStyle(
                                color: Colors.white,
                                fontSize: 22,
                                fontWeight: FontWeight.bold)),
                        Text('Trouvez la ressource idéale',
                            style: TextStyle(
                                color: Colors.white70, fontSize: 12)),
                      ],
                    ),
                  ),
                  GestureDetector(
                    onTap: () =>
                        setState(() => _showFilters = !_showFilters),
                    child: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: _showFilters
                            ? Colors.white
                            : Colors.white.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(Icons.tune,
                          color: _showFilters
                              ? const Color(0xFF9C27B0)
                              : Colors.white,
                          size: 20),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: TextField(
                  controller: _searchController,
                  onChanged: (v) {
                    _search = v;
                    _applyFilters();
                  },
                  decoration: InputDecoration(
                    hintText: 'Rechercher des ressources...',
                    hintStyle:
                        TextStyle(color: Colors.grey[400], fontSize: 13),
                    prefixIcon:
                        Icon(Icons.search, color: Colors.grey[400], size: 20),
                    suffixIcon: _searchController.text.isNotEmpty
                        ? IconButton(
                            icon: Icon(Icons.clear,
                                color: Colors.grey[400], size: 18),
                            onPressed: () {
                              _searchController.clear();
                              _search = '';
                              _applyFilters();
                            },
                          )
                        : null,
                    border: InputBorder.none,
                    contentPadding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 12),
                  ),
                ),
              ),
              if (_showFilters) ...[
                const SizedBox(height: 10),
                _buildFilterPanel(),
              ],
              if (_search.isNotEmpty && !_showFilters) ...[
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.search,
                          size: 12, color: Colors.white70),
                      const SizedBox(width: 4),
                      Text(
                        'Recherche: "$_search"',
                        style: const TextStyle(
                            color: Colors.white70, fontSize: 11),
                      ),
                      const SizedBox(width: 4),
                      GestureDetector(
                        onTap: () {
                          setState(() {
                            _search = '';
                            _searchController.clear();
                            _applyFilters();
                          });
                        },
                        child: const Icon(Icons.close,
                            size: 12, color: Colors.white70),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFilterPanel() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.15),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Budget max (DT)',
              style: TextStyle(
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.w500)),
          const SizedBox(height: 6),
          TextField(
            controller: _priceController,
            keyboardType: TextInputType.number,
            style: const TextStyle(color: Colors.white),
            onChanged: (v) {
              _maxPrice = double.tryParse(v);
              _applyFilters();
            },
            decoration: InputDecoration(
              hintText: 'Ex: 500',
              hintStyle:
                  TextStyle(color: Colors.white.withOpacity(0.5)),
              filled: true,
              fillColor: Colors.white.withOpacity(0.15),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: BorderSide.none,
              ),
              contentPadding: const EdgeInsets.symmetric(
                  horizontal: 12, vertical: 8),
            ),
          ),
          const SizedBox(height: 10),
          const Text('Trier par',
              style: TextStyle(
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.w500)),
          const SizedBox(height: 6),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                {'label': 'Par défaut', 'value': ''},
                {'label': 'Prix ↑', 'value': 'price_asc'},
                {'label': 'Prix ↓', 'value': 'price_desc'},
                {'label': 'Nom A→Z', 'value': 'name_asc'},
              ].map((opt) {
                final selected = _sortBy == opt['value'];
                return GestureDetector(
                  onTap: () {
                    setState(() {
                      _sortBy = opt['value']!;
                      _applyFilters();
                    });
                  },
                  child: Container(
                    margin: const EdgeInsets.only(right: 8),
                    padding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: selected
                          ? Colors.white
                          : Colors.white.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      opt['label']!,
                      style: TextStyle(
                        color: selected
                            ? const Color(0xFF9C27B0)
                            : Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
          if (_search.isNotEmpty ||
              _maxPrice != null ||
              _sortBy.isNotEmpty)
            Align(
              alignment: Alignment.centerRight,
              child: TextButton(
                onPressed: () {
                  setState(() {
                    _search = '';
                    _searchController.clear();
                    _maxPrice = null;
                    _priceController.clear();
                    _sortBy = '';
                    _applyFilters();
                  });
                },
                child: const Text('Réinitialiser',
                    style:
                        TextStyle(color: Colors.white70, fontSize: 12)),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildTabBar() {
    return Container(
      color: Colors.white,
      child: TabBar(
        controller: _tabController,
        isScrollable: true,
        indicatorColor: const Color(0xFF9C27B0),
        indicatorWeight: 3,
        labelColor: const Color(0xFF9C27B0),
        unselectedLabelColor: Colors.grey,
        labelStyle:
            const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
        tabs:
            _tabs.map((t) => Tab(text: t['label'] as String)).toList(),
      ),
    );
  }

  Widget _buildResultsCount() {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Text(
        // ← "prestataire(s)" → "ressource(s)"
        '${_filtered.length} ressource(s) trouvée(s)',
        style: const TextStyle(
          color: Color(0xFF6B7280),
          fontSize: 13,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }

  Widget _buildEmpty() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.search_off, size: 64, color: Colors.grey[300]),
          const SizedBox(height: 12),
          // ← "prestataire" → "ressource"
          const Text('Aucune ressource trouvée',
              style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: Colors.grey)),
          const SizedBox(height: 6),
          const Text('Modifiez vos critères de recherche',
              style: TextStyle(fontSize: 13, color: Colors.grey)),
        ],
      ),
    );
  }
}

// ─── Resource List Tile (renommé de _VendorListTile) ──────────────────────────
class _ResourceListTile extends StatelessWidget {
  final dynamic resource;
  final String imageUrl;
  final String priceRange;
  final VoidCallback onTap;

  const _ResourceListTile({
    required this.resource,
    required this.imageUrl,
    required this.priceRange,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final name = resource['name'] ?? 'Ressource';
    final price = resource['price'] ?? 0;
    final location = resource['locationname'] ?? '';
    final type = resource['type'] ?? '';

    const rating = 4.7;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.06),
              blurRadius: 12,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Row(
          children: [
            // Image
            ClipRRect(
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(18),
                bottomLeft: Radius.circular(18),
              ),
              child: Stack(
                children: [
                  Image.network(
                    imageUrl,
                    width: 110,
                    height: 110,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Container(
                      width: 110,
                      height: 110,
                      color: const Color(0xFFF3E5F5),
                      child: const Icon(Icons.image_not_supported,
                          color: Color(0xFF9C27B0)),
                    ),
                  ),
                  Positioned(
                    top: 8,
                    left: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.verified,
                              size: 10, color: Color(0xFF9C27B0)),
                          const SizedBox(width: 2),
                          Text(
                            priceRange,
                            style: const TextStyle(
                                fontSize: 9,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF9C27B0)),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
            // Infos
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF1A1A2E),
                            ),
                          ),
                        ),
                        // Badge type
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: type == 'produit'
                                ? const Color(0xFFE8F5E9)
                                : const Color(0xFFF3E5F5),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            type == 'produit' ? 'Produit' : 'Service',
                            style: TextStyle(
                              fontSize: 9,
                              fontWeight: FontWeight.bold,
                              color: type == 'produit'
                                  ? Colors.green[700]
                                  : const Color(0xFF9C27B0),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 3),
                    Row(
                      children: [
                        ...List.generate(
                          5,
                          (i) => Icon(
                            i < rating.round()
                                ? Icons.star
                                : Icons.star_border,
                            size: 12,
                            color: const Color(0xFFFFC107),
                          ),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          rating.toStringAsFixed(1),
                          style: const TextStyle(
                              fontSize: 11, color: Colors.grey),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    if (location.isNotEmpty)
                      Row(
                        children: [
                          const Icon(Icons.location_on,
                              size: 12, color: Colors.grey),
                          const SizedBox(width: 3),
                          Expanded(
                            child: Text(
                              location,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                  fontSize: 11, color: Colors.grey),
                            ),
                          ),
                        ],
                      ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          type == 'produit'
                              ? '$price DT'
                              : '$price DT/h',
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF9C27B0),
                          ),
                        ),
                        ElevatedButton(
                          onPressed: onTap,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF9C27B0),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(
                                horizontal: 14, vertical: 8),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                            minimumSize: Size.zero,
                            tapTargetSize:
                                MaterialTapTargetSize.shrinkWrap,
                          ),
                          child: const Text('Voir',
                              style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}