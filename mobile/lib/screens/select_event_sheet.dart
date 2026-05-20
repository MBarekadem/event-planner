import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http_parser/http_parser.dart';

// ─────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────
const String _kBaseUrl = 'http://localhost:5000/api';
const String _kN8nUrl = 'http://localhost:5678/webhook/transfer';

const Color _kBlue = Color(0xFF2563EB);
const Color _kBlueDark = Color(0xFF1D4ED8);
const Color _kBlueLight = Color(0xFFEFF6FF);
const Color _kGreen = Color(0xFF059669);
const Color _kGreenLight = Color(0xFFECFDF5);
const Color _kGreenBorder = Color(0xFF6EE7B7);
const Color _kRed = Color(0xFFDC2626);
const Color _kRedLight = Color(0xFFFEF2F2);
const Color _kRedBorder = Color(0xFFFCA5A5);
const Color _kAmber = Color(0xFFD97706);
const Color _kAmberLight = Color(0xFFFFFBEB);
const Color _kAmberBorder = Color(0xFFFDE68A);
const Color _kGray50 = Color(0xFFF9FAFB);
const Color _kGray100 = Color(0xFFF3F4F6);
const Color _kGray200 = Color(0xFFE5E7EB);
const Color _kGray400 = Color(0xFF9CA3AF);
const Color _kGray500 = Color(0xFF6B7280);
const Color _kGray700 = Color(0xFF374151);
const Color _kGray900 = Color(0xFF111827);

// ─────────────────────────────────────────
// MODELS
// ─────────────────────────────────────────
class SelectEventModel {
  final String id;
  final String title;
  final DateTime? dateDebut;
  final DateTime? dateFin;
  final String? category;

  const SelectEventModel({
    required this.id,
    required this.title,
    this.dateDebut,
    this.dateFin,
    this.category,
  });

  factory SelectEventModel.fromJson(Map<String, dynamic> j) => SelectEventModel(
    id: j['_id'] ?? '',
    title: j['title'] ?? 'Sans titre',
    dateDebut: j['dateDebut'] != null
        ? DateTime.tryParse(j['dateDebut'])
        : null,
    dateFin: j['dateFin'] != null ? DateTime.tryParse(j['dateFin']) : null,
    category: j['category'],
  );
}

class ResourceTerms {
  final String? file; // PDF path
  final String? text; // plain text

  const ResourceTerms({this.file, this.text});

  bool get hasPdf => file != null && file!.trim().isNotEmpty;
  bool get hasText => text != null && text!.trim().isNotEmpty;
  bool get hasAny => hasPdf || hasText;
}

// ─────────────────────────────────────────
// CIN STATUS
// ─────────────────────────────────────────
enum _CinStatus { idle, uploading, verifying, success, error }

// ─────────────────────────────────────────
// SELECT EVENT SHEET
// ─────────────────────────────────────────
class SelectEventSheet extends StatefulWidget {
  final List<SelectEventModel> events;
  final String resourceName;
  final DateTime? resourceDate;
  final ResourceTerms? terms;
  final void Function(String eventId, String cinNumber) onConfirm;
  final VoidCallback onCreateNew;

  const SelectEventSheet({
    super.key,
    required this.events,
    required this.resourceName,
    required this.onConfirm,
    required this.onCreateNew,
    this.resourceDate,
    this.terms,
  });

  @override
  State<SelectEventSheet> createState() => _SelectEventSheetState();
}

