import 'dart:convert';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_stripe/flutter_stripe.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

const String kBaseUrl = 'http://localhost:5000/api';
const Color kIndigo = Color(0xFF4338CA);
const Color kPurple = Color(0xFF7C3AED);
const Color kGreen = Color(0xFF059669);
const Color kRed = Color(0xFFEF4444);
const Color kBg = Color(0xFFF7F8FF);

// ─────────────────────────────────────────
// ANIMATED CREDIT CARD
// ─────────────────────────────────────────
class _AnimatedCard extends StatefulWidget {
  final String cardName;
  final bool flipped;

  const _AnimatedCard({required this.cardName, required this.flipped});

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
        vsync: this, duration: const Duration(milliseconds: 650));
    _anim = CurvedAnimation(parent: _ctrl, curve: Curves.easeInOutCubic);
  }

  @override
  void didUpdateWidget(_AnimatedCard old) {
    super.didUpdateWidget(old);
    if (widget.flipped && !old.flipped) _ctrl.forward();
    else if (!widget.flipped && old.flipped) _ctrl.reverse();
  }

  @override
  void dispose() { _ctrl.dispose(); super.dispose(); }

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
              : _CardFront(cardName: widget.cardName),
        );
      },
    );
  }
}

class _CardFront extends StatelessWidget {
  final String cardName;
  const _CardFront({required this.cardName});

  @override
  Widget build(BuildContext context) {
    final displayName = cardName.trim().isEmpty ? 'FULL NAME' : cardName.toUpperCase();
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
            blurRadius: 30, offset: const Offset(0, 16),
          ),
        ],
      ),
      child: Stack(
        children: [
          Positioned(right: -30, top: -30,
            child: Container(width: 160, height: 160,
              decoration: BoxDecoration(shape: BoxShape.circle,
                color: Colors.white.withOpacity(0.06)))),
          Padding(
            padding: const EdgeInsets.all(28),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                Container(
                  width: 42, height: 30,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(6),
                    gradient: const LinearGradient(
                      colors: [Color(0xFFfde68a), Color(0xFFd97706)],
                    ),
                  ),
                  child: CustomPaint(painter: _ChipPainter()),
                ),
                Icon(Icons.wifi, color: Colors.white.withOpacity(0.7), size: 20),
              ]),
              const Spacer(),
              // Numéro masqué (géré par CardField)
              Text(
                '•••• •••• •••• ••••',
                style: const TextStyle(
                  fontFamily: 'Courier', fontSize: 17,
                  color: Colors.white, letterSpacing: 3,
                ),
              ),
              const SizedBox(height: 14),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Expanded(child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('CARD HOLDER',
                        style: TextStyle(fontSize: 9,
                          color: Colors.white.withOpacity(0.6), letterSpacing: 1.5)),
                      const SizedBox(height: 3),
                      Text(displayName,
                        style: const TextStyle(fontSize: 13,
                          fontWeight: FontWeight.w600, color: Colors.white),
                        overflow: TextOverflow.ellipsis),
                    ],
                  )),
                  Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                    Text('EXPIRES',
                      style: TextStyle(fontSize: 9,
                        color: Colors.white.withOpacity(0.6), letterSpacing: 1.5)),
                    const SizedBox(height: 3),
                    Text('MM / YY',
                      style: const TextStyle(fontSize: 13,
                        fontWeight: FontWeight.w600, color: Colors.white)),
                  ]),
                ],
              ),
            ]),
          ),
        ],
      ),
    );
  }
}

class _CardBack extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity, height: 200,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        gradient: const LinearGradient(
          colors: [Color(0xFF1e40af), Color(0xFF1e3a8a)],
        ),
        boxShadow: [
          BoxShadow(color: const Color(0xFF1e3a8a).withOpacity(0.55),
            blurRadius: 30, offset: const Offset(0, 16)),
        ],
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const SizedBox(height: 28),
        Container(width: double.infinity, height: 44,
          color: Colors.black.withOpacity(0.7)),
        const SizedBox(height: 14),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 28),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('CVV', style: TextStyle(fontSize: 9,
              color: Colors.white.withOpacity(0.6), letterSpacing: 1.5)),
            const SizedBox(height: 6),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(color: Colors.white,
                borderRadius: BorderRadius.circular(6)),
              child: const Align(alignment: Alignment.centerRight,
                child: Text('•••', style: TextStyle(fontFamily: 'Courier',
                  fontSize: 15, color: Color(0xFF1f2937), letterSpacing: 4))),
            ),
          ]),
        ),
        const Spacer(),
        Padding(
          padding: const EdgeInsets.only(right: 24, bottom: 20),
          child: Row(mainAxisAlignment: MainAxisAlignment.end, children: [
            Container(width: 28, height: 28,
              decoration: BoxDecoration(shape: BoxShape.circle,
                color: Colors.red.withOpacity(0.8))),
            Transform.translate(offset: const Offset(-10, 0),
              child: Container(width: 28, height: 28,
                decoration: BoxDecoration(shape: BoxShape.circle,
                  color: Colors.amber.withOpacity(0.8)))),
          ]),
        ),
      ]),
    );
  }
}

