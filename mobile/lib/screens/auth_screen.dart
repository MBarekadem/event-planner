import 'dart:io';
import 'dart:typed_data';
import 'dart:ui' as ui;
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:image_picker/image_picker.dart';
import 'package:latlong2/latlong.dart';
import '../services/auth_service.dart';
import 'home_screen.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});
  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  bool isLogin = true;
  static const Color primary = Color(0xFF9C27B0);
  static const String _role = 'organisateur';

  // ── Controllers ──
  final _loginEmailCtrl = TextEditingController();
  final _loginPasswordCtrl = TextEditingController();
  final _nomCtrl = TextEditingController();
  final _prenomCtrl = TextEditingController();
  final _telCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();

  // ── État ──
  bool _isLoading = false;

  // ── Photo de profil ──
  File? _profileImage;
  Uint8List? _profileImageBytes;
  String? _profileImageName;
  final ImagePicker _picker = ImagePicker();

  // ── Position map ──
  LatLng _selectedPosition = const LatLng(36.8065, 10.1815);
  final MapController _mapController = MapController();

  @override
  void dispose() {
    _loginEmailCtrl.dispose();
    _loginPasswordCtrl.dispose();
    _nomCtrl.dispose();
    _prenomCtrl.dispose();
    _telCtrl.dispose();
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

  // ─── PICK IMAGE ────────────────────────────────────────────────────
  Future<void> _pickImage() async {
    final XFile? img = await _picker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 80,
    );
    if (img == null) return;

    if (kIsWeb) {
      final bytes = await img.readAsBytes();
      setState(() {
        _profileImageBytes = bytes;
        _profileImageName = img.name;
      });
    } else {
      setState(() => _profileImage = File(img.path));
    }
  }

  DecorationImage? _buildAvatarImage() {
    if (kIsWeb && _profileImageBytes != null) {
      return DecorationImage(
        image: MemoryImage(_profileImageBytes!),
        fit: BoxFit.cover,
      );
    } else if (!kIsWeb && _profileImage != null) {
      return DecorationImage(
        image: FileImage(_profileImage!),
        fit: BoxFit.cover,
      );
    }
    return null;
  }

  bool get _hasImage =>
      (kIsWeb && _profileImageBytes != null) ||
      (!kIsWeb && _profileImage != null);

  // ─── LOGIN ─────────────────────────────────────────────────────────
  Future<void> _handleLogin() async {
    if (_loginEmailCtrl.text.trim().isEmpty ||
        _loginPasswordCtrl.text.isEmpty) {
      _showSnack("Veuillez remplir tous les champs");
      return;
    }
    setState(() => _isLoading = true);

    final result = await AuthService.login(
      email: _loginEmailCtrl.text.trim(),
      password: _loginPasswordCtrl.text,
    );

    if (result['success']) {
      final user = result['data']['user'];
      final token = result['data']['token'];

      _showSnack("✅ Bienvenue ${user['firstname']} !", success: true);

      // 🔥 NAVIGATION AVEC DATA
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (context) => HomeScreen(user: user, token: token),
        ),
      );
    } else {
      final msg = result['message'] ?? "";
      if (msg.contains('non trouvé')) {
        _showSnack("❌ Aucun compte trouvé avec cet email");
      } else if (msg.contains('incorrect')) {
        _showSnack("❌ Mot de passe incorrect");
      } else if (msg.contains('attente')) {
        _showSnack("⏳ Compte en attente de validation");
      } else {
        _showSnack("❌ ${msg.isNotEmpty ? msg : 'Erreur de connexion'}");
      }
    }

    setState(() => _isLoading = false);
  }

  // ─── REGISTER ──────────────────────────────────────────────────────
  Future<void> _handleRegister() async {
    if (_nomCtrl.text.trim().isEmpty ||
        _prenomCtrl.text.trim().isEmpty ||
        _telCtrl.text.trim().isEmpty ||
        _emailCtrl.text.trim().isEmpty ||
        _passwordCtrl.text.isEmpty) {
      _showSnack("Veuillez remplir tous les champs");
      return;
    }
    setState(() => _isLoading = true);

    final result = await AuthService.register(
      lastname: _nomCtrl.text.trim(),
      firstname: _prenomCtrl.text.trim(),
      email: _emailCtrl.text.trim(),
      password: _passwordCtrl.text,
      numTel: _telCtrl.text.trim(),
      role: _role,
      latitude: _selectedPosition.latitude,
      longitude: _selectedPosition.longitude,
      imageFile: kIsWeb ? null : _profileImage,
      imageBytes: kIsWeb ? _profileImageBytes : null,
      imageName: kIsWeb ? _profileImageName : null,
    );

    if (result['success']) {
      _showSnack("✅ Compte créé avec succès !", success: true);
      setState(() {
        isLogin = true;
        _nomCtrl.clear();
        _prenomCtrl.clear();
        _telCtrl.clear();
        _emailCtrl.clear();
        _passwordCtrl.clear();
        _profileImage = null;
        _profileImageBytes = null;
        _profileImageName = null;
      });
    } else {
      _showSnack(result['message'] ?? "Erreur lors de l'inscription");
    }

    setState(() => _isLoading = false);
  }

  // ─── HELPER ────────────────────────────────────────────────────────
  void _showSnack(String msg, {bool success = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        backgroundColor: success ? Colors.green.shade600 : Colors.red.shade600,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }

  // ─── BUILD ─────────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Stack(
        children: [
          AnimatedSwitcher(
            duration: const Duration(milliseconds: 400),
            child: isLogin ? _loginUI() : _signupUI(),
          ),
          if (_isLoading)
            Container(
              color: Colors.black26,
              child: const Center(
                child: CircularProgressIndicator(color: primary),
              ),
            ),
        ],
      ),
    );
  }

  // ─── LOGIN UI ──────────────────────────────────────────────────────
  Widget _loginUI() {
    return SingleChildScrollView(
      key: const ValueKey("login"),
      child: Column(
        children: [
          Stack(
            children: [
              SizedBox(
                height: 340,
                width: double.infinity,
                child: Image.asset("assets/wedding.jpg", fit: BoxFit.cover),
              ),
              Positioned.fill(
                child: Container(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        Colors.transparent,
                        primary.withOpacity(0.4),
                        primary.withOpacity(0.9),
                      ],
                    ),
                  ),
                ),
              ),
              const Positioned(
                bottom: 70,
                left: 24,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      "Bon retour 👋",
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    SizedBox(height: 4),
                    Text(
                      "Connectez-vous à votre compte",
                      style: TextStyle(color: Colors.white70, fontSize: 13),
                    ),
                  ],
                ),
              ),
            ],
          ),

          Transform.translate(
            offset: const Offset(0, -30),
            child: ClipPath(
              clipper: WaveClipper(),
              child: Container(height: 80, color: const Color(0xFFA746AF)),
            ),
          ),

          Transform.translate(
            offset: const Offset(0, -35),
            child: Container(
              color: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Column(
                children: [
                  _field(
                    "Email",
                    Icons.email_outlined,
                    controller: _loginEmailCtrl,
                  ),
                  const SizedBox(height: 12),
                  _field(
                    "Mot de passe",
                    Icons.lock_outline,
                    isPassword: true,
                    controller: _loginPasswordCtrl,
                  ),
                  Align(
                    alignment: Alignment.centerRight,
                    child: TextButton(
                      onPressed: () {},
                      child: const Text(
                        "Mot de passe oublié ?",
                        style: TextStyle(color: primary, fontSize: 12),
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  _gradientButton("Se connecter", _handleLogin),
                  const SizedBox(height: 18),
                  _orDivider(),
                  const SizedBox(height: 14),
                  _socialBtn("Google", "assets/google.png"),
                  const SizedBox(height: 22),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Text("Pas de compte ? "),
                      GestureDetector(
                        onTap: () => setState(() => isLogin = false),
                        child: const Text(
                          "S'inscrire",
                          style: TextStyle(
                            color: primary,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 30),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ─── SIGNUP UI ─────────────────────────────────────────────────────
  Widget _signupUI() {
    return SafeArea(
      key: const ValueKey("signup"),
      child: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // ── Avatar picker ──
                  Row(
                    children: [
                      GestureDetector(
                        onTap: _pickImage,
                        child: Container(
                          width: 72,
                          height: 72,
                          decoration: BoxDecoration(
                            color: const Color(0xFFF3E5FF),
                            borderRadius: BorderRadius.circular(18),
                            border: Border.all(
                              color: const Color(0xFFC084E8),
                              width: 1.5,
                            ),
                            image: _buildAvatarImage(),
                          ),
                          child: !_hasImage
                              ? const Icon(
                                  Icons.camera_alt_outlined,
                                  color: primary,
                                  size: 28,
                                )
                              : null,
                        ),
                      ),
                      const SizedBox(width: 14),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            "Photo de profil",
                            style: TextStyle(
                              color: primary,
                              fontWeight: FontWeight.w600,
                              fontSize: 13,
                            ),
                          ),
                          const Text(
                            "Appuie pour choisir",
                            style: TextStyle(color: Colors.grey, fontSize: 11),
                          ),
                          if (_hasImage)
                            GestureDetector(
                              onTap: () => setState(() {
                                _profileImage = null;
                                _profileImageBytes = null;
                                _profileImageName = null;
                              }),
                              child: const Text(
                                "Supprimer",
                                style: TextStyle(
                                  color: Colors.red,
                                  fontSize: 11,
                                ),
                              ),
                            ),
                        ],
                      ),
                    ],
                  ),

                  const SizedBox(height: 14),

                  // ── Nom / Prénom ──
                  Row(
                    children: [
                      Expanded(
                        child: _field(
                          "Nom",
                          Icons.person_outline,
                          controller: _nomCtrl,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: _field(
                          "Prénom",
                          Icons.person_outline,
                          controller: _prenomCtrl,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  _field(
                    "Téléphone",
                    Icons.phone_outlined,
                    controller: _telCtrl,
                  ),
                  const SizedBox(height: 10),
                  _field("Email", Icons.email_outlined, controller: _emailCtrl),
                  const SizedBox(height: 10),
                  _field(
                    "Mot de passe",
                    Icons.lock_outline,
                    isPassword: true,
                    controller: _passwordCtrl,
                  ),
                  const SizedBox(height: 14),

                  // ── Localisation ──
                  Row(
                    children: [
                      const Icon(
                        Icons.location_on_outlined,
                        size: 16,
                        color: primary,
                      ),
                      const SizedBox(width: 6),
                      const Text(
                        "Localisation",
                        style: TextStyle(
                          color: primary,
                          fontWeight: FontWeight.w600,
                          fontSize: 13,
                        ),
                      ),
                      const Spacer(),
                      Text(
                        "${_selectedPosition.latitude.toStringAsFixed(4)}° N, "
                        "${_selectedPosition.longitude.toStringAsFixed(4)}° E",
                        style: const TextStyle(
                          color: Colors.grey,
                          fontSize: 10,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  _realMap(),

                  const SizedBox(height: 14),
                  _gradientButton("Créer mon compte", _handleRegister),
                  const SizedBox(height: 14),
                  _orDivider(),
                  const SizedBox(height: 12),
                  _socialBtn("Google", "assets/google.png"),
                  const SizedBox(height: 16),
                  Center(
                    child: GestureDetector(
                      onTap: () => setState(() => isLogin = true),
                      child: const Text(
                        "Déjà un compte ? Se connecter",
                        style: TextStyle(color: primary, fontSize: 13),
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ─── REAL MAP ──────────────────────────────────────────────────────
  Widget _realMap() {
    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: SizedBox(
        height: 180,
        child: FlutterMap(
          mapController: _mapController,
          options: MapOptions(
            initialCenter: _selectedPosition,
            initialZoom: 13,
            onTap: (_, point) => setState(() => _selectedPosition = point),
          ),
          children: [
            TileLayer(
              urlTemplate:
                  'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
              subdomains: const ['a', 'b', 'c', 'd'],
              userAgentPackageName: 'com.example.mobile',
            ),
            MarkerLayer(
              markers: [
                Marker(
                  point: _selectedPosition,
                  width: 40,
                  height: 40,
                  child: const Icon(
                    Icons.location_pin,
                    color: primary,
                    size: 40,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  // ─── COMPONENTS ────────────────────────────────────────────────────
  Widget _field(
    String hint,
    IconData icon, {
    bool isPassword = false,
    TextEditingController? controller,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFEDE5F7)),
      ),
      child: TextField(
        controller: controller,
        obscureText: isPassword,
        decoration: InputDecoration(
          prefixIcon: Icon(icon, color: primary, size: 20),
          hintText: hint,
          hintStyle: const TextStyle(color: Color(0xFFB0A0C0), fontSize: 13),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(vertical: 14),
        ),
      ),
    );
  }

  Widget _gradientButton(String label, VoidCallback onTap) {
    return Container(
      width: double.infinity,
      height: 52,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(30),
        gradient: const LinearGradient(
          colors: [Color(0xFFB832C5), Color(0xFF9C27B0)],
        ),
      ),
      child: ElevatedButton(
        onPressed: _isLoading ? null : onTap,
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.transparent,
          shadowColor: Colors.transparent,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(30),
          ),
        ),
        child: _isLoading
            ? const SizedBox(
                width: 22,
                height: 22,
                child: CircularProgressIndicator(
                  color: Colors.white,
                  strokeWidth: 2,
                ),
              )
            : Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    label,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(width: 8),
                  const Icon(
                    Icons.arrow_forward,
                    color: Colors.white,
                    size: 18,
                  ),
                ],
              ),
      ),
    );
  }

  Widget _orDivider() {
    return Row(
      children: [
        Expanded(child: Divider(color: Colors.grey.shade300)),
        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 10),
          child: Text("OU", style: TextStyle(color: Colors.grey, fontSize: 12)),
        ),
        Expanded(child: Divider(color: Colors.grey.shade300)),
      ],
    );
  }

  Widget _socialBtn(String label, String assetPath) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(30),
        border: Border.all(color: const Color(0xFFE0D4F0)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Image.asset(
            assetPath,
            width: 18,
            height: 18,
            errorBuilder: (_, __, ___) => const Icon(Icons.language, size: 18),
          ),
          const SizedBox(width: 8),
          Text(
            label,
            style: const TextStyle(fontSize: 13, color: Colors.black87),
          ),
        ],
      ),
    );
  }
}

// ─── WAVE CLIPPER ──────────────────────────────────────────────────────
class WaveClipper extends CustomClipper<ui.Path> {
  @override
  ui.Path getClip(Size size) {
    final path = ui.Path();
    path.lineTo(0, size.height - 40);
    path.cubicTo(
      size.width * 0.25,
      size.height,
      size.width * 0.75,
      size.height - 80,
      size.width,
      size.height - 40,
    );
    path.lineTo(size.width, 0);
    path.close();
    return path;
  }

  @override
  bool shouldReclip(CustomClipper<ui.Path> oldClipper) => false;
}
