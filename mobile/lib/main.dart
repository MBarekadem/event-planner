import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'screens/onboarding_screen.dart';
import 'screens/auth_screen.dart';
import 'screens/home_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  final prefs = await SharedPreferences.getInstance();
  final token = prefs.getString('token');
  final hasSeenOnboarding = prefs.getBool('hasSeenOnboarding') ?? false;
  
  runApp(MyApp(
    token: token,
    hasSeenOnboarding: hasSeenOnboarding,
  ));
}

class MyApp extends StatelessWidget {
  final String? token;
  final bool hasSeenOnboarding;

  const MyApp({super.key, this.token, required this.hasSeenOnboarding});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'YallaEvents',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF9C27B0)),
        useMaterial3: true,
      ),
      home: _getInitialScreen(),
    );
  }

  Widget _getInitialScreen() {
    if (!hasSeenOnboarding) {
      return OnboardingScreen();  // ← enlève "const" ici
    }
    if (token != null && token!.isNotEmpty) {
      return const HomeScreen();
    }
    return const AuthScreen();
  }
}