class _ChipPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = const Color(0x40783200)..strokeWidth = 1;
    canvas.drawLine(Offset(0, size.height / 2),
      Offset(size.width, size.height / 2), paint);
    canvas.drawLine(Offset(size.width / 2, 0),
      Offset(size.width / 2, size.height), paint);
    final rect = RRect.fromRectAndRadius(
      Rect.fromLTWH(4, 4, size.width - 8, size.height - 8),
      const Radius.circular(2));
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
    required this.label, required this.focused,
    required this.complete, required this.child, this.error,
  });

  @override
  Widget build(BuildContext context) {
    final borderColor = error != null && error!.isNotEmpty
        ? const Color(0xFFF87171)
        : focused ? const Color(0xFF6366F1)
        : complete ? const Color(0xFF34D399)
        : const Color(0xFFE5E7EB);

    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      AnimatedDefaultTextStyle(
        duration: const Duration(milliseconds: 200),
        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700,
          color: focused ? const Color(0xFF4338CA) : const Color(0xFF6B7280),
          letterSpacing: 1),
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
              ? [BoxShadow(color: const Color(0xFF6366F1).withOpacity(0.12), blurRadius: 8)]
              : [],
        ),
        child: child,
      ),
      if (error != null && error!.isNotEmpty) ...[
        const SizedBox(height: 4),
        Row(children: [
          const Icon(Icons.warning_amber_rounded, size: 12, color: Color(0xFFEF4444)),
          const SizedBox(width: 4),
          Text(error!, style: const TextStyle(fontSize: 11, color: Color(0xFFEF4444))),
        ]),
      ],
    ]);
  }
}

// ─────────────────────────────────────────
// PROGRESS BAR
// ─────────────────────────────────────────
class _ProgressBar extends StatelessWidget {
  final String label;
  final String state;

  const _ProgressBar({required this.label, required this.state});

  @override
  Widget build(BuildContext context) {
    final color = state == 'complete' ? const Color(0xFF34D399)
        : state == 'partial' ? const Color(0xFFFBBF24)
        : const Color(0xFFE5E7EB);

    return Expanded(
      child: Column(children: [
        AnimatedContainer(duration: const Duration(milliseconds: 350),
          height: 3,
          decoration: BoxDecoration(color: color,
            borderRadius: BorderRadius.circular(99))),
        const SizedBox(height: 4),
        Text(label.toUpperCase(), style: const TextStyle(
          fontSize: 9, color: Color(0xFF9CA3AF), letterSpacing: 0.8)),
      ]),
    );
  }
}

// ─────────────────────────────────────────
// PAYMENT PAGE
// ─────────────────────────────────────────
class PaymentPage extends StatefulWidget {
  final double amount;
  final String locationId;

  const PaymentPage({
    super.key, required this.amount, required this.locationId,
  });

  @override
  State<PaymentPage> createState() => _PaymentPageState();
}

class _PaymentPageState extends State<PaymentPage> {
  final _nameCtrl = TextEditingController();
  final _nameFocus = FocusNode();

  String _activeField = '';
  String _nameState = 'empty';
  bool _cardComplete = false;
  bool _cardFocused = false;

  Map<String, String> _errors = {};
  bool _loading = false;
  bool _success = false;
  String? _globalError;

  @override
  void initState() {
    super.initState();
    _nameFocus.addListener(() {
      setState(() => _activeField = _nameFocus.hasFocus ? 'name' : '');
    });
    _nameCtrl.addListener(() {
      final v = _nameCtrl.text.trim();
      setState(() {
        _nameState = v.isEmpty ? 'empty' : v.length > 2 ? 'complete' : 'partial';
      });
    });
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _nameFocus.dispose();
    super.dispose();
  }

