import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'home_content_screen.dart';
import 'profile_screen.dart';
import 'vendors_screen.dart';
import 'events_screen.dart';
import "mes_reservations_page.dart";

class HomeScreen extends StatefulWidget {
  final Map<String, dynamic> user;
  final String token;

  const HomeScreen({super.key, required this.user, required this.token});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;
  late Map<String, dynamic> _currentUser; // ← user mutable

  @override
  void initState() {
    super.initState();
    _currentUser = Map<String, dynamic>.from(widget.user);
  }

  // ✅ Recharger le user depuis SharedPreferences à chaque fois qu'on navigue vers Profil
  Future<void> _refreshUser() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString('user');
    if (raw != null && mounted) {
      setState(() {
        _currentUser = json.decode(raw);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    // ✅ Screens construits dynamiquement avec _currentUser à jour
    final screens = [
      HomeContentScreen(user: _currentUser, token: widget.token),
      MesEvenementsPage(
        userId: _currentUser['_id'] ?? _currentUser['id'] ?? '',
      ),
      MesReservationsPage(),
      ProfileScreen(user: _currentUser, token: widget.token),
    ];

    return Scaffold(
      body: IndexedStack(index: _currentIndex, children: screens),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.08),
              blurRadius: 20,
              offset: const Offset(0, -4),
            ),
          ],
        ),
        child: SafeArea(
          child: BottomNavigationBar(
            currentIndex: _currentIndex,
            onTap: (index) async {
              // ✅ Rafraîchir le user avant d'afficher le profil
              if (index == 3) await _refreshUser();
              setState(() => _currentIndex = index);
            },
            type: BottomNavigationBarType.fixed,
            selectedItemColor: const Color(0xFF9C27B0),
            unselectedItemColor: Colors.grey[400],
            selectedLabelStyle: const TextStyle(
              fontWeight: FontWeight.w600,
              fontSize: 11,
            ),
            unselectedLabelStyle: const TextStyle(fontSize: 11),
            elevation: 0,
            backgroundColor: Colors.transparent,
            items: const [
              BottomNavigationBarItem(
                icon: Icon(Icons.home_outlined),
                activeIcon: Icon(Icons.home),
                label: 'Accueil',
              ),
              BottomNavigationBarItem(
                icon: Icon(Icons.calendar_today_outlined),
                activeIcon: Icon(Icons.calendar_today),
                label: 'Événements',
              ),
              BottomNavigationBarItem(
                icon: Icon(Icons.inventory_2_outlined),
                activeIcon: Icon(Icons.inventory_2),
                label: 'reservation',
              ),
              BottomNavigationBarItem(
                icon: Icon(Icons.person_outline),
                activeIcon: Icon(Icons.person),
                label: 'Profil',
              ),
            ],
          ),
        ),
      ),
    );
  }
}
