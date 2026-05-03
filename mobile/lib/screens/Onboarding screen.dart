import 'package:flutter/material.dart';

// ─── Model ─────────────────────────────────────────────────────────────────────

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

// ─── Screen ────────────────────────────────────────────────────────────────────

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
      title: 'WEDDING',
      subtitle: 'Happily ever after starts now.',
      imagePath: 'assets/wedding.jpg',
    ),
    _PageData(
      title: 'CATERING',
      subtitle: 'Make life delicious.',
      imagePath: 'assets/catering.jpg',
    ),
    _PageData(
      title: 'Photography',
      subtitle: 'Memory is Priceless',
      imagePath: 'assets/photo.jpg',
    ),
  ];

  void _next() {
    if (_currentPage < _pages.length - 1) {
      _controller.nextPage(
        duration: const Duration(milliseconds: 400),
        curve: Curves.easeInOut,
      );
    } else {
      // TODO: Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const HomePage()));
    }
  }

  void _skip() {
    _controller.animateToPage(
      _pages.length - 1,
      duration: const Duration(milliseconds: 400),
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
        itemBuilder: (context, index) {
          final page = _pages[index];
          return _OnboardingPage(
            page: page,
            currentIndex: _currentPage,
            total: _pages.length,
            onNext: _next,
            onSkip: _skip,
          );
        },
      ),
    );
  }
}

// ─── Single page ───────────────────────────────────────────────────────────────

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
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Top bar: logo left + skip right
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // Logo tent icon
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(10),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.08),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: const Center(
                    child: _TentIcon(),
                  ),
                ),

                // Skip button
                GestureDetector(
                  onTap: onSkip,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 10),
                    decoration: BoxDecoration(
                      color: _purple,
                      borderRadius: BorderRadius.circular(30),
                    ),
                    child: const Text(
                      'skip',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 0.3,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // ── Title
          Center(
            child: Text(
              page.title,
              style: const TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.w900,
                color: Color(0xFF1A1A1A),
                letterSpacing: 1.5,
              ),
            ),
          ),

          const SizedBox(height: 10),

          // ── Subtitle
          Center(
            child: Text(
              page.subtitle,
              style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w400,
                color: Color(0xFF888888),
                letterSpacing: 0.3,
              ),
            ),
          ),

          const SizedBox(height: 20),

          // ── Image + Next button stacked
          Expanded(
            child: Stack(
              children: [
                // Image fills the rest of the screen
                Positioned.fill(
                  child: ClipRRect(
                    borderRadius: const BorderRadius.only(
                      topLeft: Radius.circular(28),
                      topRight: Radius.circular(28),
                    ),
                    child: Image.asset(
                      page.imagePath,
                      fit: BoxFit.cover,
                    ),
                  ),
                ),

                // Dark gradient at bottom for button readability
                Positioned(
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: 70,
                  child: ClipRRect(
                    borderRadius: const BorderRadius.only(
                      topLeft: Radius.circular(28),
                      topRight: Radius.circular(28),
                    ),
                    child: Container(
                      decoration: const BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [
                            Colors.transparent,
                            Color(0x88000000),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),

                // Next button floating at bottom center
                Positioned(
                  left: 40,
                  right: 40,
                  bottom: 36,
                  child: SizedBox(
                    height: 54,
                    child: ElevatedButton(
                      onPressed: onNext,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _purple,
                        foregroundColor: Colors.white,
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(50),
                        ),
                      ),
                      child: Text(
                        currentIndex < total - 1 ? 'Next' : 'Get Started',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ),
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

// ─── Tent logo icon (custom painter) ──────────────────────────────────────────

class _TentIcon extends StatelessWidget {
  const _TentIcon();

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      size: const Size(26, 26),
      painter: _TentPainter(),
    );
  }
}

class _TentPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = const Color(0xFF9C27B0)
      ..style = PaintingStyle.fill;

    final w = size.width;
    final h = size.height;

    // Main tent triangle (left panel)
    final leftPanel = Path()
      ..moveTo(w * 0.5, h * 0.05)   // apex
      ..lineTo(w * 0.0, h * 0.85)   // bottom left
      ..lineTo(w * 0.42, h * 0.85)  // bottom right of left panel
      ..close();
    canvas.drawPath(leftPanel, paint);

    // Right panel
    final rightPanel = Path()
      ..moveTo(w * 0.5, h * 0.05)   // apex
      ..lineTo(w * 0.58, h * 0.85)  // bottom left of right panel
      ..lineTo(w * 1.0, h * 0.85)   // bottom right
      ..close();
    canvas.drawPath(rightPanel, paint);

    // Center gap / door (white triangle in middle bottom)
    final door = Path()
      ..moveTo(w * 0.5, h * 0.45)
      ..lineTo(w * 0.42, h * 0.85)
      ..lineTo(w * 0.58, h * 0.85)
      ..close();
    canvas.drawPath(door, Paint()..color = Colors.white);

    // Small flag on top
    canvas.drawCircle(Offset(w * 0.5, h * 0.04), w * 0.035, paint);

    // Base line
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(0, h * 0.85, w, h * 0.08),
        const Radius.circular(2),
      ),
      paint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}