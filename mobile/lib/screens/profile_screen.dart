import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

// ─── CONSTANTES ────────────────────────────────────────────────────────────────
const _purple = Color(0xFF9C27B0);
const _pink = Color(0xFFE91E63);
const _baseUrl = 'http://localhost:5000';

class ProfileScreen extends StatefulWidget {
  final Map<String, dynamic> user;
  final String token;

  const ProfileScreen({super.key, required this.user, required this.token});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen>
    with SingleTickerProviderStateMixin {
  late Map<String, dynamic> _user;
  bool _isSaving = false;

  // Stats dynamiques
  int _eventsCount = 0;
  int _favoritesCount = 0;
  int _invoicesCount = 0;
  bool _statsLoading = true;

  // Edit controllers
  final _firstnameCtrl = TextEditingController();
  final _lastnameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();

  // Image
  File? _newImage;
  Uint8List? _newImageBytes;
  String? _newImageName;
  final ImagePicker _picker = ImagePicker();

  late AnimationController _animCtrl;
  late Animation<double> _fadeAnim;
  late Animation<Offset> _slideAnim;

  @override
  void initState() {
    super.initState();
    _user = Map<String, dynamic>.from(widget.user);
    _syncControllers();
    _loadStats();

    _animCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 700),
    );
    _fadeAnim = CurvedAnimation(parent: _animCtrl, curve: Curves.easeOut);
    _slideAnim = Tween<Offset>(
      begin: const Offset(0, 0.08),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _animCtrl, curve: Curves.easeOut));

    _animCtrl.forward();
  }

  void _syncControllers() {
    _firstnameCtrl.text = _user['firstname'] ?? '';
    _lastnameCtrl.text = _user['lastname'] ?? '';
    _emailCtrl.text = _user['email'] ?? '';
    _phoneCtrl.text = _user['numTel'] ?? '';
  }

  @override
  void dispose() {
    _animCtrl.dispose();
    _firstnameCtrl.dispose();
    _lastnameCtrl.dispose();
    _emailCtrl.dispose();
    _phoneCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

  // ─── STATS DYNAMIQUES ───────────────────────────────────────────────────────
  Future<void> _loadStats() async {
    setState(() => _statsLoading = true);
    try {
      final userId = _user['id'] ?? _user['_id'];
      final headers = {'Authorization': 'Bearer ${widget.token}'};

      final results = await Future.wait([
        http.get(
          Uri.parse('$_baseUrl/api/events/user/$userId'),
          headers: headers,
        ),
        http.get(
          Uri.parse('$_baseUrl/api/users/adore/$userId'),
          headers: headers,
        ),
        http.get(Uri.parse('$_baseUrl/api/locations/my'), headers: headers),
      ]);

      if (mounted) {
        setState(() {
          // Événements
          if (results[0].statusCode == 200) {
            _eventsCount = (json.decode(results[0].body) as List).length;
          }
          // Favoris
          if (results[1].statusCode == 200) {
            _favoritesCount = (json.decode(results[1].body) as List).length;
          }
          // Factures payées
          if (results[2].statusCode == 200) {
            final locations = json.decode(results[2].body) as List;
            _invoicesCount = locations
                .where((l) => l['payer'] == 'payer')
                .length;
          }
          _statsLoading = false;
        });
      }
    } catch (e) {
      debugPrint('Stats error: $e');
      if (mounted) setState(() => _statsLoading = false);
    }
  }

  // ─── IMAGE AVATAR ───────────────────────────────────────────────────────────
  ImageProvider? get _avatarImage {
    if (kIsWeb && _newImageBytes != null) return MemoryImage(_newImageBytes!);
    if (!kIsWeb && _newImage != null) return FileImage(_newImage!);
    final img = _user['image'];
    if (img != null && img.toString().isNotEmpty) {
      return NetworkImage('$_baseUrl/$img');
    }
    return null;
  }

  Future<void> _pickImage() async {
    final XFile? img = await _picker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 80,
    );
    if (img == null) return;
    if (kIsWeb) {
      final bytes = await img.readAsBytes();
      setState(() {
        _newImageBytes = bytes;
        _newImageName = img.name;
      });
    } else {
      setState(() => _newImage = File(img.path));
    }
  }

  // ─── API UPDATE ─────────────────────────────────────────────────────────────
  Future<void> _saveProfile() async {
    setState(() => _isSaving = true);
    try {
      var request = http.MultipartRequest(
        'PUT',
        Uri.parse('$_baseUrl/api/users/update'),
      );
      request.headers['Authorization'] = 'Bearer ${widget.token}';

      request.fields['firstname'] = _firstnameCtrl.text.trim();
      request.fields['lastname'] = _lastnameCtrl.text.trim();
      request.fields['email'] = _emailCtrl.text.trim();
      request.fields['numTel'] = _phoneCtrl.text.trim();
      if (_passwordCtrl.text.isNotEmpty) {
        request.fields['password'] = _passwordCtrl.text;
      }

      // ✅ Image mobile
      if (!kIsWeb && _newImage != null) {
        request.files.add(
          await http.MultipartFile.fromPath('image', _newImage!.path),
        );
      }
      // ✅ Image web avec contentType correct
      else if (kIsWeb && _newImageBytes != null) {
        final name = _newImageName ?? 'profile.jpg';
        final ext = name.split('.').last.toLowerCase();
        final mime = ext == 'png'
            ? 'image/png'
            : ext == 'webp'
            ? 'image/webp'
            : 'image/jpeg';
        request.files.add(
          http.MultipartFile.fromBytes(
            'image',
            _newImageBytes!,
            filename: name,
            contentType: MediaType.parse(mime),
          ),
        );
      }

      final streamed = await request.send();
      final response = await http.Response.fromStream(streamed);

      if (response.statusCode == 200) {
        final updated = json.decode(response.body);
        debugPrint('✅ Updated user: ${json.encode(updated)}'); // ← ajouter

        // ✅ Persister dans SharedPreferences → image + numTel survivent à la reconnexion
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('user', json.encode(updated));

        setState(() {
          _user = updated;
          _syncControllers();
          _newImage = null;
          _newImageBytes = null;
          _newImageName = null;
        });

        _passwordCtrl.clear();
        _showSnack('✅ Profil mis à jour !', success: true);
      } else {
        final body = json.decode(response.body);
        _showSnack('❌ ${body['message'] ?? 'Erreur'}');
      }
    } catch (e) {
      _showSnack('❌ Erreur réseau : $e');
    } finally {
      setState(() => _isSaving = false);
    }
  }

  // ─── LOGOUT ──────────────────────────────────────────────────────────────────
  void _logout() async {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Déconnexion'),
        content: const Text('Voulez-vous vraiment vous déconnecter ?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Annuler'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () async {
              Navigator.pop(context);
              final prefs = await SharedPreferences.getInstance();
              await prefs.remove('token');
              await prefs.remove('user');
              Navigator.of(
                context,
              ).pushNamedAndRemoveUntil('/login', (route) => false);
            },
            child: const Text(
              'Déconnecter',
              style: TextStyle(color: Colors.white),
            ),
          ),
        ],
      ),
    );
  }

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

  // ─── BUILD ───────────────────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF4F0FA),
      body: FadeTransition(
        opacity: _fadeAnim,
        child: SlideTransition(
          position: _slideAnim,
          child: CustomScrollView(
            slivers: [
              _buildSliverHeader(),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 100),
                  child: Column(
                    children: [
                      const SizedBox(height: 24),
                      _buildStatsRow(),
                      const SizedBox(height: 20),
                      _buildEditForm(),
                      const SizedBox(height: 20),
                      _buildInfoCard(),
                      const SizedBox(height: 20),
                      _buildMenuCard(),
                      const SizedBox(height: 20),
                      _buildLogoutBtn(),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ─── SLIVER HEADER ───────────────────────────────────────────────────────────
  Widget _buildSliverHeader() {
    return SliverAppBar(
      expandedHeight: 300,
      pinned: true,
      backgroundColor: _purple,
      flexibleSpace: FlexibleSpaceBar(
        background: Stack(
          children: [
            Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [Color(0xFF6A0080), _purple, _pink],
                ),
              ),
            ),
            Positioned(
              top: -40,
              right: -40,
              child: Container(
                width: 180,
                height: 180,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.white.withOpacity(0.06),
                ),
              ),
            ),
            Positioned(
              bottom: 60,
              left: -30,
              child: Container(
                width: 130,
                height: 130,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.white.withOpacity(0.05),
                ),
              ),
            ),
            SafeArea(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const SizedBox(height: 20),
                  GestureDetector(
                    onTap: _pickImage,
                    child: Stack(
                      children: [
                        Container(
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.white, width: 3),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withOpacity(0.25),
                                blurRadius: 16,
                                offset: const Offset(0, 6),
                              ),
                            ],
                          ),
                          child: CircleAvatar(
                            radius: 52,
                            backgroundColor: Colors.white24,
                            backgroundImage: _avatarImage,
                            child: _avatarImage == null
                                ? Text(
                                    (_user['firstname'] ?? 'U')
                                        .substring(0, 1)
                                        .toUpperCase(),
                                    style: GoogleFonts.playfairDisplay(
                                      fontSize: 40,
                                      color: Colors.white,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  )
                                : null,
                          ),
                        ),
                        Positioned(
                          bottom: 2,
                          right: 2,
                          child: Container(
                            padding: const EdgeInsets.all(5),
                            decoration: BoxDecoration(
                              color: _pink,
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: Colors.white,
                                width: 1.5,
                              ),
                            ),
                            child: const Icon(
                              Icons.camera_alt,
                              color: Colors.white,
                              size: 14,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),
                  Text(
                    '${_user['firstname'] ?? ''} ${_user['lastname'] ?? ''}',
                    style: GoogleFonts.playfairDisplay(
                      fontSize: 24,
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      _user['role']?.toString().toUpperCase() ?? 'ORGANISATEUR',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 11,
                        letterSpacing: 1.5,
                        fontWeight: FontWeight.w600,
                      ),
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

  // ─── STATS ROW ───────────────────────────────────────────────────────────────
  Widget _buildStatsRow() {
    final stats = [
      {
        'label': 'Événements',
        'value': _statsLoading ? '...' : '$_eventsCount',
        'icon': Icons.event,
      },
      {
        'label': 'Favoris',
        'value': _statsLoading ? '...' : '$_favoritesCount',
        'icon': Icons.favorite,
      },
      {
        'label': 'Factures',
        'value': _statsLoading ? '...' : '$_invoicesCount',
        'icon': Icons.description,
      },
    ];

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: _purple.withOpacity(0.08),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: stats.asMap().entries.map((e) {
          final isLast = e.key == stats.length - 1;
          return Expanded(
            child: Container(
              decoration: !isLast
                  ? BoxDecoration(
                      border: Border(
                        right: BorderSide(
                          color: Colors.grey.shade200,
                          width: 1,
                        ),
                      ),
                    )
                  : null,
              child: Column(
                children: [
                  Icon(e.value['icon'] as IconData, color: _purple, size: 22),
                  const SizedBox(height: 6),
                  _statsLoading
                      ? SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: _purple,
                          ),
                        )
                      : Text(
                          e.value['value'] as String,
                          style: GoogleFonts.playfairDisplay(
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                            color: const Color(0xFF1A1A2E),
                          ),
                        ),
                  const SizedBox(height: 2),
                  Text(
                    e.value['label'] as String,
                    style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
                  ),
                ],
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  // ─── EDIT FORM ───────────────────────────────────────────────────────────────
  Widget _buildEditForm() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: _purple.withOpacity(0.08),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: _purple.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.edit_note, color: _purple, size: 20),
              ),
              const SizedBox(width: 10),
              Text(
                'Modifier le profil',
                style: GoogleFonts.playfairDisplay(
                  fontSize: 17,
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFF1A1A2E),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Row(
            children: [
              Expanded(
                child: _editField(
                  'Prénom',
                  Icons.person_outline,
                  _firstnameCtrl,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _editField('Nom', Icons.person_outline, _lastnameCtrl),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _editField(
            'Email',
            Icons.email_outlined,
            _emailCtrl,
            type: TextInputType.emailAddress,
          ),
          const SizedBox(height: 12),
          _editField(
            'Téléphone',
            Icons.phone_outlined,
            _phoneCtrl,
            type: TextInputType.phone,
          ),
          const SizedBox(height: 12),
          _editField(
            'Nouveau mot de passe',
            Icons.lock_outline,
            _passwordCtrl,
            isPassword: true,
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            height: 50,
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: const LinearGradient(colors: [_purple, _pink]),
                borderRadius: BorderRadius.circular(14),
                boxShadow: [
                  BoxShadow(
                    color: _purple.withOpacity(0.35),
                    blurRadius: 12,
                    offset: const Offset(0, 5),
                  ),
                ],
              ),
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.transparent,
                  shadowColor: Colors.transparent,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
                onPressed: _isSaving ? null : _saveProfile,
                child: _isSaving
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(
                          color: Colors.white,
                          strokeWidth: 2,
                        ),
                      )
                    : Text(
                        'Enregistrer les modifications',
                        style: GoogleFonts.nunito(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                          fontSize: 14,
                        ),
                      ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _editField(
    String label,
    IconData icon,
    TextEditingController ctrl, {
    TextInputType type = TextInputType.text,
    bool isPassword = false,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFFF8F4FF),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE8DCFF)),
      ),
      child: TextField(
        controller: ctrl,
        obscureText: isPassword,
        keyboardType: type,
        style: GoogleFonts.nunito(fontSize: 13),
        decoration: InputDecoration(
          prefixIcon: Icon(icon, color: _purple, size: 18),
          labelText: label,
          labelStyle: TextStyle(color: Colors.grey.shade500, fontSize: 12),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(vertical: 14),
        ),
      ),
    );
  }

  // ─── INFO CARD ────────────────────────────────────────────────────────────────
  Widget _buildInfoCard() {
    final locationName = _user['locationName'] ?? 'Non renseignée';
    final status = _user['status'] ?? 'valide';

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: _purple.withOpacity(0.08),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: _pink.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.info_outline, color: _pink, size: 20),
              ),
              const SizedBox(width: 10),
              Text(
                'Informations du compte',
                style: GoogleFonts.playfairDisplay(
                  fontSize: 17,
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFF1A1A2E),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          _infoRow(Icons.email_outlined, 'Email', _user['email'] ?? '-'),
          _divider(),
          // ✅ numTel affiché correctement
          _infoRow(
            Icons.phone_outlined,
            'Téléphone',
            (_user['numTel'] != null && _user['numTel'].toString().isNotEmpty)
                ? _user['numTel'].toString()
                : 'Non renseigné',
          ),
          _divider(),
          _infoRow(
            Icons.location_on_outlined,
            'Localisation',
            locationName,
            maxLines: 2,
          ),
          _divider(),
          Row(
            children: [
              const Icon(Icons.verified_outlined, color: _purple, size: 18),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Statut',
                    style: TextStyle(fontSize: 11, color: Colors.grey.shade400),
                  ),
                  const SizedBox(height: 2),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 3,
                    ),
                    decoration: BoxDecoration(
                      color: status == 'valide'
                          ? Colors.green.shade50
                          : Colors.orange.shade50,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      status == 'valide' ? '✅ Validé' : '⏳ En attente',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: status == 'valide'
                            ? Colors.green.shade700
                            : Colors.orange.shade700,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _infoRow(
    IconData icon,
    String label,
    String value, {
    int maxLines = 1,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: _purple, size: 18),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(fontSize: 11, color: Colors.grey.shade400),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: GoogleFonts.nunito(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: const Color(0xFF1A1A2E),
                  ),
                  maxLines: maxLines,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _divider() =>
      Divider(color: Colors.grey.shade100, height: 1, thickness: 1);

  // ─── MENU CARD ────────────────────────────────────────────────────────────────
  Widget _buildMenuCard() {
    final items = [
      {
        'icon': Icons.notifications_outlined,
        'label': 'Notifications',
        'color': const Color(0xFF3B82F6),
      },
      {
        'icon': Icons.payment_outlined,
        'label': 'Méthodes de paiement',
        'color': const Color(0xFF10B981),
      },
      {
        'icon': Icons.shield_outlined,
        'label': 'Confidentialité',
        'color': const Color(0xFFF59E0B),
      },
      {
        'icon': Icons.help_outline,
        'label': 'Aide & Support',
        'color': const Color(0xFF8B5CF6),
      },
    ];

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: _purple.withOpacity(0.08),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.blue.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(
                  Icons.settings_outlined,
                  color: Colors.blue,
                  size: 20,
                ),
              ),
              const SizedBox(width: 10),
              Text(
                'Paramètres',
                style: GoogleFonts.playfairDisplay(
                  fontSize: 17,
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFF1A1A2E),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ...items.asMap().entries.map((e) {
            final item = e.value;
            final isLast = e.key == items.length - 1;
            return Column(
              children: [
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: (item['color'] as Color).withOpacity(0.1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(
                      item['icon'] as IconData,
                      color: item['color'] as Color,
                      size: 18,
                    ),
                  ),
                  title: Text(
                    item['label'] as String,
                    style: GoogleFonts.nunito(
                      fontWeight: FontWeight.w600,
                      fontSize: 14,
                    ),
                  ),
                  trailing: Icon(
                    Icons.arrow_forward_ios,
                    size: 14,
                    color: Colors.grey.shade400,
                  ),
                  onTap: () {},
                ),
                if (!isLast) Divider(color: Colors.grey.shade100, height: 1),
              ],
            );
          }),
        ],
      ),
    );
  }

  // ─── LOGOUT ──────────────────────────────────────────────────────────────────
  Widget _buildLogoutBtn() {
    return SizedBox(
      width: double.infinity,
      height: 52,
      child: OutlinedButton.icon(
        onPressed: _logout,
        style: OutlinedButton.styleFrom(
          side: BorderSide(color: Colors.red.shade300, width: 1.5),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
        ),
        icon: Icon(Icons.logout, color: Colors.red.shade400, size: 18),
        label: Text(
          'Se déconnecter',
          style: GoogleFonts.nunito(
            color: Colors.red.shade400,
            fontWeight: FontWeight.w700,
            fontSize: 14,
          ),
        ),
      ),
    );
  }
}
