import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'auth_screen.dart';

class _PageData {
  final String title;
  final String subtitle;
  final String imagePath;
  const _PageData({
    required this.title,
    required this.subtitle,
    required this.imagePath,
  });
}

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});
  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final PageController _controller = PageController();
  int _currentPage = 0;
  static const Color _purple = Color(0xFF9C27B0);

  final List<_PageData> _pages = const [
    _PageData(
      title: 'MARIAGE',
      subtitle: 'Votre bonheur commence ici.',
      imagePath: 'assets/wedding.jpg',
    ),
    _PageData(
      title: 'TRAITEUR',
      subtitle: 'Des saveurs inoubliables pour vos événements.',
      imagePath: 'assets/catering.jpg',
    ),
    _PageData(
      title: 'PHOTOGRAPHIE',
      subtitle: 'Immortalisez chaque moment précieux.',
      imagePath: 'assets/photo.jpg',
    ),
  ];

  void _next() async {
    if (_currentPage < _pages.length - 1) {
      _controller.nextPage(
        duration: const Duration(milliseconds: 500),
        curve: Curves.easeInOut,
      );
    } else {
      // Sauvegarde que l'utilisateur a vu l'onboarding
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool('hasSeenOnboarding', true);
      
      if (mounted) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (context) => const AuthScreen()),
        );
      }
    }
  }

  void _skip() {
    _controller.animateToPage(
      _pages.length - 1,
      duration: const Duration(milliseconds: 500),
      curve: Curves.easeInOut,
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: PageView.builder(
        controller: _controller,
        onPageChanged: (i) => setState(() => _currentPage = i),
        itemCount: _pages.length,
        itemBuilder: (context, index) => _OnboardingPage(
          page: _pages[index],
          currentIndex: _currentPage,
          total: _pages.length,
          onNext: _next,
          onSkip: _skip,
        ),
      ),
    );
  }
}

class _OnboardingPage extends StatelessWidget {
  final _PageData page;
  final int currentIndex;
  final int total;
  final VoidCallback onNext;
  final VoidCallback onSkip;
  static const Color _purple = Color(0xFF9C27B0);

  const _OnboardingPage({
    required this.page,
    required this.currentIndex,
    required this.total,
    required this.onNext,
    required this.onSkip,
  });

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Column(
        children: [
          // ── Top Bar
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // Logo container
                Container(
                  width: 46,
                  height: 46,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.grey.shade200),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.08),
                        blurRadius: 8,
                      ),
                    ],
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: Image.asset(
                      'assets/logo.png',
                      fit: BoxFit.contain,
                      errorBuilder: (_, __, ___) => const Center(
                        child: Icon(
                          Icons.image_outlined,
                          size: 22,
                          color: Color(0xFF9C27B0),
                        ),
                      ),
                    ),
                  ),
                ),
                // Skip button
                GestureDetector(
                  onTap: onSkip,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 20,
                      vertical: 10,
                    ),
                    decoration: BoxDecoration(
                      color: _purple,
                      borderRadius: BorderRadius.circular(30),
                    ),
                    child: const Text(
                      'Passer',
                      style: TextStyle(color: Colors.white),
                    ),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 8),

          // ── Title
          AnimatedSwitcher(
            duration: const Duration(milliseconds: 500),
            transitionBuilder: (child, animation) => FadeTransition(
              opacity: animation,
              child: SlideTransition(
                position: Tween(
                  begin: const Offset(0, 0.3),
                  end: Offset.zero,
                ).animate(animation),
                child: child,
              ),
            ),
            child: Text(
              page.title,
              key: ValueKey(page.title),
              style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w900),
            ),
          ),

          const SizedBox(height: 6),

          // ── Subtitle
          AnimatedSwitcher(
            duration: const Duration(milliseconds: 600),
            child: Text(
              page.subtitle,
              key: ValueKey(page.subtitle),
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.grey),
            ),
          ),

          const SizedBox(height: 16),

          // ── Image Section
          Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(28),
                child: Stack(
                  children: [
                    // Image
                    Positioned.fill(
                      child: TweenAnimationBuilder(
                        duration: const Duration(milliseconds: 800),
                        tween: Tween(begin: 1.1, end: 1.0),
                        builder: (context, scale, child) =>
                            Transform.scale(scale: scale, child: child),
                        child: Image.asset(page.imagePath, fit: BoxFit.cover),
                      ),
                    ),

                    // Gradient
                    Positioned(
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: 180,
                      child: Container(
                        decoration: const BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [
                              Colors.transparent,
                              Color(0x88000000),
                              Color(0xDD000000),
                            ],
                          ),
                        ),
                      ),
                    ),

                    // Dots
                    Positioned(
                      bottom: 80,
                      left: 0,
                      right: 0,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: List.generate(total, (index) {
                          final active = index == currentIndex;
                          return AnimatedContainer(
                            duration: const Duration(milliseconds: 300),
                            margin: const EdgeInsets.symmetric(horizontal: 4),
                            width: active ? 20 : 8,
                            height: 8,
                            decoration: BoxDecoration(
                              color: active
                                  ? Colors.white
                                  : Colors.white.withOpacity(0.4),
                              borderRadius: BorderRadius.circular(10),
                            ),
                          );
                        }),
                      ),
                    ),

                    // Button
                    Positioned(
                      left: 28,
                      right: 28,
                      bottom: 20,
                      child: SizedBox(
                        height: 52,
                        child: ElevatedButton(
                          onPressed: onNext,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: _purple,
                            elevation: 6,
                            shadowColor: _purple.withOpacity(0.5),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(50),
                            ),
                          ),
                          child: AnimatedSwitcher(
                            duration: const Duration(milliseconds: 300),
                            child: Text(
                              currentIndex < total - 1
                                  ? 'Suivant'
                                  : 'Commencer',
                              key: ValueKey(currentIndex),
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                                color: Colors.white,
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
          ),

          const SizedBox(height: 16),
        ],
      ),
    );
  }
}