  bool _validate() {
    final errs = <String, String>{};
    if (!_cardComplete) errs['card'] = 'Informations de carte incomplètes.';
    if (_nameCtrl.text.trim().isEmpty) errs['name'] = 'Nom du titulaire requis.';
    setState(() => _errors = errs);
    return errs.isEmpty;
  }

  Future<void> _pay() async {
    if (!_validate()) return;

    setState(() { _loading = true; _globalError = null; });

    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('token');

      // 1️⃣ Créer PaymentMethod via CardField (SDK Stripe — sécurisé)
      final paymentMethod = await Stripe.instance.createPaymentMethod(
        params: PaymentMethodParams.card(
          paymentMethodData: PaymentMethodData(
            billingDetails: BillingDetails(name: _nameCtrl.text.trim()),
          ),
        ),
      );

      // 2️⃣ Créer PaymentIntent backend
      final piRes = await http.post(
        Uri.parse('$kBaseUrl/pay'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'amount': widget.amount,
          'locationId': widget.locationId,
        }),
      );

      final piData = jsonDecode(piRes.body);
      if (piRes.statusCode != 200) {
        setState(() {
          _globalError = piData['message'] ?? 'Erreur serveur.';
          _loading = false;
        });
        return;
      }

      // 3️⃣ Confirmer le paiement — PAS de presentPaymentSheet
      final paymentIntent = await Stripe.instance.confirmPayment(
        paymentIntentClientSecret: piData['clientSecret'],
        data: PaymentMethodParams.cardFromMethodId(
          paymentMethodData: PaymentMethodDataCardFromMethod(
            paymentMethodId: paymentMethod.id,
          ),
        ),
      );

