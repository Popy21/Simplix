# Simplix
Simple Sale CRM

A comprehensive multi-platform Sales CRM system with TypeScript API, React Native web/mobile app, and Flutter mobile app.

## 🚀 Features

- **Multi-Platform Support**: Desktop, web, iOS, and Android
- **Customer Management**: Track and manage customer information
- **Product Catalog**: Maintain product inventory and pricing
- **Sales Tracking**: Record and monitor sales transactions
- **RESTful API**: Robust backend with SQLite database

## 📁 Project Structure

```
Simplix/
├── api/                 # TypeScript API with SQLite
├── web-app/            # React Native (Expo) for web & mobile
├── mobile-app/         # Flutter mobile application
└── README.md           # This file
```

## 🛠️ Technology Stack

### API (Backend)
- TypeScript
- Node.js + Express
- SQLite database
- CORS enabled

### Web/Mobile App
- React Native
- Expo (for web support)
- React Navigation
- Axios for API calls

### Mobile App
- Flutter
- Material Design
- HTTP client

## 🚦 Getting Started

### 1. API Setup

```bash
cd api
npm install
cp .env.example .env
npm run dev
```

The API will run on `http://localhost:3000`

See [api/README.md](api/README.md) for detailed API documentation.

### 2. Web App Setup

```bash
cd web-app
npm install
npm run web
```

See [web-app/README.md](web-app/README.md) for more details.

### 3. Mobile App Setup (Flutter)

```bash
cd mobile-app
flutter pub get
flutter run
```

See [mobile-app/README.md](mobile-app/README.md) for more details.

## 📱 Platform Support

| Platform | Web App | Mobile App (Flutter) |
|----------|---------|---------------------|
| iOS      | ✅      | ✅                  |
| Android  | ✅      | ✅                  |
| Web      | ✅      | ✅                  |
| Desktop  | ✅ (via web) | ❌            |

## 🔌 API Endpoints

### Customers
- `GET /api/customers` - List all customers
- `POST /api/customers` - Create customer
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer

### Products
- `GET /api/products` - List all products
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Sales
- `GET /api/sales` - List all sales
- `POST /api/sales` - Create sale
- `PUT /api/sales/:id` - Update sale
- `DELETE /api/sales/:id` - Delete sale

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details

## 👨‍💻 Author

Popy21

---

**Note**: Make sure to start the API server before running the web or mobile apps, as they depend on the API for data.