class _SelectEventSheetState extends State<SelectEventSheet>
    with TickerProviderStateMixin {
  // ── Event selection ──
  String? _selectedEventId;

  // ── Contract ──
  bool _contractAccepted = false;

  // ── CIN ──
  _CinStatus _cinStatus = _CinStatus.idle;
  File? _cinFile;
  final _cinNumberCtrl = TextEditingController();
  String _cinNumber = '';
  String? _cinError;
  String? _cinSuccessLabel;
  List<Map<String, String>> _mismatch = [];
  int _waitSeconds = 0;
  Timer? _timer;

  // ── User ──
  String _userFirstname = '';
  String _userLastname = '';
  String _userId = '';
  String _token = '';

  // ── Animation ──
  late AnimationController _fadeCtrl;
  late Animation<double> _fadeAnim;
  final _picker = ImagePicker();

  // ── Lifecycle ──
  @override
  void initState() {
    super.initState();
    _fadeCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 320),
    );
    _fadeAnim = CurvedAnimation(parent: _fadeCtrl, curve: Curves.easeOut);
    _fadeCtrl.forward();
    _loadUser();
  }

  @override
  void dispose() {
    _timer?.cancel();
    _cinNumberCtrl.dispose();
    _fadeCtrl.dispose();
    super.dispose();
  }

  // ── Load user ──
  Future<void> _loadUser() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString('token') ?? '';
    final raw = prefs.getString('user');
    if (raw != null) {
      final u = jsonDecode(raw) as Map<String, dynamic>;
      if (mounted) {
        setState(() {
          _userFirstname = u['firstname'] ?? '';
          _userLastname = u['lastname'] ?? '';
          _userId = u['_id'] ?? u['id'] ?? '';
        });
      }
    }
  }
  // ── Helpers ──
  List<SelectEventModel> get _filteredEvents {
  return widget.events.where((ev) {

    // ignorer les événements sans dates
    if (ev.dateDebut == null || ev.dateFin == null) {
      return false;
    }

    // si aucune date ressource → afficher tous
    if (widget.resourceDate == null) {
      return true;
    }

    final resDay = _dateOnly(widget.resourceDate!);
    final start = _dateOnly(ev.dateDebut!);
    final end = _dateOnly(ev.dateFin!);

    // dateDebut < resourceDate < dateFin
    return resDay.isAfter(start) && resDay.isBefore(end);

  }).toList();
}

  DateTime _dateOnly(DateTime d) => DateTime(d.year, d.month, d.day);

  static const _frMonths = [
    '',
    'janvier',
    'février',
    'mars',
    'avril',
    'mai',
    'juin',
    'juillet',
    'août',
    'septembre',
    'octobre',
    'novembre',
    'décembre',
  ];

  String _fmtDate(DateTime d) =>
      '${d.day.toString().padLeft(2, '0')} ${_frMonths[d.month]} ${d.year}';

  String _stripEq(dynamic val) {
    if (val == null) return '';
    final s = val.toString();
    return s.startsWith('=') ? s.substring(1).trim() : s.trim();
  }

  bool _parseBool(dynamic val) {
    if (val is bool) return val;
    return _stripEq(val) == 'true';
  }

  String _normalize(String s) =>
      s.toLowerCase().trim().replaceAll(RegExp(r'\s+'), '');

  bool get _canConfirm =>
      (_filteredEvents.isEmpty || _selectedEventId != null) &&
      _contractAccepted &&
      _cinStatus == _CinStatus.success;

  String get _confirmLabel {
    if (_filteredEvents.isNotEmpty && _selectedEventId == null)
      return 'Sélectionnez un événement';
    if (_cinStatus != _CinStatus.success) return 'Vérifiez votre CIN d\'abord';
    if (!_contractAccepted) return 'Acceptez les conditions du contrat';
    return 'Confirmer la réservation';
  }

  // ── CIN pick ──
  void _showPickerSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => _PickerSheet(
        onCamera: () {
          Navigator.pop(context);
          _pickCin(ImageSource.camera);
        },
        onGallery: () {
          Navigator.pop(context);
          _pickCin(ImageSource.gallery);
        },
      ),
    );
  }

  Future<void> _pickCin(ImageSource src) async {
    final picked = await _picker.pickImage(source: src, imageQuality: 85);
    if (picked == null) return;
    setState(() {
      _cinFile = File(picked.path);
      _cinStatus = _CinStatus.idle;
      _cinError = null;
      _mismatch = [];
      _cinSuccessLabel = null;
    });
  }

  void _removeCin() => setState(() {
    _cinFile = null;
    _cinStatus = _CinStatus.idle;
    _cinError = null;
    _mismatch = [];
    _cinSuccessLabel = null;
  });

  // ── CIN verify — polling toutes les 3s, max 60s, CIN uniquement ──
  static const int _kPollIntervalSec = 3;
  static const int _kMaxWaitSec = 60;

  Future<void> _verifyCin() async {
    if (_cinFile == null) return;

    final entered = _normalize(_cinNumber);
    if (entered.isEmpty) {
      setState(() {
        _cinStatus = _CinStatus.error;
        _cinError = 'Veuillez entrer votre numéro de CIN.';
      });
      return;
    }

    setState(() {
      _cinStatus = _CinStatus.uploading;
      _cinError = null;
      _mismatch = [];
      _cinSuccessLabel = null;
    });

    try {
      // ── ÉTAPE 1 : upload vers webhook n8n ──
      final req = http.MultipartRequest('POST', Uri.parse(_kN8nUrl));
      if (_token.isNotEmpty) req.headers['Authorization'] = 'Bearer $_token';
      req.files.add(
        await http.MultipartFile.fromPath(
          'file',
          _cinFile!.path,
          filename: _cinFile!.path.split('/').last,
          contentType: MediaType('image', 'jpeg'),
        ),
      );
      req.fields['firstname'] = _userFirstname;
      req.fields['lastname'] = _userLastname;
      req.fields['userId'] = _userId;

      final streamed = await req.send();
      if (streamed.statusCode != 200 && streamed.statusCode != 201) {
        throw Exception('Erreur webhook: ${streamed.statusCode}');
      }

      // ── ÉTAPE 2 : polling toutes les 3s jusqu'à résultat ou 60s ──
      setState(() {
        _cinStatus = _CinStatus.verifying;
        _waitSeconds = 0;
      });
      _timer?.cancel();
      _timer = Timer.periodic(const Duration(seconds: 1), (t) {
        if (!mounted) {
          t.cancel();
          return;
        }
        setState(() => _waitSeconds++);
      });

      Map<String, dynamic>? cinInfo;
      int elapsed = 0;

      while (elapsed < _kMaxWaitSec) {
        await Future.delayed(const Duration(seconds: _kPollIntervalSec));
        elapsed += _kPollIntervalSec;

        try {
          final res = await http.get(
            Uri.parse('$_kBaseUrl/cin'),
            headers: {
              'Content-Type': 'application/json',
              if (_token.isNotEmpty) 'Authorization': 'Bearer $_token',
            },
          );
          if (res.statusCode != 200) continue;

          final decoded = jsonDecode(res.body);
          final candidate = decoded is List && decoded.isNotEmpty
              ? decoded[0] as Map<String, dynamic>
              : decoded is Map<String, dynamic>
              ? decoded
              : null;

          // Résultat valide = champ cin non vide
          final rawCin = _normalize(_stripEq(candidate?['cin']));
          if (candidate != null && rawCin.isNotEmpty) {
            cinInfo = candidate;
            break;
          }
        } catch (_) {
          // erreur réseau temporaire → on continue
        }
      }

      _timer?.cancel();

      // ── Timeout sans résultat ──
      if (cinInfo == null) {
        setState(() {
          _cinStatus = _CinStatus.error;
          _cinError = 'Délai dépassé (${_kMaxWaitSec}s). Réessayez.';
        });
        return;
      }

      // ── VÉRIFICATION : numéro CIN uniquement ──
      final extracted = _normalize(_stripEq(cinInfo['cin']));

      if (extracted.isEmpty) {
        setState(() {
          _cinStatus = _CinStatus.error;
          _cinError =
              'Document invalide ou illisible. Importez une CIN tunisienne valide.';
        });
        return;
      }

      if (entered != extracted) {
        setState(() {
          _cinStatus = _CinStatus.error;
          _mismatch = [
            {'field': 'Numéro CIN', 'cin': extracted, 'profil': entered},
          ];
        });
        return;
      }

      // ── TOUT OK ──
      setState(() {
        _cinStatus = _CinStatus.success;
        _cinSuccessLabel = 'CIN n° $extracted vérifiée';
      });

      // Mise à jour CIN profil (non bloquant)
      if (_token.isNotEmpty) {
        http
            .put(
              Uri.parse('$_kBaseUrl/users/update-cin'),
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer $_token',
              },
              body: jsonEncode({'cin': extracted}),
            )
            .catchError((_) {});
      }
    } catch (e) {
      _timer?.cancel();
      debugPrint('ERREUR VERIFY CIN: $e');
      setState(() {
        _cinStatus = _CinStatus.error;
        _cinError = 'Erreur lors de la vérification. Réessayez.';
      });
    }
  }

  // ── Show terms modal ──
  void _showTermsModal() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _TermsSheet(
        resourceName: widget.resourceName,
        terms: widget.terms,
        onAccept: () {
          setState(() => _contractAccepted = true);
          Navigator.pop(context);
        },
      ),
    );
  }

  // ── Confirm ──
  void _handleConfirm() {
    if (!_canConfirm) return;
    HapticFeedback.mediumImpact();
    widget.onConfirm(_selectedEventId ?? '', _cinNumber);
  }

  // ── BUILD ──
  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _fadeAnim,
      child: Container(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom + 24,
        ),
        constraints: BoxConstraints(
          maxHeight: MediaQuery.of(context).size.height * 0.93,
        ),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Drag handle
            const SizedBox(height: 12),
            Center(
              child: Container(
                width: 36,
                height: 4,
                decoration: BoxDecoration(
                  color: _kGray200,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 4),
            _buildHeader(),
            const Divider(height: 1, color: _kGray100),
            Flexible(
              child: SingleChildScrollView(
                physics: const BouncingScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(20, 18, 20, 0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (widget.resourceDate != null) ...[
                      _buildDateBanner(),
                      const SizedBox(height: 16),
                    ],
                    _buildEventSection(),
                    const SizedBox(height: 20),
                    _buildDividerLabel('Vérification d\'identité'),
                    const SizedBox(height: 14),
                    _buildCinSection(),
                    const SizedBox(height: 20),
                    _buildDividerLabel('Conditions du contrat'),
                    const SizedBox(height: 14),
                    _buildContractSection(),
                    const SizedBox(height: 24),
                    _buildConfirmButton(),
                    const SizedBox(height: 10),
                    _buildCreateNewButton(),
                    const SizedBox(height: 8),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── HEADER ──
  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
      child: Row(
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: _kBlueLight,
              borderRadius: BorderRadius.circular(11),
            ),
            child: const Icon(Icons.event_outlined, color: _kBlue, size: 18),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Associer à un événement',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: _kGray900,
                    letterSpacing: -0.3,
                  ),
                ),
                Text(
                  widget.resourceName,
                  style: const TextStyle(fontSize: 11, color: _kGray400),
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          GestureDetector(
            onTap: () => Navigator.pop(context),
            child: Container(
              width: 30,
              height: 30,
              decoration: BoxDecoration(
                color: _kGray100,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.close, size: 15, color: _kGray500),
            ),
          ),
        ],
      ),
    );
  }

  // ── DIVIDER LABEL ──
  Widget _buildDividerLabel(String label) {
    return Row(
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w700,
            color: _kGray700,
          ),
        ),
        const SizedBox(width: 10),
        Expanded(child: Container(height: 1, color: _kGray100)),
      ],
    );
  }

  // ── DATE BANNER ──
  Widget _buildDateBanner() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
      decoration: BoxDecoration(
        color: _kBlueLight,
        border: Border.all(color: const Color(0xFFBFDBFE)),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          const Icon(Icons.calendar_today_outlined, size: 13, color: _kBlue),
          const SizedBox(width: 8),
          Expanded(
            child: Text.rich(
              TextSpan(
                style: const TextStyle(fontSize: 11, color: _kBlueDark),
                children: [
                  const TextSpan(text: 'Seuls les événements du '),
                  TextSpan(
                    text: _fmtDate(widget.resourceDate!),
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                  const TextSpan(text: ' sont affichés.'),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ── EVENT SECTION ──
  Widget _buildEventSection() {
    final events = _filteredEvents;
    if (events.isEmpty) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: _kAmberLight,
          border: Border.all(color: _kAmberBorder),
          borderRadius: BorderRadius.circular(14),
        ),
        child: Column(
          children: [
            const Icon(Icons.event_busy_outlined, color: _kAmber, size: 30),
            const SizedBox(height: 8),
            Text(
              widget.resourceDate != null
                  ? 'Aucun événement à cette date.'
                  : 'Aucun événement disponible.',
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: Color(0xFF92400E),
              ),
            ),
            const SizedBox(height: 6),
            GestureDetector(
              onTap: widget.onCreateNew,
              child: const Text(
                '+ Créer un événement pour cette date',
                style: TextStyle(
                  fontSize: 12,
                  color: _kBlue,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Sélectionnez un événement existant :',
          style: const TextStyle(fontSize: 12, color: _kGray500),
        ),
        const SizedBox(height: 10),
        ...events.map(
          (e) => _EventTile(
            event: e,
            selected: _selectedEventId == e.id,
            onTap: () => setState(() => _selectedEventId = e.id),
            fmtDate: _fmtDate,
          ),
        ),
      ],
    );
  }

  // ── CIN SECTION ──
  Widget _buildCinSection() {
    final displayName = '$_userFirstname $_userLastname'.trim();
    final isLoading =
        _cinStatus == _CinStatus.uploading ||
        _cinStatus == _CinStatus.verifying;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Account badge
        if (displayName.isNotEmpty)
          Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: _kGray50,
              border: Border.all(color: _kGray100),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              children: [
                const Icon(Icons.person_outline, size: 13, color: _kGray400),
                const SizedBox(width: 8),
                Text(
                  'Vérification pour le compte : ',
                  style: const TextStyle(fontSize: 11, color: _kGray400),
                ),
                Flexible(
                  child: Text(
                    displayName,
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: _kGray700,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),

        // CIN number input
        _CinTextField(
          controller: _cinNumberCtrl,
          onChanged: (v) {
            _cinNumber = v;
            if (_cinStatus == _CinStatus.error ||
                _cinStatus == _CinStatus.success) {
              setState(() {
                _cinStatus = _CinStatus.idle;
                _cinError = null;
                _mismatch = [];
                _cinSuccessLabel = null;
              });
            }
          },
        ),
        const SizedBox(height: 10),

        // Upload area
        _buildCinUpload(),

        // Progress bar
        if (_cinStatus == _CinStatus.verifying) ...[
          const SizedBox(height: 12),
          _ProgressBar(
            seconds: _waitSeconds,
            total: _SelectEventSheetState._kMaxWaitSec,
          ),
        ],

        // General error
        if (_cinError != null) ...[
          const SizedBox(height: 10),
          _ErrorBanner(message: _cinError!),
        ],

        // Mismatch card
        if (_mismatch.isNotEmpty) ...[
          const SizedBox(height: 10),
          _MismatchCard(mismatch: _mismatch),
        ],

        // Success
        if (_cinStatus == _CinStatus.success) ...[
          const SizedBox(height: 10),
          _SuccessBanner(label: _cinSuccessLabel),
        ],

        // Verify button
        if (_cinFile != null && _cinStatus != _CinStatus.success) ...[
          const SizedBox(height: 12),
          _VerifyButton(
            isLoading: isLoading,
            isError: _cinStatus == _CinStatus.error,
            status: _cinStatus,
            waitSeconds: _waitSeconds,
            onTap: isLoading ? null : _verifyCin,
          ),
        ],
      ],
    );
  }

  Widget _buildCinUpload() {
    if (_cinFile == null) {
      return GestureDetector(
        onTap: _showPickerSheet,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          width: double.infinity,
          padding: const EdgeInsets.symmetric(vertical: 22),
          decoration: BoxDecoration(
            color: _kGray50,
            border: Border.all(color: _kGray200, style: BorderStyle.solid),
            borderRadius: BorderRadius.circular(14),
          ),
          child: Column(
            children: [
              Icon(
                Icons.upload_outlined,
                size: 28,
                color: Colors.grey.shade300,
              ),
              const SizedBox(height: 6),
              Text(
                'Cliquez pour importer votre CIN',
                style: TextStyle(fontSize: 12, color: Colors.grey.shade400),
              ),
              const SizedBox(height: 2),
              Text(
                'JPG · PNG · max 5 Mo',
                style: TextStyle(fontSize: 10, color: Colors.grey.shade300),
              ),
            ],
          ),
        ),
      );
    }

    Color borderColor = _kGray200;
    Color bgColor = _kGray50;
    Color iconColor = _kGray400;
    IconData iconData = Icons.image_outlined;

    if (_cinStatus == _CinStatus.success) {
      borderColor = _kGreenBorder;
      bgColor = _kGreenLight;
      iconColor = _kGreen;
      iconData = Icons.check_circle_outline;
    } else if (_cinStatus == _CinStatus.error) {
      borderColor = _kRedBorder;
      bgColor = _kRedLight;
      iconColor = _kRed;
      iconData = Icons.error_outline;
    }

    final isLoading =
        _cinStatus == _CinStatus.uploading ||
        _cinStatus == _CinStatus.verifying;

    return AnimatedContainer(
      duration: const Duration(milliseconds: 250),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: bgColor,
        border: Border.all(color: borderColor),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Icon(iconData, size: 16, color: iconColor),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              _cinFile!.path.split('/').last,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: _cinStatus == _CinStatus.success
                    ? const Color(0xFF065F46)
                    : _cinStatus == _CinStatus.error
                    ? const Color(0xFF991B1B)
                    : _kGray700,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
          if (!isLoading)
            GestureDetector(
              onTap: _removeCin,
              child: const Icon(Icons.close, size: 16, color: _kGray400),
            ),
        ],
      ),
    );
  }

  // ── CONTRACT SECTION ──
  Widget _buildContractSection() {
    return GestureDetector(
      onTap: _showTermsModal,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 250),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: _contractAccepted ? _kGreenLight : _kAmberLight,
          border: Border.all(
            color: _contractAccepted ? _kGreenBorder : _kAmberBorder,
          ),
          borderRadius: BorderRadius.circular(14),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  Icons.description_outlined,
                  size: 15,
                  color: _contractAccepted ? _kGreen : _kAmber,
                ),
                const SizedBox(width: 8),
                Text(
                  'Conditions du contrat',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: _contractAccepted
                        ? const Color(0xFF065F46)
                        : const Color(0xFF92400E),
                  ),
                ),
                if (_cinStatus == _CinStatus.success) ...[
                  const Spacer(),
                  _SmallBadge(
                    label: '✓ Identité vérifiée',
                    bg: const Color(0xFFD1FAE5),
                    fg: const Color(0xFF065F46),
                  ),
                ],
              ],
            ),
            const SizedBox(height: 10),

            // Terms indicator
            if (widget.terms?.hasPdf == true)
              Row(
                children: [
                  Icon(
                    Icons.picture_as_pdf_outlined,
                    size: 12,
                    color: _kGray400,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    'Contrat PDF disponible',
                    style: TextStyle(fontSize: 11, color: _kGray400),
                  ),
                ],
              )
            else if (widget.terms?.hasText == true)
              Row(
                children: [
                  Icon(Icons.article_outlined, size: 12, color: _kGray400),
                  const SizedBox(width: 4),
                  Text(
                    'Conditions textuelles disponibles',
                    style: TextStyle(fontSize: 11, color: _kGray400),
                  ),
                ],
              )
            else
              Text(
                'Appuyez pour consulter les conditions générales de location/réservation.',
                style: TextStyle(fontSize: 11, color: _kGray400, height: 1.5),
              ),

            const SizedBox(height: 12),

            Row(
              children: [
                AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  width: 20,
                  height: 20,
                  decoration: BoxDecoration(
                    color: _contractAccepted ? _kGreen : Colors.transparent,
                    border: Border.all(
                      color: _contractAccepted ? _kGreen : _kGray400,
                      width: 2,
                    ),
                    borderRadius: BorderRadius.circular(5),
                  ),
                  child: _contractAccepted
                      ? const Icon(Icons.check, color: Colors.white, size: 12)
                      : null,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text.rich(
                    TextSpan(
                      style: const TextStyle(fontSize: 12),
                      children: [
                        const TextSpan(text: 'J\'ai lu et j\'accepte les '),
                        TextSpan(
                          text: 'conditions générales du contrat',
                          style: const TextStyle(
                            color: _kBlue,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  // ── CONFIRM BUTTON ──
  Widget _buildConfirmButton() {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 300),
      width: double.infinity,
      decoration: BoxDecoration(
        gradient: _canConfirm
            ? const LinearGradient(
                colors: [_kBlue, _kBlueDark],
                begin: Alignment.centerLeft,
                end: Alignment.centerRight,
              )
            : null,
        color: _canConfirm ? null : _kGray100,
        borderRadius: BorderRadius.circular(14),
        boxShadow: _canConfirm
            ? [
                BoxShadow(
                  color: _kBlue.withOpacity(0.3),
                  blurRadius: 14,
                  offset: const Offset(0, 4),
                ),
              ]
            : [],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          onTap: _canConfirm ? _handleConfirm : null,
          borderRadius: BorderRadius.circular(14),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 15),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  _canConfirm ? Icons.check_circle_outline : Icons.lock_outline,
                  size: 16,
                  color: _canConfirm ? Colors.white : _kGray400,
                ),
                const SizedBox(width: 8),
                Text(
                  _confirmLabel,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: _canConfirm ? Colors.white : _kGray400,
                  ),
                ),
                if (_canConfirm) ...[
                  const SizedBox(width: 4),
                  const Icon(
                    Icons.chevron_right,
                    size: 16,
                    color: Colors.white,
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildCreateNewButton() {
    return SizedBox(
      width: double.infinity,
      child: TextButton.icon(
        onPressed: widget.onCreateNew,
        icon: const Icon(Icons.add, size: 15, color: _kBlue),
        label: const Text(
          '+ Créer un nouvel événement',
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: _kBlue,
          ),
        ),
        style: TextButton.styleFrom(
          padding: const EdgeInsets.symmetric(vertical: 10),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────
// EVENT TILE
// ─────────────────────────────────────────
class _EventTile extends StatelessWidget {
  final SelectEventModel event;
  final bool selected;
  final VoidCallback onTap;
  final String Function(DateTime) fmtDate;

  const _EventTile({
    required this.event,
    required this.selected,
    required this.onTap,
    required this.fmtDate,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: selected ? const Color(0xFFEEF2FF) : _kGray50,
          border: Border.all(
            color: selected ? _kBlue : _kGray200,
            width: selected ? 1.5 : 1,
          ),
          borderRadius: BorderRadius.circular(14),
        ),
        child: Row(
          children: [
            AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: selected ? _kBlue : const Color(0xFFEEF2FF),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                Icons.event_outlined,
                color: selected ? Colors.white : _kBlue,
                size: 18,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    event.title,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: selected ? _kBlue : _kGray900,
                    ),
                  ),
                  if (event.dateDebut != null)
                    Text(
                      fmtDate(event.dateDebut!),
                      style: const TextStyle(fontSize: 11, color: _kGray400),
                    ),
                  if (event.category != null)
                    Text(
                      event.category!,
                      style: const TextStyle(fontSize: 10, color: _kGray400),
                    ),
                ],
              ),
            ),
            if (selected)
              const Icon(Icons.check_circle, color: _kBlue, size: 18),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────
// CIN TEXT FIELD
// ─────────────────────────────────────────
class _CinTextField extends StatelessWidget {
  final TextEditingController controller;
  final ValueChanged<String> onChanged;

  const _CinTextField({required this.controller, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      keyboardType: TextInputType.number,
      inputFormatters: [FilteringTextInputFormatter.digitsOnly],
      style: const TextStyle(fontSize: 14, color: _kGray900),
      onChanged: onChanged,
      decoration: InputDecoration(
        labelText: 'Numéro de CIN *',
        hintText: 'Ex : 08361985',
        hintStyle: const TextStyle(color: _kGray400, fontSize: 13),
        labelStyle: const TextStyle(fontSize: 12, color: _kGray500),
        prefixIcon: const Icon(
          Icons.badge_outlined,
          size: 18,
          color: _kGray400,
        ),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 14,
          vertical: 13,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: _kGray200),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: _kGray200),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: _kBlue, width: 1.5),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────
// PROGRESS BAR
// ─────────────────────────────────────────
class _ProgressBar extends StatelessWidget {
  final int seconds;
  final int total;

  const _ProgressBar({required this.seconds, required this.total});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Analyse de la CIN en cours...',
              style: TextStyle(fontSize: 11, color: _kGray400),
            ),
            Text(
              '${seconds}s / ${total}s',
              style: const TextStyle(fontSize: 11, color: _kGray400),
            ),
          ],
        ),
        const SizedBox(height: 6),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: (seconds / total).clamp(0.0, 1.0),
            backgroundColor: _kGray100,
            valueColor: const AlwaysStoppedAnimation<Color>(_kBlue),
            minHeight: 5,
          ),
        ),
      ],
    );
  }
}

// ─────────────────────────────────────────
// ERROR BANNER
// ─────────────────────────────────────────
class _ErrorBanner extends StatelessWidget {
  final String message;
  const _ErrorBanner({required this.message});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
      decoration: BoxDecoration(
        color: _kRedLight,
        border: Border.all(color: _kRedBorder),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        children: [
          const Icon(Icons.error_outline, color: _kRed, size: 14),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              message,
              style: const TextStyle(fontSize: 11, color: _kRed),
            ),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────
// MISMATCH CARD
// ─────────────────────────────────────────
class _MismatchCard extends StatelessWidget {
  final List<Map<String, String>> mismatch;
  const _MismatchCard({required this.mismatch});

  @override
  Widget build(BuildContext context) {
    final isCinNumber = mismatch.any((m) => m['field'] == 'Numéro CIN');
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: _kRedLight,
        border: Border.all(color: _kRedBorder),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.warning_amber_rounded, size: 13, color: _kRed),
              SizedBox(width: 6),
              Text(
                'Les informations suivantes ne correspondent pas :',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: _kRed,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ...mismatch.map(
            (m) => Container(
              margin: const EdgeInsets.only(bottom: 6),
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.white,
                border: Border.all(color: const Color(0xFFFECACA)),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    m['field']!.toUpperCase(),
                    style: const TextStyle(
                      fontSize: 9,
                      fontWeight: FontWeight.w700,
                      color: _kRed,
                      letterSpacing: 0.5,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Sur la CIN',
                              style: TextStyle(fontSize: 9, color: _kGray400),
                            ),
                            Text(
                              m['cin'] ?? '—',
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              m['field'] == 'Numéro CIN'
                                  ? 'Saisi'
                                  : 'Votre profil',
                              style: const TextStyle(
                                fontSize: 9,
                                color: _kGray400,
                              ),
                            ),
                            Text(
                              m['profil'] ?? '—',
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          Text(
            isCinNumber
                ? 'Corrigez le numéro ci-dessus — la vérification se relancera.'
                : 'La CIN présentée ne correspond pas au compte connecté.',
            style: TextStyle(fontSize: 10, color: Colors.red.shade400),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────
// SUCCESS BANNER
// ─────────────────────────────────────────
class _SuccessBanner extends StatelessWidget {
  final String? label;
  const _SuccessBanner({this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: _kGreenLight,
        border: Border.all(color: _kGreenBorder),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          const Icon(Icons.check_circle_outline, color: _kGreen, size: 16),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'CIN vérifiée — identité confirmée',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF065F46),
                  ),
                ),
                if (label != null && label!.isNotEmpty)
                  Text(
                    label!,
                    style: const TextStyle(
                      fontSize: 11,
                      color: Color(0xFF059669),
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

// ─────────────────────────────────────────
// VERIFY BUTTON
// ─────────────────────────────────────────
class _VerifyButton extends StatelessWidget {
  final bool isLoading;
  final bool isError;
  final _CinStatus status;
  final int waitSeconds;
  final VoidCallback? onTap;

  const _VerifyButton({
    required this.isLoading,
    required this.isError,
    required this.status,
    required this.waitSeconds,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    String label;
    if (isLoading) {
      label = status == _CinStatus.uploading
          ? 'Envoi en cours...'
          : 'Analyse en cours... (${waitSeconds}s)';
    } else {
      label = isError ? 'Réessayer la vérification' : 'Vérifier ma CIN';
    }

    return SizedBox(
      width: double.infinity,
      child: OutlinedButton(
        onPressed: onTap,
        style: OutlinedButton.styleFrom(
          foregroundColor: _kBlue,
          side: const BorderSide(color: _kBlue, width: 1.5),
          padding: const EdgeInsets.symmetric(vertical: 13),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (isLoading)
              const SizedBox(
                width: 14,
                height: 14,
                child: CircularProgressIndicator(strokeWidth: 2, color: _kBlue),
              )
            else
              const Icon(Icons.verified_user_outlined, size: 16),
            const SizedBox(width: 8),
            Text(
              label,
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────
// TERMS SHEET
// ─────────────────────────────────────────
class _TermsSheet extends StatelessWidget {
  final String resourceName;
  final ResourceTerms? terms;
  final VoidCallback onAccept;

  const _TermsSheet({
    required this.resourceName,
    required this.terms,
    required this.onAccept,
  });

  @override
  Widget build(BuildContext context) {
    final hasPdf = terms?.hasPdf ?? false;
    final hasText = terms?.hasText ?? false;

    return Container(
      height: MediaQuery.of(context).size.height * 0.82,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          const SizedBox(height: 12),
          Center(
            child: Container(
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: _kGray200,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 14),

          // Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: _kBlueLight,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(
                    Icons.description_outlined,
                    color: _kBlue,
                    size: 17,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Conditions du contrat',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: _kGray900,
                        ),
                      ),
                      Text(
                        resourceName,
                        style: const TextStyle(fontSize: 11, color: _kGray400),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                GestureDetector(
                  onTap: () => Navigator.pop(context),
                  child: Container(
                    width: 28,
                    height: 28,
                    decoration: BoxDecoration(
                      color: _kGray100,
                      borderRadius: BorderRadius.circular(7),
                    ),
                    child: const Icon(Icons.close, size: 14, color: _kGray500),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          const Divider(height: 1, color: _kGray100),

          // Content
          Expanded(
            child: hasPdf
                ? _PdfNotice(pdfPath: terms!.file!)
                : hasText
                ? SingleChildScrollView(
                    physics: const BouncingScrollPhysics(),
                    padding: const EdgeInsets.all(20),
                    child: Text(
                      terms!.text!,
                      style: const TextStyle(
                        fontSize: 13,
                        height: 1.7,
                        color: _kGray700,
                      ),
                    ),
                  )
                : const _EmptyTerms(),
          ),

          const Divider(height: 1, color: _kGray100),

          // Accept button
          Padding(
            padding: EdgeInsets.fromLTRB(
              20,
              14,
              20,
              MediaQuery.of(context).padding.bottom + 14,
            ),
            child: SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: onAccept,
                style: ElevatedButton.styleFrom(
                  backgroundColor: _kBlue,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                  elevation: 0,
                ),
                child: const Text(
                  'J\'accepte les conditions du contrat',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────
// PDF NOTICE (PDF requires webview plugin)
// ─────────────────────────────────────────
class _PdfNotice extends StatelessWidget {
  final String pdfPath;
  const _PdfNotice({required this.pdfPath});

  @override
  Widget build(BuildContext context) {
    final pdfUrl = 'http://localhost:5000/${pdfPath.replaceAll('\\', '/')}';
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: _kBlueLight,
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Icon(
                Icons.picture_as_pdf_outlined,
                color: _kBlue,
                size: 32,
              ),
            ),
            const SizedBox(height: 14),
            const Text(
              'Document PDF du prestataire',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: _kGray700,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              'Veuillez intégrer un plugin PDF (flutter_pdfview ou syncfusion_flutter_pdfviewer) pour afficher ce document directement.',
              style: TextStyle(fontSize: 12, color: _kGray400, height: 1.5),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: _kGray50,
                border: Border.all(color: _kGray200),
                borderRadius: BorderRadius.circular(10),
              ),
              child: SelectableText(
                pdfUrl,
                style: const TextStyle(
                  fontSize: 11,
                  color: _kBlue,
                  fontFamily: 'monospace',
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────
// EMPTY TERMS
// ─────────────────────────────────────────
class _EmptyTerms extends StatelessWidget {
  const _EmptyTerms();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.description_outlined,
            size: 42,
            color: Colors.grey.shade200,
          ),
          const SizedBox(height: 10),
          Text(
            'Aucune condition fournie',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: Colors.grey.shade400,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Le prestataire n\'a pas encore ajouté de contrat.',
            style: TextStyle(fontSize: 11, color: Colors.grey.shade300),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────
// PICKER SHEET
// ─────────────────────────────────────────
class _PickerSheet extends StatelessWidget {
  final VoidCallback onCamera;
  final VoidCallback onGallery;

  const _PickerSheet({required this.onCamera, required this.onGallery});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.fromLTRB(
        20,
        16,
        20,
        MediaQuery.of(context).padding.bottom + 20,
      ),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 36,
            height: 4,
            decoration: BoxDecoration(
              color: _kGray200,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 14),
          const Text(
            'Importer la CIN',
            style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _PickerTile(
                  icon: Icons.camera_alt_outlined,
                  label: 'Caméra',
                  onTap: onCamera,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _PickerTile(
                  icon: Icons.photo_library_outlined,
                  label: 'Galerie',
                  onTap: onGallery,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _PickerTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _PickerTile({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 18),
        decoration: BoxDecoration(
          color: _kBlueLight,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Column(
          children: [
            Icon(icon, color: _kBlue, size: 26),
            const SizedBox(height: 6),
            Text(
              label,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: _kBlue,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────
// SMALL BADGE
// ─────────────────────────────────────────
class _SmallBadge extends StatelessWidget {
  final String label;
  final Color bg;
  final Color fg;

  const _SmallBadge({required this.label, required this.bg, required this.fg});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        label,
        style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: fg),
      ),
    );
  }
}

// ─────────────────────────────────────────
// USAGE EXAMPLE
// ─────────────────────────────────────────
//
// showModalBottomSheet(
//   context: context,
//   isScrollControlled: true,
//   backgroundColor: Colors.transparent,
//   builder: (_) => SelectEventSheet(
//     events: myEvents.map((e) => SelectEventModel.fromJson(e)).toList(),
//     resourceName: item.name,
//     resourceDate: DateTime.tryParse(item.selectedDate ?? ''),
//     terms: ResourceTerms(
//       file: item.terms?.file,   // PDF path  (optional)
//       text: item.terms?.text,   // plain text (optional)
//     ),
//     onConfirm: (eventId, cinNumber) {
//       // handle confirmed booking
//     },
//     onCreateNew: () {
//       Navigator.pop(context);
//       // navigate to event creation
//     },
//   ),
// );
