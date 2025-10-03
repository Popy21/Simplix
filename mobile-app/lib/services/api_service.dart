import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/models.dart';

class ApiService {
  static const String baseUrl = 'http://localhost:3000/api';

  // Customers
  Future<List<Customer>> getCustomers() async {
    final response = await http.get(Uri.parse('$baseUrl/customers'));
    if (response.statusCode == 200) {
      final List<dynamic> data = json.decode(response.body);
      return data.map((json) => Customer.fromJson(json)).toList();
    }
    throw Exception('Failed to load customers');
  }

  Future<Customer> createCustomer(Customer customer) async {
    final response = await http.post(
      Uri.parse('$baseUrl/customers'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode(customer.toJson()),
    );
    if (response.statusCode == 201) {
      return Customer.fromJson(json.decode(response.body));
    }
    throw Exception('Failed to create customer');
  }

  // Products
  Future<List<Product>> getProducts() async {
    final response = await http.get(Uri.parse('$baseUrl/products'));
    if (response.statusCode == 200) {
      final List<dynamic> data = json.decode(response.body);
      return data.map((json) => Product.fromJson(json)).toList();
    }
    throw Exception('Failed to load products');
  }

  Future<Product> createProduct(Product product) async {
    final response = await http.post(
      Uri.parse('$baseUrl/products'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode(product.toJson()),
    );
    if (response.statusCode == 201) {
      return Product.fromJson(json.decode(response.body));
    }
    throw Exception('Failed to create product');
  }

  // Sales
  Future<List<Sale>> getSales() async {
    final response = await http.get(Uri.parse('$baseUrl/sales'));
    if (response.statusCode == 200) {
      final List<dynamic> data = json.decode(response.body);
      return data.map((json) => Sale.fromJson(json)).toList();
    }
    throw Exception('Failed to load sales');
  }

  Future<Sale> createSale(Sale sale) async {
    final response = await http.post(
      Uri.parse('$baseUrl/sales'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode(sale.toJson()),
    );
    if (response.statusCode == 201) {
      return Sale.fromJson(json.decode(response.body));
    }
    throw Exception('Failed to create sale');
  }
}
