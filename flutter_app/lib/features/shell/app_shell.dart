import 'package:flutter/material.dart';
import '../dashboard/dashboard_screen.dart';
import '../transactions/transactions_screen.dart';
import '../tools/tools_screen.dart';
import '../profile/profile_screen.dart';
class AppShell extends StatefulWidget{const AppShell({super.key});@override State<AppShell> createState()=>_AppShellState();}
class _AppShellState extends State<AppShell>{int index=0;final pages=const[DashboardScreen(),TransactionsScreen(),ToolsScreen(),ProfileScreen()];@override Widget build(BuildContext context)=>Scaffold(body:SafeArea(child:IndexedStack(index:index,children:pages)),bottomNavigationBar:NavigationBar(selectedIndex:index,onDestinationSelected:(v)=>setState(()=>index=v),destinations:const[NavigationDestination(icon:Icon(Icons.grid_view_rounded),label:'Home'),NavigationDestination(icon:Icon(Icons.receipt_long_rounded),label:'Activity'),NavigationDestination(icon:Icon(Icons.auto_awesome_mosaic_rounded),label:'Tools'),NavigationDestination(icon:Icon(Icons.person_outline_rounded),label:'Profile')]));}
