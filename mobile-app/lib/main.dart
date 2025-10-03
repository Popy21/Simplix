import 'package:flutter/material.dart';
import 'screens/home_screen.dart';
import 'screens/customers_screen.dart';
import 'screens/products_screen.dart';
import 'screens/sales_screen.dart';

void main() {
  runApp(const SimplixApp());
}

class SimplixApp extends StatelessWidget {
  const SimplixApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Simplix CRM',
      theme: ThemeData(
        primarySwatch: Colors.blue,
        useMaterial3: true,
      ),
      home: const HomeScreen(),
      routes: {
        '/customers': (context) => const CustomersScreen(),
        '/products': (context) => const ProductsScreen(),
        '/sales': (context) => const SalesScreen(),
      },
    );
  }
}
