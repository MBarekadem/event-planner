import 'dart:convert';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_stripe/flutter_stripe.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

// ─────────────────────────────────────────
// CONSTANTS (même palette que mes_reservations)
// ─────────────────────────────────────────
const String kBaseUrl = 'http://localhost:5000/api';
const Color kIndigo = Color(0xFF4338CA);
const Color kPurple = Color(0xFF7C3AED);
const Color kGreen = Color(0xFF059669);
const Color kRed = Color(0xFFEF4444);
const Color kBg = Color(0xFFF7F8FF);

// ─────────────────────────────────────────
// FORMATTERS
// ─────────────────────────────────────────

/// Formate le numéro de carte : groupes de 4 séparés par espace
class _CardNumberFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    final digits = newValue.text.replaceAll(RegExp(r'\D'), '');
    final limited = digits.length > 16 ? digits.substring(0, 16) : digits;
    final buffer = StringBuffer();
    for (int i = 0; i < limited.length; i++) {
      if (i > 0 && i % 4 == 0) buffer.write(' ');
      buffer.write(limited[i]);
    }
    final formatted = buffer.toString();
    return newValue.copyWith(
      text: formatted,
      selection: TextSelection.collapsed(offset: formatted.length),
    );
  }
}

/// Formate la date d'expiration : MM / YY
class _ExpiryFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    final digits = newValue.text.replaceAll(RegExp(r'\D'), '');
    final limited = digits.length > 4 ? digits.substring(0, 4) : digits;
    String formatted = limited;
    if (limited.length > 2) {
      formatted = '${limited.substring(0, 2)} / ${limited.substring(2)}';
    }
    return newValue.copyWith(
      text: formatted,
      selection: TextSelection.collapsed(offset: formatted.length),
    );
  }
}

// ─────────────────────────────────────────
// ANIMATED CREDIT CARD WIDGET
// ─────────────────────────────────────────
class _AnimatedCard extends StatefulWidget {
  final String cardNumber;
  final String cardName;
  final String expiry;
  final bool flipped;
  final String activeField; // 'number' | 'expiry' | 'name' | 'cvc' | ''

  const _AnimatedCard({
    required this.cardNumber,
    required this.cardName,
    required this.expiry,
    required this.flipped,
    required this.activeField,
  });

  @override
  State<_AnimatedCard> createState() => _AnimatedCardState();
}

class _AnimatedCardState extends State<_AnimatedCard>
    with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _anim;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 650),
    );
    _anim = CurvedAnimation(parent: _ctrl, curve: Curves.easeInOutCubic);
  }

  @override
  void didUpdateWidget(_AnimatedCard old) {
    super.didUpdateWidget(old);
    if (widget.flipped && !old.flipped) {
      _ctrl.forward();
    } else if (!widget.flipped && old.flipped) {
      _ctrl.reverse();
    }
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _anim,
      builder: (_, __) {
        final angle = _anim.value * math.pi;
        final showBack = angle > math.pi / 2;
        return Transform(
          alignment: Alignment.center,
          transform: Matrix4.identity()
            ..setEntry(3, 2, 0.001)
            ..rotateY(angle),
          child: showBack
              ? Transform(
                  alignment: Alignment.center,
                  transform: Matrix4.identity()..rotateY(math.pi),
                  child: _CardBack(),
                )
              : _CardFront(
                  cardNumber: widget.cardNumber,
                  cardName: widget.cardName,
                  expiry: widget.expiry,
                  activeField: widget.activeField,
                ),
        );
      },
    );
  }
}

// ── Front face ────────────────────────────────────────────────────────────────
class _CardFront extends StatelessWidget {
  final String cardNumber;
  final String cardName;
  final String expiry;
  final String activeField;

  const _CardFront({
    required this.cardNumber,
    required this.cardName,
    required this.expiry,
    required this.activeField,
  });

