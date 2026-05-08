import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:intl/intl.dart';
import 'package:shared_preferences/shared_preferences.dart';

// ════════════════════════════════════════════════
// MODÈLE
// ════════════════════════════════════════════════

class Evenement {
  final String id;
  final String titre;
  final String description;
  final String categorie;
  final String lieu;
  final String type;
  final DateTime dateDebut;
  final DateTime dateFin;
  final int nombreParticipants;
  final String statut;

  Evenement({
    required this.id,
    required this.titre,
    required this.description,
    required this.categorie,
    required this.lieu,
    required this.type,
    required this.dateDebut,
    required this.dateFin,
    required this.nombreParticipants,
    required this.statut,
  });

  factory Evenement.fromJson(Map<String, dynamic> json) {
    return Evenement(
      id: json['_id'] ?? '',
      titre: json['title'] ?? '',
      description: json['description'] ?? '',
      categorie: json['category'] ?? '',
      lieu: json['lieu'] ?? '',
      type: json['type'] ?? 'public',
      dateDebut: DateTime.tryParse(json['dateDebut'] ?? '') ?? DateTime.now(),
      dateFin: DateTime.tryParse(json['dateFin'] ?? '') ?? DateTime.now(),
      nombreParticipants: json['nombreParticipants'] ?? 0,
      statut: json['status'] ?? 'en_attente',
    );
  }
}

// ════════════════════════════════════════════════
// SERVICE API - CORRIGÉ
// ════════════════════════════════════════════════

class EvenementService {
  static const String baseUrl = 'http://192.168.100.25:5000/api/event';

  static Future<Map<String, dynamic>?> _getUserData() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token');
    final userString = prefs.getString('user');
    
    print('🔍 Vérification SharedPreferences:');
    print('   - token: ${token != null ? "PRÉSENT" : "ABSENT"}');
    print('   - userString: ${userString != null ? "PRÉSENT" : "ABSENT"}');
    
    if (token == null || userString == null) {
      print('❌ Token ou user manquant');
      return null;
    }
    
    try {
      final user = jsonDecode(userString);
      return {
        'token': token,
        'userId': user['_id'] ?? user['id'],
      };
    } catch (e) {
      print('❌ Erreur décodage user: $e');
      return null;
    }
  }

  static Future<List<Evenement>> obtenirEvenementsUtilisateur(String userId) async {
    final userData = await _getUserData();
    
    if (userData == null) {
      throw Exception('Veuillez vous reconnecter');
    }
    
    final token = userData['token'];
    final url = '$baseUrl/user_event/$userId';
    
    print('🌐 Appel API: $url');
    print('🔑 Token envoyé: ${token.substring(0, token.length > 20 ? 20 : token.length)}...');
    
    final response = await http.get(
      Uri.parse(url),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
    );
    
    print('📡 Statut: ${response.statusCode}');
    
    if (response.statusCode == 200) {
      final List data = jsonDecode(response.body);
      print('✅ ${data.length} événements chargés');
      return data.map((e) => Evenement.fromJson(e)).toList();
    } else if (response.statusCode == 401) {
      throw Exception('Session expirée. Veuillez vous reconnecter.');
    } else {
      throw Exception('Erreur ${response.statusCode}: ${response.body}');
    }
  }

  static Future<Evenement> creerEvenement({
    required String titre,
    required String description,
    required String categorie,
    required String lieu,
    required String type,
    required DateTime dateDebut,
    required DateTime dateFin,
    required int nombreParticipants,
  }) async {
    final userData = await _getUserData();
    
    if (userData == null) {
      throw Exception('Veuillez vous reconnecter');
    }
    
    final token = userData['token'];
    
    print('🌐 Création événement: $baseUrl/addEvent');
    
    final response = await http.post(
      Uri.parse('$baseUrl/addEvent'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'title': titre,
        'description': description,
        'category': categorie,
        'lieu': lieu,
        'type': type,
        'dateDebut': dateDebut.toIso8601String(),
        'dateFin': dateFin.toIso8601String(),
        'nombreParticipants': nombreParticipants,
      }),
    );
    
    print('📡 Statut création: ${response.statusCode}');
    
    if (response.statusCode == 201) {
      return Evenement.fromJson(jsonDecode(response.body));
    } else if (response.statusCode == 401) {
      throw Exception('Session expirée. Veuillez vous reconnecter.');
    }
    throw Exception('Erreur lors de la création : ${response.body}');
  }

  static Future<void> supprimerEvenement(String id) async {
    final userData = await _getUserData();
    
    if (userData == null) {
      throw Exception('Veuillez vous reconnecter');
    }
    
    final token = userData['token'];
    
    final response = await http.delete(
      Uri.parse('$baseUrl/dell_event/$id'),
      headers: {'Authorization': 'Bearer $token'},
    );
    
    if (response.statusCode == 401) {
      throw Exception('Session expirée. Veuillez vous reconnecter.');
    }
  }
}

