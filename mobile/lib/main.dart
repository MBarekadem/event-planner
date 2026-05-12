import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import 'package:flutter_stripe/flutter_stripe.dart';

import 'screens/onboarding_screen.dart';
import 'screens/auth_screen.dart';
import 'screens/home_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  Stripe.publishableKey =
      'pk_test_51TNBjcRqjNGfrecsmctWpoSvbhepNtLN3BB3Suu95rFDQxHxxgSoIIyoWMJzQ1sD39F4Ddvi0PynxJp8zqECQe9m00K8iR1o62'; // votre clé publique
  await Stripe.instance.applySettings();

  final prefs = await SharedPreferences.getInstance();
  final token = prefs.getString('token');
  final userString = prefs.getString('user');
  final hasSeenOnboarding = prefs.getBool('hasSeenOnboarding') ?? false;

  runApp(
    MyApp(
      token: token,
      userString: userString,
      hasSeenOnboarding: hasSeenOnboarding,
    ),
  );
}

class MyApp extends StatelessWidget {
  final String? token;
  final String? userString;
  final bool hasSeenOnboarding;

  const MyApp({
    super.key,
    this.token,
    this.userString,
    required this.hasSeenOnboarding,
  });

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'YallaEvents',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF9C27B0)),
        useMaterial3: true,
      ),

      // ✅ ROUTES
      routes: {'/login': (context) => const AuthScreen()},

      // ✅ HOME DYNAMIQUE
      home: _getInitialScreen(),
    );
  }

  Widget _getInitialScreen() {
    // 1️⃣ Onboarding
    if (!hasSeenOnboarding) {
      return OnboardingScreen();
    }

    // 2️⃣ User connecté
    if (token != null && token!.isNotEmpty && userString != null) {
      final user = jsonDecode(userString!);

      return HomeScreen(user: user, token: token!);
    }

    // 3️⃣ Sinon login
    return const AuthScreen();
  }
}