  @override
  Widget build(BuildContext context) {
    final displayNumber = cardNumber.isEmpty
        ? '#### #### #### ####'
        : cardNumber.padRight(19, ' ');
    final displayName = cardName.trim().isEmpty
        ? 'FULL NAME'
        : cardName.toUpperCase();
    final displayExp = expiry.isEmpty ? 'MM / YY' : expiry;

    return Container(
      width: double.infinity,
      height: 200,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        gradient: const LinearGradient(
          colors: [Color(0xFF1e3a8a), Color(0xFF2563eb), Color(0xFF3b82f6)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF1e3a8a).withOpacity(0.55),
            blurRadius: 30,
            offset: const Offset(0, 16),
          ),
        ],
      ),
      child: Stack(
        children: [
          // Cercles décoratifs
          Positioned(
            right: -30,
            top: -30,
            child: Container(
              width: 160,
              height: 160,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white.withOpacity(0.06),
              ),
            ),
          ),
          Positioned(
            right: 20,
            top: 60,
            child: Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white.withOpacity(0.04),
              ),
            ),
          ),
          // Contenu
          Padding(
            padding: const EdgeInsets.all(28),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top row : chip + NFC
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    // Puce dorée
                    Container(
                      width: 42,
                      height: 30,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(6),
                        gradient: const LinearGradient(
                          colors: [Color(0xFFfde68a), Color(0xFFd97706)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                      ),
                      child: CustomPaint(painter: _ChipPainter()),
                    ),
                    // Icône NFC
                    Icon(
                      Icons.wifi,
                      color: Colors.white.withOpacity(0.7),
                      size: 20,
                    ),
                  ],
                ),
                const Spacer(),
                // Numéro de carte
                _UnderlinedField(
                  text: displayNumber,
                  active: activeField == 'number',
                  style: const TextStyle(
                    fontFamily: 'Courier',
                    fontSize: 17,
                    color: Colors.white,
                    letterSpacing: 3,
                  ),
                ),
                const SizedBox(height: 14),
                // Bas : titulaire + expiration
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'CARD HOLDER',
                            style: TextStyle(
                              fontSize: 9,
                              color: Colors.white.withOpacity(0.6),
                              letterSpacing: 1.5,
                            ),
                          ),
                          const SizedBox(height: 3),
                          _UnderlinedField(
                            text: displayName,
                            active: activeField == 'name',
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: Colors.white,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          'EXPIRES',
                          style: TextStyle(
                            fontSize: 9,
                            color: Colors.white.withOpacity(0.6),
                            letterSpacing: 1.5,
                          ),
                        ),
                        const SizedBox(height: 3),
                        _UnderlinedField(
                          text: displayExp,
                          active: activeField == 'expiry',
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: Colors.white,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ── Back face ─────────────────────────────────────────────────────────────────
class _CardBack extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      height: 200,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        gradient: const LinearGradient(
          colors: [Color(0xFF1e40af), Color(0xFF1e3a8a)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF1e3a8a).withOpacity(0.55),
            blurRadius: 30,
            offset: const Offset(0, 16),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 28),
          // Bande magnétique
          Container(
            width: double.infinity,
            height: 44,
            color: Colors.black.withOpacity(0.7),
          ),
          const SizedBox(height: 14),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 28),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'CVV',
                  style: TextStyle(
                    fontSize: 9,
                    color: Colors.white.withOpacity(0.6),
                    letterSpacing: 1.5,
                  ),
                ),
                const SizedBox(height: 6),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 8,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(6),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF6366F1).withOpacity(0.3),
                        blurRadius: 8,
                      ),
                    ],
                  ),
                  child: const Align(
                    alignment: Alignment.centerRight,
                    child: Text(
                      '•••',
                      style: TextStyle(
                        fontFamily: 'Courier',
                        fontSize: 15,
                        color: Color(0xFF1f2937),
                        letterSpacing: 4,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const Spacer(),
          Padding(
            padding: const EdgeInsets.only(right: 24, bottom: 20),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                Container(
                  width: 28,
                  height: 28,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.red.withOpacity(0.8),
                  ),
                ),
                Transform.translate(
                  offset: const Offset(-10, 0),
                  child: Container(
                    width: 28,
                    height: 28,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: Colors.amber.withOpacity(0.8),
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

// ── Texte souligné dynamique ──────────────────────────────────────────────────
class _UnderlinedField extends StatelessWidget {
  final String text;
  final bool active;
  final TextStyle style;

  const _UnderlinedField({
    required this.text,
    required this.active,
    required this.style,
  });

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 250),
      padding: const EdgeInsets.only(bottom: 3),
      decoration: BoxDecoration(
        border: Border(
          bottom: BorderSide(
            color: active
                ? const Color(0xFFa5b4fc).withOpacity(0.9)
                : Colors.transparent,
            width: 2,
          ),
        ),
      ),
      child: Text(text, style: style, overflow: TextOverflow.ellipsis),
    );
  }
}

// ── Puce dorée dessinée ───────────────────────────────────────────────────────
class _ChipPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = const Color(0x40783200)
      ..strokeWidth = 1;
    // Lignes horizontale et verticale
    canvas.drawLine(
      Offset(0, size.height / 2),
      Offset(size.width, size.height / 2),
      paint,
    );
    canvas.drawLine(
      Offset(size.width / 2, 0),
      Offset(size.width / 2, size.height),
      paint,
    );
    // Petit rectangle interne
    final rect = RRect.fromRectAndRadius(
      Rect.fromLTWH(4, 4, size.width - 8, size.height - 8),
      const Radius.circular(2),
    );
    canvas.drawRRect(rect, paint..style = PaintingStyle.stroke);
  }

  @override
  bool shouldRepaint(covariant CustomPainter old) => false;
}

