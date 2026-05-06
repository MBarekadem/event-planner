// lib/screens/home_content_screen.dart
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

class HomeContentScreen extends StatefulWidget {
  final Map<String, dynamic> user;
  final String token;

  const HomeContentScreen({
    super.key,
    required this.user,
    required this.token,
  });

  @override
  State<HomeContentScreen> createState() => _HomeContentScreenState();
}

class _HomeContentScreenState extends State<HomeContentScreen> {
  List<dynamic> _resources = [];
  bool _isLoading = true;
  int _currentSlideIndex = 0;
  int _expandedFaqIndex = -1;

  // Getter directs depuis widget.user
  String get _userName =>
      widget.user['firstname'] ?? widget.user['name'] ?? "Invité";

  // Slideshow images
  final List<String> _slides = [
    'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800',
    'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800',
    'https://images.unsplash.com/photo-1505236858219-8359eb29e329?w=800',
    'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=800',
  ];

  // Catégories d'événements
  final List<Map<String, dynamic>> _eventTypes = [
    {'title': 'Mariage', 'category': 'Célébration', 'color': 0xFFFF69B4},
    {'title': 'Conférence', 'category': 'Professionnel', 'color': 0xFF3B82F6},
    {'title': 'Anniversaire', 'category': 'Privé', 'color': 0xFFFF9800},
    {'title': 'Séminaire', 'category': 'Formation', 'color': 0xFF4CAF50},
    {'title': 'Réunion', 'category': 'Corporate', 'color': 0xFF9C27B0},
    {'title': 'Festival', 'category': 'Culturel', 'color': 0xFF00BCD4},
  ];

  // Features
  final List<Map<String, dynamic>> _features = [
    {
      'title': 'Réservation intelligente',
      'description':
          'Réservez vos salles, traiteurs et décorateurs en un clic',
      'icon': Icons.smart_toy,
      'color': 0xFF3B82F6,
    },
    {
      'title': 'Recommandation AI',
      'description':
          'Notre IA vous suggère les meilleures ressources selon votre budget',
      'icon': Icons.auto_awesome,
      'color': 0xFF9C27B0,
    },
    {
      'title': 'Agenda interactif',
      'description': 'Visualisez les disponibilités en temps réel',
      'icon': Icons.calendar_today,
      'color': 0xFFFF9800,
    },
    {
      'title': 'Paiement sécurisé',
      'description': 'Transactions 100% sécurisées',
      'icon': Icons.security,
      'color': 0xFF4CAF50,
    },
  ];

  // FAQ
  final List<Map<String, String>> _faq = [
    {
      'q': 'Comment créer un événement sur YallaEvents ?',
      'a':
          'C\'est simple ! Cliquez sur le bouton +, remplissez les informations de base, et notre système vous guidera pas à pas.',
    },
    {
      'q': 'Les paiements sont-ils sécurisés ?',
      'a':
          'Absolument ! Nous utilisons un système de paiement crypté de niveau bancaire.',
    },
    {
      'q': 'Comment devenir prestataire partenaire ?',
      'a':
          'Pour devenir prestataire, créez un compte et sélectionnez le rôle "prestataire". Notre équipe validera votre profil.',
    },
    {
      'q': 'Puis-je modifier mon événement après l\'avoir créé ?',
      'a':
          'Oui, vous pouvez modifier les détails de votre événement à tout moment depuis votre tableau de bord.',
    },
  ];

  @override
  void initState() {
    super.initState();
    _fetchResources();
    _startSlideshow();
  }

  void _startSlideshow() {
    Future.delayed(const Duration(seconds: 5), () {
      if (mounted) {
        setState(() {
          _currentSlideIndex = (_currentSlideIndex + 1) % _slides.length;
        });
        _startSlideshow();
      }
    });
  }