      // 4️⃣ Succès
      if (paymentIntent.status == PaymentIntentsStatus.Succeeded) {
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
        setState(() { _success = true; _loading = false; });
      } else {
        setState(() {
          _globalError = 'Statut : ${paymentIntent.status}';
          _loading = false;
        });
      }

    } on StripeException catch (e) {
      setState(() {
        _globalError = e.error.localizedMessage ?? 'Erreur Stripe.';
        _loading = false;
      });
    } catch (e) {
      setState(() { _globalError = 'Erreur : $e'; _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kBg,
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFFEEF2FF), Color(0xFFF8FAFC), Color(0xFFEDE9FE)],
            begin: Alignment.topLeft, end: Alignment.bottomRight,
          ),
        ),
        child: SafeArea(
          child: GestureDetector(
            onTap: () => FocusScope.of(context).unfocus(),
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 40),
              child: Column(children: [
                Align(
                  alignment: Alignment.centerLeft,
                  child: GestureDetector(
                    onTap: () => Navigator.pop(context),
                    child: Container(
                      width: 38, height: 38,
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.8),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: Colors.white.withOpacity(0.6)),
                      ),
                      child: const Icon(Icons.arrow_back_ios_new,
                        size: 16, color: Color(0xFF4338CA)),
                    ),
                  ),
                ),
                const SizedBox(height: 24),

                // Carte animée — se retourne quand CardField est focus
                _AnimatedCard(
                  cardName: _nameCtrl.text,
                  flipped: _cardFocused,
                ),
                const SizedBox(height: 32),

                Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: [
                      BoxShadow(color: const Color(0xFF4338CA).withOpacity(0.12),
                        blurRadius: 40, offset: const Offset(0, 16)),
                      BoxShadow(color: Colors.black.withOpacity(0.06),
                        blurRadius: 12, offset: const Offset(0, 4)),
                    ],
                    border: Border.all(
                      color: const Color(0xFF6366F1).withOpacity(0.1)),
                  ),
                  padding: const EdgeInsets.all(28),
                  child: _success ? _buildSuccess() : _buildForm(),
                ),
              ]),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildForm() {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      // Header
      Row(children: [
        Container(
          width: 36, height: 36,
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF4338CA), Color(0xFF6366F1)]),
            borderRadius: BorderRadius.circular(10),
          ),
          child: const Icon(Icons.credit_card, color: Colors.white, size: 16),
        ),
        const SizedBox(width: 10),
        const Text('Paiement sécurisé',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800,
            color: Color(0xFF111827))),
      ]),
      const SizedBox(height: 6),
      Row(children: [
        const Icon(Icons.lock_outline, size: 12, color: Color(0xFF10B981)),
        const SizedBox(width: 4),
        Text('SSL · Stripe',
          style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
        Text(' · ', style: TextStyle(fontSize: 12, color: Colors.grey.shade300)),
        Text('${widget.amount.toStringAsFixed(0)} DT',
          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800,
            color: Color(0xFF4338CA))),
      ]),
      const SizedBox(height: 24),

      // ✅ CardField Stripe — remplace numéro + expiry + cvv
      _FormField(
        label: 'Informations de carte',
        error: _errors['card'],
        focused: _cardFocused,
        complete: _cardComplete,
        child: CardField(
          onCardChanged: (details) {
            setState(() => _cardComplete = details?.complete ?? false);
          },
          onFocus: (field) {
            setState(() => _cardFocused = field != null);
          },
          style: const TextStyle(
            fontFamily: 'Courier',
            fontSize: 14,
            color: Color(0xFF1F2937),
          ),
          decoration: const InputDecoration(
            border: InputBorder.none,
            isDense: true,
            contentPadding: EdgeInsets.zero,
          ),
        ),
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
          style: const TextStyle(fontFamily: 'Courier', fontSize: 14,
            letterSpacing: 1, color: Color(0xFF1F2937)),
          decoration: InputDecoration(
            isDense: true, contentPadding: EdgeInsets.zero,
            border: InputBorder.none, hintText: 'JEAN DUPONT',
            hintStyle: TextStyle(fontFamily: 'Courier', fontSize: 14,
              color: Colors.grey.shade400),
          ),
        ),
      ),
      const SizedBox(height: 16),

      // Progress
      Row(children: [
        _ProgressBar(label: 'Carte', state: _cardComplete ? 'complete' : 'empty'),
        const SizedBox(width: 6),
        _ProgressBar(label: 'Nom', state: _nameState),
      ]),
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
          child: Row(children: [
            const Icon(Icons.warning_amber_rounded, size: 16,
              color: Color(0xFFDC2626)),
            const SizedBox(width: 8),
            Expanded(child: Text(_globalError!,
              style: const TextStyle(fontSize: 12, color: Color(0xFFDC2626)))),
          ]),
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
            disabledBackgroundColor: const Color(0xFF4338CA).withOpacity(0.85),
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14)),
            elevation: 0,
          ),
          child: AnimatedSwitcher(
            duration: const Duration(milliseconds: 200),
            child: _loading
                ? const SizedBox(key: ValueKey('loading'),
                    width: 20, height: 20,
                    child: CircularProgressIndicator(
                      color: Colors.white, strokeWidth: 2.5))
                : Row(key: const ValueKey('label'),
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.credit_card, size: 18),
                      const SizedBox(width: 8),
                      Text('Payer ${widget.amount.toStringAsFixed(0)} DT',
                        style: const TextStyle(fontSize: 15,
                          fontWeight: FontWeight.w700)),
                    ]),
          ),
        ),
      ),
      const SizedBox(height: 14),
      Center(
        child: Text('Test : 4242 4242 4242 4242 · 12/34 · 123',
          style: TextStyle(fontSize: 11, color: Colors.grey.shade400,
            fontFamily: 'Courier')),
      ),
    ]);
  }

  Widget _buildSuccess() {
    return Column(children: [
      const SizedBox(height: 16),
      Container(
        width: 72, height: 72,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: const LinearGradient(
            colors: [Color(0xFF059669), Color(0xFF065F46)],
            begin: Alignment.topLeft, end: Alignment.bottomRight,
          ),
          boxShadow: [
            BoxShadow(color: const Color(0xFF059669).withOpacity(0.4),
              blurRadius: 24, offset: const Offset(0, 8)),
          ],
        ),
        child: const Icon(Icons.check_rounded, color: Colors.white, size: 34),
      ),
      const SizedBox(height: 20),
      const Text('Paiement réussi !',
        style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800,
          color: Color(0xFF111827))),
      const SizedBox(height: 8),
      Text('Facture générée. Retrouvez-la dans vos réservations.',
        textAlign: TextAlign.center,
        style: TextStyle(fontSize: 13, color: Colors.grey.shade500)),
      const SizedBox(height: 28),
      SizedBox(
        width: double.infinity,
        child: ElevatedButton(
          onPressed: () => Navigator.pushNamedAndRemoveUntil(
            context, '/mes-reservations', (_) => false),
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF4338CA),
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 14),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12)),
            elevation: 0,
          ),
          child: const Text('Voir mes réservations →',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
        ),
      ),
      const SizedBox(height: 16),
    ]);
  }
}