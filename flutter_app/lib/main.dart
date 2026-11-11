import 'package:flutter/material.dart';
import 'app.dart';
import 'core/api_client.dart';
Future<void> main() async { WidgetsFlutterBinding.ensureInitialized(); await ApiClient.instance.initialize(); runApp(const PaydayApp()); }