  Future<void> _fetchResources() async {
    setState(() => _isLoading = true);
    try {
      final response = await http.get(
        Uri.parse('http://localhost:5000/api/ressources/get_all_ressources'),
        headers: {'Authorization': 'Bearer ${widget.token}'},
      );
      if (response.statusCode == 200) {
        setState(() {
          _resources = json.decode(response.body);
          _isLoading = false;
        });
      } else {
        setState(() => _isLoading = false);
      }
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  String? _getImageUrl(List<dynamic>? media) {
    if (media == null || media.isEmpty) return null;
    final first = media[0];
    if (first is Map &&
        first.containsKey('img_vd') &&
        first['img_vd'] is List &&
        first['img_vd'].isNotEmpty) {
      return 'http://localhost:5000${first['img_vd'][0]}';
    }
    return null;
  }

  IconData _getEventIcon(String title) {
    switch (title) {
      case 'Mariage':
        return Icons.favorite;
      case 'Conférence':
        return Icons.business;
      case 'Anniversaire':
        return Icons.cake;
      case 'Séminaire':
        return Icons.school;
      case 'Réunion':
        return Icons.people;
      default:
        return Icons.music_note;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[50],
      body: CustomScrollView(
        slivers: [
          // ========== SLIVER APP BAR WITH SLIDESHOW ==========
          SliverAppBar(
            expandedHeight: 450,
            pinned: true,
            backgroundColor: Colors.transparent,
            flexibleSpace: FlexibleSpaceBar(
              background: Stack(
                children: [
                  // Image slideshow
                  PageView.builder(
                    itemCount: _slides.length,
                    onPageChanged: (index) {
                      setState(() => _currentSlideIndex = index);
                    },
                    itemBuilder: (context, index) {
                      return Image.network(
                        _slides[index],
                        fit: BoxFit.cover,
                        width: double.infinity,
                        errorBuilder:
                            (_, __, ___) => Container(
                              color: const Color(0xFF9C27B0),
                              child: const Center(
                                child: Icon(
                                  Icons.event,
                                  size: 80,
                                  color: Colors.white54,
                                ),
                              ),
                            ),
                      );
                    },
                  ),
                  // Gradient overlay
                  Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          Colors.black.withOpacity(0.4),
                          Colors.black.withOpacity(0.6),
                          Colors.black.withOpacity(0.85),
                        ],
                      ),
                    ),
                  ),
                  // Content
                  SafeArea(
                    child: Padding(
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.end,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Badge de bienvenue avec les données user réelles
                          if (widget.user.isNotEmpty)
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 6,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.white.withOpacity(0.2),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Text(
                                '👋 Bienvenue $_userName',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 12,
                                ),
                              ),
                            ),
                          const SizedBox(height: 20),
                          Text(
                            'Planifiez vos',
                            style: GoogleFonts.poppins(
                              fontSize: 28,
                              color: Colors.white,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          Text(
                            'Événements',
                            style: GoogleFonts.poppins(
                              fontSize: 42,
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 10),
                          Text(
                            'en toute simplicité',
                            style: GoogleFonts.poppins(
                              fontSize: 20,
                              color: Colors.white70,
                            ),
                          ),
                          const SizedBox(height: 20),
                          // Search bar
                          Container(
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(30),
                            ),
                            child: const TextField(
                              decoration: InputDecoration(
                                hintText: 'Rechercher un événement...',
                                prefixIcon: Icon(
                                  Icons.search,
                                  color: Colors.grey,
                                ),
                                border: InputBorder.none,
                                contentPadding: EdgeInsets.symmetric(
                                  vertical: 15,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  // Slide dots
                  Positioned(
                    bottom: 20,
                    left: 0,
                    right: 0,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: List.generate(_slides.length, (index) {
                        return Container(
                          margin: const EdgeInsets.symmetric(horizontal: 4),
                          width: _currentSlideIndex == index ? 24 : 8,
                          height: 8,
                          decoration: BoxDecoration(
                            color:
                                _currentSlideIndex == index
                                    ? Colors.white
                                    : Colors.white.withOpacity(0.4),
                            borderRadius: BorderRadius.circular(4),
                          ),
                        );
                      }),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // ========== CATÉGORIES ==========
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Catégories',
                    style: GoogleFonts.poppins(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 15),
                  SizedBox(
                    height: 100,
                    child: ListView.builder(
                      scrollDirection: Axis.horizontal,
                      itemCount: _eventTypes.length,
                      itemBuilder: (context, index) {
                        final item = _eventTypes[index];
                        return Container(
                          width: 80,
                          margin: const EdgeInsets.only(right: 15),
                          child: Column(
                            children: [
                              Container(
                                height: 60,
                                decoration: BoxDecoration(
                                  color: Color(
                                    item['color'] as int,
                                  ).withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(15),
                                ),
                                child: Center(
                                  child: Icon(
                                    _getEventIcon(item['title'] as String),
                                    color: Color(item['color'] as int),
                                    size: 30,
                                  ),
                                ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                item['title'] as String,
                                style: const TextStyle(fontSize: 11),
                                textAlign: TextAlign.center,
                              ),
                            ],
                          ),
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),
          ),

          // ========== RECOMMANDÉS POUR VOUS ==========
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Recommandés pour vous',
                    style: GoogleFonts.poppins(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  TextButton(
                    onPressed: () {},
                    child: const Text('Voir tout'),
                  ),
                ],
              ),
            ),
          ),

          _isLoading
              ? const SliverToBoxAdapter(
                child: Padding(
                  padding: EdgeInsets.all(40),
                  child: Center(child: CircularProgressIndicator()),
                ),
              )
              : SliverToBoxAdapter(
                child: SizedBox(
                  height: 230,
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    itemCount:
                        _resources.length > 6 ? 6 : _resources.length,
                    itemBuilder: (context, index) {
                      final resource = _resources[index];
                      final imageUrl = _getImageUrl(resource['media']);
                      return Container(
                        width: 170,
                        margin: const EdgeInsets.only(right: 15),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(15),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.grey.withOpacity(0.1),
                              blurRadius: 8,
                              offset: const Offset(0, 3),
                            ),
                          ],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            ClipRRect(
                              borderRadius: const BorderRadius.vertical(
                                top: Radius.circular(15),
                              ),
                              child:
                                  imageUrl != null
                                      ? Image.network(
                                        imageUrl,
                                        height: 120,
                                        width: double.infinity,
                                        fit: BoxFit.cover,
                                        errorBuilder:
                                            (_, __, ___) => Container(
                                              height: 120,
                                              color: Colors.grey[200],
                                              child: const Icon(
                                                Icons.image,
                                                size: 40,
                                                color: Colors.grey,
                                              ),
                                            ),
                                      )
                                      : Container(
                                        height: 120,
                                        color: Colors.purple.withOpacity(
                                          0.2,
                                        ),
                                        child: const Icon(
                                          Icons.image,
                                          size: 40,
                                          color: Colors.purple,
                                        ),
                                      ),
                            ),
                            Padding(
                              padding: const EdgeInsets.all(10),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    resource['name'] ?? 'Ressource',
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w600,
                                      fontSize: 13,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    'À partir de ${(resource['price'] ?? 0).toStringAsFixed(0)} DT',
                                    style: const TextStyle(
                                      color: Colors.green,
                                      fontWeight: FontWeight.w600,
                                      fontSize: 11,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ),
              ),

          // ========== TYPES D'ÉVÉNEMENTS ==========
          SliverToBoxAdapter(
            child: Container(
              margin: const EdgeInsets.all(20),
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Types d\'événements',
                    style: GoogleFonts.poppins(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Explorez les différents types d\'événements que vous pouvez organiser',
                    style: TextStyle(color: Colors.grey[600], fontSize: 13),
                  ),
                  const SizedBox(height: 20),
                  GridView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    gridDelegate:
                        const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 2,
                          crossAxisSpacing: 12,
                          mainAxisSpacing: 12,
                          childAspectRatio: 1.2,
                        ),
                    itemCount: _eventTypes.length,
                    itemBuilder: (context, index) {
                      final item = _eventTypes[index];
                      return Container(
                        decoration: BoxDecoration(
                          color: Color(
                            item['color'] as int,
                          ).withOpacity(0.1),
                          borderRadius: BorderRadius.circular(15),
                        ),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              _getEventIcon(item['title'] as String),
                              color: Color(item['color'] as int),
                              size: 40,
                            ),
                            const SizedBox(height: 10),
                            Text(
                              item['title'] as String,
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 14,
                              ),
                            ),
                            Text(
                              item['category'] as String,
                              style: TextStyle(
                                color: Colors.grey[500],
                                fontSize: 11,
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
          ),

          // ========== FEATURES ==========
          SliverToBoxAdapter(
            child: Container(
              margin: const EdgeInsets.all(20),
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [Color(0xFF9C27B0), Color(0xFFE91E63)],
                ),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Pourquoi choisir YallaEvents ?',
                    style: GoogleFonts.poppins(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 20),
                  ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: _features.length,
                    itemBuilder: (context, index) {
                      final feature = _features[index];
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 16),
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: Colors.white.withOpacity(0.2),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Icon(
                                feature['icon'] as IconData,
                                color: Colors.white,
                                size: 24,
                              ),
                            ),
                            const SizedBox(width: 15),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    feature['title'] as String,
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontWeight: FontWeight.w600,
                                      fontSize: 14,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    feature['description'] as String,
                                    style: TextStyle(
                                      color: Colors.white.withOpacity(0.8),
                                      fontSize: 12,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
          ),

          // ========== À PROPOS ==========
          SliverToBoxAdapter(
            child: Container(
              margin: const EdgeInsets.all(20),
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: Colors.grey.withOpacity(0.1),
                    blurRadius: 10,
                    offset: const Offset(0, 5),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'À propos de YallaEvents',
                    style: GoogleFonts.poppins(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: const Color(0xFF9C27B0),
                    ),
                  ),
                  const SizedBox(height: 15),
                  Text(
                    'Smart YallaEvents est une application web intelligente conçue pour simplifier et moderniser l\'organisation des événements. Elle offre une plateforme centralisée permettant aux organisateurs de planifier efficacement leurs projets.',
                    style: TextStyle(
                      fontSize: 14,
                      height: 1.5,
                      color: Colors.grey[700],
                    ),
                  ),
                  const SizedBox(height: 15),
                  Text(
                    'Grâce à une gestion des disponibilités en temps réel et une interface intuitive, notre solution réduit les conflits, optimise les ressources et améliore l\'expérience utilisateur.',
                    style: TextStyle(
                      fontSize: 14,
                      height: 1.5,
                      color: Colors.grey[700],
                    ),
                  ),
                  const SizedBox(height: 20),
                  Wrap(
                    spacing: 10,
                    children:
                        ['Innovation', 'Fiabilité', 'Simplicité'].map((tag) {
                          return Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 15,
                              vertical: 6,
                            ),
                            decoration: BoxDecoration(
                              color: const Color(0xFF9C27B0).withOpacity(0.1),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Text(
                              tag,
                              style: const TextStyle(
                                color: Color(0xFF9C27B0),
                                fontSize: 12,
                              ),
                            ),
                          );
                        }).toList(),
                  ),
                ],
              ),
            ),
          ),

          // ========== FAQ ==========
          SliverToBoxAdapter(
            child: Container(
              margin: const EdgeInsets.all(20),
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: Colors.grey.withOpacity(0.1),
                    blurRadius: 10,
                    offset: const Offset(0, 5),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Questions fréquentes',
                    style: GoogleFonts.poppins(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 15),
                  ..._faq.asMap().entries.map((entry) {
                    final index = entry.key;
                    final faq = entry.value;
                    return Column(
                      children: [
                        GestureDetector(
                          onTap: () {
                            setState(() {
                              _expandedFaqIndex =
                                  _expandedFaqIndex == index ? -1 : index;
                            });
                          },
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 15),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    faq['q']!,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                                Icon(
                                  _expandedFaqIndex == index
                                      ? Icons.expand_less
                                      : Icons.expand_more,
                                  color: const Color(0xFF9C27B0),
                                ),
                              ],
                            ),
                          ),
                        ),
                        if (_expandedFaqIndex == index)
                          Padding(
                            padding: const EdgeInsets.only(bottom: 15),
                            child: Text(
                              faq['a']!,
                              style: TextStyle(
                                color: Colors.grey[600],
                                fontSize: 13,
                              ),
                            ),
                          ),
                        if (index < _faq.length - 1)
                          Divider(color: Colors.grey[200]),
                      ],
                    );
                  }),
                ],
              ),
            ),
          ),

          const SliverToBoxAdapter(child: SizedBox(height: 80)),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {},
        backgroundColor: const Color(0xFF9C27B0),
        child: const Icon(Icons.add, color: Colors.white),
      ),
    );
  }
}