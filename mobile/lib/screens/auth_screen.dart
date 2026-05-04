import 'dart:io';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});
  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  bool isLogin = true;
  static const Color primary = Color(0xFF9C27B0);

  // ✅ Photo de profil
  File? _profileImage;
  final ImagePicker _picker = ImagePicker();

  // ✅ Position sur la map
  LatLng _selectedPosition = const LatLng(36.8065, 10.1815); // Tunis par défaut
  final MapController _mapController = MapController();

  // ─── Ouvrir galerie ou caméra ───────────────────────────────────────
  Future<void> _pickImage() async {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 12),
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            const SizedBox(height: 16),
            ListTile(
              leading: const Icon(Icons.photo_library_outlined, color: primary),
              title: const Text("Choisir depuis la galerie"),
              onTap: () async {
                Navigator.pop(context);
                final XFile? img = await _picker.pickImage(
                  source: ImageSource.gallery,
                  imageQuality: 80,
                );
                if (img != null) setState(() => _profileImage = File(img.path));
              },
            ),
            ListTile(
              leading: const Icon(Icons.camera_alt_outlined, color: primary),
              title: const Text("Prendre une photo"),
              onTap: () async {
                Navigator.pop(context);
                final XFile? img = await _picker.pickImage(
                  source: ImageSource.camera,
                  imageQuality: 80,
                );
                if (img != null) setState(() => _profileImage = File(img.path));
              },
            ),
            const SizedBox(height: 10),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: AnimatedSwitcher(
        duration: const Duration(milliseconds: 400),
        child: isLogin ? _loginUI() : _signupUI(),
      ),
    );
  }

  // ─── LOGIN ────────────────────────────────────────────────────────────

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
              child: Container(height: 80, color: Color(0xFFA746AF)),
            ),
          ),

          Transform.translate(
            offset: const Offset(0, -35),
            child: Container(
              color: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Column(
                children: [
                  _field("Email", Icons.email_outlined),
                  const SizedBox(height: 12),
                  _field("Mot de passe", Icons.lock_outline, isPassword: true),
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
                  _gradientButton("Se connecter", () {}),
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

  // ─── SIGNUP ───────────────────────────────────────────────────────────

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
                  // ✅ Avatar picker avec vraie photo
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
                            image: _profileImage != null
                                ? DecorationImage(
                                    image: FileImage(_profileImage!),
                                    fit: BoxFit.cover,
                                  )
                                : null,
                          ),
                          child: _profileImage == null
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
                            "Galerie ou caméra",
                            style: TextStyle(color: Colors.grey, fontSize: 11),
                          ),
                          if (_profileImage != null)
                            GestureDetector(
                              onTap: () => setState(() => _profileImage = null),
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

                  Row(
                    children: [
                      Expanded(child: _field("Nom", Icons.person_outline)),
                      const SizedBox(width: 10),
                      Expanded(child: _field("Prénom", Icons.person_outline)),
                    ],
                  ),
                  const SizedBox(height: 10),
                  _field("Téléphone", Icons.phone_outlined),
                  const SizedBox(height: 10),
                  _field("Email", Icons.email_outlined),
                  const SizedBox(height: 10),
                  _field("Mot de passe", Icons.lock_outline, isPassword: true),
                  const SizedBox(height: 14),

                  // Localisation
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
                        "${_selectedPosition.latitude.toStringAsFixed(4)}° N, ${_selectedPosition.longitude.toStringAsFixed(4)}° E",
                        style: const TextStyle(
                          color: Colors.grey,
                          fontSize: 10,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),

                  // ✅ VRAIE MAP interactive
                  _realMap(),

                  const SizedBox(height: 14),
                  _gradientButton("Créer mon compte", () {}),
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
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ─── REAL MAP ─────────────────────────────────────────────────────────

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
            // ✅ Tap sur la map pour changer la position
            onTap: (tapPosition, point) {
              setState(() => _selectedPosition = point);
            },
          ),
          children: [
            // Tuiles OpenStreetMap — 100% gratuit, sans token
            TileLayer(
              urlTemplate:
                  'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
              subdomains: const ['a', 'b', 'c', 'd'],
              userAgentPackageName:
                  'com.example.mobile', // ← colle ton applicationId ici
            ),
            // Pin violet sur la position sélectionnée
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

  // ─── COMPONENTS ───────────────────────────────────────────────────────

  Widget _field(String hint, IconData icon, {bool isPassword = false}) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFEDE5F7)),
      ),
      child: TextField(
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
        onPressed: onTap,
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.transparent,
          shadowColor: Colors.transparent,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(30),
          ),
        ),
        child: Row(
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
            const Icon(Icons.arrow_forward, color: Colors.white, size: 18),
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

  Widget _tab(String label, bool active, VoidCallback onTap) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 14),
          decoration: BoxDecoration(
            border: Border(
              bottom: BorderSide(
                color: active ? primary : Colors.transparent,
                width: 2,
              ),
            ),
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 13,
              color: active ? primary : Colors.grey,
              fontWeight: active ? FontWeight.w600 : FontWeight.normal,
            ),
          ),
        ),
      ),
    );
  }
}

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