// ════════════════════════════════════════════════
// PAGE PRINCIPALE — MesEvenementsPage
// ════════════════════════════════════════════════

class MesEvenementsPage extends StatefulWidget {
  final String userId;
  const MesEvenementsPage({super.key, required this.userId});

  @override
  State<MesEvenementsPage> createState() => _MesEvenementsPageState();
}

class _MesEvenementsPageState extends State<MesEvenementsPage> {
  static const Color _violet = Color(0xFF7C3AED);
  static const Color _violetClair = Color(0xFFEDE9FE);
  static const Color _fondPage = Color(0xFFF8F7FF);

  DateTime _moisCourant = DateTime.now();
  DateTime _jourSelectionne = DateTime.now();
  List<Evenement> _evenements = [];
  bool _chargement = true;
  String? _erreur;

  @override
  void initState() {
    super.initState();
    _chargerEvenements();
  }

  Future<void> _chargerEvenements() async {
    setState(() {
      _chargement = true;
      _erreur = null;
    });
    try {
      final evs = await EvenementService.obtenirEvenementsUtilisateur(widget.userId);
      setState(() {
        _evenements = evs;
        _chargement = false;
      });
    } catch (e) {
      setState(() {
        _erreur = e.toString();
        _chargement = false;
      });
    }
  }

  bool _memeJour(DateTime a, DateTime b) =>
      a.year == b.year && a.month == b.month && a.day == b.day;

  List<Evenement> get _evenementsAVenir {
    final now = DateTime.now();
    return _evenements
        .where((e) => e.dateDebut.isAfter(now) || _memeJour(e.dateDebut, now))
        .toList()
      ..sort((a, b) => a.dateDebut.compareTo(b.dateDebut));
  }

  bool _aDesEvenements(DateTime jour) =>
      _evenements.any((e) => _memeJour(e.dateDebut, jour));

  void _moisPrecedent() => setState(
      () => _moisCourant = DateTime(_moisCourant.year, _moisCourant.month - 1));

  void _moisSuivant() => setState(
      () => _moisCourant = DateTime(_moisCourant.year, _moisCourant.month + 1));

  void _ouvrirFormulaireCreation() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => FormulaireEvenement(
        onCreer: (nouvelEvenement) {
          setState(() => _evenements.add(nouvelEvenement));
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _fondPage,
      body: SafeArea(
        child: Column(
          children: [
            _buildEntete(),
            Expanded(
              child: RefreshIndicator(
                color: _violet,
                onRefresh: _chargerEvenements,
                child: SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.only(bottom: 100),
                  child: Column(
                    children: [
                      const SizedBox(height: 20),
                      _buildCalendrier(),
                      const SizedBox(height: 24),
                      _buildSectionEvenements(),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _ouvrirFormulaireCreation,
        backgroundColor: _violet,
        foregroundColor: Colors.white,
        elevation: 4,
        icon: const Icon(Icons.add_rounded),
        label: const Text(
          'Nouvel événement',
          style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
        ),
      ),
    );
  }

  Widget _buildEntete() {
    return Container(
      width: double.infinity,
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFF6D28D9), Color(0xFF9C27B0)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.only(
          bottomLeft: Radius.circular(28),
          bottomRight: Radius.circular(28),
        ),
      ),
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 28),
      child: const Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Mes Événements',
            style: TextStyle(
              color: Colors.white,
              fontSize: 26,
              fontWeight: FontWeight.bold,
            ),
          ),
          SizedBox(height: 4),
          Text(
            'Gérez vos événements à venir',
            style: TextStyle(color: Colors.white70, fontSize: 14),
          ),
        ],
      ),
    );
  }