// ─────────────────────────────────────────
// FIELD WRAPPER
// ─────────────────────────────────────────
class _FormField extends StatelessWidget {
  final String label;
  final String? error;
  final bool focused;
  final bool complete;
  final Widget child;

  const _FormField({
    required this.label,
    required this.focused,
    required this.complete,
    required this.child,
    this.error,
  });

  @override
  Widget build(BuildContext context) {
    final borderColor = error != null && error!.isNotEmpty
        ? const Color(0xFFF87171)
        : focused
        ? const Color(0xFF6366F1)
        : complete
        ? const Color(0xFF34D399)
        : const Color(0xFFE5E7EB);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        AnimatedDefaultTextStyle(
          duration: const Duration(milliseconds: 200),
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            color: focused ? const Color(0xFF4338CA) : const Color(0xFF6B7280),
            letterSpacing: 1,
          ),
          child: Text(label.toUpperCase()),
        ),
        const SizedBox(height: 6),
        AnimatedContainer(
          duration: const Duration(milliseconds: 250),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            color: focused ? const Color(0xFFFAFAFE) : const Color(0xFFF9FAFB),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: borderColor, width: 1.5),
            boxShadow: focused
                ? [
                    BoxShadow(
                      color: const Color(0xFF6366F1).withOpacity(0.12),
                      blurRadius: 8,
                    ),
                  ]
                : error != null && error!.isNotEmpty
                ? [
                    BoxShadow(
                      color: const Color(0xFFF87171).withOpacity(0.1),
                      blurRadius: 8,
                    ),
                  ]
                : [],
          ),
          child: child,
        ),
        if (error != null && error!.isNotEmpty) ...[
          const SizedBox(height: 4),
          Row(
            children: [
              const Icon(
                Icons.warning_amber_rounded,
                size: 12,
                color: Color(0xFFEF4444),
              ),
              const SizedBox(width: 4),
              Text(
                error!,
                style: const TextStyle(fontSize: 11, color: Color(0xFFEF4444)),
              ),
            ],
          ),
        ],
      ],
    );
  }
}

// ─────────────────────────────────────────
// PROGRESS BAR
// ─────────────────────────────────────────
class _ProgressBar extends StatelessWidget {
  final String label;
  final String state; // 'empty' | 'partial' | 'complete'

  const _ProgressBar({required this.label, required this.state});

