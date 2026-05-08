import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

class ResetPasswordScreen extends StatefulWidget {
  final String token; // reçu via deep link ou navigation
  const ResetPasswordScreen({super.key, required this.token});
  @override
  State<ResetPasswordScreen> createState() => _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends State<ResetPasswordScreen> {
  static const Color primary = Color(0xFF9C27B0);
  final _passCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();
  bool _isLoading = false;
  bool _success = false;

  Future<void> _resetPassword() async {
    if (_passCtrl.text.isEmpty || _confirmCtrl.text.isEmpty) {
      _showSnack("Veuillez remplir tous les champs");
      return;
    }
    if (_passCtrl.text != _confirmCtrl.text) {
      _showSnack("Les mots de passe ne correspondent pas");
      return;
    }
    if (_passCtrl.text.length < 6) {
      _showSnack("Minimum 6 caractères");
      return;
    }

    setState(() => _isLoading = true);

    try {
      final res = await http.post(
        Uri.parse(
          'http://localhost:5000/api/users/reset-password/${widget.token}',
        ),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'password': _passCtrl.text}),
      );

      final data = jsonDecode(res.body);

      if (res.statusCode == 200) {
        setState(() => _success = true);
      } else {
        _showSnack(data['message'] ?? "Lien invalide ou expiré");
      }
    } catch (e) {
      _showSnack("Impossible de contacter le serveur");
    }

    setState(() => _isLoading = false);
  }

  void _showSnack(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        backgroundColor: Colors.red.shade600,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, color: primary, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: _success ? _successView(context) : _formView(),
      ),
    );
  }

  Widget _formView() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 56,
          height: 56,
          decoration: BoxDecoration(
            color: const Color(0xFFF3E5FF),
            borderRadius: BorderRadius.circular(16),
          ),
          child: const Icon(Icons.lock_outline, color: primary, size: 28),
        ),
        const SizedBox(height: 24),
        const Text(
          "Nouveau mot de passe",
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: Color(0xFF1A1A2E),
          ),
        ),
        const SizedBox(height: 8),
        const Text(
          "Choisissez un nouveau mot de passe sécurisé.",
          style: TextStyle(color: Colors.grey, fontSize: 13),
        ),
        const SizedBox(height: 32),
        _passField("Nouveau mot de passe", _passCtrl),
        const SizedBox(height: 12),
        _passField("Confirmer le mot de passe", _confirmCtrl),
        const SizedBox(height: 24),
        SizedBox(
          width: double.infinity,
          height: 52,
          child: DecoratedBox(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(30),
              gradient: const LinearGradient(
                colors: [Color(0xFFB832C5), Color(0xFF9C27B0)],
              ),
            ),
            child: ElevatedButton(
              onPressed: _isLoading ? null : _resetPassword,
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
                  : const Text(
                      "Réinitialiser",
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _passField(String hint, TextEditingController ctrl) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFEDE5F7)),
      ),
      child: TextField(
        controller: ctrl,
        obscureText: true,
        decoration: InputDecoration(
          prefixIcon: const Icon(Icons.lock_outline, color: primary, size: 20),
          hintText: hint,
          hintStyle: const TextStyle(color: Color(0xFFB0A0C0), fontSize: 13),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(vertical: 14),
        ),
      ),
    );
  }

  Widget _successView(BuildContext context) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Container(
          width: 100,
          height: 100,
          decoration: BoxDecoration(
            color: Colors.green.shade50,
            borderRadius: BorderRadius.circular(50),
          ),
          child: Icon(
            Icons.check_circle_outline,
            color: Colors.green.shade600,
            size: 55,
          ),
        ),
        const SizedBox(height: 28),
        const Text(
          "Mot de passe modifié !",
          style: TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.bold,
            color: Color(0xFF1A1A2E),
          ),
        ),
        const SizedBox(height: 12),
        const Text(
          "Vous pouvez maintenant vous connecter\navec votre nouveau mot de passe.",
          textAlign: TextAlign.center,
          style: TextStyle(color: Colors.grey, fontSize: 13, height: 1.5),
        ),
        const SizedBox(height: 32),
        SizedBox(
          width: double.infinity,
          height: 52,
          child: DecoratedBox(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(30),
              gradient: const LinearGradient(
                colors: [Color(0xFFB832C5), Color(0xFF9C27B0)],
              ),
            ),
            child: ElevatedButton(
              onPressed: () =>
                  Navigator.popUntil(context, (route) => route.isFirst),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.transparent,
                shadowColor: Colors.transparent,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(30),
                ),
              ),
              child: const Text(
                "Se connecter",
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
