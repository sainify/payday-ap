import 'package:flutter/material.dart';
import 'core/api_client.dart';
import 'features/auth/auth_screen.dart';
import 'features/shell/app_shell.dart';
class PaydayApp extends StatelessWidget{const PaydayApp({super.key});@override Widget build(BuildContext context)=>MaterialApp(title:'PAYDAY',debugShowCheckedModeBanner:false,theme:ThemeData(useMaterial3:true,scaffoldBackgroundColor:const Color(0xFFF7F6F2),colorScheme:ColorScheme.fromSeed(seedColor:const Color(0xFF4B4FE0),surface:const Color(0xFFF7F6F2)),cardTheme:CardThemeData(color:Colors.white,elevation:0,shape:RoundedRectangleBorder(borderRadius:BorderRadius.circular(24),side:const BorderSide(color:Color(0x0D141414))))),home:ApiClient.instance.hasSession?const AppShell():const AuthScreen());}