  @override
  Widget build(BuildContext context) {
    final color = state == 'complete'
        ? const Color(0xFF34D399)
        : state == 'partial'
        ? const Color(0xFFFBBF24)
        : const Color(0xFFE5E7EB);

    return Expanded(
      child: Column(
        children: [
          AnimatedContainer(
            duration: const Duration(milliseconds: 350),
            height: 3,
            decoration: BoxDecoration(
              color: color,
              borderRadius: BorderRadius.circular(99),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label.toUpperCase(),
            style: const TextStyle(
              fontSize: 9,
              color: Color(0xFF9CA3AF),
              letterSpacing: 0.8,
            ),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────
// PAYMENT PAGE
// ─────────────────────────────────────────
class PaymentPage extends StatefulWidget {
  /// Montant à payer (DT)
  final double amount;

  /// ID de la location côté backend
  final String locationId;

  const PaymentPage({
    super.key,
    required this.amount,
    required this.locationId,
  });

  @override
  State<PaymentPage> createState() => _PaymentPageState();
}

class _PaymentPageState extends State<PaymentPage> {
  // Controllers
  final _numberCtrl = TextEditingController();
  final _nameCtrl = TextEditingController();
  final _expiryCtrl = TextEditingController();
  final _cvcCtrl = TextEditingController();

  // Focus nodes
  final _numberFocus = FocusNode();
  final _nameFocus = FocusNode();
  final _expiryFocus = FocusNode();
  final _cvcFocus = FocusNode();

  // State
  String _activeField = '';
  String _numberState = 'empty'; // empty | partial | complete
  String _nameState = 'empty';
  String _expiryState = 'empty';
  String _cvcState = 'empty';

  Map<String, String> _errors = {};
  bool _loading = false;
  bool _success = false;
  String? _globalError;

  @override
  void initState() {
    super.initState();
    _numberFocus.addListener(() => _onFocusChange('number', _numberFocus));
    _nameFocus.addListener(() => _onFocusChange('name', _nameFocus));
    _expiryFocus.addListener(() => _onFocusChange('expiry', _expiryFocus));
    _cvcFocus.addListener(() => _onFocusChange('cvc', _cvcFocus));

    _numberCtrl.addListener(_updateNumberState);
    _nameCtrl.addListener(_updateNameState);
    _expiryCtrl.addListener(_updateExpiryState);
    _cvcCtrl.addListener(_updateCvcState);
  }

  void _onFocusChange(String field, FocusNode node) {
    setState(() => _activeField = node.hasFocus ? field : '');
  }

  void _updateNumberState() {
    final digits = _numberCtrl.text.replaceAll(' ', '');
    setState(() {
      _numberState = digits.isEmpty
          ? 'empty'
          : digits.length >= 16
          ? 'complete'
          : 'partial';
    });
  }

  void _updateNameState() {
    final v = _nameCtrl.text.trim();
    setState(() {
      _nameState = v.isEmpty
          ? 'empty'
          : v.length > 2
          ? 'complete'
          : 'partial';
    });
  }

  void _updateExpiryState() {
    final digits = _expiryCtrl.text.replaceAll(RegExp(r'\D'), '');
    setState(() {
      _expiryState = digits.isEmpty
          ? 'empty'
          : digits.length >= 4
          ? 'complete'
          : 'partial';
    });
  }

  void _updateCvcState() {
    final v = _cvcCtrl.text.trim();
    setState(() {
      _cvcState = v.isEmpty
          ? 'empty'
          : v.length >= 3
          ? 'complete'
          : 'partial';
    });
  }

  @override
  void dispose() {
    _numberCtrl.dispose();
    _nameCtrl.dispose();
    _expiryCtrl.dispose();
    _cvcCtrl.dispose();
    _numberFocus.dispose();
    _nameFocus.dispose();
    _expiryFocus.dispose();
    _cvcFocus.dispose();
    super.dispose();
  }

  // ── Validation ────────────────────────────────────────────────────────────
  bool _validate() {
    final errs = <String, String>{};
    final digits = _numberCtrl.text.replaceAll(' ', '');
    if (digits.length < 16) errs['number'] = 'Numéro de carte incomplet.';

    if (_nameCtrl.text.trim().isEmpty)
      errs['name'] = 'Nom du titulaire requis.';

    final expDigits = _expiryCtrl.text.replaceAll(RegExp(r'\D'), '');
    if (expDigits.length < 4) {
      errs['expiry'] = 'Date d\'expiration invalide.';
    } else {
      final month = int.tryParse(expDigits.substring(0, 2)) ?? 0;
      if (month < 1 || month > 12) errs['expiry'] = 'Mois invalide.';
    }

    if (_cvcCtrl.text.trim().length < 3) errs['cvc'] = 'CVV invalide.';

    setState(() => _errors = errs);
    return errs.isEmpty;
  }

  // Paiement
  Future<void> _pay() async {
  if (!_validate()) return;

  setState(() {
    _loading = true;
    _globalError = null;
  });

  try {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token');

    // 1️⃣ Créer PaymentIntent côté backend
    final piRes = await http.post(
      Uri.parse('$kBaseUrl/pay'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'amount': widget.amount,
        'locationId': widget.locationId,
      }),
    );

    final data = jsonDecode(piRes.body);

    if (piRes.statusCode != 200) {
      setState(() {
        _globalError = data['message'] ?? 'Erreur serveur.';
        _loading = false;
      });
      return;
    }

    final clientSecret = data['clientSecret'];

    // 2️⃣ Initialiser PaymentSheet
    await Stripe.instance.initPaymentSheet(
      paymentSheetParameters: SetupPaymentSheetParameters(
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: 'YallaEvents',
      ),
    );

    // 3️⃣ Afficher UI Stripe native
    await Stripe.instance.presentPaymentSheet();

    // 4️⃣ Sauvegarder paiement backend
    await http.post(
      Uri.parse('$kBaseUrl/location/pay'),
      headers: {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      },
      body: jsonEncode({
        'locationId': widget.locationId,
        'amount': widget.amount,
      }),
    );

    setState(() {
      _success = true;
      _loading = false;
    });
  } on StripeException catch (e) {
    setState(() {
      _globalError =
          e.error.localizedMessage ?? 'Paiement annulé.';
      _loading = false;
    });
  } catch (e) {
    setState(() {
      _globalError = 'Erreur: $e';
      _loading = false;
    });
  }
}
  // ─────────────────────────────────────────
  // BUILD
  // ─────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kBg,
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFFEEF2FF), Color(0xFFF8FAFC), Color(0xFFEDE9FE)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: SafeArea(
          child: GestureDetector(
            onTap: () => FocusScope.of(context).unfocus(),
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 40),
              child: Column(
                children: [
                  // Back button
                  Align(
                    alignment: Alignment.centerLeft,
                    child: GestureDetector(
                      onTap: () => Navigator.pop(context),
                      child: Container(
                        width: 38,
                        height: 38,
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.8),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: Colors.white.withOpacity(0.6),
                          ),
                        ),
                        child: const Icon(
                          Icons.arrow_back_ios_new,
                          size: 16,
                          color: Color(0xFF4338CA),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Carte animée
                  _AnimatedCard(
                    cardNumber: _numberCtrl.text,
                    cardName: _nameCtrl.text,
                    expiry: _expiryCtrl.text,
                    flipped: _activeField == 'cvc',
                    activeField: _activeField,
                  ),
                  const SizedBox(height: 32),

                  // Formulaire
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(24),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF4338CA).withOpacity(0.12),
                          blurRadius: 40,
                          offset: const Offset(0, 16),
                        ),
                        BoxShadow(
                          color: Colors.black.withOpacity(0.06),
                          blurRadius: 12,
                          offset: const Offset(0, 4),
                        ),
                      ],
                      border: Border.all(
                        color: const Color(0xFF6366F1).withOpacity(0.1),
                      ),
                    ),
                    padding: const EdgeInsets.all(28),
                    child: _success ? _buildSuccess() : _buildForm(),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  // ── Formulaire ────────────────────────────────────────────────────────────
  Widget _buildForm() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Header
        Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF4338CA), Color(0xFF6366F1)],
                ),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(
                Icons.credit_card,
                color: Colors.white,
                size: 16,
              ),
            ),
            const SizedBox(width: 10),
            const Text(
              'Paiement sécurisé',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: Color(0xFF111827),
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        Row(
          children: [
            const SizedBox(width: 2),
            const Icon(Icons.lock_outline, size: 12, color: Color(0xFF10B981)),
            const SizedBox(width: 4),
            Text(
              'SSL · Stripe',
              style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
            ),
            Text(
              ' · ',
              style: TextStyle(fontSize: 12, color: Colors.grey.shade300),
            ),
            Text(
              '${widget.amount.toStringAsFixed(0)} DT',
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w800,
                color: Color(0xFF4338CA),
              ),
            ),
          ],
        ),
        const SizedBox(height: 24),

        // Numéro de carte
        _FormField(
          label: 'Numéro de carte',
          error: _errors['number'],
          focused: _activeField == 'number',
          complete: _numberState == 'complete',
          child: TextField(
            controller: _numberCtrl,
            focusNode: _numberFocus,
            keyboardType: TextInputType.number,
            inputFormatters: [_CardNumberFormatter()],
            style: const TextStyle(
              fontFamily: 'Courier',
              fontSize: 14,
              letterSpacing: 2,
              color: Color(0xFF1F2937),
            ),
            decoration: InputDecoration(
              isDense: true,
              contentPadding: EdgeInsets.zero,
              border: InputBorder.none,
              hintText: '1234 5678 9012 3456',
              hintStyle: TextStyle(
                fontFamily: 'Courier',
                fontSize: 14,
                letterSpacing: 2,
                color: _activeField == 'number'
                    ? const Color(0xFFC7D2FE)
                    : Colors.grey.shade400,
              ),
            ),
          ),
        ),
        const SizedBox(height: 14),

        // Expiration + CVV
        Row(
          children: [
            Expanded(
              child: _FormField(
                label: 'Expiration',
                error: _errors['expiry'],
                focused: _activeField == 'expiry',
                complete: _expiryState == 'complete',
                child: TextField(
                  controller: _expiryCtrl,
                  focusNode: _expiryFocus,
                  keyboardType: TextInputType.number,
                  inputFormatters: [_ExpiryFormatter()],
                  style: const TextStyle(
                    fontFamily: 'Courier',
                    fontSize: 14,
                    letterSpacing: 1,
                    color: Color(0xFF1F2937),
                  ),
                  decoration: InputDecoration(
                    isDense: true,
                    contentPadding: EdgeInsets.zero,
                    border: InputBorder.none,
                    hintText: 'MM / YY',
                    hintStyle: TextStyle(
                      fontFamily: 'Courier',
                      fontSize: 14,
                      color: _activeField == 'expiry'
                          ? const Color(0xFFC7D2FE)
                          : Colors.grey.shade400,
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _FormField(
                label: 'CVV',
                error: _errors['cvc'],
                focused: _activeField == 'cvc',
                complete: _cvcState == 'complete',
                child: TextField(
                  controller: _cvcCtrl,
                  focusNode: _cvcFocus,
                  keyboardType: TextInputType.number,
                  obscureText: true,
                  maxLength: 4,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  style: const TextStyle(
                    fontFamily: 'Courier',
                    fontSize: 14,
                    letterSpacing: 4,
                    color: Color(0xFF1F2937),
                  ),
                  decoration: InputDecoration(
                    isDense: true,
                    counterText: '',
                    contentPadding: EdgeInsets.zero,
                    border: InputBorder.none,
                    hintText: '•••',
                    hintStyle: TextStyle(
                      fontFamily: 'Courier',
                      fontSize: 14,
                      letterSpacing: 4,
                      color: _activeField == 'cvc'
                          ? const Color(0xFFC7D2FE)
                          : Colors.grey.shade400,
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),

        // Nom du titulaire
        _FormField(
          label: 'Nom du titulaire',
          error: _errors['name'],
          focused: _activeField == 'name',
          complete: _nameState == 'complete',
          child: TextField(
            controller: _nameCtrl,
            focusNode: _nameFocus,
            textCapitalization: TextCapitalization.characters,
            style: const TextStyle(
              fontFamily: 'Courier',
              fontSize: 14,
              letterSpacing: 1,
              color: Color(0xFF1F2937),
            ),
            decoration: InputDecoration(
              isDense: true,
              contentPadding: EdgeInsets.zero,
              border: InputBorder.none,
              hintText: 'JEAN DUPONT',
              hintStyle: TextStyle(
                fontFamily: 'Courier',
                fontSize: 14,
                color: _activeField == 'name'
                    ? const Color(0xFFC7D2FE)
                    : Colors.grey.shade400,
              ),
            ),
          ),
        ),
        const SizedBox(height: 16),

        // Barre de progression
        Row(
          children: [
            _ProgressBar(label: 'N° carte', state: _numberState),
            const SizedBox(width: 6),
            _ProgressBar(label: 'Expiration', state: _expiryState),
            const SizedBox(width: 6),
            _ProgressBar(label: 'CVV', state: _cvcState),
            const SizedBox(width: 6),
            _ProgressBar(label: 'Nom', state: _nameState),
          ],
        ),
        const SizedBox(height: 16),

        // Erreur globale
        if (_globalError != null) ...[
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFFFEF2F2),
              border: Border.all(color: const Color(0xFFFECACA)),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              children: [
                const Icon(
                  Icons.warning_amber_rounded,
                  size: 16,
                  color: Color(0xFFDC2626),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    _globalError!,
                    style: const TextStyle(
                      fontSize: 12,
                      color: Color(0xFFDC2626),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
        ],

        // Bouton payer
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: _loading ? null : _pay,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF4338CA),
              foregroundColor: Colors.white,
              disabledBackgroundColor: const Color(
                0xFF4338CA,
              ).withOpacity(0.85),
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
              elevation: 0,
              shadowColor: Colors.transparent,
            ),
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 200),
              child: _loading
                  ? const SizedBox(
                      key: ValueKey('loading'),
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        color: Colors.white,
                        strokeWidth: 2.5,
                      ),
                    )
                  : Row(
                      key: const ValueKey('label'),
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.credit_card, size: 18),
                        const SizedBox(width: 8),
                        Text(
                          'Payer ${widget.amount.toStringAsFixed(0)} DT',
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
            ),
          ),
        ),
        const SizedBox(height: 14),

        // Hint test
        Center(
          child: Text(
            'Test : 4242 4242 4242 4242 · 12/34 · 123',
            style: TextStyle(
              fontSize: 11,
              color: Colors.grey.shade400,
              fontFamily: 'Courier',
            ),
          ),
        ),
      ],
    );
  }

  // ── Succès ────────────────────────────────────────────────────────────────
  Widget _buildSuccess() {
    return Column(
      children: [
        const SizedBox(height: 16),
        Container(
          width: 72,
          height: 72,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: const LinearGradient(
              colors: [Color(0xFF059669), Color(0xFF065F46)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF059669).withOpacity(0.4),
                blurRadius: 24,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: const Icon(Icons.check_rounded, color: Colors.white, size: 34),
        ),
        const SizedBox(height: 20),
        const Text(
          'Paiement réussi !',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w800,
            color: Color(0xFF111827),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'Facture générée. Retrouvez-la dans vos réservations.',
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 13, color: Colors.grey.shade500),
        ),
        const SizedBox(height: 28),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: () => Navigator.pushNamedAndRemoveUntil(
              context,
              '/mes-reservations',
              (_) => false,
            ),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF4338CA),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              elevation: 0,
            ),
            child: const Text(
              'Voir mes réservations →',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
            ),
          ),
        ),
        const SizedBox(height: 16),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH : _SelectEventSheet SANS validation CIN
// Remplace _SelectEventSheet dans mes_reservations.dart
// onConfirm ne reçoit plus que l'eventId (pas de cinFile)
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// SETUP flutter_stripe  (3 étapes)
// ─────────────────────────────────────────────────────────────────────────────
//
// 1. pubspec.yaml — ajoutez :
//    flutter_stripe: ^10.2.0
//
// 2. main.dart — initialisez Stripe AVANT runApp :
//
//    import 'package:flutter_stripe/flutter_stripe.dart';
//
//    void main() async {
//      WidgetsFlutterBinding.ensureInitialized();
//      Stripe.publishableKey = 'pk_test_51TNBjcRqjNGfrecsmctWpoSvbhepNtLN3BB3Suu95rFDQxHxxgSoIIyoWMJzQ1sD39F4Ddvi0PynxJp8zqECQe9m00K8iR1o62';
//      await Stripe.instance.applySettings();
//      // ... reste de votre initState
//      runApp(MyApp(...));
//    }
//
// 3. Android — android/app/build.gradle :
//    minSdkVersion 21   (au lieu de 16)
//
// ─────────────────────────────────────────────────────────────────────────────
// CONNEXION avec mes_reservations.dart
// ─────────────────────────────────────────────────────────────────────────────
//
// Dans _buildReservationList(), remplacez onPay :
//
//    onPay: () => Navigator.push(
//      context,
//      MaterialPageRoute(
//        builder: (_) => PaymentPage(
//          amount:     r.resourcePrice ?? 0,
//          locationId: r.id,
//        ),
//      ),
//    ),
