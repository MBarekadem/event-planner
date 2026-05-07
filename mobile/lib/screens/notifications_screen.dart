import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;

class NotificationsScreen extends StatefulWidget {
  final Map<String, dynamic> user;
  final String token;

  const NotificationsScreen({
    super.key,
    required this.user,
    required this.token,
  });

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  List<dynamic> _notifications = [];
  bool _loading = true;
  int _unreadCount = 0;

  static const String baseUrl = 'http://localhost:5000/api';

  @override
  void initState() {
    super.initState();
    _fetchNotifications();
  }

  Future<void> _fetchNotifications() async {
    if (widget.token.isEmpty) return;
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/notifications'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${widget.token}',
        },
      );
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        setState(() {
          _notifications = data['notifications'] ?? [];
          _unreadCount = data['unreadCount'] ?? 0;
          _loading = false;
        });
      } else {
        setState(() => _loading = false);
      }
    } catch (e) {
      debugPrint('Erreur chargement notifications: $e');
      setState(() => _loading = false);
    }
  }

  Future<void> _markAsRead(String id) async {
    try {
      await http.put(
        Uri.parse('$baseUrl/notifications/$id/read'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${widget.token}',
        },
      );
      setState(() {
        final index = _notifications.indexWhere((n) => n['_id'] == id);
        if (index != -1) {
          _notifications[index]['read'] = true;
          _unreadCount = _unreadCount > 0 ? _unreadCount - 1 : 0;
        }
      });
    } catch (e) {
      debugPrint('Erreur: $e');
    }
  }

  Future<void> _markAllAsRead() async {
    try {
      await http.put(
        Uri.parse('$baseUrl/notifications/read-all'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${widget.token}',
        },
      );
      setState(() {
        for (var notif in _notifications) {
          notif['read'] = true;
        }
        _unreadCount = 0;
      });
    } catch (e) {
      debugPrint('Erreur: $e');
    }
  }

  Future<void> _deleteNotification(String id) async {
    try {
      await http.delete(
        Uri.parse('$baseUrl/notifications/$id'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${widget.token}',
        },
      );
      setState(() {
        final deleted = _notifications.firstWhere((n) => n['_id'] == id);
        _notifications.removeWhere((n) => n['_id'] == id);
        if (!deleted['read']) {
          _unreadCount = _unreadCount > 0 ? _unreadCount - 1 : 0;
        }
      });
    } catch (e) {
      debugPrint('Erreur: $e');
    }
  }

  String _formatDate(String dateStr) {
    try {
      final date = DateTime.parse(dateStr);
      final now = DateTime.now();
      final diff = now.difference(date);

      if (diff.inDays > 7) {
        return '${date.day}/${date.month}/${date.year}';
      } else if (diff.inDays >= 1) {
        return 'il y a ${diff.inDays} j';
      } else if (diff.inHours >= 1) {
        return 'il y a ${diff.inHours} h';
      } else if (diff.inMinutes >= 1) {
        return 'il y a ${diff.inMinutes} min';
      } else {
        return 'à l\'instant';
      }
    } catch (_) {
      return '';
    }
  }

  Color _getIconColor(String type) {
    switch (type) {
      case 'success':
        return Colors.green;
      case 'warning':
        return Colors.orange;
      case 'error':
        return Colors.red;
      case 'event':
        return Colors.purple;
      case 'validation':
        return Colors.blue;
      default:
        return const Color(0xFF9C27B0);
    }
  }

  IconData _getIcon(String type) {
    switch (type) {
      case 'success':
        return Icons.check_circle;
      case 'warning':
        return Icons.warning;
      case 'error':
        return Icons.error;
      case 'event':
        return Icons.event;
      case 'validation':
        return Icons.verified;
      default:
        return Icons.notifications;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F0FF),
      appBar: AppBar(
        title: const Text(
          'Notifications',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        backgroundColor: const Color(0xFF9C27B0),
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          if (_unreadCount > 0)
            TextButton(
              onPressed: _markAllAsRead,
              child: const Text(
                'Tout marquer',
                style: TextStyle(color: Colors.white),
              ),
            ),
        ],
      ),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: Color(0xFF9C27B0)),
            )
          : _notifications.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.notifications_none,
                        size: 64,
                        color: Colors.grey[400],
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'Aucune notification',
                        style: TextStyle(
                          fontSize: 16,
                          color: Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(12),
                  itemCount: _notifications.length,
                  itemBuilder: (context, index) {
                    final notif = _notifications[index];
                    final isRead = notif['read'] ?? false;
                    final type = notif['type'] ?? 'default';

                    return Dismissible(
                      key: Key(notif['_id']),
                      background: Container(
                        color: Colors.red,
                        alignment: Alignment.centerRight,
                        padding: const EdgeInsets.only(right: 20),
                        child: const Icon(Icons.delete, color: Colors.white),
                      ),
                      direction: DismissDirection.endToStart,
                      onDismissed: (_) => _deleteNotification(notif['_id']),
                      child: GestureDetector(
                        onTap: () {
                          if (!isRead) {
                            _markAsRead(notif['_id']);
                          }
                          // Naviguer selon le lien
                          if (notif['link'] != null && notif['link'].isNotEmpty) {
                            Navigator.pop(context, true);
                          }
                        },
                        child: Container(
                          margin: const EdgeInsets.only(bottom: 10),
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: isRead ? Colors.white : const Color(0xFFEDE9FE),
                            borderRadius: BorderRadius.circular(16),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withOpacity(0.05),
                                blurRadius: 8,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: _getIconColor(type).withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Icon(
                                  _getIcon(type),
                                  color: _getIconColor(type),
                                  size: 20,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      notif['title'] ?? 'Notification',
                                      style: const TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 14,
                                        color: Color(0xFF1A1A2E),
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      notif['message'] ?? '',
                                      style: TextStyle(
                                        fontSize: 12,
                                        color: Colors.grey[600],
                                      ),
                                    ),
                                    const SizedBox(height: 6),
                                    Text(
                                      _formatDate(notif['createdAt']),
                                      style: TextStyle(
                                        fontSize: 10,
                                        color: Colors.grey[400],
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              if (!isRead)
                                Container(
                                  width: 8,
                                  height: 8,
                                  decoration: const BoxDecoration(
                                    color: Color(0xFF9C27B0),
                                    shape: BoxShape.circle,
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}