  Widget _buildCalendrier() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 20,
            offset: const Offset(0, 4),
          )
        ],
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          _buildNavigationMois(),
          const SizedBox(height: 14),
          _buildEnteteSemaine(),
          const SizedBox(height: 8),
          _buildGrilleDays(),
        ],
      ),
    );
  }

  Widget _buildNavigationMois() {
    String nomMois;
    try {
      nomMois = DateFormat('MMMM yyyy', 'fr_FR').format(_moisCourant);
    } catch (_) {
      nomMois = DateFormat('MMMM yyyy').format(_moisCourant);
    }
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        GestureDetector(
          onTap: _moisPrecedent,
          child: const Padding(
            padding: EdgeInsets.all(8),
            child: Icon(Icons.chevron_left, color: _violet, size: 26),
          ),
        ),
        Text(
          _capitaliser(nomMois),
          style: const TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.bold,
            color: Color(0xFF1F1F2E),
          ),
        ),
        GestureDetector(
          onTap: _moisSuivant,
          child: const Padding(
            padding: EdgeInsets.all(8),
            child: Icon(Icons.chevron_right, color: _violet, size: 26),
          ),
        ),
      ],
    );
  }

  Widget _buildEnteteSemaine() {
    const jours = ['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa'];
    return Row(
      children: jours
          .map((j) => Expanded(
                child: Center(
                  child: Text(j,
                      style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF9CA3AF))),
                ),
              ))
          .toList(),
    );
  }

  Widget _buildGrilleDays() {
    final premierJour = DateTime(_moisCourant.year, _moisCourant.month, 1);
    final dernierJour = DateTime(_moisCourant.year, _moisCourant.month + 1, 0);
    final decalage = premierJour.weekday % 7;
    final nbLignes = ((decalage + dernierJour.day) / 7).ceil();

    return Column(
      children: List.generate(nbLignes, (semaine) {
        return Row(
          children: List.generate(7, (col) {
            final index = semaine * 7 + col;
            final jour = index - decalage + 1;
            if (jour < 1 || jour > dernierJour.day) {
              return const Expanded(child: SizedBox(height: 44));
            }
            final date = DateTime(_moisCourant.year, _moisCourant.month, jour);
            return Expanded(child: _buildCaseJour(date));
          }),
        );
      }),
    );
  }

  Widget _buildCaseJour(DateTime date) {
    final estAujourdhui = _memeJour(date, DateTime.now());
    final estSelectionne = _memeJour(date, _jourSelectionne);
    final aEvenements = _aDesEvenements(date);

    return GestureDetector(
      onTap: () => setState(() => _jourSelectionne = date),
      child: Container(
        height: 44,
        margin: const EdgeInsets.all(2),
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: estSelectionne
              ? _violet
              : estAujourdhui
                  ? _violetClair
                  : Colors.transparent,
        ),
        child: Stack(
          alignment: Alignment.center,
          children: [
            Text(
              '${date.day}',
              style: TextStyle(
                fontSize: 14,
                fontWeight: (estAujourdhui || estSelectionne)
                    ? FontWeight.bold
                    : FontWeight.normal,
                color: estSelectionne
                    ? Colors.white
                    : estAujourdhui
                        ? _violet
                        : const Color(0xFF374151),
              ),
            ),
            if (aEvenements && !estSelectionne)
              Positioned(
                bottom: 6,
                child: Container(
                  width: 5,
                  height: 5,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: _violet.withOpacity(0.7),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionEvenements() {
    if (_chargement) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(40),
          child: CircularProgressIndicator(color: _violet),
        ),
      );
    }
    if (_erreur != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              const Icon(Icons.error_outline, color: Colors.redAccent, size: 40),
              const SizedBox(height: 8),
              Text(_erreur!, textAlign: TextAlign.center, style: const TextStyle(color: Colors.redAccent)),
              const SizedBox(height: 8),
              TextButton(
                onPressed: _chargerEvenements,
                child: const Text('Réessayer', style: TextStyle(color: _violet)),
              ),
            ],
          ),
        ),
      );
    }

    final liste = _evenementsAVenir;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Événements à venir',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF1F1F2E)),
              ),
              Text(
                '${liste.length} Événement${liste.length > 1 ? 's' : ''}',
                style: const TextStyle(color: _violet, fontWeight: FontWeight.w600, fontSize: 14),
              ),
            ],
          ),
          const SizedBox(height: 16),
          if (liste.isEmpty)
            _buildAucunEvenement()
          else
            ...liste.map((e) => _buildCarteEvenement(e)),
        ],
      ),
    );
  }

  Widget _buildAucunEvenement() {
    return Container(
      padding: const EdgeInsets.all(32),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 12)],
      ),
      child: const Column(
        children: [
          Icon(Icons.event_available_outlined, size: 52, color: Color(0xFFD1D5DB)),
          SizedBox(height: 12),
          Text('Aucun événement à venir', style: TextStyle(color: Color(0xFF9CA3AF), fontSize: 15)),
          SizedBox(height: 4),
          Text('Créez votre premier événement !', style: TextStyle(color: Color(0xFFD1D5DB), fontSize: 13)),
        ],
      ),
    );
  }

  Widget _buildCarteEvenement(Evenement ev) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 16, offset: const Offset(0, 2))],
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(ev.titre,
                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF1F1F2E))),
              ),
              const SizedBox(width: 8),
              _buildBadgeStatut(ev.statut),
            ],
          ),
          const SizedBox(height: 10),
          _buildInfoLigne(Icons.access_time_outlined, _fmtDate(ev.dateDebut)),
          const SizedBox(height: 5),
          _buildInfoLigne(Icons.location_on_outlined, ev.lieu),
          const SizedBox(height: 5),
          _buildInfoLigne(Icons.people_outline, '${ev.nombreParticipants} participants'),
          if (ev.type == 'prive') ...[
            const SizedBox(height: 5),
            _buildInfoLigne(Icons.lock_outline, 'Événement privé'),
          ],
        ],
      ),
    );
  }

  Widget _buildInfoLigne(IconData icone, String texte) {
    return Row(
      children: [
        Icon(icone, size: 14, color: const Color(0xFF9CA3AF)),
        const SizedBox(width: 6),
        Expanded(
          child: Text(texte, style: const TextStyle(fontSize: 13, color: Color(0xFF6B7280)), overflow: TextOverflow.ellipsis),
        ),
      ],
    );
  }

  Widget _buildBadgeStatut(String statut) {
    final cfg = _configStatut(statut);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: cfg['fond'] as Color, borderRadius: BorderRadius.circular(20)),
      child: Text(
        cfg['label'] as String,
        style: TextStyle(color: cfg['texte'] as Color, fontSize: 11, fontWeight: FontWeight.w600),
      ),
    );
  }

  Map<String, dynamic> _configStatut(String s) {
    switch (s) {
      case 'confirme':
        return {'fond': const Color(0xFFD1FAE5), 'texte': const Color(0xFF065F46), 'label': 'Confirmé'};
      case 'planification':
        return {'fond': const Color(0xFFDBEAFE), 'texte': const Color(0xFF1E40AF), 'label': 'Planification'};
      case 'annule':
        return {'fond': const Color(0xFFFEE2E2), 'texte': const Color(0xFF991B1B), 'label': 'Annulé'};
      default:
        return {'fond': const Color(0xFFFEF3C7), 'texte': const Color(0xFF92400E), 'label': 'En attente'};
    }
  }

  String _fmtDate(DateTime d) {
    try {
      return DateFormat("d MMM 'à' HH:mm", 'fr_FR').format(d);
    } catch (_) {
      return DateFormat("d MMM 'à' HH:mm").format(d);
    }
  }

  String _capitaliser(String s) => s.isEmpty ? s : s[0].toUpperCase() + s.substring(1);
}

