class Customer {
  final int? id;
  final String name;
  final String? email;
  final String? phone;
  final String? company;
  final String? address;

  Customer({
    this.id,
    required this.name,
    this.email,
    this.phone,
    this.company,
    this.address,
  });

  factory Customer.fromJson(Map<String, dynamic> json) {
    return Customer(
      id: json['id'],
      name: json['name'],
      email: json['email'],
      phone: json['phone'],
      company: json['company'],
      address: json['address'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'email': email,
      'phone': phone,
      'company': company,
      'address': address,
    };
  }
}

class Product {
  final int? id;
  final String name;
  final String? description;
  final double price;
  final int stock;

  Product({
    this.id,
    required this.name,
    this.description,
    required this.price,
    required this.stock,
  });

  factory Product.fromJson(Map<String, dynamic> json) {
    return Product(
      id: json['id'],
      name: json['name'],
      description: json['description'],
      price: (json['price'] as num).toDouble(),
      stock: json['stock'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'description': description,
      'price': price,
      'stock': stock,
    };
  }
}

class Sale {
  final int? id;
  final int customerId;
  final int productId;
  final int quantity;
  final double totalAmount;
  final String? status;
  final String? customerName;
  final String? productName;

  Sale({
    this.id,
    required this.customerId,
    required this.productId,
    required this.quantity,
    required this.totalAmount,
    this.status,
    this.customerName,
    this.productName,
  });

  factory Sale.fromJson(Map<String, dynamic> json) {
    return Sale(
      id: json['id'],
      customerId: json['customer_id'],
      productId: json['product_id'],
      quantity: json['quantity'],
      totalAmount: (json['total_amount'] as num).toDouble(),
      status: json['status'],
      customerName: json['customer_name'],
      productName: json['product_name'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'customer_id': customerId,
      'product_id': productId,
      'quantity': quantity,
      'total_amount': totalAmount,
      'status': status,
    };
  }
}
