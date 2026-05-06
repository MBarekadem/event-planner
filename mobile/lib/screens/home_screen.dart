import 'package:flutter/material.dart';
import 'home_content_screen.dart';
import 'profile_screen.dart';

class HomeScreen extends StatefulWidget {
  final Map<String, dynamic> user;
  final String token;

  const HomeScreen({super.key, required this.user, required this.token});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;

  late final List<Widget> _screens;

  @override
  void initState() {
    super.initState();
    _screens = [
      HomeContentScreen(user: widget.user, token: widget.token),
      const Center(
        child: Text('📅 MES ÉVÉNEMENTS', style: TextStyle(fontSize: 24)),
      ),
      const Center(
        child: Text('❤️ MES FAVORIS', style: TextStyle(fontSize: 24)),
      ),
      const Center(
        child: Text('📄 MES DOCUMENTS', style: TextStyle(fontSize: 24)),
      ),
      ProfileScreen(user: widget.user,  token: widget.token,),
    ];
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _screens[_currentIndex],
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) => setState(() => _currentIndex = index),
        type: BottomNavigationBarType.fixed,
        selectedItemColor: const Color(0xFF9C27B0),
        unselectedItemColor: Colors.grey,
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home), label: 'Accueil'),
          BottomNavigationBarItem(
            icon: Icon(Icons.calendar_today),
            label: 'Événements',
          ),
          BottomNavigationBarItem(icon: Icon(Icons.favorite), label: 'Favoris'),
          BottomNavigationBarItem(
            icon: Icon(Icons.description),
            label: 'Documents',
          ),
          BottomNavigationBarItem(icon: Icon(Icons.person), label: 'Profil'),
        ],
      ),
    );
  }
}