// ════════════════════════════════════════════════
// FORMULAIRE DE CRÉATION
// ════════════════════════════════════════════════

class FormulaireEvenement extends StatefulWidget {
  final Function(Evenement) onCreer;
  const FormulaireEvenement({super.key, required this.onCreer});

  @override
  State<FormulaireEvenement> createState() => _FormulaireEvenementState();
}

class _FormulaireEvenementState extends State<FormulaireEvenement> {
  static const Color _violet = Color(0xFF7C3AED);

  final _formKey = GlobalKey<FormState>();
  final _titreCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _lieuCtrl = TextEditingController();
  final _nbPartCtrl = TextEditingController();

  String _typeEvenement = 'public';
  String _categorie = 'mariage';
  DateTime _dateDebut = DateTime.now().add(const Duration(days: 1));
  DateTime _dateFin = DateTime.now().add(const Duration(days: 1, hours: 3));
  bool _enChargement = false;

  final List<Map<String, dynamic>> _categories = [
    {'valeur': 'mariage', 'label': 'Mariage', 'icone': Icons.favorite_outline},
    {'valeur': 'entreprise', 'label': 'Entreprise', 'icone': Icons.business_outlined},
    {'valeur': 'anniversaire', 'label': 'Anniversaire', 'icone': Icons.cake_outlined},
    {'valeur': 'conference', 'label': 'Conférence', 'icone': Icons.mic_outlined},
    {'valeur': 'soiree', 'label': 'Soirée', 'icone': Icons.nightlife_outlined},
    {'valeur': 'autre', 'label': 'Autre', 'icone': Icons.event_outlined},
  ];

