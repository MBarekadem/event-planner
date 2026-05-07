import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'vendors_screen.dart';
import 'profile_screen.dart';
import 'resource_detail_screen.dart';
import 'notifications_screen.dart';  // ← AJOUTEZ CET IMPORT

class HomeContentScreen extends StatefulWidget {
  final Map<String, dynamic> user;
  final String token;

  const HomeContentScreen({super.key, required this.user, required this.token});

  @override
  State<HomeContentScreen> createState() => _HomeContentScreenState();
}

class _HomeContentScreenState extends State<HomeContentScreen>
    with TickerProviderStateMixin {
  List<dynamic> _featuredResources = [];
  List<dynamic> _recommendedResources = [];
  bool _loadingFeatured = true;
  bool _loadingRecs = true;
  int _notificationCount = 0;  // ← Changé à 0 par défaut
  final TextEditingController _searchController = TextEditingController();
  late AnimationController _fadeController;
  late Animation<double> _fadeAnimation;

  static const String baseUrl = 'http://localhost:5000/api';

  final List<Map<String, dynamic>> _categories = [
    {'label': 'Planner',    'icon': Icons.calendar_month,  'value': 'salle'},
    {'label': 'Traiteurs',  'icon': Icons.restaurant,      'value': 'traiteur'},
    {'label': 'Décor',      'icon': Icons.auto_fix_high,   'value': 'decoration'},
    {'label': 'Photo',      'icon': Icons.camera_alt,      'value': 'photographe'},
    {'label': 'Musique',    'icon': Icons.music_note,      'value': 'dj'},
    {'label': 'Fleuriste',  'icon': Icons.local_florist,   'value': 'materiel'},
  ];

  @override
  void initState() {
    super.initState();
    _fadeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
    _fadeAnimation =
        CurvedAnimation(parent: _fadeController, curve: Curves.easeOut);
    _fadeController.forward();
    _fetchFeaturedResources();
    _fetchRecommendations();
    _fetchNotificationCount();  // ← AJOUTEZ CET APPEL
  }

  @override
  void dispose() {
    _fadeController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  // ← NOUVELLE MÉTHODE POUR LE COMPTEUR DE NOTIFICATIONS
  Future<void> _fetchNotificationCount() async {
    if (widget.token.isEmpty) return;
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/notifications/unread/count'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${widget.token}',
        },
      );
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        setState(() {
          _notificationCount = data['count'] ?? 0;
        });
      }
    } catch (e) {
      debugPrint('Erreur chargement notifications: $e');
    }
  }

  Future<void> _fetchFeaturedResources() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/ressources/get_all_ressources'),
        headers: {'Content-Type': 'application/json'},
      );
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        setState(() {
          _featuredResources = (data as List).take(6).toList();
          _loadingFeatured = false;
        });
      } else {
        setState(() => _loadingFeatured = false);
      }
    } catch (e) {
      debugPrint('Erreur chargement vedettes : $e');
      setState(() => _loadingFeatured = false);
    }
  }

  Future<void> _fetchRecommendations() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/recommendations'),
        headers: {
          'Content-Type': 'application/json',
          if (widget.token.isNotEmpty)
            'Authorization': 'Bearer ${widget.token}',
        },
      );
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        setState(() {
          _recommendedResources =
              (data['data'] as List? ?? []).take(8).toList();
          _loadingRecs = false;
        });
      } else {
        setState(() => _loadingRecs = false);
      }
    } catch (e) {
      debugPrint('Erreur recommandations : $e');
      setState(() => _loadingRecs = false);
    }
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

  void _navigateToVendors({String? category, String? searchQuery}) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => VendorsScreen(
          user: widget.user,
          token: widget.token,
          initialCategory: category,
          searchQuery: searchQuery,  // ← AJOUTEZ searchQuery
        ),
      ),
    );
  }

  void _navigateToProfile() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => ProfileScreen(
          user: widget.user,
          token: widget.token,
        ),
      ),
    );
  }

  // ← MÉTHODE CORRIGÉE POUR LES NOTIFICATIONS
  void _navigateToNotifications() async {
    final result = await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => NotificationsScreen(
          user: widget.user,
          token: widget.token,
        ),
      ),
    );
    // Si on revient des notifications, rafraîchir le compteur
    if (result == true) {
      _fetchNotificationCount();
    }
  }

  void _ouvrirDetailRessource(dynamic resource) {
    final resourceId = resource['_id']?.toString() ?? '';
    if (resourceId.isEmpty) return;
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => ResourceDetailPage(
          resourceId: resourceId,
          user: widget.user,
          token: widget.token,
        ),
      ),
    );
  }

  // ← MÉTHODE POUR LA RECHERCHE
  void _performSearch(String query) {
    if (query.trim().isEmpty) return;
    _navigateToVendors(searchQuery: query.trim());
  }

  @override
  Widget build(BuildContext context) {
    final firstName = widget.user['firstname'] ?? 'Utilisateur';

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light,
      child: Scaffold(
        backgroundColor: const Color(0xFFF5F0FF),
        body: FadeTransition(
          opacity: _fadeAnimation,
          child: CustomScrollView(
            physics: const BouncingScrollPhysics(),
            slivers: [
              SliverToBoxAdapter(child: _buildHeader(firstName)),
              SliverToBoxAdapter(child: _buildSearchBar()),
              SliverToBoxAdapter(
                child: _buildSectionTitle('Catégories',
                    onSeeAll: () => _navigateToVendors()),
              ),
              SliverToBoxAdapter(child: _buildCategories()),
              SliverToBoxAdapter(child: _buildStatsBanner()),
              SliverToBoxAdapter(
                child: _buildSectionTitle('Recommandés pour vous',
                    onSeeAll: () => _navigateToVendors()),
              ),
              SliverToBoxAdapter(child: _buildRecommendationsCarousel()),
              SliverToBoxAdapter(
                child: _buildSectionTitle('Services Vedettes',
                    onSeeAll: () => _navigateToVendors()),
              ),
              SliverToBoxAdapter(child: _buildFeaturedServicesVertical()),
              const SliverToBoxAdapter(child: SizedBox(height: 32)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(String firstName) {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFF7B2FBE), Color(0xFF9C27B0)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.only(
          bottomLeft: Radius.circular(28),
          bottomRight: Radius.circular(28),
        ),
      ),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Bienvenue,',
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.85),
                        fontSize: 14,
                        fontWeight: FontWeight.w400,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      firstName,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        letterSpacing: -0.3,
                      ),
                    ),
                  ],
                ),
              ),

              // Icône NOTIFICATIONS
              Stack(
                children: [
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.2),
                      shape: BoxShape.circle,
                    ),
                    child: IconButton(
                      icon: const Icon(
                        Icons.notifications_outlined,
                        color: Colors.white,
                        size: 24,
                      ),
                      onPressed: _navigateToNotifications,
                    ),
                  ),
                  if (_notificationCount > 0)
                    Positioned(
                      right: 6,
                      top: 6,
                      child: Container(
                        padding: const EdgeInsets.all(3),
                        decoration: const BoxDecoration(
                          color: Colors.red,
                          shape: BoxShape.circle,
                        ),
                        child: Text(
                          _notificationCount > 99 ? '99+' : '$_notificationCount',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 9,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                ],
              ),

              const SizedBox(width: 8),

              // Icône PROFIL
              Container(
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.2),
                  shape: BoxShape.circle,
                ),
                child: IconButton(
                  icon: const Icon(Icons.person_outline,
                      color: Colors.white, size: 24),
                  onPressed: _navigateToProfile,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ← BARRE DE RECHERCHE CORRIGÉE
  Widget _buildSearchBar() {
    return Container(
      margin: const EdgeInsets.fromLTRB(20, 8, 20, 0),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.08),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: TextField(
        controller: _searchController,
        onSubmitted: (val) {
          if (val.isNotEmpty) _performSearch(val);
        },
        decoration: InputDecoration(
          hintText: 'Rechercher des services...',
          hintStyle: TextStyle(color: Colors.grey[400], fontSize: 14),
          prefixIcon: Icon(Icons.search, color: Colors.grey[400]),
          suffixIcon: _searchController.text.isNotEmpty
              ? IconButton(
                  icon: Icon(Icons.clear, color: Colors.grey[400], size: 18),
                  onPressed: () {
                    _searchController.clear();
                    setState(() {});
                  },
                )
              : null,
          border: InputBorder.none,
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        ),
        onChanged: (value) {
          setState(() {});  // Pour rafraîchir l'icône clear
        },
      ),
    );
  }

  Widget _buildSectionTitle(String title, {VoidCallback? onSeeAll}) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Color(0xFF1A1A2E),
            ),
          ),
          if (onSeeAll != null)
            GestureDetector(
              onTap: onSeeAll,
              child: const Text(
                'Voir tout',
                style: TextStyle(
                  color: Color(0xFF9C27B0),
                  fontWeight: FontWeight.w600,
                  fontSize: 13,
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildCategories() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: GridView.builder(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 3,
          childAspectRatio: 1.1,
          crossAxisSpacing: 10,
          mainAxisSpacing: 10,
        ),
        itemCount: _categories.length,
        itemBuilder: (context, index) {
          final cat = _categories[index];
          return _CategoryTile(
            label: cat['label'],
            icon: cat['icon'],
            onTap: () => _navigateToVendors(category: cat['value']),
          );
        },
      ),
    );
  }

  Widget _buildStatsBanner() {
    return Container(
      margin: const EdgeInsets.fromLTRB(20, 20, 20, 0),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF7B2FBE), Color(0xFFAB47BC)],
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF9C27B0).withOpacity(0.3),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.2),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.people_outline,
                color: Colors.white, size: 28),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Rejoignez des milliers d\'utilisateurs',
                  style: TextStyle(
                      color: Colors.white.withOpacity(0.85), fontSize: 12),
                ),
                const SizedBox(height: 2),
                const Text(
                  '1500+ services',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Text(
                  'réservés le mois dernier',
                  style: TextStyle(
                      color: Colors.white.withOpacity(0.85), fontSize: 12),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRecommendationsCarousel() {
    if (_loadingRecs) {
      return SizedBox(
        height: 190,
        child: ListView.builder(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 16),
          itemCount: 3,
          itemBuilder: (_, __) => const _ShimmerCard(horizontal: true),
        ),
      );
    }
    if (_recommendedResources.isEmpty) return const SizedBox.shrink();

    return SizedBox(
      height: 190,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: _recommendedResources.length,
        itemBuilder: (context, index) {
          final res = _recommendedResources[index];
          return _ResourceCardHorizontal(
            resource: res,
            imageUrl: _getResourceImage(res),
            onTap: () => _ouvrirDetailRessource(res),
          );
        },
      ),
    );
  }

  Widget _buildFeaturedServicesVertical() {
    if (_loadingFeatured) {
      return Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: Column(
          children: List.generate(
            2,
            (_) => const Padding(
              padding: EdgeInsets.only(bottom: 16),
              child: _ShimmerCard(horizontal: false),
            ),
          ),
        ),
      );
    }

    if (_featuredResources.isEmpty) {
      return const Padding(
        padding: EdgeInsets.all(20),
        child: Center(
          child: Text(
            'Aucun service disponible',
            style: TextStyle(color: Colors.grey),
          ),
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        children: _featuredResources.map((res) {
          return Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: _ResourceCardVertical(
              resource: res,
              imageUrl: _getResourceImage(res),
              onTap: () => _ouvrirDetailRessource(res),
            ),
          );
        }).toList(),
      ),
    );
  }
}

