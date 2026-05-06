import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class AuthService {
  static String get baseUrl {
    if (kIsWeb) return "http://localhost:5000/api/users";
    return "http://localhost:5000/api/users";
  }

  // ─── REGISTER ──────────────────────────────────────────────────────
  static Future<Map<String, dynamic>> register({
    required String lastname,
    required String firstname,
    required String email,
    required String password,
    required String numTel,
    required String role,
    required double latitude,
    required double longitude,
    File? imageFile,
    Uint8List? imageBytes,
    String? imageName,
  }) async {
    try {
      var request = http.MultipartRequest(
        'POST',
        Uri.parse('$baseUrl/register'),
      );

      request.fields['lastname'] = lastname;
      request.fields['firstname'] = firstname;
      request.fields['email'] = email;
      request.fields['password'] = password;
      request.fields['numTel'] = numTel;
      request.fields['role'] = role;
      request.fields['location'] = jsonEncode({
        "type": "Point",
        "coordinates": [longitude, latitude],
      });

      if (imageFile != null) {
        request.files.add(
          await http.MultipartFile.fromPath('image', imageFile.path),
        );
      }

      if (imageBytes != null && imageName != null) {
        request.files.add(
          http.MultipartFile.fromBytes(
            'image',
            imageBytes,
            filename: imageName,
          ),
        );
      }

      final streamed = await request.send().timeout(
        const Duration(seconds: 15),
      );
      final response = await http.Response.fromStream(streamed);
      final data = jsonDecode(response.body);

      if (response.statusCode == 201) {
        return {'success': true, 'data': data};
      } else {
        return {'success': false, 'message': data['message']};
      }
    } on SocketException {
      return {'success': false, 'message': 'Serveur inaccessible'};
    } catch (e) {
      return {'success': false, 'message': 'Erreur réseau : $e'};
    }
  }

  // ─── LOGIN ─────────────────────────────────────────────────────────
  static Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) async {
    try {
      final response = await http
          .post(
            Uri.parse('$baseUrl/login'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'email': email, 'password': password}),
          )
          .timeout(const Duration(seconds: 10));

      final data = jsonDecode(response.body);

      if (response.statusCode == 200) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('token', data['token']);
        await prefs.setString('user', jsonEncode(data['user']));
        return {'success': true, 'data': data};
      } else {
        return {'success': false, 'message': data['message']};
      }
    } on SocketException {
      return {'success': false, 'message': 'Serveur inaccessible'};
    } catch (e) {
      return {'success': false, 'message': 'Erreur réseau : $e'};
    }
  }

  // ─── TOKEN LOCAL ───────────────────────────────────────────────────
  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('token');
  }

  static Future<Map<String, dynamic>?> getLocalUser() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString('user');
    return raw != null ? jsonDecode(raw) : null;
  }

  static Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
    await prefs.remove('user');
  }
}