  @override
  void dispose() {
    _titreCtrl.dispose();
    _descCtrl.dispose();
    _lieuCtrl.dispose();
    _nbPartCtrl.dispose();
    super.dispose();
  }

  Future<void> _choisirDate({required bool estDebut}) async {
    final initial = estDebut ? _dateDebut : _dateFin;
    final date = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 730)),
      builder: (ctx, child) => Theme(
        data: Theme.of(ctx).copyWith(colorScheme: const ColorScheme.light(primary: _violet)),
        child: child!,
      ),
    );
    if (date == null || !mounted) return;

    final heure = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(initial),
      builder: (ctx, child) => Theme(
        data: Theme.of(ctx).copyWith(colorScheme: const ColorScheme.light(primary: _violet)),
        child: child!,
      ),
    );
    if (heure == null || !mounted) return;

    final complet = DateTime(date.year, date.month, date.day, heure.hour, heure.minute);
    setState(() {
      if (estDebut) {
        _dateDebut = complet;
        if (_dateFin.isBefore(_dateDebut)) {
          _dateFin = _dateDebut.add(const Duration(hours: 2));
        }
      } else {
        _dateFin = complet;
      }
    });
  }

  Future<void> _soumettre() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _enChargement = true);
    try {
      final nouvelEvenement = await EvenementService.creerEvenement(
        titre: _titreCtrl.text.trim(),
        description: _descCtrl.text.trim(),
        categorie: _categorie,
        lieu: _lieuCtrl.text.trim(),
        type: _typeEvenement,
        dateDebut: _dateDebut,
        dateFin: _dateFin,
        nombreParticipants: int.tryParse(_nbPartCtrl.text) ?? 0,
      );
      widget.onCreer(nouvelEvenement);
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Row(children: [Icon(Icons.check_circle, color: Colors.white), SizedBox(width: 8), Text('Événement créé avec succès !')]),
            backgroundColor: Color(0xFF059669),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.all(Radius.circular(10))),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString()),
            backgroundColor: Colors.redAccent,
            behavior: SnackBarBehavior.floating,
            shape: const RoundedRectangleBorder(borderRadius: BorderRadius.all(Radius.circular(10))),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _enChargement = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.92,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
            child: Column(
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(color: const Color(0xFFE5E7EB), borderRadius: BorderRadius.circular(2)),
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Nouvel événement', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF1F1F2E))),
                    GestureDetector(
                      onTap: () => Navigator.pop(context),
                      child: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(color: const Color(0xFFF3F4F6), borderRadius: BorderRadius.circular(10)),
                        child: const Icon(Icons.close, size: 18, color: Color(0xFF6B7280)),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const Divider(height: 24),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _label('Titre de l\'événement *'),
                    _champ(
                      ctrl: _titreCtrl,
                      hint: 'Ex : Mariage Sarah & John',
                      icone: Icons.title,
                      validateur: (v) => (v == null || v.trim().isEmpty) ? 'Le titre est requis' : null,
                    ),
                    const SizedBox(height: 16),
                    _label('Description'),
                    _champ(ctrl: _descCtrl, hint: 'Décrivez votre événement…', icone: Icons.description_outlined, maxLignes: 3),
                    const SizedBox(height: 16),
                    _label('Catégorie'),
                    _buildChoixCategorie(),
                    const SizedBox(height: 16),
                    _label('Lieu *'),
                    _champ(
                      ctrl: _lieuCtrl,
                      hint: 'Ex : Grand Hôtel Ballroom',
                      icone: Icons.location_on_outlined,
                      validateur: (v) => (v == null || v.trim().isEmpty) ? 'Le lieu est requis' : null,
                    ),
                    const SizedBox(height: 16),
                    _label('Type d\'événement'),
                    _buildChoixType(),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _label('Date de début *'),
                              _buildBoutonDate(_dateDebut, () => _choisirDate(estDebut: true)),
                            ],
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _label('Date de fin *'),
                              _buildBoutonDate(_dateFin, () => _choisirDate(estDebut: false)),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    _label('Nombre de participants *'),
                    _champ(
                      ctrl: _nbPartCtrl,
                      hint: 'Ex : 150',
                      icone: Icons.people_outline,
                      typeClavier: TextInputType.number,
                      validateur: (v) {
                        if (v == null || v.trim().isEmpty) return 'Champ requis';
                        if (int.tryParse(v) == null) return 'Nombre invalide';
                        return null;
                      },
                    ),
                    const SizedBox(height: 32),
                    SizedBox(
                      width: double.infinity,
                      height: 54,
                      child: ElevatedButton(
                        onPressed: _enChargement ? null : _soumettre,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: _violet,
                          foregroundColor: Colors.white,
                          disabledBackgroundColor: const Color(0xFFDDD6FE),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          elevation: 0,
                        ),
                        child: _enChargement
                            ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
                            : const Text('Créer l\'événement', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _label(String texte) => Padding(
        padding: const EdgeInsets.only(bottom: 6),
        child: Text(texte, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF374151))),
      );

  Widget _champ({
    required TextEditingController ctrl,
    required String hint,
    required IconData icone,
    int maxLignes = 1,
    TextInputType typeClavier = TextInputType.text,
    String? Function(String?)? validateur,
  }) {
    return TextFormField(
      controller: ctrl,
      maxLines: maxLignes,
      keyboardType: typeClavier,
      validator: validateur,
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(color: Color(0xFFD1D5DB), fontSize: 14),
        prefixIcon: Icon(icone, color: const Color(0xFF9CA3AF), size: 20),
        filled: true,
        fillColor: const Color(0xFFF9FAFB),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: _violet, width: 1.5)),
        errorBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Colors.redAccent)),
        focusedErrorBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Colors.redAccent)),
        contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: maxLignes > 1 ? 14 : 0),
      ),
    );
  }

  Widget _buildChoixCategorie() {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: _categories.map((cat) {
        final actif = _categorie == cat['valeur'];
        return GestureDetector(
          onTap: () => setState(() => _categorie = cat['valeur'] as String),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: actif ? _violet : const Color(0xFFF3F4F6),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: actif ? _violet : Colors.transparent),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(cat['icone'] as IconData, size: 14, color: actif ? Colors.white : const Color(0xFF6B7280)),
                const SizedBox(width: 6),
                Text(cat['label'] as String, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: actif ? Colors.white : const Color(0xFF6B7280))),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildChoixType() {
    return Row(
      children: [
        Expanded(child: _carteType('public', 'Public', Icons.public_outlined)),
        const SizedBox(width: 12),
        Expanded(child: _carteType('prive', 'Privé', Icons.lock_outline)),
      ],
    );
  }

  Widget _carteType(String valeur, String label, IconData icone) {
    final actif = _typeEvenement == valeur;
    return GestureDetector(
      onTap: () => setState(() => _typeEvenement = valeur),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: actif ? const Color(0xFFEDE9FE) : const Color(0xFFF9FAFB),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: actif ? _violet : const Color(0xFFE5E7EB), width: actif ? 1.5 : 1),
        ),
        child: Column(
          children: [
            Icon(icone, color: actif ? _violet : const Color(0xFF9CA3AF), size: 22),
            const SizedBox(height: 4),
            Text(label, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: actif ? _violet : const Color(0xFF6B7280))),
          ],
        ),
      ),
    );
  }

  Widget _buildBoutonDate(DateTime date, VoidCallback onTap) {
    String label;
    try {
      label = DateFormat("d MMM HH:mm", 'fr_FR').format(date);
    } catch (_) {
      label = DateFormat("d MMM HH:mm").format(date);
    }
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        decoration: BoxDecoration(
          color: const Color(0xFFF9FAFB),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFE5E7EB)),
        ),
        child: Row(
          children: [
            const Icon(Icons.calendar_today_outlined, size: 15, color: Color(0xFF9CA3AF)),
            const SizedBox(width: 8),
            Expanded(
              child: Text(label, style: const TextStyle(fontSize: 13, color: Color(0xFF374151)), overflow: TextOverflow.ellipsis),
            ),
          ],
        ),
      ),
    );
  }
}