// ─── Tuile Catégorie ─────────────────────────────────────────────────────────
class _CategoryTile extends StatelessWidget {
  final String label;
  final IconData icon;
  final VoidCallback onTap;

  const _CategoryTile(
      {required this.label, required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFF3E5F5),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: const Color(0xFF9C27B0), size: 24),
            ),
            const SizedBox(height: 8),
            Text(
              label,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: Color(0xFF1A1A2E),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Carte HORIZONTALE ────────────────────────────────────────────────────────
class _ResourceCardHorizontal extends StatelessWidget {
  final dynamic resource;
  final String imageUrl;
  final VoidCallback onTap;

  const _ResourceCardHorizontal(
      {required this.resource, required this.imageUrl, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final name = resource['name'] ?? 'Ressource';
    final price = resource['price'] ?? 0;
    final location = resource['locationname'] ?? '';
    final type = resource['type'] ?? '';

    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 200,
        margin: const EdgeInsets.only(right: 14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.08),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius:
                  const BorderRadius.vertical(top: Radius.circular(18)),
              child: Stack(
                children: [
                  Image.network(
                    imageUrl,
                    height: 110,
                    width: double.infinity,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Container(
                      height: 110,
                      color: const Color(0xFFF3E5F5),
                      child: const Icon(Icons.image_not_supported,
                          color: Color(0xFF9C27B0)),
                    ),
                  ),
                  Positioned(
                    top: 8,
                    right: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: const Color(0xFF9C27B0),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        type == 'service' ? 'Service' : 'Produit',
                        style: const TextStyle(
                            color: Colors.white,
                            fontSize: 9,
                            fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF1A1A2E),
                    ),
                  ),
                  const SizedBox(height: 3),
                  if (location.isNotEmpty)
                    Row(
                      children: [
                        const Icon(Icons.location_on,
                            size: 11, color: Colors.grey),
                        const SizedBox(width: 2),
                        Expanded(
                          child: Text(
                            location,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                                fontSize: 10, color: Colors.grey),
                          ),
                        ),
                      ],
                    ),
                  const SizedBox(height: 4),
                  Text(
                    '$price DT/h',
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF9C27B0),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Carte VERTICALE ──────────────────────────────────────────────────────────
class _ResourceCardVertical extends StatelessWidget {
  final dynamic resource;
  final String imageUrl;
  final VoidCallback onTap;

  const _ResourceCardVertical(
      {required this.resource, required this.imageUrl, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final name = resource['name'] ?? 'Ressource';
    final price = resource['price'] ?? 0;
    final description = resource['description'] ?? '';
    final location = resource['locationname'] ?? '';
    final type = resource['type'] ?? '';

    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: double.infinity,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.08),
              blurRadius: 14,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius:
                  const BorderRadius.vertical(top: Radius.circular(20)),
              child: Stack(
                children: [
                  Image.network(
                    imageUrl,
                    height: 200,
                    width: double.infinity,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Container(
                      height: 200,
                      color: const Color(0xFFF3E5F5),
                      child: const Center(
                        child: Icon(Icons.image_not_supported,
                            color: Color(0xFF9C27B0), size: 48),
                      ),
                    ),
                  ),
                  Positioned(
                    top: 12,
                    left: 12,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFF9C27B0),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        type == 'service' ? 'Service' : 'Produit',
                        style: const TextStyle(
                            color: Colors.white,
                            fontSize: 11,
                            fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                  Positioned(
                    bottom: 12,
                    right: 12,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.15),
                            blurRadius: 8,
                          ),
                        ],
                      ),
                      child: Text(
                        '$price DT/h',
                        style: const TextStyle(
                          color: Color(0xFF9C27B0),
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    name,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF1A1A2E),
                    ),
                  ),
                  const SizedBox(height: 6),
                  if (description.isNotEmpty)
                    Text(
                      description,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 13,
                        color: Colors.grey[600],
                        height: 1.4,
                      ),
                    ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      if (location.isNotEmpty) ...[
                        const Icon(Icons.location_on,
                            size: 14, color: Colors.grey),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            location,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                                fontSize: 12, color: Colors.grey),
                          ),
                        ),
                      ] else
                        const Spacer(),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF3E5F5),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: const Row(
                          children: [
                            Text(
                              'Voir détails',
                              style: TextStyle(
                                color: Color(0xFF9C27B0),
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            SizedBox(width: 4),
                            Icon(Icons.arrow_forward_ios,
                                size: 10, color: Color(0xFF9C27B0)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Shimmer ───────────────────────────────────────────────────────────────────
class _ShimmerCard extends StatelessWidget {
  final bool horizontal;
  const _ShimmerCard({required this.horizontal});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: horizontal ? 200 : double.infinity,
      height: horizontal ? null : 280,
      margin: horizontal ? const EdgeInsets.only(right: 14) : EdgeInsets.zero,
      decoration: BoxDecoration(
        color: Colors.grey[200],
        borderRadius: BorderRadius.circular(18),
      ),
    );
  }
}